import React, { useState } from 'react';
import { ArrowRight, Check, Crown, Eye, EyeOff, Loader2, Lock, Mail, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LogoLockup } from './Logo';

const inputClass =
  'w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 focus:outline-none transition-colors';

export const SetupScreen: React.FC = () => {
  const { setupOwner } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Ingresa tu nombre y tu correo electrónico.');
      return;
    }
    if (!email.includes('@')) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 10) {
      setError('La contraseña del Owner debe tener al menos 10 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    const result = await setupOwner({ name: name.trim(), email: email.trim(), password });
    setSubmitting(false);
    if (!result.success) setError(result.message || 'No se pudo completar la configuración inicial.');
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-slate-100 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/4 w-[520px] h-[520px] rounded-full bg-rose-600/20 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-[130px]" />

      <div className="relative w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <LogoLockup size={48} showTagline />
        </div>

        <div className="bg-[#141416]/90 border border-white/10 rounded-3xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
          <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-white/10 bg-gradient-to-br from-rose-600/10 via-transparent to-amber-500/5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-900/40">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-400">Configuración inicial</p>
                <h1 className="font-display text-xl font-black tracking-tight">Crea la cuenta Owner</h1>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              ScreenLog Pro todavía no tiene propietario. Esta pantalla solo aparece una vez: la primera cuenta creada
              será el Owner y tendrá control total del portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="setup-name" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nombre del Owner
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="setup-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tu nombre"
                  className={inputClass}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="setup-email" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Correo del Owner
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="setup-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="owner@screenlog.app"
                  className={inputClass}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="setup-password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="setup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 10 caracteres"
                  className={inputClass}
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="setup-confirm" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirmar contraseña
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="setup-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repite la contraseña"
                  className={inputClass}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Guarda estas credenciales en un lugar seguro. El Owner puede crear administradores, gestionar la
                seguridad del portal y transferir la propiedad.
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {submitting ? 'Creando Owner...' : 'Crear Owner y comenzar'}
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-5">
          Esta configuración es de un solo uso y no puede repetirse una vez creado el Owner.
        </p>
      </div>
    </div>
  );
};
