import { useState } from 'react';
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { getRoleDashboard } from '../utils/roles';

export function Login() {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to role-based dashboard
  if (isAuthenticated) {
    return <Navigate to={getRoleDashboard(role)} replace />;
  }

  const validateField = (name, value) => {
    let error = '';
    if (name === 'email') {
      const emailTrimmed = value.trim();
      if (!emailTrimmed) {
        error = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
        error = 'Please provide a valid email address.';
      }
    } else if (name === 'password') {
      if (!value) {
        error = 'Password is required.';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    // Validate all fields
    const errors = {
      email: validateField('email', formData.email),
      password: validateField('password', formData.password),
    };

    setFieldErrors(errors);
    setTouched({ email: true, password: true });

    if (errors.email || errors.password) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (result.success && result.token && result.user) {
        // Store in AuthContext & localStorage
        login(result.user, result.token);

        // Check if recruiter is pending approval
        if (result.user.role === 'recruiter' && result.user.status === 'pending') {
          // If pending approval, still logged in with limited state or redirect to dashboard
          const fromPath = location.state?.from?.pathname;
          const target = fromPath && fromPath.startsWith('/recruiter') ? fromPath : '/recruiter/dashboard';
          navigate(target, { replace: true });
        } else {
          const fromPath = location.state?.from?.pathname;
          const defaultDash = getRoleDashboard(result.user.role);
          const target = fromPath && fromPath.startsWith(`/${result.user.role}`) ? fromPath : defaultDash;
          navigate(target, { replace: true });
        }
      } else {
        setServerError({
          title: 'Authentication Error',
          message: result.message || 'Unable to log in. Please check your credentials.',
        });
      }
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors)) {
        // Validation errors from express-validator
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
          title: 'Invalid credentials.',
          message: resp?.message || 'Please try again or reset your password.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-6 md:py-12">
      <div className="w-full max-w-md bg-surface-container-lowest border border-border-hairline p-8 md:p-12 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>

        {/* Header matching stitch_talent_match_web_ui/talent_match_login */}
        <div className="text-center mb-10">
          <h1 className="font-display-xl text-3xl md:text-4xl font-extrabold text-primary tracking-tighter mb-2">
            TALENT MATCH
          </h1>
          <p className="font-headline-md text-base md:text-lg text-on-surface uppercase tracking-wider font-semibold">
            LOGIN
          </p>
        </div>

        {/* Redirect Notice if coming from a protected route */}
        {location.state?.from && (
          <div className="p-3 mb-6 bg-surface-container border border-border-hairline text-xs font-label-mono text-primary">
            Please log in to access <span className="font-bold">{location.state.from.pathname}</span>
          </div>
        )}

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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {/* Email Address */}
          <div className="space-y-1">
            <label
              className="block font-label-mono text-xs text-on-surface-variant uppercase tracking-wider"
              htmlFor="email"
            >
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
              placeholder="Enter your email"
              className={`w-full bg-transparent border-0 border-b-2 ${
                fieldErrors.email ? 'border-error' : 'border-border-hairline focus:border-primary'
              } focus:ring-0 px-0 py-2.5 font-body-md text-base text-on-surface placeholder:text-text-muted transition-colors rounded-none outline-none`}
            />
            {fieldErrors.email && (
              <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex justify-between items-end">
              <label
                className="block font-label-mono text-xs text-on-surface-variant uppercase tracking-wider"
                htmlFor="password"
              >
                Password
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-label-sm text-xs text-text-muted hover:text-primary transition-colors"
              >
                Forgot Password?
              </a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              aria-invalid={Boolean(fieldErrors.password)}
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Enter your password"
              className={`w-full bg-transparent border-0 border-b-2 ${
                fieldErrors.password ? 'border-error' : 'border-border-hairline focus:border-primary'
              } focus:ring-0 px-0 py-2.5 font-body-md text-base text-on-surface placeholder:text-text-muted transition-colors rounded-none outline-none`}
            />
            {fieldErrors.password && (
              <p className="text-xs font-label-mono text-error mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary font-headline-md text-sm md:text-base py-4 px-6 hover:bg-match-indicator disabled:opacity-60 transition-colors duration-300 flex items-center justify-center group border border-primary uppercase tracking-wider font-bold cursor-pointer"
          >
            <span>{isSubmitting ? 'SIGNING IN...' : 'SIGN IN'}</span>
            <span className="material-symbols-outlined ml-2 text-lg transform group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 text-center border-t border-border-hairline pt-6">
          <p className="font-body-md text-xs md:text-sm text-on-surface-variant">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-primary underline hover:text-match-indicator transition-colors ml-1"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
