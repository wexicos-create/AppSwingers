import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import AuthGate from './auth/AuthGate';
import './index.css';

function Root() {
  return <AuthGate>{({ user, isAdmin, signOut }) => (
    <div className="min-h-screen bg-[#090414]">
      <div className="sticky top-0 z-[100] flex items-center justify-between gap-3 border-b border-purple-500/20 bg-[#090414]/95 px-4 py-2 text-xs text-white backdrop-blur">
        <div className="min-w-0">
          <span className="font-semibold">{user.email}</span>
          {isAdmin && <span className="ml-2 rounded-full border border-pink-400/40 px-2 py-0.5 text-pink-200">Rol administrativo</span>}
        </div>
        <button onClick={() => void signOut()} className="shrink-0 rounded-lg border border-purple-400/30 px-3 py-1.5 hover:bg-purple-900/40">Cerrar sesión segura</button>
      </div>
      <App authUser={user} isAdmin={isAdmin} onSignOut={signOut} />
    </div>
  )}</AuthGate>;
}

createRoot(document.getElementById('root')!).render(<Root />);
