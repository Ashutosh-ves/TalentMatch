import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useDebounce } from '../hooks/useDebounce';
import messageService from '../services/messageService';
import applicationService from '../services/applicationService';
import openingService from '../services/openingService';

export function InterviewChat() {
  const { applicationId: routeAppId } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { socket, isConnected } = useSocket();
  const currentUserId = user?._id || user?.id;

  const [inputMessage, setInputMessage] = useState('');
  const [selectedAppId, setSelectedAppId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const debouncedSearchFilter = useDebounce(searchFilter, 300);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [otherUserTypingName, setOtherUserTypingName] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [incomingMessages, setIncomingMessages] = useState([]);

  const messagesEndRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const idleStopTypingTimeoutRef = useRef(null);
  const isCurrentlyTypingRef = useRef(false);

  // 1. Fetch conversations list for sidebar
  const { data: myAppsData } = useQuery({
    queryKey: ['myApplications'],
    queryFn: () => applicationService.getMyApplications(),
    enabled: role === 'student',
  });

  const { data: myOpeningsData } = useQuery({
    queryKey: ['myOpenings'],
    queryFn: () => openingService.getMyOpenings(),
    enabled: role === 'recruiter',
  });

  const recruiterOpenings = myOpeningsData?.openings || [];

  const { data: recruiterAppsData } = useQuery({
    queryKey: ['allRecruiterApplications', recruiterOpenings.map((o) => o._id).join(',')],
    queryFn: async () => {
      const all = await Promise.all(
        recruiterOpenings.map(async (op) => {
          try {
            const res = await applicationService.getApplicationsByOpening(op._id);
            return res.applications || [];
          } catch {
            return [];
          }
        })
      );
      return all.flat();
    },
    enabled: role === 'recruiter' && recruiterOpenings.length > 0,
  });

  // 2. Derive active application ID
  const fallbackAppId = useMemo(() => {
    if (role === 'student') {
      const apps = (myAppsData?.applications || []).filter(
        (a) => a.status === 'shortlisted' || a.status === 'accepted'
      );
      return apps[0]?._id || null;
    }
    if (role === 'recruiter') {
      const apps = (recruiterAppsData || []).filter(
        (a) => a.status === 'shortlisted' || a.status === 'accepted'
      );
      return apps[0]?._id || null;
    }
    return null;
  }, [role, myAppsData, recruiterAppsData]);

  const activeAppId = routeAppId || selectedAppId || fallbackAppId;

  // 3. Fetch current application details if activeAppId exists
  const { data: currentAppData } = useQuery({
    queryKey: ['application', activeAppId],
    queryFn: () => applicationService.getApplicationById(activeAppId),
    enabled: !!activeAppId,
  });

  const currentApplication = currentAppData?.application;

  // Build the list of active conversations
  const conversationsList = useMemo(() => {
    let list = [];
    if (role === 'student') {
      const apps = myAppsData?.applications || [];
      list = apps.filter((a) => a.status === 'shortlisted' || a.status === 'accepted');
    } else if (role === 'recruiter') {
      const apps = recruiterAppsData || [];
      list = apps.filter((a) => a.status === 'shortlisted' || a.status === 'accepted');
    }

    if (currentApplication && !list.some((a) => a._id === currentApplication._id)) {
      list = [currentApplication, ...list];
    }

    return list;
  }, [role, myAppsData, recruiterAppsData, currentApplication]);

  // 4. Fetch message history for the active application
  const { data: messagesData, isLoading: isMessagesLoading } = useQuery({
    queryKey: ['messages', activeAppId],
    queryFn: () => messageService.getMessageHistory(activeAppId),
    enabled: !!activeAppId,
  });

  // Combine fetched messages with newly received socket messages
  const liveMessages = useMemo(() => {
    const history = messagesData?.messages || [];
    const map = new Map();
    history.forEach((m) => map.set(m._id, m));
    incomingMessages.forEach((m) => {
      if (m.applicationId === activeAppId) {
        map.set(m._id, m);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [messagesData, incomingMessages, activeAppId]);

  // 5. Socket.IO Room Management, Real-time Messages, Typing, & Presence Wiring
  useEffect(() => {
    setIsOtherUserTyping(false);
    setOtherUserTypingName('');
    setOnlineUsers(new Set());

    if (!socket || !isConnected || !activeAppId) return;

    // Join application chat room
    socket.emit('join_room', { applicationId: activeAppId });

    // Listener for room entry response (contains currently online user IDs)
    const handleJoinedRoom = (data) => {
      if (data?.applicationId === activeAppId && Array.isArray(data.onlineUserIds)) {
        setOnlineUsers(new Set(data.onlineUserIds.map(String)));
      }
    };

    // Presence: user joined the room
    const handleUserOnline = (data) => {
      if (data?.applicationId === activeAppId && data?.userId) {
        setOnlineUsers((prev) => new Set([...prev, String(data.userId)]));
      }
    };

    // Presence: user left or disconnected from the room
    const handleUserOffline = (data) => {
      if (data?.applicationId === activeAppId && data?.userId) {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(String(data.userId));
          return next;
        });
      }
    };

    // Listener for new messages
    const handleReceiveMessage = (newMessage) => {
      if (newMessage && newMessage.applicationId === activeAppId) {
        setIncomingMessages((prev) => {
          if (prev.some((m) => m._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });
        setIsOtherUserTyping(false);
      }
    };

    // Listeners for typing indicators from the server relay
    const handleTyping = (data) => {
      if (data?.applicationId === activeAppId && String(data?.userId) !== String(currentUserId)) {
        setIsOtherUserTyping(true);
        setOtherUserTypingName(data?.name || '');
      }
    };

    const handleStopTyping = (data) => {
      if (data?.applicationId === activeAppId && String(data?.userId) !== String(currentUserId)) {
        setIsOtherUserTyping(false);
      }
    };

    socket.on('joined_room', handleJoinedRoom);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    const handleBeforeUnload = () => {
      socket.emit('leave_room', { applicationId: activeAppId });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      socket.emit('leave_room', { applicationId: activeAppId });
      socket.off('joined_room', handleJoinedRoom);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
    };
  }, [socket, isConnected, activeAppId, currentUserId]);

  // Clean up idle typing timeout and stop typing on unmount or activeAppId change
  useEffect(() => {
    return () => {
      if (idleStopTypingTimeoutRef.current) {
        clearTimeout(idleStopTypingTimeoutRef.current);
      }
      if (isCurrentlyTypingRef.current && socket && isConnected && activeAppId) {
        socket.emit('stop_typing', { applicationId: activeAppId });
        isCurrentlyTypingRef.current = false;
        lastTypingEmitRef.current = 0;
      }
    };
  }, [activeAppId, socket, isConnected]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages, isOtherUserTyping]);

  // Handle typing emissions: throttled to once per 2s, stop_typing after 2.5s idle
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputMessage(val);

    if (!socket || !isConnected || !activeAppId) return;

    if (val.trim()) {
      const now = Date.now();
      // Throttle typing to once per 2s
      if (now - lastTypingEmitRef.current >= 2000) {
        socket.emit('typing', { applicationId: activeAppId });
        lastTypingEmitRef.current = now;
        isCurrentlyTypingRef.current = true;
      }

      // Stop typing after 2.5s idle
      if (idleStopTypingTimeoutRef.current) {
        clearTimeout(idleStopTypingTimeoutRef.current);
      }
      idleStopTypingTimeoutRef.current = setTimeout(() => {
        if (isCurrentlyTypingRef.current) {
          socket.emit('stop_typing', { applicationId: activeAppId });
          isCurrentlyTypingRef.current = false;
          lastTypingEmitRef.current = 0;
        }
      }, 2500);
    } else {
      if (idleStopTypingTimeoutRef.current) {
        clearTimeout(idleStopTypingTimeoutRef.current);
      }
      if (isCurrentlyTypingRef.current) {
        socket.emit('stop_typing', { applicationId: activeAppId });
        isCurrentlyTypingRef.current = false;
        lastTypingEmitRef.current = 0;
      }
    }
  };

  // Handle input blur: stop typing immediately
  const handleInputBlur = () => {
    if (idleStopTypingTimeoutRef.current) {
      clearTimeout(idleStopTypingTimeoutRef.current);
    }
    if (isCurrentlyTypingRef.current && socket && isConnected && activeAppId) {
      socket.emit('stop_typing', { applicationId: activeAppId });
      isCurrentlyTypingRef.current = false;
      lastTypingEmitRef.current = 0;
    }
  };

  // 6. Send message action: stop typing immediately on send
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = inputMessage.trim();
    if (!trimmed || !activeAppId) return;

    setInputMessage('');

    // Stop typing immediately on send
    if (idleStopTypingTimeoutRef.current) {
      clearTimeout(idleStopTypingTimeoutRef.current);
    }
    if (isCurrentlyTypingRef.current && socket && isConnected && activeAppId) {
      socket.emit('stop_typing', { applicationId: activeAppId });
      isCurrentlyTypingRef.current = false;
      lastTypingEmitRef.current = 0;
    }

    // Try sending via Socket first
    if (socket && isConnected) {
      socket.emit('send_message', { applicationId: activeAppId, text: trimmed }, (response) => {
        if (response?.success && response?.message) {
          setIncomingMessages((prev) => {
            if (prev.some((m) => m._id === response.message._id)) return prev;
            return [...prev, response.message];
          });
        }
      });
    } else {
      // Fallback via REST API
      try {
        const res = await messageService.sendMessage(activeAppId, trimmed);
        if (res.message) {
          setIncomingMessages((prev) => [...prev, res.message]);
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Determine chat partner identity
  const opening = currentApplication?.openingId || {};
  const studentUser = currentApplication?.studentId || {};

  const partnerUserId =
    role === 'student'
      ? (opening.recruiterId?._id || opening.recruiterId?.id || opening.recruiterId)?.toString()
      : (studentUser._id || studentUser.id || studentUser)?.toString();

  const isPartnerOnline = Boolean(partnerUserId && onlineUsers.has(String(partnerUserId)));

  const partnerName =
    role === 'student'
      ? opening.companyName || opening.recruiterId?.name || 'Hiring Team'
      : studentUser.name || 'Student Candidate';

  const partnerRoleTitle = opening.title || 'Engineering Role';
  const matchScore = currentApplication?.matchScore ?? 95;

  const filteredConversations = conversationsList.filter((conv) => {
    if (!debouncedSearchFilter.trim()) return true;
    const term = debouncedSearchFilter.toLowerCase();
    const candidateName = conv.studentId?.name || '';
    const jobTitle = conv.openingId?.title || '';
    const company = conv.openingId?.companyName || conv.openingId?.recruiterId?.name || '';
    return (
      candidateName.toLowerCase().includes(term) ||
      jobTitle.toLowerCase().includes(term) ||
      company.toLowerCase().includes(term)
    );
  });

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] max-w-[1440px] mx-auto w-full px-4 md:px-margin-desktop py-4">
      {/* Mobile Drawer Toggle */}
      <div className="lg:hidden flex items-center justify-between pb-3 mb-2 border-b border-border-hairline">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 font-label-mono text-xs uppercase text-text-muted hover:text-primary transition-colors py-1 px-3 border border-border-hairline bg-surface-container"
        >
          <span className="material-symbols-outlined text-base">forum</span>
          {sidebarOpen ? 'Close Chats' : 'View Chats'} ({conversationsList.length})
        </button>

        {partnerName && (
          <span className="font-headline-md text-sm font-bold text-primary truncate max-w-[200px]">
            {partnerName}
          </span>
        )}
      </div>

      <div className="flex flex-grow overflow-hidden gap-6 h-full relative">
        {/* Left Sidebar: Conversations List matching stitch design */}
        <aside
          className={`${
            sidebarOpen ? 'absolute inset-0 z-30 bg-surface md:relative' : 'hidden'
          } lg:flex w-full lg:w-80 flex-col border-r border-border-hairline pr-0 lg:pr-6 h-full flex-none`}
        >
          <div className="mb-6 flex-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline-md text-xl font-bold text-primary">Active Chats</h2>
              <span className="font-label-mono text-xs px-2 py-0.5 bg-surface-container border border-border-hairline text-text-muted">
                {conversationsList.length}
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search conversations..."
                className="w-full border-0 border-b-2 border-border-hairline focus:border-primary px-0 py-2 bg-transparent font-label-mono text-xs text-primary placeholder:text-text-muted outline-none transition-colors rounded-none"
              />
              <span className="material-symbols-outlined absolute right-0 top-2 text-text-muted text-base pointer-events-none">
                search
              </span>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto space-y-2 pr-1">
            {filteredConversations.length === 0 ? (
              <div className="p-6 border border-dashed border-border-hairline text-center text-text-muted font-label-mono text-xs">
                {conversationsList.length === 0
                  ? 'No shortlisted interview chats available yet.'
                  : 'No conversations match search.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv._id === activeAppId;
                const cOpening = conv.openingId || {};
                const cStudent = conv.studentId || {};

                const cName =
                  role === 'student'
                    ? cOpening.companyName || cOpening.recruiterId?.name || 'Hiring Team'
                    : cStudent.name || 'Candidate';

                const cRole = cOpening.title || 'Engineering Role';

                return (
                  <div
                    key={conv._id}
                    onClick={() => {
                      setSelectedAppId(conv._id);
                      navigate(`/chat/${conv._id}`);
                      setSidebarOpen(false);
                    }}
                    className={`p-4 border cursor-pointer flex flex-col gap-1 relative transition-all ${
                      isSelected
                        ? 'bg-surface-container-low border-border-hairline'
                        : 'border-transparent hover:border-border-hairline hover:bg-surface-container-low/50'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute w-1.5 h-full bg-primary left-0 top-0"></div>
                    )}

                    <div className="flex justify-between items-baseline">
                      <span
                        className={`font-headline-md text-sm font-semibold truncate ${
                          isSelected ? 'text-primary' : 'text-text-muted'
                        }`}
                      >
                        {cName}
                      </span>
                      <span className="font-label-mono text-[10px] text-text-muted uppercase">
                        {conv.status}
                      </span>
                    </div>

                    <span className="font-label-mono text-xs text-text-muted truncate">
                      {cRole}
                    </span>
                    <p className="font-body-md text-xs text-text-muted truncate mt-0.5">
                      Match score: {conv.matchScore}%
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Main Chat Thread Area matching stitch design */}
        <section className="flex-grow flex flex-col h-full bg-surface border border-border-hairline overflow-hidden relative">
          {activeAppId ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-hairline bg-surface-container-lowest flex-none">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border border-border-hairline bg-surface-container flex items-center justify-center font-display-xl font-bold text-lg text-primary uppercase">
                      {partnerName[0]}
                    </div>
                    <div
                      className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface-container-lowest ${
                        isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                      title={isPartnerOnline ? 'Online' : 'Offline'}
                    ></div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-lg md:text-xl font-bold text-primary tracking-tight">
                        {partnerName}
                      </h2>
                      <span
                        className={`font-label-mono text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          isPartnerOnline
                            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                            : 'bg-surface-container-low text-text-muted border border-border-hairline'
                        }`}
                      >
                        {isPartnerOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                        {partnerRoleTitle}
                      </span>
                      <span className="text-border-hairline">•</span>
                      {role === 'recruiter' && studentUser._id ? (
                        <Link
                          to={`/recruiter/candidates/${studentUser._id}?openingId=${opening._id}`}
                          className="font-label-mono text-xs text-primary hover:text-match-indicator underline transition-colors"
                        >
                          View Candidate
                        </Link>
                      ) : opening._id ? (
                        <Link
                          to={`/student/openings/${opening._id}`}
                          className="font-label-mono text-xs text-primary hover:text-match-indicator underline transition-colors"
                        >
                          View Opening
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Match indicator pill */}
                <div className="hidden sm:flex flex-col items-end">
                  <span className="font-label-mono text-[10px] text-text-muted uppercase tracking-wider">
                    Match Confidence
                  </span>
                  <span className="font-display-xl text-lg font-bold text-match-indicator">
                    {matchScore}%
                  </span>
                </div>
              </div>

              {/* Chat Message Scrollable Container */}
              <div className="flex-grow p-4 md:p-6 overflow-y-auto space-y-4">
                {isMessagesLoading ? (
                  <div className="h-full flex items-center justify-center font-label-mono text-xs text-text-muted">
                    Loading interview thread...
                  </div>
                ) : liveMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-text-muted">
                    <span className="material-symbols-outlined text-4xl mb-2 text-text-muted">
                      chat_bubble_outline
                    </span>
                    <p className="font-body-md text-sm">No messages exchanged yet.</p>
                    <p className="font-label-mono text-xs mt-1 text-text-muted">
                      Send a message below to start the conversation.
                    </p>
                  </div>
                ) : (
                  liveMessages.map((msg) => {
                    const isOwn =
                      msg.senderId?._id === currentUserId ||
                      msg.senderId?.id === currentUserId ||
                      msg.senderId === currentUserId;

                    if (isOwn) {
                      return (
                        <div
                          key={msg._id || msg.timestamp}
                          className="flex flex-col items-end gap-1 max-w-[80%] md:max-w-[70%] ml-auto"
                        >
                          <span className="font-label-mono text-[10px] text-text-muted mr-1">
                            You
                          </span>
                          <div className="bg-primary text-on-primary p-4 rounded-tl-xl rounded-tr-xl rounded-bl-xl font-body-md text-sm leading-relaxed shadow-sm">
                            {msg.text}
                          </div>
                          <span className="font-label-mono text-[11px] text-text-muted mr-1">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg._id || msg.timestamp}
                        className="flex flex-col items-start gap-1 max-w-[80%] md:max-w-[70%]"
                      >
                        <span className="font-label-mono text-[10px] text-text-muted ml-1">
                          {msg.senderId?.name || partnerName}
                        </span>
                        <div className="bg-surface-container-low text-primary p-4 border border-border-hairline rounded-tr-xl rounded-br-xl rounded-tl-xl font-body-md text-sm leading-relaxed shadow-sm">
                          {msg.text}
                        </div>
                        <span className="font-label-mono text-[11px] text-text-muted ml-1">
                          {formatMessageTime(msg.timestamp)}
                        </span>
                      </div>
                    );
                  })
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Typing Indicator floating above message bar matching stitch design */}
              {isOtherUserTyping && (
                <div className="absolute bottom-[84px] left-6 z-20 bg-surface-container-lowest px-3 py-1.5 border border-border-hairline rounded-full flex items-center gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.06)] animate-fade-in">
                  <span className="font-label-mono text-xs text-text-muted lowercase">
                    {otherUserTypingName || partnerName} is typing
                  </span>
                  <div className="flex gap-1 items-center">
                    <div
                      className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0s' }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                    <div
                      className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Message Input Area matching stitch design */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 md:p-6 border-t border-border-hairline bg-surface-container-lowest flex-none relative z-10"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-grow relative">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      onKeyDown={handleKeyDown}
                      placeholder="Type an interview message (Press Enter to send)..."
                      className="w-full border-0 border-b-2 border-border-hairline focus:border-primary bg-transparent py-3 px-0 font-body-md text-sm text-primary placeholder:font-label-mono placeholder:text-text-muted outline-none transition-colors rounded-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputMessage.trim()}
                    className="flex-none bg-primary text-on-primary px-6 md:px-8 py-3 font-label-mono text-xs hover:bg-match-indicator disabled:opacity-40 transition-colors duration-200 flex items-center gap-2 rounded font-bold cursor-pointer"
                  >
                    <span>SEND</span>
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-text-muted font-body-md">
              <span className="material-symbols-outlined text-5xl mb-3 text-text-muted">
                forum
              </span>
              <h3 className="font-headline-md text-lg font-bold text-primary mb-1">
                Select an Interview Conversation
              </h3>
              <p className="text-xs text-text-muted max-w-sm">
                Choose a candidate or application from the sidebar to open the direct interview
                messaging channel.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default InterviewChat;
