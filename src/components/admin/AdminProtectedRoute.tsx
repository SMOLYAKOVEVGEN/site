import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function AdminProtectedRoute() {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      try {
        const ok = await isAdminAuthenticated();
        if (!active) return;
        setStatus(ok ? 'allowed' : 'denied');
      } catch (error) {
        console.error('Admin auth check failed:', error);
        if (!active) return;
        setStatus('denied');
      }
    }

    checkAccess();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/admin-login" replace />;
  }

  return <Outlet />;
}