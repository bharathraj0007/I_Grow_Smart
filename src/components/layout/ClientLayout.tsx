import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Subheader from './Subheader';
import FloatingChatbot from '../FloatingChatbot';

export default function ClientLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Subheader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-muted border-t border-border py-8 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2025 AgriSmart. Empowering farmers with technology.</p>
        </div>
      </footer>
      <FloatingChatbot />
    </div>
  );
}
