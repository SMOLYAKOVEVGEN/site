import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  BadgePercent,
  Upload,
  LogOut,
  FileText,
} from 'lucide-react';
import { adminLogout } from '@/lib/admin-auth';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';

const nav = [
  { to: '/admin', label: 'Дашборд', icon: LayoutDashboard },
  { to: '/admin/leads', label: 'Заявки', icon: FileText },
  { to: '/admin/products', label: 'Товары', icon: Package },
  { to: '/admin/categories', label: 'Категории', icon: FolderTree },
  { to: '/admin/brands', label: 'Бренды', icon: BadgePercent },
  { to: '/admin/import', label: 'Импорт', icon: Upload },
];

export default function AdminLayout() {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
    }

    const previousContent = meta.content;
    meta.content = 'noindex, nofollow';

    return () => {
      if (previousContent) {
        meta!.content = previousContent;
      } else {
        meta!.remove();
      }
    };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await adminLogout();
      toast.success('Вы вышли из админки');
      navigate('/admin-login', { replace: true });
    } catch (error) {
      console.error('Admin logout failed:', error);
      toast.error('Не удалось выйти из админки');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid grid-cols-[260px_1fr] min-h-screen">
        <aside className="border-r border-slate-200 bg-white p-6 flex flex-col">
          <div className="mb-8">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Admin</div>
            <div className="text-2xl font-heading text-graphite">Каталог</div>
          </div>

          <nav className="space-y-2 flex-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.to ||
                (item.to !== '/admin' && location.pathname.startsWith(item.to));

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                    active ? 'bg-primary text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? 'Выход...' : 'Выйти'}
          </button>
        </aside>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}