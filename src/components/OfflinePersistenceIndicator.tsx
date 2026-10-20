import React, { useState, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  HardDrive, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Database,
  ChevronDown,
  ChevronUp,
  FileJson,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

interface OfflinePersistenceIndicatorProps {
  compact?: boolean;
  className?: string;
}

export const OfflinePersistenceIndicator: React.FC<OfflinePersistenceIndicatorProps> = ({ 
  compact = false,
  className = '' 
}) => {
  const { 
    isOnline, 
    offlineSyncQueue, 
    lastSyncTime, 
    isSyncing, 
    syncOfflineQueue, 
    exportLocalBackup, 
    importLocalBackup, 
    myListEntries,
    mediaList
  } = useMedia();

  const [isExpanded, setIsExpanded] = useState(false);
  const [importStatus, setImportStatus] = useState<{ message: string; success: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSync = async () => {
    const result = await syncOfflineQueue();
    if (result.success) {
      setImportStatus({
        message: result.syncedCount > 0 
          ? `¡${result.syncedCount} cambios sincronizados con éxito!` 
          : 'Todos los datos locales ya están al día.',
        success: true
      });
      setTimeout(() => setImportStatus(null), 4000);
    } else {
      setImportStatus({
        message: 'No se pudo sincronizar. Por favor verifica tu conexión a internet.',
        success: false
      });
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await importLocalBackup(file);
    setImportStatus({ message: res.message, success: res.success });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setImportStatus(null), 5000);
  };

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 text-xs ${className}`}>
        {isOnline ? (
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium hover:bg-emerald-500/20 transition-colors"
            title="Datos guardados en localStorage. Clic para ver opciones de copia de seguridad."
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Local 100% activo</span>
            {offlineSyncQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                {offlineSyncQueue.length}
              </span>
            )}
          </div>
        ) : (
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium hover:bg-amber-500/25 transition-colors"
            title="Estás en modo sin conexión. Tus listas y estadísticas se cargan desde localStorage."
          >
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Modo Offline</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-full rounded-2xl border transition-all duration-300 overflow-hidden ${
      !isOnline 
        ? 'bg-gradient-to-r from-amber-950/40 via-[#161618] to-rose-950/30 border-amber-500/30 shadow-xl shadow-amber-950/20'
        : 'bg-[#161618]/90 border-white/10 shadow-lg'
    } ${className}`}>
      
      {/* Main Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        
        {/* Left: Status info */}
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
            !isOnline 
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
          }`}>
            {!isOnline ? <WifiOff className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide border ${
                !isOnline 
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
              }`}>
                {!isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Sin Conexión (Modo Offline)
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Persistencia Local Activa
                  </>
                )}
              </span>

              {lastSyncTime && (
                <span className="text-[11px] text-slate-400">
                  Última sincronización: <strong className="text-slate-300">{lastSyncTime}</strong>
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {!isOnline ? (
                <>
                  Tus listas, reseñas y estadísticas están <strong className="text-white">100% respaldadas en tu navegador (localStorage)</strong>. Puedes continuar agregando y clasificando películas normalmente.
                </>
              ) : (
                <>
                  Tus listas y estadísticas se guardan de forma instantánea en <strong className="text-white">localStorage</strong> para acceso inmediato y disponibilidad offline en cualquier momento.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Quick actions & metric chips */}
        <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
          
          {/* Saved count badge */}
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span><strong>{myListEntries.length}</strong> en Mi Lista</span>
          </div>

          {/* Pending queue badge */}
          {offlineSyncQueue.length > 0 && (
            <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-1.5 font-semibold">
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>{offlineSyncQueue.length} pendientes</span>
            </div>
          )}

          {/* Manual sync button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing || (!isOnline && offlineSyncQueue.length === 0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isOnline
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95'
                : 'bg-white/5 text-slate-400 border border-white/10 cursor-not-allowed'
            }`}
            title="Sincronizar cambios pendientes con la nube"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          {/* Expand Details & Backup options */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title={isExpanded ? 'Ocultar opciones de respaldo' : 'Mostrar opciones de respaldo local'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Import / Sync Status Toast */}
      {importStatus && (
        <div className={`px-4 py-2.5 text-xs font-medium border-t flex items-center gap-2 ${
          importStatus.success 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
            : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
        }`}>
          {importStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
          <span>{importStatus.message}</span>
        </div>
      )}

      {/* Expandable Backup & Diagnostics Drawer */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0A0A0B]/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-display font-semibold text-sm text-white flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-rose-400" />
                <span>Gestor de Copias de Seguridad Locales (JSON)</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Exporta tus películas, valoraciones y notas a un archivo local descargable para transferir entre dispositivos o guardar copias de seguridad personales.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Export Backup Button */}
              <button
                type="button"
                onClick={exportLocalBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all active:scale-95"
                title="Descargar copia de seguridad en archivo .json"
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>Exportar Respaldo</span>
              </button>

              {/* Import Backup Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition-all active:scale-95"
                title="Restaurar datos desde un archivo .json"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Restaurar Respaldo</span>
              </button>

              <input 
                ref={fileInputRef}
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Diagnostic Info Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Estado Conexión</span>
              <span className={`font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOnline ? 'Conectado a Internet' : 'Desconectado'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Títulos en Catálogo</span>
              <span className="text-white font-semibold">{mediaList.length} disponibles</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">En Tu Bitácora</span>
              <span className="text-rose-400 font-semibold">{myListEntries.length} registrados</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase font-bold">Cola de Sincronización</span>
              <span className="text-amber-400 font-semibold">{offlineSyncQueue.length} pendientes</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
