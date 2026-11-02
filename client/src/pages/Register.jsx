import { Link } from 'react-router-dom';

export function Register() {
  return (
    <div className="py-12 max-w-xl mx-auto">
      <div className="bg-surface-container-lowest border border-border-hairline p-8 md:p-12">
        <h1 className="font-display-xl text-3xl md:text-4xl font-bold tracking-tight text-primary mb-2">
          Create Account
        </h1>
        <p className="font-body-md text-text-muted mb-8">
          Register to begin discovering curated tech opportunities.
        </p>

        <div className="p-6 border border-border-hairline bg-surface-container mb-6 text-sm font-label-mono text-primary">
          Registration form will be built in the authentication phase.
        </div>

        <div className="font-label-mono text-xs">
          Already have an account?{' '}
          <Link to="/login" className="text-match-indicator underline uppercase font-bold">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
