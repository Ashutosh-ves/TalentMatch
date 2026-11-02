import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full bg-background border-t border-border-hairline mt-auto">
      <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 md:px-16 py-8 max-w-[1440px] mx-auto gap-6">
        <div className="font-display-xl font-bold text-lg tracking-tighter text-primary">
          TALENT MATCH
        </div>

        <nav className="flex flex-wrap justify-center gap-8 font-label-mono text-xs text-on-surface-variant uppercase tracking-wider">
          <Link to="#" className="hover:text-match-indicator transition-colors">
            Privacy
          </Link>
          <Link to="#" className="hover:text-match-indicator transition-colors">
            Terms
          </Link>
          <Link to="#" className="hover:text-match-indicator transition-colors">
            Editorial
          </Link>
          <Link to="#" className="hover:text-match-indicator transition-colors">
            Contact
          </Link>
        </nav>

        <div className="font-label-mono text-xs text-text-muted">
          © 2024 TALENT MATCH. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
