import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { isCustomerAuthenticated } from '@/lib/customer-auth';

export default function CheckoutProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const ok = await isCustomerAuthenticated();
        if (!active) return;
        setStatus(ok ? 'allowed' : 'denied');
      } catch (error) {
        console.error('Checkout auth check failed:', error);
        if (!active) return;
        setStatus('denied');
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === 'denied') {
    const next = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/checkout-auth-required?next=${next}`} replace />;
  }

  return <Outlet />;
}