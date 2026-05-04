import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { adminLogin } from '@/lib/admin-auth';
import toast from 'react-hot-toast';
import { usePageMeta } from '@/lib/use-page-meta';

export default function AdminLoginPage() {
  usePageMeta({
    title: 'Вход в админ-панель',
    description: 'Вход в административный раздел сайта АВТОграф.',
    robots: 'noindex, nofollow',
  });
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      toast.error('Введите email и пароль');
      return;
    }

    setLoading(true);

    try {
      const ok = await adminLogin(normalizedEmail, normalizedPassword);

      if (ok) {
        toast.success('Вход выполнен');
        navigate('/admin', { replace: true });
      } else {
        toast.error('Нет доступа к админке или неверные учетные данные');
      }
    } catch (error) {
      console.error('Admin login failed:', error);
      toast.error('Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="main" role="main" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="mb-8">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500 mb-2">Admin</div>
          <h1 className="text-3xl font-heading text-graphite">Вход в админку</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-slate-600 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-11"
                placeholder="Введите email"
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-2">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 pl-11"
                placeholder="Введите пароль"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-white px-5 py-3 disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}