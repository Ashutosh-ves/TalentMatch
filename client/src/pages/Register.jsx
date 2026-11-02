import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';

export function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('student'); // 'student' or 'recruiter'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
  });

  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    companyName: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingApprovalUser, setPendingApprovalUser] = useState(null);

  const validateField = (fieldName, value) => {
    let error = '';
    if (fieldName === 'name') {
      if (!value.trim()) {
        error = 'Full name is required.';
      }
    } else if (fieldName === 'email') {
      const emailTrimmed = value.trim();
      if (!emailTrimmed) {
        error = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        error = 'Please provide a valid email address.';
      }
    } else if (fieldName === 'password') {
      if (!value) {
        error = 'Password is required.';
      } else if (value.length < 6) {
        error = 'Password must be at least 6 characters long.';
      }
    } else if (fieldName === 'companyName' && role === 'recruiter') {
      if (!value.trim()) {
        error = 'Company name is required for company registration.';
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError(null);

    if (touched[name]) {
      const err = validateField(name, value);
      setFieldErrors((prev) => ({ ...prev, [name]: err }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const err = validateField(name, value);
    setFieldErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleRoleToggle = (selectedRole) => {
    setRole(selectedRole);
    setServerError(null);
    setFieldErrors({});
    setTouched({
      name: false,
      email: false,
      password: false,
      companyName: false,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    // Validate all fields
    const errors = {
      name: validateField('name', formData.name),
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };

    if (role === 'recruiter') {
      errors.companyName = validateField('companyName', formData.companyName);
    }

    setFieldErrors(errors);
    setTouched({
      name: true,
      email: true,
      password: true,
      companyName: role === 'recruiter',
    });

    const hasErrors = Object.values(errors).some((err) => Boolean(err));
    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: role,
        ...(role === 'recruiter' && { companyName: formData.companyName.trim() }),
      };

      const result = await authService.register(payload);

      if (result.success && result.user) {
        // Check if user status requires pending approval (Recruiter)
        if (result.user.status === 'pending' || result.user.role === 'recruiter') {
          // Reflect pending-approval state rather than immediate dashboard redirect
          setPendingApprovalUser({
            name: result.user.name,
            email: result.user.email,
            companyName: formData.companyName.trim(),
            status: result.user.status,
          });
        } else {
          // Student flow: Log in directly and redirect to student dashboard
          login(result.user, result.token);
          navigate('/student/dashboard', { replace: true });
        }
      } else {
        setServerError({
          title: 'Registration failed',
          message: result.message || 'Unable to complete registration. Please try again.',
        });
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors)) {
        const newFieldErrors = {};
        resp.errors.forEach((e) => {
          if (e.path) newFieldErrors[e.path] = e.msg;
        });
        setFieldErrors(newFieldErrors);
        setServerError({
          title: 'Validation failed',
          message: resp.errors.map((e) => e.msg).join('. '),
        });
      } else {
        setServerError({
          title: 'Registration failed',
          message: resp?.message || 'Unable to create account. Please try again.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-6 md:py-12">
      <main className="w-full max-w-[480px] bg-surface-container-lowest border border-border-hairline rounded-none p-8 md:p-12 relative">
        {/* Pending Approval Confirmation View (for Recruiter / Company) */}
        {pendingApprovalUser ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center bg-surface-container border border-border-hairline">
              <span className="material-symbols-outlined text-3xl text-primary">
                hourglass_top
              </span>
            </div>

            <h1 className="font-headline-lg text-2xl md:text-3xl font-extrabold uppercase text-primary tracking-tight mb-2">
              Registration Submitted
            </h1>

            <div className="inline-block px-3 py-1 font-label-mono text-xs uppercase bg-surface-container border border-border-hairline text-primary mb-6">
              Status: Pending Approval
            </div>

            <p className="font-body-md text-sm text-text-muted mb-6 leading-relaxed">
              Your company account for{' '}
              <span className="font-bold text-primary">
                {pendingApprovalUser.companyName || pendingApprovalUser.name}
              </span>{' '}
              has been registered. An administrator will review your credentials before granting access to post openings and browse talent.
            </p>

            <div className="p-4 bg-surface-container-low border border-border-hairline text-left mb-8 text-xs font-label-mono space-y-1">
              <div>
                <span className="text-text-muted">Account Name:</span> {pendingApprovalUser.name}
              </div>
              <div>
                <span className="text-text-muted">Registered Email:</span> {pendingApprovalUser.email}
              </div>
              <div>
                <span className="text-text-muted">Access Level:</span> Recruiter (Pending)
              </div>
            </div>

            <Link
              to="/login"
              className="inline-block w-full font-label-mono text-xs uppercase tracking-widest bg-primary text-on-primary py-4 px-6 hover:bg-secondary-container transition-colors text-center font-bold"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Header matching stitch_talent_match_web_ui/talent_match_register */}
            <header className="mb-8 text-center">
              <h1 className="font-headline-lg text-2xl md:text-3xl font-bold text-primary uppercase tracking-tight mb-2">
                Create Account.
              </h1>
              <p className="font-body-md text-sm text-text-muted">
                Join the professional network for ambitious talent.
              </p>
            </header>

            {/* Role Toggle Button Group */}
            <div
              aria-label="Role selection"
              className="flex border border-border-hairline p-1 mb-8"
              role="group"
            >
              <button
                type="button"
                id="role-student"
                onClick={() => handleRoleToggle('student')}
                className={`flex-1 py-3 text-center font-label-mono text-xs uppercase tracking-wider transition-colors focus:outline-none cursor-pointer ${
                  role === 'student'
                    ? 'text-on-primary bg-primary font-bold'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                STUDENT
              </button>
              <button
                type="button"
                id="role-company"
                onClick={() => handleRoleToggle('recruiter')}
                className={`flex-1 py-3 text-center font-label-mono text-xs uppercase tracking-wider transition-colors focus:outline-none cursor-pointer ${
                  role === 'recruiter'
                    ? 'text-on-primary bg-primary font-bold'
                    : 'text-text-muted hover:text-primary'
                }`}
              >
                COMPANY
              </button>
            </div>

            {/* Server Error Alert */}
            {serverError && (
              <div className="flex items-start space-x-3 p-4 bg-error-container text-on-error-container border-l-4 border-error mb-6">
                <span className="material-symbols-outlined text-error text-xl">error</span>
                <div>
                  <p className="font-label-sm text-xs font-bold text-error">{serverError.title}</p>
                  <p className="font-body-md text-xs text-error mt-0.5">{serverError.message}</p>
                </div>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Full Name */}
              <div>
                <label className="sr-only" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="FULL NAME"
                  className={`block w-full border-0 border-b-2 ${
                    fieldErrors.name ? 'border-error' : 'border-border-hairline focus:border-primary'
                  } bg-transparent py-3.5 pl-0 pr-4 text-primary font-body-md text-sm placeholder:font-label-mono placeholder:text-xs placeholder:text-text-muted focus:ring-0 transition-colors rounded-none outline-none`}
                />
                {fieldErrors.name && (
                  <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Company Name (visible only when Company role selected) */}
              {role === 'recruiter' && (
                <div>
                  <label className="sr-only" htmlFor="companyName">
                    Company Name
                  </label>
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    aria-invalid={Boolean(fieldErrors.companyName)}
                    value={formData.companyName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="COMPANY NAME"
                    className={`block w-full border-0 border-b-2 ${
                      fieldErrors.companyName ? 'border-error' : 'border-border-hairline focus:border-primary'
                    } bg-transparent py-3.5 pl-0 pr-4 text-primary font-body-md text-sm placeholder:font-label-mono placeholder:text-xs placeholder:text-text-muted focus:ring-0 transition-colors rounded-none outline-none`}
                  />
                  {fieldErrors.companyName && (
                    <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.companyName}</p>
                  )}
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="sr-only" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  aria-invalid={Boolean(fieldErrors.email)}
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="EMAIL ADDRESS"
                  className={`block w-full border-0 border-b-2 ${
                    fieldErrors.email ? 'border-error' : 'border-border-hairline focus:border-primary'
                  } bg-transparent py-3.5 pl-0 pr-4 text-primary font-body-md text-sm placeholder:font-label-mono placeholder:text-xs placeholder:text-text-muted focus:ring-0 transition-colors rounded-none outline-none`}
                />
                {fieldErrors.email && (
                  <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="relative">
                <label className="sr-only" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="PASSWORD (MIN 6 CHARACTERS)"
                  className={`block w-full border-0 border-b-2 ${
                    fieldErrors.password ? 'border-error' : 'border-border-hairline focus:border-primary'
                  } bg-transparent py-3.5 pl-0 pr-4 text-primary font-body-md text-sm placeholder:font-label-mono placeholder:text-xs placeholder:text-text-muted focus:ring-0 transition-colors rounded-none outline-none`}
                />
                {fieldErrors.password && (
                  <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-on-primary font-label-mono text-xs py-4 px-6 uppercase tracking-wider hover:bg-secondary-container disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary mt-8 font-bold cursor-pointer"
              >
                {isSubmitting ? 'REGISTERING...' : 'REGISTER'}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="font-body-md text-xs md:text-sm text-text-muted hover:text-primary transition-colors"
              >
                Already have an account?{' '}
                <span className="font-bold underline decoration-border-hairline underline-offset-4 text-primary">
                  Sign In
                </span>
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default Register;
