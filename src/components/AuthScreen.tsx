import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Clapperboard,
  Eye,
  EyeOff,
  Film,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LogoLockup, LogoMark } from './Logo';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthScreenProps {
  initialMode?: AuthMode;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
];

const inputClass =
  'w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 focus:outline-none transition-colors';

export const AuthScreen: React.FC<AuthScreenProps> = ({ initialMode = 'login' }) => {
  const { login, register, settings, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [loginEmail, setLoginEmail] = useState(() => {
    try {
      return localStorage.getItem('sl_last_email') || '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);

  const [forgotEmail, setForgotEmail] = useState('');

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError('');
    setNotice('');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!loginEmail.trim() || !loginPassword) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }
    setSubmitting(true);
    const result = await login(loginEmail.trim(), loginPassword, remember);
    setSubmitting(false);
    if (!result.success) setError(result.message || 'No se pudo iniciar sesión.');
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Completa tu nombre, correo y contraseña.');
      return;
    }
    if (!email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    const result = await register({ name: name.trim(), email: email.trim(), password, avatar });
    setSubmitting(false);
    if (!result.success) setError(result.message || 'No se pudo crear la cuenta.');
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!forgotEmail.trim()) {
      setError('Ingresa el correo asociado a tu cuenta.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo enviar la solicitud.');
      }
      setNotice(
        payload?.message ||
          'Si el correo existe en ScreenLog Pro, un administrador podrá restablecer la contraseña de forma segura.',
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-slate-100 flex flex-col lg:flex-row relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-32 w-[520px] h-[520px] rounded-full bg-rose-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 right-0 w-[520px] h-[520px] rounded-full bg-amber-500/10 blur-[140px]" />

      <aside className="relative hidden lg:flex lg:w-[52%] xl:w-[56%] flex-col justify-between p-10 xl:p-14 border-r border-white/5">
        <LogoLockup size={44} showTagline />

        <div className="max-w-xl space-y-7 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] uppercase tracking-[0.2em] font-bold text-rose-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Tu registro cinematográfico
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-black leading-[1.08] tracking-tight">
            Cada película deja una huella.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400">
              Regístrala para siempre.
            </span>
          </h1>
          <p className="text-slate-400 text-base xl:text-lg leading-relaxed">
            {settings.tagline}. Organiza lo que ves, puntúa con detalle y comparte tu mirada con la comunidad.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: ListChecks, title: 'Mi Lista', text: 'Películas y series siempre a mano.' },
              { icon: BarChart3, title: 'Estadísticas', text: 'Descubre tus patrones de cine.' },
              { icon: ShieldCheck, title: 'Privado', text: 'Tus datos bajo tu control.' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 backdrop-blur-sm"
              >
                <feature.icon className="w-5 h-5 text-rose-400 mb-2.5" />
                <p className="text-sm font-bold text-white">{feature.title}</p>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{feature.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <div className="flex -space-x-2">
              {AVATAR_PRESETS.slice(0, 3).map((preset) => (
                <img
                  key={preset}
                  src={preset}
                  alt=""
                  className="w-7 h-7 rounded-full ring-2 ring-[#0A0A0B] object-cover"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
            <span>Un espacio para quienes ven cine con atención.</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-[11px] text-slate-500">
          <Film className="w-3.5 h-3.5" />
          ScreenLog Pro · Diseñado para cinéfilos
        </div>
      </aside>

      <main className="relative flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-6">
            <LogoLockup size={42} showTagline />
          </div>

          <div className="bg-[#141416]/90 border border-white/10 rounded-3xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="mb-4">
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver al inicio
                </button>
              </div>
              {mode !== 'forgot' ? (
                <>
                  <div className="mb-6">
                    <h2 className="font-display text-2xl font-black tracking-tight">
                      {mode === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                    </h2>
                    <p className="text-sm text-slate-400 mt-1.5">
                      {mode === 'login'
                        ? 'Tu lista, tus notas y tus estadísticas te esperan.'
                        : 'Empieza a construir tu registro cinematográfico.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 mb-5 bg-white/5 rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        mode === 'login' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Entrar
                    </button>
                    {settings.allowPublicRegistration && (
                      <button
                        type="button"
                        onClick={() => switchMode('register')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                          mode === 'register' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Registrarme
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white mb-5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Volver al inicio de sesión
                </button>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {notice && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{notice}</span>
                </div>
              )}

              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="auth-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        id="auth-email"
                        type="email"
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(event) => setLoginEmail(event.target.value)}
                        placeholder="tu@correo.com"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="auth-password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                        Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[11px] font-semibold text-rose-400 hover:text-rose-300"
                      >
                        ¿La olvidaste?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        id="auth-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        placeholder="Tu contraseña"
                        className={inputClass}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(event) => setRemember(event.target.checked)}
                      className="rounded accent-rose-600"
                    />
                    Mantener mi sesión en este dispositivo
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {submitting ? 'Entrando...' : 'Entrar a ScreenLog'}
                  </button>
                </form>
              )}

              {mode === 'register' && settings.allowPublicRegistration && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label htmlFor="register-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Nombre o alias
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        id="register-name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Cómo quieres aparecer"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        id="register-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="tu@correo.com"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="register-password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          id="register-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="register-confirm" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Confirmar
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        <input
                          id="register-confirm"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          placeholder="Repite la contraseña"
                          className={inputClass}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Elige tu avatar
                    </span>
                    <div className="flex items-center gap-3">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAvatar(preset)}
                          aria-label="Seleccionar avatar"
                          className={`relative rounded-full p-0.5 transition-all ${
                            avatar === preset ? 'ring-2 ring-rose-500 scale-105' : 'opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={preset}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {avatar === preset && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {submitting ? 'Creando cuenta...' : 'Crear mi cuenta'}
                  </button>
                </form>
              )}

              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-black tracking-tight mb-1.5">Recuperar acceso</h2>
                    <p className="text-sm text-slate-400">
                      Indica tu correo y un administrador podrá restablecer tu contraseña de forma segura.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="forgot-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={(event) => setForgotEmail(event.target.value)}
                        placeholder="tu@correo.com"
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Enviar solicitud
                  </button>
                </form>
              )}

              {!settings.allowPublicRegistration && mode === 'register' && (
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-slate-300">
                  El registro público está desactivado. Contacta con el administrador del portal para recibir acceso.
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                {mode !== 'forgot' && (
                  <button
                    type="button"
                    onClick={continueAsGuest}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600/20 to-amber-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2 hover:bg-rose-600/30"
                  >
                    <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
                    Explorar como invitado
                  </button>
                )}
                <p className="text-[10px] text-center text-slate-500 leading-relaxed">
                  Como invitado puedes consultar el catálogo. Para guardar tu lista y escribir reseñas necesitas una cuenta.
                </p>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-600 mt-5">
            © {new Date().getFullYear()} {settings.portalName}. Acceso protegido.
          </p>
        </div>
      </main>
    </div>
  );
};
