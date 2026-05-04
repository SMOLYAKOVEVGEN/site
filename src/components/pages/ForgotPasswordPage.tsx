import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendPasswordResetEmail } from '@/lib/customer-auth';
import { usePageMeta } from '@/lib/use-page-meta';

export default function ForgotPasswordPage() {
  usePageMeta({
    title: 'Восстановление пароля',
    description: 'Восстановление доступа к личному кабинету клиента.',
  });
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await sendPasswordResetEmail(email);

      setSuccessMessage(
        'Если аккаунт с таким email существует, мы отправили письмо для восстановления пароля.'
      );
      setErrorMessage('');
    } catch (error: any) {
      console.error('Password reset request failed:', error);
      setErrorMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось отправить письмо для восстановления'
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
            <Link to="/account" className="hover:text-primary transition-colors">
              Личный кабинет
            </Link>
            <span className="mx-2">/</span>
            <span>Восстановление пароля</span>
          </div>

          <h1 className="font-heading text-3xl md:text-4xl text-graphite font-bold">
            Восстановление пароля
          </h1>
          <p className="mt-3 max-w-3xl text-steel-gray text-base md:text-lg">
            Введите email, и мы отправим письмо со ссылкой для смены пароля.
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
                Восстановление доступа
              </div>

              <h2 className="mt-6 text-3xl md:text-4xl font-heading font-bold leading-tight">
                Сброс пароля
              </h2>

              <p className="mt-4 text-white/75 max-w-lg text-base md:text-lg">
                После перехода по ссылке из письма вы сможете задать новый пароль для своего аккаунта.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Безопасность</div>
                <div className="mt-1 text-xs text-white/65">
                  Смена пароля доступна только через письмо.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Быстро</div>
                <div className="mt-1 text-xs text-white/65">
                  Восстановление занимает пару минут.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-sm font-medium">Удобно</div>
                <div className="mt-1 text-xs text-white/65">
                  После смены пароля можно сразу войти.
                </div>
              </div>
            </div>
          </motion.div>

          <div className="p-8 md:p-12 flex items-center bg-white">
            <div className="w-full max-w-[520px] mx-auto">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-graphite mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Введите email"
                      className="pl-11 h-12 border-graphite/15 focus-visible:ring-primary"
                      disabled={isSubmitting}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-[linear-gradient(90deg,#7aa2ff_0%,#8b5cf6_100%)] hover:opacity-90 text-white text-sm font-semibold rounded-xl shadow-md"
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить ссылку'}
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

                <div className="text-sm text-steel-gray">
                  Вспомнили пароль?{' '}
                  <Link to="/account" className="text-primary hover:opacity-80 transition-opacity">
                    Вернуться ко входу
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}