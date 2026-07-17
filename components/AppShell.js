import Sidebar from './Sidebar';
import InstallPrompt from './InstallPrompt';
import FloatingActionButton from './FloatingActionButton';
import ChatAssistant from './ChatAssistant';

export default function AppShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">{children}</main>
      <InstallPrompt />
      <FloatingActionButton />
      <ChatAssistant />
    </div>
  );
}
