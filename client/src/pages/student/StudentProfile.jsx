import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '../../services/studentService';

export function StudentProfile() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['myStudentProfile'],
    queryFn: studentService.getMyProfile,
  });

  const student = data?.student;

  // Form states with fallback to loaded student values
  const [githubUsername, setGithubUsername] = useState(null);
  const [skills, setSkills] = useState(null);
  const [interests, setInterests] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [linkedinUrl, setLinkedinUrl] = useState(null);
  const [portfolioUrl, setPortfolioUrl] = useState(null);

  const currentGithub = githubUsername ?? student?.githubUsername ?? '';
  const currentSkills = skills ?? (Array.isArray(student?.skills) ? student.skills : []);
  const currentInterests = interests ?? (Array.isArray(student?.interests) ? student.interests : []);
  const currentAvailability = availability ?? student?.availability ?? 'Full-time';
  const currentLinkedin = linkedinUrl ?? student?.linkedinUrl ?? '';
  const currentPortfolio = portfolioUrl ?? student?.portfolioUrl ?? '';

  // Local input helpers for adding tags
  const [newSkill, setNewSkill] = useState('');
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [isAddingInterest, setIsAddingInterest] = useState(false);

  // Status feedback
  const [feedback, setFeedback] = useState(null);

  // Sync GitHub Mutation
  const syncGithubMutation = useMutation({
    mutationFn: (username) => studentService.syncGithub(username),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myStudentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendedOpenings'] });
      setFeedback({
        type: 'success',
        message: res.message || 'GitHub data successfully fetched and cached.',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to fetch GitHub data. Check username.',
      });
    },
  });

  // Save Profile Mutation
  const saveProfileMutation = useMutation({
    mutationFn: (payload) => studentService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myStudentProfile'] });
      queryClient.invalidateQueries({ queryKey: ['recommendedOpenings'] });
      setFeedback({
        type: 'success',
        message: 'Student profile updated successfully!',
      });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile.',
      });
    },
  });

  const handleFetchGithub = () => {
    if (!currentGithub.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a GitHub username first.' });
      return;
    }
    setFeedback(null);
    syncGithubMutation.mutate(currentGithub.trim());
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !currentSkills.includes(trimmed)) {
      setSkills([...currentSkills, trimmed]);
      setNewSkill('');
      setIsAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(currentSkills.filter((s) => s !== skillToRemove));
  };

  const handleAddInterest = (e) => {
    e.preventDefault();
    const trimmed = newInterest.trim();
    if (trimmed && !currentInterests.includes(trimmed)) {
      setInterests([...currentInterests, trimmed]);
      setNewInterest('');
      setIsAddingInterest(false);
    }
  };

  const handleRemoveInterest = (interestToRemove) => {
    setInterests(currentInterests.filter((i) => i !== interestToRemove));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setFeedback(null);

    saveProfileMutation.mutate({
      skills: currentSkills,
      interests: currentInterests,
      availability: currentAvailability,
      githubUsername: currentGithub.trim(),
      linkedinUrl: currentLinkedin.trim(),
      portfolioUrl: currentPortfolio.trim(),
    });
  };

  const availabilityOptions = ['Full-time', 'Part-time', 'Internship', 'Contract'];
  const githubStats = student?.githubStats || { contributions: 0, topLanguages: [], repoCount: 0 };

  if (isLoading) {
    return (
      <div className="py-12 text-center font-label-mono text-xs text-text-muted animate-pulse">
        Loading profile data...
      </div>
    );
  }

  return (
    <div className="py-6 max-w-[1100px] mx-auto">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 mb-8 flex items-center justify-between border-l-4 ${
            feedback.type === 'success'
              ? 'bg-surface-container text-primary border-primary'
              : 'bg-error-container text-on-error-container border-error'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-label-mono">
            <span className="material-symbols-outlined text-base">
              {feedback.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-text-muted hover:text-primary font-bold text-sm"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSaveProfile} className="flex flex-col gap-12">
        {/* Section 1: Header & Identity */}
        <section>
          <div className="mb-8">
            <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold text-primary tracking-tighter mb-2">
              Edit Profile
            </h1>
            <p className="font-body-md text-sm text-text-muted">
              Configure your technical credentials and discovery parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-1">
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                disabled
                value={student?.userId?.name || ''}
                className="w-full bg-surface-container-low border-0 border-b-2 border-border-hairline p-2.5 font-body-md text-sm text-primary opacity-80 cursor-not-allowed outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="text"
                disabled
                value={student?.userId?.email || ''}
                className="w-full bg-surface-container-low border-0 border-b-2 border-border-hairline p-2.5 font-body-md text-sm text-primary opacity-80 cursor-not-allowed outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={currentLinkedin}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="w-full bg-transparent border-0 border-b-2 border-border-hairline focus:border-primary p-2.5 font-body-md text-sm text-primary outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                Portfolio URL
              </label>
              <input
                type="url"
                value={currentPortfolio}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://yourportfolio.dev"
                className="w-full bg-transparent border-0 border-b-2 border-border-hairline focus:border-primary p-2.5 font-body-md text-sm text-primary outline-none transition-colors"
              />
            </div>
          </div>
        </section>

        <hr className="border-t border-border-hairline" />

        {/* Section 2: GitHub Integration */}
        <section>
          <h2 className="font-headline-lg text-xl md:text-2xl font-bold text-primary tracking-tight mb-2">
            GitHub Integration
          </h2>
          <p className="font-body-md text-xs text-text-muted mb-6">
            Sync public repositories to calculate your match score against job openings.
          </p>

          <div className="flex flex-col md:flex-row gap-4 items-end mb-8">
            <div className="flex flex-col gap-1 flex-grow w-full">
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider">
                GitHub Username
              </label>
              <input
                type="text"
                value={currentGithub}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g. octocat"
                className="w-full bg-transparent border-0 border-b-2 border-border-hairline focus:border-primary p-2.5 font-label-mono text-sm text-primary outline-none transition-colors"
              />
            </div>

            <button
              type="button"
              onClick={handleFetchGithub}
              disabled={syncGithubMutation.isPending}
              className="bg-primary text-on-primary font-label-mono text-xs px-8 py-3.5 hover:bg-match-indicator disabled:opacity-60 transition-colors shrink-0 uppercase tracking-wider font-bold cursor-pointer"
            >
              {syncGithubMutation.isPending ? 'Fetching...' : 'Fetch GitHub Data'}
            </button>
          </div>

          {/* Cached Stats Card matching stitch_talent_match_student_profile_setup */}
          <div className="bg-surface-container-lowest border border-border-hairline p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
            <div className="flex flex-col gap-1">
              <span className="font-label-mono text-xs text-text-muted uppercase">Repositories</span>
              <span className="font-headline-md text-2xl font-bold text-primary">
                {githubStats.repoCount || 0}
              </span>
            </div>

            <div className="hidden md:block w-px h-10 bg-border-hairline"></div>

            <div className="flex flex-col gap-1">
              <span className="font-label-mono text-xs text-text-muted uppercase">Contributions</span>
              <span className="font-headline-md text-2xl font-bold text-primary">
                {githubStats.contributions || 0}
              </span>
            </div>

            <div className="hidden md:block w-px h-10 bg-border-hairline"></div>

            <div className="flex flex-col gap-1">
              <span className="font-label-mono text-xs text-text-muted uppercase">Top Languages</span>
              <span className="font-label-mono text-xs text-primary pt-1">
                {githubStats.topLanguages && githubStats.topLanguages.length > 0
                  ? githubStats.topLanguages.join(' / ')
                  : 'None indexed'}
              </span>
            </div>

            <div className="hidden md:block w-px h-10 bg-border-hairline"></div>

            <div className="flex flex-col items-start md:items-center">
              <span className="font-label-mono text-[11px] text-text-muted uppercase mb-1">
                Status
              </span>
              <span
                className={`material-symbols-outlined text-xl ${
                  student?.githubUsername ? 'text-match-indicator' : 'text-text-muted'
                }`}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {student?.githubUsername ? 'check_circle' : 'pending'}
              </span>
            </div>
          </div>
        </section>

        <hr className="border-t border-border-hairline" />

        {/* Section 3: Professional Focus (Skills & Interests) */}
        <section>
          <h2 className="font-headline-lg text-xl md:text-2xl font-bold text-primary tracking-tight mb-2">
            Professional Focus
          </h2>
          <p className="font-body-md text-xs text-text-muted mb-8">
            Add tech stack keywords and industry focus areas to match with recruiters.
          </p>

          <div className="flex flex-col gap-8">
            {/* Skills */}
            <div>
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider block mb-3">
                Skills Stack
              </label>
              <div className="flex flex-wrap gap-2.5 items-center">
                {currentSkills.map((skill) => (
                  <span
                    key={skill}
                    className="border border-border-hairline px-3.5 py-1.5 font-label-mono text-xs bg-surface-container-lowest flex items-center gap-2 text-primary"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="material-symbols-outlined text-[15px] cursor-pointer hover:text-error transition-colors"
                    >
                      close
                    </button>
                  </span>
                ))}

                {isAddingSkill ? (
                  <div className="flex items-center gap-2 border border-primary px-2 py-1 bg-white">
                    <input
                      type="text"
                      autoFocus
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddSkill(e);
                        if (e.key === 'Escape') setIsAddingSkill(false);
                      }}
                      placeholder="e.g. React"
                      className="font-label-mono text-xs outline-none bg-transparent w-24"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="text-xs font-bold text-primary hover:text-match-indicator"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(false)}
                      className="text-xs text-text-muted"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingSkill(true)}
                    className="border border-border-hairline border-dashed px-3.5 py-1.5 font-label-mono text-xs bg-surface-container-lowest text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    + Add Skill
                  </button>
                )}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label className="font-label-mono text-xs text-text-muted uppercase tracking-wider block mb-3">
                Interests & Domains
              </label>
              <div className="flex flex-wrap gap-2.5 items-center">
                {currentInterests.map((interest) => (
                  <span
                    key={interest}
                    className="border border-border-hairline px-3.5 py-1.5 font-label-mono text-xs bg-surface-container-lowest flex items-center gap-2 text-primary"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => handleRemoveInterest(interest)}
                      className="material-symbols-outlined text-[15px] cursor-pointer hover:text-error transition-colors"
                    >
                      close
                    </button>
                  </span>
                ))}

                {isAddingInterest ? (
                  <div className="flex items-center gap-2 border border-primary px-2 py-1 bg-white">
                    <input
                      type="text"
                      autoFocus
                      value={newInterest}
                      onChange={(e) => setNewInterest(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddInterest(e);
                        if (e.key === 'Escape') setIsAddingInterest(false);
                      }}
                      placeholder="e.g. FinTech"
                      className="font-label-mono text-xs outline-none bg-transparent w-24"
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="text-xs font-bold text-primary hover:text-match-indicator"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingInterest(false)}
                      className="text-xs text-text-muted"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingInterest(true)}
                    className="border border-border-hairline border-dashed px-3.5 py-1.5 font-label-mono text-xs bg-surface-container-lowest text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    + Add Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-t border-border-hairline" />

        {/* Section 4: Availability */}
        <section>
          <h2 className="font-headline-lg text-xl md:text-2xl font-bold text-primary tracking-tight mb-2">
            Availability
          </h2>
          <p className="font-body-md text-xs text-text-muted mb-6">
            Select your preferred work engagement type.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availabilityOptions.map((opt) => {
              const isSelected = currentAvailability === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => setAvailability(opt)}
                  className={`p-4 text-center font-label-mono text-xs uppercase tracking-wider border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary border-primary font-bold'
                      : 'border-border-hairline bg-surface-container-lowest text-text-muted hover:border-primary hover:text-primary'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </section>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saveProfileMutation.isPending}
            className="bg-primary text-on-primary font-label-mono text-xs px-12 py-4 hover:bg-match-indicator disabled:opacity-60 transition-colors uppercase tracking-widest font-bold cursor-pointer"
          >
            {saveProfileMutation.isPending ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StudentProfile;
