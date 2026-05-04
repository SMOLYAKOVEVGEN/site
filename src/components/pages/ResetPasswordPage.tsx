import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Lock, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateCustomerPassword } from '@/lib/customer-auth';
import { supabase } from '@/lib/supabase';
import { usePageMeta } from '@/lib/use-page-meta';

export default function ResetPasswordPage() {
  usePageMeta({
    title: 'Смена пароля',
    description: 'Создание нового пароля для личного кабинета.',
  });
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function restoreSessionFromHash() {
      try {
        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;

        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (!access_token || !refresh_token) {
          if (!active) return;
          setSessionError('Ссылка восстановления недействительна или уже истекла.');
          setSessionReady(false);
          return;
        }

        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (error) {
          throw error;
        }

        if (!active) return;
        setSessionReady(true);
        setSessionError('');
      } catch (error: any) {
        console.error('Reset password session restore failed:', error);
        if (!active) return;
        setSessionError(
          typeof error?.message === 'string' && error.message.trim()
            ? error.message
            : 'Не удалось открыть страницу смены пароля'
        );
        setSessionReady(false);
      }
    }

    restoreSessionFromHash();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      if (!sessionReady) {
        throw new Error('Сессия восстановления не активна');
      }

      if (password.trim().length < 6) {
        throw new Error('Пароль должен быть не короче 6 символов');
      }

      if (password !== passwordRepeat) {
        throw new Error('Пароли не совпадают');
      }

      await updateCustomerPassword(password);

      setSuccessMessage('Пароль успешно обновлен. Теперь можно войти с новым паролем.');
      setErrorMessage('');

      window.setTimeout(() => {
        navigate('/account', { replace: true });
      }, 1200);
    } catch (error: any) {
      console.error('Update password failed:', error);
      setErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось обновить пароль'
      );
      setSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main" className="min-h-screen bg-[linear-gradient(180deg,#f7f8fa_0%,#eef2f6_100%)]">
      <section className="border-b border-graphite/10 bg-white">
        <div className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 py-10">
          <div className="text-sm text-steel-gray mb-4">
            <Link to="/" className="hover:text-primary transition-colors">
              Главная
            </Link>
            <span className="mx-2">/</span>
            <span>Новый пароль</span>
          </div>

          <h1 className="font-heading text-3xl md:text-4xl text-graphite font-bold">
            Новый пароль
          </h1>
          <p className="mt-3 max-w-3xl text-steel-gray text-base md:text-lg">
            Установите новый пароль для доступа к вашему аккаунту.
          </p>
        </div>
      </section>

      <section className="max-w-[120rem] mx-auto px-6 md:px-12 lg:px-24 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] rounded-[28px] overflow-hidden border border-graphite/10 shadow-[0_20px_80px_rgba(15,23,32,0.08)] bg-white">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative min-h-[560px] bg-[radial-gradient(circle_at_top_left,#163b73_0%,#0f1720_60%,#0b1118_100%)] text-white p-8 md:p-12 flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-primary/10 text-primary border border-primary/10">
                <ShieldCheck className="h-4 w-4" />
                Обновление доступа
              </div>

              <h2 className="mt-6 text-3xl md:text-4xl font-heading font-bold leading-tight">
                Задайте новый пароль
              </h2>

              <p className="mt-4 text-white/75 max-w-lg text-base md:text-lg">
                После сохранения нового пароля вы сможете войти в личный кабинет с обновленными данными.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Надежно</div>
                <div className="mt-1 text-xs text-white/65">
                  Используйте пароль не короче 6 символов.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Быстро</div>
                <div className="mt-1 text-xs text-white/65">
                  После обновления можно сразу входить.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Удобно</div>
                <div className="mt-1 text-xs text-white/65">
                  Смена пароля доступна прямо из письма.
                </div>
              </div>
            </div>
          </motion.div>

          <div className="p-8 md:p-12 flex items-center bg-white">
            <div className="w-full max-w-[520px] mx-auto">
              {!sessionReady && sessionError ? (
                <div className="space-y-5">
                  <div className="min-h-[54px] rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{sessionError}</span>
                  </div>

                  <Link to="/forgot-password">
                    <Button className="w-full bg-primary hover:bg-primary/90 text-white h-12">
                      Запросить новую ссылку
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-graphite mb-2">
                      Новый пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Введите новый пароль"
                        className="pl-11 pr-11 h-12 border-graphite/15 focus-visible:ring-primary"
                        disabled={isSubmitting}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-steel-gray hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-graphite mb-2">
                      Повторите пароль
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordRepeat}
                        onChange={(e) => setPasswordRepeat(e.target.value)}
                        placeholder="Повторите новый пароль"
                        className="pl-11 h-12 border-graphite/15 focus-visible:ring-primary"
                        disabled={isSubmitting}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting || !sessionReady}
                    className="w-full h-12 bg-[linear-gradient(90deg,#7aa2ff_0%,#8b5cf6_100%)] hover:opacity-90 text-white text-sm font-semibold rounded-xl shadow-md"
                  >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить новый пароль'}
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  {successMessage && (
                    <div className="min-h-[54px] rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{successMessage}</span>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="min-h-[54px] rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200">
                      <ShieldCheck className="h-4 w-4" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}