import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { openingService } from '../../services/openingService';

export function PostEditOpening() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState([]);
  const [availabilityNeeds, setAvailabilityNeeds] = useState('Full-time');
  const [status, setStatus] = useState('active');

  const [newSkill, setNewSkill] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  // If editing, load existing opening
  const { data: existingData, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['opening', id],
    queryFn: () => openingService.getOpeningById(id),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingData?.opening) {
      const o = existingData.opening;
      setTitle(o.title || '');
      setDescription(o.description || '');
      setRequiredSkills(Array.isArray(o.requiredSkills) ? o.requiredSkills : []);
      setAvailabilityNeeds(o.availabilityNeeds || 'Full-time');
      setStatus(o.status || 'active');
    }
  }, [existingData]);

  // Mutation for saving
  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (isEditing) {
        return openingService.updateOpening(id, payload);
      }
      return openingService.createOpening(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myOpenings'] });
      queryClient.invalidateQueries({ queryKey: ['recommendedOpenings'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: ['opening', id] });
      }
      navigate('/recruiter/dashboard');
    },
    onError: (err) => {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors)) {
        const errors = {};
        resp.errors.forEach((e) => {
          if (e.path) errors[e.path] = e.msg;
        });
        setFieldErrors(errors);
        setServerError(resp.errors.map((e) => e.msg).join('. '));
      } else {
        setServerError(resp?.message || 'Failed to save job opening.');
      }
    },
  });

  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkill.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills([...requiredSkills, trimmed]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError(null);

    const errors = {};
    if (!title.trim()) {
      errors.title = 'Opening title is required.';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    saveMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      requiredSkills,
      availabilityNeeds,
      status,
    });
  };

  const availabilityOptions = ['Full-time', 'Part-time', 'Internship', 'Contract'];

  if (isEditing && isLoadingExisting) {
    return (
      <div className="py-16 text-center font-label-mono text-xs text-text-muted animate-pulse">
        Loading opening data...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-6 md:py-12">
      <div className="w-full max-w-3xl bg-surface-container-lowest border border-border-hairline p-8 md:p-12 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/recruiter/dashboard"
            className="font-label-mono text-xs uppercase tracking-wider text-text-muted hover:text-primary transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>

        {/* Header matching stitch_talent_match_post_edit_opening */}
        <div className="mb-10">
          <h1 className="font-display-xl text-3xl md:text-5xl font-extrabold text-primary tracking-tighter mb-2">
            {isEditing ? 'Edit Opening' : 'Post New Opening'}
          </h1>
          <p className="font-body-md text-sm text-text-muted">
            Define requirements and stack specifications to match qualified student talent.
          </p>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="flex items-start space-x-3 p-4 bg-error-container text-on-error-container border-l-4 border-error mb-8">
            <span className="material-symbols-outlined text-error text-xl">error</span>
            <p className="font-body-md text-xs text-error mt-0.5">{serverError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-10" noValidate>
          {/* Opening Title */}
          <div>
            <label
              className="block font-label-mono text-xs text-text-muted uppercase tracking-wider mb-1"
              htmlFor="opening_title"
            >
              Opening Title *
            </label>
            <input
              id="opening_title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Senior Full Stack Engineer"
              className={`w-full bg-transparent border-0 border-b-2 ${
                fieldErrors.title ? 'border-error' : 'border-border-hairline focus:border-primary'
              } px-0 py-3 font-headline-md text-xl md:text-2xl text-primary placeholder:text-text-muted outline-none transition-colors rounded-none`}
            />
            {fieldErrors.title && (
              <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Job Description */}
          <div>
            <label
              className="block font-label-mono text-xs text-text-muted uppercase tracking-wider mb-2"
              htmlFor="job_description"
            >
              Job Description
            </label>
            <textarea
              id="job_description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the core responsibilities, engineering challenges, and impact of this role..."
              className="w-full bg-transparent border-0 border-b-2 border-border-hairline focus:border-primary px-0 py-3 font-body-md text-base text-primary placeholder:text-text-muted outline-none transition-colors resize-none rounded-none"
            />
          </div>

          {/* Required Skills */}
          <div>
            <label className="block font-label-mono text-xs text-text-muted uppercase tracking-wider mb-3">
              Required Skills (Tags)
            </label>
            <div className="border-b-2 border-border-hairline pb-4 flex flex-wrap gap-2.5 items-center focus-within:border-primary transition-colors">
              {requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center bg-surface-container border border-border-hairline px-3 py-1 gap-2 font-label-mono text-xs text-primary"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="material-symbols-outlined text-[15px] text-text-muted hover:text-error transition-colors"
                  >
                    close
                  </button>
                </span>
              ))}

              <div className="flex items-center gap-2 flex-grow min-w-[200px]">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddSkill(e);
                  }}
                  placeholder="Add a skill and press Enter..."
                  className="bg-transparent border-none p-0 font-label-mono text-xs text-primary placeholder:text-text-muted outline-none flex-grow"
                />
                {newSkill.trim() && (
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="text-xs font-label-mono uppercase text-match-indicator font-bold"
                  >
                    + Add
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] font-label-mono text-text-muted mt-2">
              Skills are used by the discovery engine to compute candidate match scores.
            </p>
          </div>

          {/* Availability Needs */}
          <div>
            <label className="block font-label-mono text-xs text-text-muted uppercase tracking-wider mb-4">
              Availability Needs
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availabilityOptions.map((opt) => {
                const isSelected = availabilityNeeds === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setAvailabilityNeeds(opt)}
                    className={`p-3 text-center font-label-mono text-xs uppercase tracking-wider border transition-all cursor-pointer ${
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
          </div>

          {/* Opening Status */}
          <div>
            <label className="block font-label-mono text-xs text-text-muted uppercase tracking-wider mb-3">
              Publication Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2.5 cursor-pointer font-label-mono text-xs text-primary">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === 'active'}
                  onChange={() => setStatus('active')}
                  className="text-primary focus:ring-0"
                />
                <span>Active (Discoverable by Students)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer font-label-mono text-xs text-text-muted">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                  className="text-primary focus:ring-0"
                />
                <span>Draft (Saved privately)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-8 border-t border-border-hairline flex flex-col sm:flex-row gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/recruiter/dashboard')}
              className="px-8 py-4 border border-border-hairline text-primary font-label-mono text-xs uppercase tracking-widest hover:bg-surface-container transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-10 py-4 bg-primary text-on-primary font-label-mono text-xs uppercase tracking-widest hover:bg-match-indicator disabled:opacity-60 transition-colors font-bold cursor-pointer"
            >
              {saveMutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Save Changes'
                : 'Publish Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PostEditOpening;
