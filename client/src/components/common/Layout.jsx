import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-primary">
      <Navbar />
      <main className="flex-grow w-full max-w-[1440px] mx-auto px-4 md:px-16 py-8">
        {children ? children : <Outlet />}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
