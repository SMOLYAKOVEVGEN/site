import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  User,
  Building2,
  Phone,
  Landmark,
  MapPin,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { customerLogin, customerRegister } from '@/lib/customer-auth';
import accountAuthBg from '@/assets/account/account-auth-bg.png';
import { usePageMeta } from '@/lib/use-page-meta';

type LoginState = 'idle' | 'success' | 'error';
type ActiveTab = 'login' | 'register';
type RegisterCustomerType = 'individual' | 'company';

function resolveRedirectTarget(rawNext: string | null, rawRedirect: string | null): string {
  const candidate = (rawNext || rawRedirect || '/').trim();

  if (!candidate) return '/';
  if (!candidate.startsWith('/')) return '/';
  if (candidate.startsWith('//')) return '/';

  return candidate;
}

function getInputClass(hasError = false) {
  return [
    'h-12 border-graphite/15 focus-visible:ring-primary',
    hasError ? 'border-red-300 focus-visible:ring-red-500' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export default function AccountPage() {
  usePageMeta({
    title: 'Личный кабинет',
    description: 'Вход и регистрация клиента АВТОграф.',
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = resolveRedirectTarget(
    searchParams.get('next'),
    searchParams.get('redirect')
  );

  const [activeTab, setActiveTab] = useState<ActiveTab>('login');
  const [registerCustomerType, setRegisterCustomerType] =
    useState<RegisterCustomerType>('individual');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [individualFullName, setIndividualFullName] = useState('');
  const [individualEmail, setIndividualEmail] = useState('');
  const [individualPhone, setIndividualPhone] = useState('');
  const [individualComment, setIndividualComment] = useState('');
  const [individualPassword, setIndividualPassword] = useState('');
  const [individualPasswordRepeat, setIndividualPasswordRepeat] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyInn, setCompanyInn] = useState('');
  const [companyKpp, setCompanyKpp] = useState('');
  const [companyOgrn, setCompanyOgrn] = useState('');
  const [companyLegalAddress, setCompanyLegalAddress] = useState('');
  const [companyContactPerson, setCompanyContactPerson] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyComment, setCompanyComment] = useState('');
  const [companyPassword, setCompanyPassword] = useState('');
  const [companyPasswordRepeat, setCompanyPasswordRepeat] = useState('');

  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterPasswordRepeat, setShowRegisterPasswordRepeat] = useState(false);

  const [agreePersonalData, setAgreePersonalData] = useState(false);
  const [agreeNewsletter, setAgreeNewsletter] = useState(false);

  const [loginState, setLoginState] = useState<LoginState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerSubmitted, setRegisterSubmitted] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  const currentRegisterEmail =
    registerCustomerType === 'individual' ? individualEmail : companyEmail;

  const currentRegisterPassword =
    registerCustomerType === 'individual' ? individualPassword : companyPassword;

  const currentRegisterPasswordRepeat =
    registerCustomerType === 'individual'
      ? individualPasswordRepeat
      : companyPasswordRepeat;

  const registerPasswordMismatch =
    Boolean(currentRegisterPasswordRepeat) &&
    currentRegisterPassword !== currentRegisterPasswordRepeat;

  const registerPasswordTooShort =
    Boolean(currentRegisterPassword) && currentRegisterPassword.length < 6;

  const registerCanSubmit =
    agreePersonalData &&
    !registerPasswordMismatch &&
    !registerPasswordTooShort &&
    currentRegisterPassword.length >= 6;

  const panelData = useMemo(() => {
    if (activeTab === 'register' && registerSubmitted) {
      return {
        title: 'Регистрация выполнена',
        text: 'Аккаунт создан. Проверьте почту, если у вас включено подтверждение email, и затем выполните вход, чтобы продолжить оформление заказа.',
        badge: 'Аккаунт создан',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        messageClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        messageIcon: <CheckCircle2 className="h-4 w-4" />,
      };
    }

    if (activeTab === 'login' && loginState === 'success') {
      return {
        title: 'Доступ подтвержден',
        text: 'Вы успешно вошли в аккаунт. Сейчас продолжим работу на нужной странице.',
        badge: 'Успешный вход',
        badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        messageClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        messageIcon: <CheckCircle2 className="h-4 w-4" />,
      };
    }

    if (activeTab === 'login' && loginState === 'error') {
      return {
        title: 'Ошибка авторизации',
        text: 'Проверьте email и пароль. Если аккаунта еще нет, зарегистрируйтесь.',
        badge: 'Ошибка входа',
        badgeClass: 'bg-red-50 text-red-700 border border-red-200',
        messageClass: 'bg-red-50 text-red-700 border border-red-200',
        messageIcon: <AlertTriangle className="h-4 w-4" />,
      };
    }

    if (activeTab === 'register') {
      return {
        title:
          registerCustomerType === 'company'
            ? 'Регистрация юридического лица'
            : 'Регистрация физического лица',
        text:
          registerCustomerType === 'company'
            ? 'Создайте аккаунт организации, чтобы оформлять заказы, сохранять реквизиты и работать с обращениями.'
            : 'Создайте личный аккаунт, чтобы перейти к оформлению заказа, хранить избранное и работать с заявками.',
        badge:
          registerCustomerType === 'company'
            ? 'Новый аккаунт юрлица'
            : 'Новый аккаунт физлица',
        badgeClass: 'bg-primary/10 text-primary border border-primary/10',
        messageClass: 'bg-slate-50 text-slate-600 border border-slate-200',
        messageIcon: <ShieldCheck className="h-4 w-4" />,
      };
    }

    return {
      title: 'Вход в личный кабинет',
      text: 'Авторизуйтесь для оформления заказа, работы с корзиной и дальнейшего сопровождения обращений.',
      badge: 'Безопасный вход',
      badgeClass: 'bg-primary/10 text-primary border border-primary/10',
      messageClass: 'bg-slate-50 text-slate-600 border border-slate-200',
      messageIcon: <ShieldCheck className="h-4 w-4" />,
    };
  }, [activeTab, loginState, registerSubmitted, registerCustomerType]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRegisterSubmitted(false);
    setLoginState('idle');
    setLoginMessage('');

    try {
      await customerLogin(email, password);
      setLoginState('success');
      setLoginMessage('Вход выполнен успешно.');

      window.setTimeout(() => {
        navigate(redirectTarget, { replace: true });
      }, 700);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Customer login failed:', error?.message || error);
      }
      setLoginState('error');
      const rawMsg = typeof error?.message === 'string' ? error.message.trim().toLowerCase() : '';
      let friendlyMsg = 'Не удалось выполнить вход';
      if (
        rawMsg.includes('invalid login credentials') ||
        rawMsg.includes('invalid email or password') ||
        rawMsg.includes('email not confirmed') ||
        error?.status === 400
      ) {
        friendlyMsg = 'Неверный email или пароль';
      } else if (rawMsg.includes('too many requests') || error?.status === 429) {
        friendlyMsg = 'Слишком много попыток. Попробуйте позже';
      } else if (rawMsg.includes('network') || rawMsg.includes('fetch')) {
        friendlyMsg = 'Ошибка сети. Проверьте соединение';
      } else if (rawMsg) {
        friendlyMsg = error.message;
      }
      setLoginMessage(friendlyMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreePersonalData) {
      setRegisterSubmitted(false);
      setRegisterMessage('Нужно подтвердить согласие на обработку персональных данных.');
      return;
    }

    if (currentRegisterPassword.length < 6) {
      setRegisterSubmitted(false);
      setRegisterMessage('Пароль должен содержать не менее 6 символов.');
      return;
    }

    if (currentRegisterPassword !== currentRegisterPasswordRepeat) {
      setRegisterSubmitted(false);
      setRegisterMessage('Пароль и подтверждение пароля не совпадают.');
      return;
    }

    setIsSubmitting(true);
    setLoginState('idle');
    setRegisterMessage('');

    try {
      if (registerCustomerType === 'individual') {
        await customerRegister({
          customerType: 'individual',
          email: individualEmail,
          password: individualPassword,
          fullName: individualFullName,
          phone: individualPhone,
          comment: individualComment,
          company: '',
          companyName: '',
          inn: '',
          kpp: '',
          ogrn: '',
          legalAddress: '',
          contactPerson: '',
          agreePersonalData,
          agreeNewsletter,
        } as any);

        setEmail(individualEmail);
        setPassword(individualPassword);
        setIndividualPassword('');
        setIndividualPasswordRepeat('');
      } else {
        await customerRegister({
          customerType: 'company',
          email: companyEmail,
          password: companyPassword,
          fullName: companyContactPerson,
          phone: companyPhone,
          comment: companyComment,
          company: companyName,
          companyName,
          inn: companyInn,
          kpp: companyKpp,
          ogrn: companyOgrn,
          legalAddress: companyLegalAddress,
          contactPerson: companyContactPerson,
          agreePersonalData,
          agreeNewsletter,
        } as any);

        setEmail(companyEmail);
        setPassword(companyPassword);
        setCompanyPassword('');
        setCompanyPasswordRepeat('');
      }

      setRegisterSubmitted(true);
      setRegisterMessage('Аккаунт создан. Теперь выполните вход под своими данными.');
      setActiveTab('login');
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Customer register failed:', error?.message || error);
      }
      setRegisterSubmitted(false);
      setRegisterMessage(
        typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : 'Не удалось создать аккаунт'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main" className="min-h-screen bg-[linear-gradient(180deg,#f7f8fa_0%,#eef2f6_100%)]">
      <section className="bg-graphite py-12 text-primary-foreground sm:py-20">
        <div className="mx-auto max-w-[100rem] px-4 sm:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-4 text-sm text-white/70">
              <Link to="/" className="transition-colors hover:text-white">
                Главная
              </Link>
              <span className="mx-2">/</span>
              <span>Личный кабинет</span>
            </div>

            <h1 className="mb-4 font-heading text-3xl leading-tight sm:mb-6 sm:text-5xl lg:text-6xl">
              Личный кабинет клиента
            </h1>

            <p className="max-w-4xl font-paragraph text-base leading-relaxed text-primary-foreground/85 sm:text-xl">
              Авторизация и регистрация для оформления заказа, работы с корзиной,
              избранным и дальнейшего сопровождения обращений.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-10 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[100rem] px-4 sm:px-8"></div>
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] rounded-[28px] overflow-hidden border border-graphite/10 shadow-[0_20px_80px_rgba(15,23,32,0.08)] bg-white">
          <motion.div
            animate={
              activeTab === 'login' && loginState === 'error'
                ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
                : activeTab === 'login' && loginState === 'success'
                ? { scale: [1, 1.015, 1] }
                : { x: 0, scale: 1 }
            }
            transition={{ duration: 0.5 }}
            className="relative min-h-[620px] overflow-hidden text-white p-8 md:p-12 flex flex-col justify-between"
          >
            <div className="absolute inset-0">
              <img
                src={accountAuthBg.src}
                alt="Фоновое изображение авторизации"
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0b1730] via-[#0b1730]/88 to-[#07101d]/58" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#08111d]/55 via-transparent to-[#08111d]/18" />
              <div className="absolute inset-0 opacity-20 [background-size:40px_40px] [background-image:linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)]" />
            </div>

            <div className="relative z-10 max-w-[620px]">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${panelData.badgeClass}`}
              >
                {panelData.messageIcon}
                {panelData.badge}
              </div>

              <motion.h2
                key={panelData.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-3xl md:text-5xl font-heading font-bold leading-tight"
              >
                {panelData.title}
              </motion.h2>

              <motion.p
                key={panelData.text}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-4 text-white/80 max-w-lg text-base md:text-xl leading-relaxed"
              >
                {panelData.text}
              </motion.p>
            </div>

            <div className="relative z-10 grid sm:grid-cols-3 gap-3 mt-8">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-[2px]">
                <div className="text-sm font-medium">Оформление заказа</div>
                <div className="mt-1 text-xs text-white/65">
                  Быстрый переход к оформлению после входа.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-[2px]">
                <div className="text-sm font-medium">Избранные позиции</div>
                <div className="mt-1 text-xs text-white/65">
                  Доступ к сохраненным товарам и истории.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-[2px]">
                <div className="text-sm font-medium">Сопровождение</div>
                <div className="mt-1 text-xs text-white/65">
                  Работа с заказами, заявками и запросами.
                </div>
              </div>
            </div>
          </motion.div>

          <div className="p-8 md:p-12 flex items-center bg-white">
            <div className="w-full max-w-[560px] mx-auto">
              <div className="mb-8">
                <p className="text-xs uppercase tracking-[0.22em] text-steel-gray">
                  Авторизация
                </p>

                <div className="mt-4 inline-flex rounded-2xl border border-graphite/10 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setRegisterSubmitted(false);
                      setRegisterMessage('');
                    }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'login'
                        ? 'bg-white text-graphite shadow-sm'
                        : 'text-steel-gray hover:text-graphite'
                    }`}
                  >
                    Вход
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setLoginState('idle');
                      setLoginMessage('');
                    }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'register'
                        ? 'bg-white text-graphite shadow-sm'
                        : 'text-steel-gray hover:text-graphite'
                    }`}
                  >
                    Регистрация
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'login' ? (
                  <motion.form
                    key="login"
                    onSubmit={handleLoginSubmit}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="space-y-5"
                  >
                    <div>
                      <label htmlFor="login-email" className="block text-sm font-medium text-graphite mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                        <Input
                          id="login-email"
                          type="email"
                          autoComplete="email"
                          aria-invalid={loginState === 'error'}
                          aria-describedby={loginState === 'error' ? 'login-message' : undefined}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Введите email"
                          className={`pl-11 ${getInputClass(loginState === 'error' && !email)}`}
                          disabled={isSubmitting}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="login-password" className="block text-sm font-medium text-graphite mb-2">
                        Пароль
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          aria-invalid={loginState === 'error'}
                          aria-describedby={loginState === 'error' ? 'login-message' : undefined}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Введите пароль"
                          className={`pl-11 pr-11 ${getInputClass(loginState === 'error' && !password)}`}
                          disabled={isSubmitting}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-steel-gray hover:text-primary transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full h-12 text-white text-sm font-semibold rounded-xl shadow-md transition-all ${
                        loginState === 'success'
                          ? 'bg-emerald-600 hover:bg-emerald-600'
                          : 'bg-[linear-gradient(90deg,#7aa2ff_0%,#8b5cf6_100%)] hover:opacity-90'
                      }`}
                    >
                      {isSubmitting ? 'Проверка...' : loginState === 'success' ? 'Успешный вход' : 'Войти'}
                      {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    <motion.div
                      key={`login-${loginState}-${loginMessage}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      id="login-message"
                      className={`min-h-[54px] rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium ${panelData.messageClass}`}
                    >
                      {panelData.messageIcon}
                      <span>
                        {loginState === 'idle' &&
                          'Введите email и пароль от вашего аккаунта.'}
                        {loginState === 'success' &&
                          (loginMessage || 'Вход выполнен успешно.')}
                        {loginState === 'error' &&
                          (loginMessage || 'Не удалось выполнить вход.')}
                      </span>
                    </motion.div>

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <Link
                        to="/forgot-password"
                        className="text-sm text-primary hover:opacity-80 transition-opacity"
                      >
                        Забыли пароль?
                      </Link>
                    </div>
                  </motion.form>
                ) : (
                  <motion.form
                    key="register"
                    onSubmit={handleRegisterSubmit}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="space-y-5"
                  >
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-graphite">
                        Тип регистрации
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setRegisterCustomerType('individual')}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            registerCustomerType === 'individual'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-graphite/10 bg-white text-steel-gray hover:border-graphite/20 hover:text-graphite'
                          }`}
                        >
                          Физическое лицо
                        </button>

                        <button
                          type="button"
                          onClick={() => setRegisterCustomerType('company')}
                          className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                            registerCustomerType === 'company'
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-graphite/10 bg-white text-steel-gray hover:border-graphite/20 hover:text-graphite'
                          }`}
                        >
                          Юридическое лицо
                        </button>
                      </div>
                    </div>

                    {registerCustomerType === 'individual' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            ФИО *
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="text"
                              value={individualFullName}
                              onChange={(e) => setIndividualFullName(e.target.value)}
                              placeholder="Введите ФИО"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Email *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="email"
                              value={individualEmail}
                              onChange={(e) => setIndividualEmail(e.target.value)}
                              placeholder="Введите email"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Телефон
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="text"
                              value={individualPhone}
                              onChange={(e) => setIndividualPhone(e.target.value)}
                              placeholder="+7 (___) ___-__-__"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Пароль *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type={showRegisterPassword ? 'text' : 'password'}
                              value={individualPassword}
                              onChange={(e) => setIndividualPassword(e.target.value)}
                              placeholder="Минимум 6 символов"
                              className={`pl-11 pr-11 ${getInputClass(registerPasswordTooShort)}`}
                              disabled={isSubmitting}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword((v) => !v)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-steel-gray hover:text-primary transition-colors"
                            >
                              {showRegisterPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Повторите пароль *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type={showRegisterPasswordRepeat ? 'text' : 'password'}
                              value={individualPasswordRepeat}
                              onChange={(e) => setIndividualPasswordRepeat(e.target.value)}
                              placeholder="Повторите пароль"
                              className={`pl-11 pr-11 ${getInputClass(registerPasswordMismatch)}`}
                              disabled={isSubmitting}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPasswordRepeat((v) => !v)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-steel-gray hover:text-primary transition-colors"
                            >
                              {showRegisterPasswordRepeat ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Комментарий
                          </label>
                          <textarea
                            value={individualComment}
                            onChange={(e) => setIndividualComment(e.target.value)}
                            placeholder="Дополнительная информация"
                            className="w-full min-h-[110px] rounded-xl border border-graphite/15 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                            disabled={isSubmitting}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Наименование организации *
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="text"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="Введите название организации"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-graphite mb-2">
                              ИНН *
                            </label>
                            <div className="relative">
                              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                              <Input
                                type="text"
                                value={companyInn}
                                onChange={(e) => setCompanyInn(e.target.value)}
                                placeholder="ИНН"
                                className={`pl-11 ${getInputClass()}`}
                                disabled={isSubmitting}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-graphite mb-2">
                              КПП
                            </label>
                            <div className="relative">
                              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                              <Input
                                type="text"
                                value={companyKpp}
                                onChange={(e) => setCompanyKpp(e.target.value)}
                                placeholder="КПП"
                                className={`pl-11 ${getInputClass()}`}
                                disabled={isSubmitting}
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            ОГРН / ОГРНИП
                          </label>
                          <div className="relative">
                            <Landmark className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="text"
                              value={companyOgrn}
                              onChange={(e) => setCompanyOgrn(e.target.value)}
                              placeholder="ОГРН или ОГРНИП"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Юридический адрес
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-4 h-4 w-4 text-steel-gray" />
                            <textarea
                              value={companyLegalAddress}
                              onChange={(e) => setCompanyLegalAddress(e.target.value)}
                              placeholder="Введите юридический адрес"
                              className="w-full min-h-[90px] rounded-xl border border-graphite/15 pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Контактное лицо *
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="text"
                              value={companyContactPerson}
                              onChange={(e) => setCompanyContactPerson(e.target.value)}
                              placeholder="ФИО контактного лица"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Email *
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="email"
                              value={companyEmail}
                              onChange={(e) => setCompanyEmail(e.target.value)}
                              placeholder="Введите email"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Телефон
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type="text"
                              value={companyPhone}
                              onChange={(e) => setCompanyPhone(e.target.value)}
                              placeholder="+7 (___) ___-__-__"
                              className={`pl-11 ${getInputClass()}`}
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Пароль *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type={showRegisterPassword ? 'text' : 'password'}
                              value={companyPassword}
                              onChange={(e) => setCompanyPassword(e.target.value)}
                              placeholder="Минимум 6 символов"
                              className={`pl-11 pr-11 ${getInputClass(registerPasswordTooShort)}`}
                              disabled={isSubmitting}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword((v) => !v)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-steel-gray hover:text-primary transition-colors"
                            >
                              {showRegisterPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Повторите пароль *
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-gray" />
                            <Input
                              type={showRegisterPasswordRepeat ? 'text' : 'password'}
                              value={companyPasswordRepeat}
                              onChange={(e) => setCompanyPasswordRepeat(e.target.value)}
                              placeholder="Повторите пароль"
                              className={`pl-11 pr-11 ${getInputClass(registerPasswordMismatch)}`}
                              disabled={isSubmitting}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPasswordRepeat((v) => !v)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-steel-gray hover:text-primary transition-colors"
                            >
                              {showRegisterPasswordRepeat ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-graphite mb-2">
                            Комментарий
                          </label>
                          <textarea
                            value={companyComment}
                            onChange={(e) => setCompanyComment(e.target.value)}
                            placeholder="Дополнительная информация"
                            className="w-full min-h-[110px] rounded-xl border border-graphite/15 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                            disabled={isSubmitting}
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-3 rounded-2xl border border-graphite/10 bg-slate-50 p-4">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreePersonalData}
                          onChange={(e) => setAgreePersonalData(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-graphite/20 text-primary focus:ring-primary"
                          disabled={isSubmitting}
                          required
                        />
                        <span className="text-sm text-graphite leading-relaxed">
                          Я согласен на обработку персональных данных и принимаю условия
                          политики конфиденциальности. *
                        </span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreeNewsletter}
                          onChange={(e) => setAgreeNewsletter(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded border-graphite/20 text-primary focus:ring-primary"
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-steel-gray leading-relaxed">
                          Согласен получать информационные и рекламные рассылки по email.
                        </span>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || !registerCanSubmit}
                      className={`w-full h-12 text-sm font-semibold rounded-xl shadow-md transition-all ${
                        registerCanSubmit
                          ? 'bg-primary hover:bg-primary/90 text-white'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {isSubmitting ? 'Отправка...' : 'Создать аккаунт'}
                      {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    <motion.div
                      key={`register-${registerSubmitted}-${registerMessage}-${registerCustomerType}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`min-h-[54px] rounded-xl px-4 py-3 flex items-center gap-3 text-sm font-medium ${
                        registerSubmitted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : registerPasswordMismatch || registerPasswordTooShort || !agreePersonalData
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {registerSubmitted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : registerPasswordMismatch || registerPasswordTooShort || !agreePersonalData ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                      <span>
                        {registerMessage ||
                          (registerPasswordMismatch
                            ? 'Пароль и подтверждение пароля должны совпадать.'
                            : registerPasswordTooShort
                            ? 'Пароль должен содержать не менее 6 символов.'
                            : !agreePersonalData
                            ? 'Для регистрации нужно подтвердить согласие на обработку персональных данных.'
                            : `Заполните форму ${
                                registerCustomerType === 'company'
                                  ? 'юридического лица'
                                  : 'физического лица'
                              }, чтобы создать аккаунт.`)}
                      </span>
                    </motion.div>

                    {!registerSubmitted && currentRegisterEmail && (
                      <p className="text-xs text-steel-gray">
                        После регистрации вы сможете войти с этим email.
                      </p>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}