import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function InterviewChat() {
  const { applicationId } = useParams();
  const { role, user } = useAuth();

  return (
    <div className="py-8">
      <div className="bg-surface-container-lowest border border-border-hairline p-8">
        <div className="flex justify-between items-center pb-6 border-b border-border-hairline mb-6">
          <div>
            <h1 className="font-display-xl text-2xl md:text-3xl font-bold tracking-tight text-primary">
              Interview Chat
            </h1>
            <p className="font-body-md text-text-muted text-sm mt-1">
              Active conversation context: {applicationId ? `Application #${applicationId}` : 'General Channel'}
            </p>
          </div>
          <span className="px-3 py-1 font-label-mono text-xs uppercase bg-surface-container border border-border-hairline text-primary">
            Logged in as {role} ({user?.name})
          </span>
        </div>

        <div className="p-8 border border-dashed border-border-hairline text-center text-text-muted font-label-mono text-sm">
          Chat and real-time messaging interface stub.
        </div>
      </div>
    </div>
  );
}

export default InterviewChat;
