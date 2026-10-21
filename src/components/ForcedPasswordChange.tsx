import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound, Loader2, LogOut, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LogoLockup } from './Logo';

const inputClass =
  'w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 focus:outline-none transition-colors';

export const ForcedPasswordChange: React.FC = () => {
  const { currentUser, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('Ingresa tu contraseña temporal.');
      return;
    }
    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser diferente a la temporal.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSubmitting(true);
    const result = await changePassword(currentPassword, newPassword);
    setSubmitting(false);
    if (!result.success) setError(result.message || 'No se pudo cambiar la contraseña.');
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-slate-100 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/3 w-[420px] h-[420px] rounded-full bg-rose-600/20 blur-[130px]" />
      <div className="relative w-full max-w-md">
        <div className="flex justify-center mb-8">
          <LogoLockup size={44} />
        </div>
        <div className="bg-[#141416]/90 border border-white/10 rounded-3xl shadow-2xl shadow-black/50 backdrop-blur-xl overflow-hidden">
          <div className="px-6 pt-7 pb-5 border-b border-white/10 bg-rose-600/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-rose-400">Acción requerida</p>
                <h1 className="font-display text-xl font-black tracking-tight">Cambia tu contraseña</h1>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              {currentUser?.name ? `${currentUser.name}, tu` : 'Tu'} acceso fue restablecido por un administrador. Define
              una nueva contraseña para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="forced-current" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Contraseña temporal
              </label>
              <input
                id="forced-current"
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className={inputClass}
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label htmlFor="forced-new" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nueva contraseña
              </label>
              <input
                id="forced-new"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                className={inputClass}
                autoComplete="new-password"
                required
              />
            </div>

            <div>
              <label htmlFor="forced-confirm" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirmar nueva contraseña
              </label>
              <input
                id="forced-confirm"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la nueva contraseña"
                className={inputClass}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords((value) => !value)}
              className="text-[11px] font-semibold text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {submitting ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>

            <button
              type="button"
              onClick={() => void logout()}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
          </form>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-5 flex items-center justify-center gap-1.5">
          <Check className="w-3 h-3" />
          Tu nueva contraseña se guarda cifrada y nunca se muestra en texto plano.
        </p>
      </div>
    </div>
  );
};
