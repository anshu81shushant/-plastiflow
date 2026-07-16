import Sidebar from './Sidebar';
import InstallPrompt from './InstallPrompt';

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">{children}</main>
      <InstallPrompt />
    </div>
  );
}
