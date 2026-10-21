import React, { useState } from 'react';
import {
  CalendarDays,
  Check,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  MonitorSmartphone,
  Pencil,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  UserCog,
} from 'lucide-react';
import { ROLE_LABELS, isOwner, isStaff, useAuth } from '../context/AuthContext';
import { useMedia } from '../context/MediaContext';
import { formatDate, formatDateShort } from '../lib/api';

const inputClass =
  'w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 focus:outline-none transition-colors';

const RoleBadge: React.FC<{ role: 'owner' | 'admin' | 'user' }> = ({ role }) => {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <Crown className="w-3 h-3" />
        Owner
      </span>
    );
  }
  if (role === 'admin') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <Shield className="w-3 h-3" />
        Administrador
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-500/10 text-sky-300 border border-sky-500/25">
      <UserIcon className="w-3 h-3" />
      Usuario
    </span>
  );
};

export const AccountView: React.FC = () => {
  const { currentUser, sessionInfo, changePassword, logout, logoutAll } = useAuth();
  const { setIsEditProfileModalOpen, setActiveTab, showToast } = useMedia();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-rose-600/10 border border-rose-500/25 flex items-center justify-center">
          <UserIcon className="w-7 h-7 text-rose-400" />
        </div>
        <h1 className="font-display text-2xl font-black tracking-tight">Inicia sesión para ver tu cuenta</h1>
        <p className="text-sm text-slate-400">
          Como invitado puedes explorar el catálogo, pero tu perfil, tu lista y tus estadísticas requieren una cuenta.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
        >
          <LogIn className="w-4 h-4" />
          Volver al acceso
        </button>
      </div>
    );
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (!currentPassword) {
      setPasswordError('Ingresa tu contraseña actual.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }
    setSavingPassword(true);
    const result = await changePassword(currentPassword, newPassword);
    setSavingPassword(false);
    if (!result.success) {
      setPasswordError(result.message || 'No se pudo cambiar la contraseña.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordNotice('Contraseña actualizada correctamente.');
    showToast('Contraseña actualizada.', 'success');
  };

  const handleLogoutAll = async () => {
    await logoutAll();
    showToast('Se cerraron todas las sesiones de tu cuenta.', 'info');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-[#141416] border border-white/10 p-6 sm:p-8">
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-rose-600/10 blur-[90px] pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-20 h-20 rounded-3xl object-cover ring-2 ring-white/10"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                {currentUser.name}
              </h1>
              <RoleBadge role={currentUser.role} />
              {currentUser.mustChangePassword && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  Cambio de contraseña pendiente
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {currentUser.email}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Miembro desde {formatDateShort(currentUser.createdAt || currentUser.joinedDate)}
              </span>
              {currentUser.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {currentUser.city}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-sm font-semibold transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Editar perfil
            </button>
            {isStaff(currentUser.role) && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-300 text-sm font-semibold transition-colors"
              >
                <UserCog className="w-4 h-4" />
                Administración
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-3xl bg-[#141416] border border-white/10 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <h2 className="font-display text-lg font-black tracking-tight">Perfil cinéfilo</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Biografía</span>
              <span className="text-slate-300 text-right max-w-[70%]">{currentUser.bio || 'Sin biografía todavía.'}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Usuario</span>
              <span className="text-slate-300">@{currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, '_')}</span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Géneros favoritos</span>
              <span className="text-slate-300 text-right max-w-[70%]">
                {currentUser.favoriteGenres && currentUser.favoriteGenres.length > 0
                  ? currentUser.favoriteGenres.join(' · ')
                  : 'Sin definir'}
              </span>
            </div>
            {currentUser.socialLinks && (currentUser.socialLinks.letterboxd || currentUser.socialLinks.instagram || currentUser.socialLinks.twitter) && (
              <div className="flex items-start justify-between gap-4">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Redes</span>
                <span className="text-slate-300 text-right max-w-[70%] break-all">
                  {[currentUser.socialLinks.letterboxd, currentUser.socialLinks.instagram, currentUser.socialLinks.twitter]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {isOwner(currentUser.role)
                ? 'Como Owner puedes gestionar administradores, facturación, credenciales, registros del sistema y transferir la propiedad del portal.'
                : isStaff(currentUser.role)
                  ? 'Como administrador puedes gestionar usuarios, moderar la comunidad y ajustar la configuración del portal.'
                  : 'Como usuario puedes organizar tu lista, puntuar títulos y participar en la comunidad.'}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-[#141416] border border-white/10 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4 text-sky-400" />
            <h2 className="font-display text-lg font-black tracking-tight">Mi sesión actual</h2>
          </div>

          {sessionInfo ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Navegador</span>
                <span className="text-slate-300 text-right">{sessionInfo.browser}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Sistema</span>
                <span className="text-slate-300 text-right">{sessionInfo.os}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">IP</span>
                <span className="text-slate-300 font-mono text-xs">{sessionInfo.ip}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Inicio</span>
                <span className="text-slate-300 text-right">{formatDate(sessionInfo.startedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Última actividad</span>
                <span className="text-slate-300 text-right">{formatDate(sessionInfo.lastActivityAt)}</span>
              </div>
              <p className="text-[10px] text-slate-500 pt-1">
                Por seguridad, solo se muestra la sesión actual. Nunca se listan sesiones de otras personas.
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay información de sesión disponible.</p>
          )}

          <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión
            </button>
            <button
              type="button"
              onClick={() => void handleLogoutAll()}
              className="flex-1 py-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/25 text-rose-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Cerrar todas las sesiones
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-3xl bg-[#141416] border border-white/10 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <h2 className="font-display text-lg font-black tracking-tight">Cambiar contraseña</h2>
        </div>

        {passwordError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}
        {passwordNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{passwordNotice}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="account-current-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Contraseña actual
            </label>
            <input
              id="account-current-password"
              type={showPasswords ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="account-new-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Nueva contraseña
            </label>
            <input
              id="account-new-password"
              type={showPasswords ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="account-confirm-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Confirmar
            </label>
            <input
              id="account-confirm-password"
              type={showPasswords ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </div>
          <div className="sm:col-span-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
              disabled={savingPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold disabled:opacity-60 transition-all"
            >
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
            </button>
          </div>
        </form>

        <p className="text-[10px] text-slate-500">
          Tu contraseña se almacena con hash scrypt y nunca se muestra en texto plano. Al cambiarla se cierran las demás
          sesiones activas.
        </p>
      </section>

      <p className="text-center text-[10px] text-slate-600">
        Rol actual: {ROLE_LABELS[currentUser.role]} · Los permisos se verifican en el servidor en cada solicitud.
      </p>
    </div>
  );
};
