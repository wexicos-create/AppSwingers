import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

type Props = { user: User | null; children: ReactNode; requiredRole?: boolean; isAdmin?: boolean };

export default function ProtectedRoute({ user, children, requiredRole = false, isAdmin = false }: Props) {
  if (!user) return null;
  if (requiredRole && !isAdmin) {
    return <main className="min-h-screen bg-[#090414] text-white grid place-items-center p-6"><section className="max-w-md rounded-2xl border border-red-400/30 bg-[#160b20] p-6 text-center"><h1 className="text-xl font-bold">Acceso restringido</h1><p className="mt-2 text-sm text-purple-100/80">Esta sección requiere un rol administrativo autorizado.</p></section></main>;
  }
  return <>{children}</>;
}
