import React from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPublicView } from './components/LandingPublicView';
import { SystemDashboardView } from './components/SystemDashboardView';
import { CatalogView } from './components/CatalogView';
import { MyListView } from './components/MyListView';
import { UserStatsPanel } from './components/UserStatsPanel';
import { DetailModal } from './components/DetailModal';
import { AddMediaModal } from './components/AddMediaModal';
import { TrailerModal } from './components/TrailerModal';
import { EditProfileModal } from './components/EditProfileModal';
import { EditMediaModal } from './components/EditMediaModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { AdminPanelView } from './components/AdminPanelView';
import { AccountView } from './components/AccountView';
import { AuthScreen } from './components/AuthScreen';
import { SetupScreen } from './components/SetupScreen';
import { ForcedPasswordChange } from './components/ForcedPasswordChange';
import { ForbiddenView } from './components/ForbiddenView';
import { LogoLockup, LogoMark } from './components/Logo';
import { Loader2 } from 'lucide-react';

const Splash: React.FC = () => (
  <div className="min-h-dvh bg-[#0A0A0B] flex flex-col items-center justify-center gap-5">
    <LogoMark size={64} />
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
      Cargando ScreenLog Pro...
    </div>
  </div>
);

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, mediaList } = useMedia();
  const { currentUser } = useAuth();
  const isStaffUser = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const renderTab = () => {
    if (activeTab === 'sistema') return <SystemDashboardView />;
    if (activeTab === 'explorar') return <CatalogView />;
    if (activeTab === 'mi_lista') return <MyListView />;
    if (activeTab === 'estadisticas') return <UserStatsPanel standalone />;
    if (activeTab === 'admin') {
      return isStaffUser ? (
        <AdminPanelView />
      ) : (
        <ForbiddenView section="Panel de administración" onBack={() => setActiveTab('sistema')} onHome={() => setActiveTab('sistema')} />
      );
    }
    if (activeTab === 'cuenta') return <AccountView />;
    return <LandingPublicView />;
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 md:pb-10">
        {renderTab()}
      </main>

      <DetailModal />
      <AddMediaModal />
      <TrailerModal />
      <EditProfileModal />
      <EditMediaModal />
      <AIAssistantModal />

      <footer className="border-t border-white/5 bg-[#161618]/90 text-slate-400 py-8 mt-auto mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <LogoLockup size={38} showTagline />

          <nav className="flex items-center gap-5 text-xs font-semibold" aria-label="Enlaces del pie">
            <button type="button" onClick={() => setActiveTab('explorar')} className="hover:text-white transition-colors">
              Explorar
            </button>
            <button type="button" onClick={() => setActiveTab('mi_lista')} className="hover:text-white transition-colors">
              Mi Lista
            </button>
            <button type="button" onClick={() => setActiveTab('landing')} className="hover:text-white transition-colors">
              Opiniones
            </button>
            <button type="button" onClick={() => setActiveTab('landing')} className="hover:text-white transition-colors">
              Contacto
            </button>
          </nav>

          <div className="text-xs text-slate-500 text-center md:text-right">
            <span>{mediaList.length} títulos catalogados</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>© {new Date().getFullYear()} ScreenLog Pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AuthenticatedApp: React.FC = () => (
  <MediaProvider>
    <MainAppContent />
  </MediaProvider>
);

const AppGate: React.FC = () => {
  const { loading, needsSetup, currentUser, isGuest } = useAuth();

  if (loading) return <Splash />;
  if (needsSetup) return <SetupScreen />;
  if (!currentUser && !isGuest) return <AuthScreen />;
  if (currentUser?.mustChangePassword) return <ForcedPasswordChange />;
  return <AuthenticatedApp />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}
