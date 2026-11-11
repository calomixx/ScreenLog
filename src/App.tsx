import React, { Suspense, lazy } from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPublicView } from './components/LandingPublicView';
import { LogoLockup, LogoMark } from './components/Logo';
import { Loader2, ShieldAlert } from 'lucide-react';

// Lazy-loaded Views (Code Splitting for instant initial page load)
const SystemDashboardView = lazy(() =>
  import('./components/SystemDashboardView').then((m) => ({ default: m.SystemDashboardView })),
);
const CatalogView = lazy(() =>
  import('./components/CatalogView').then((m) => ({ default: m.CatalogView })),
);
const CineMatchView = lazy(() =>
  import('./components/CineMatchView').then((m) => ({ default: m.CineMatchView })),
);
const MyListView = lazy(() =>
  import('./components/MyListView').then((m) => ({ default: m.MyListView })),
);
const UserStatsPanel = lazy(() =>
  import('./components/UserStatsPanel').then((m) => ({ default: m.UserStatsPanel })),
);
const AdminPanelView = lazy(() =>
  import('./components/AdminPanelView').then((m) => ({ default: m.AdminPanelView })),
);
const AccountView = lazy(() =>
  import('./components/AccountView').then((m) => ({ default: m.AccountView })),
);
const AuthScreen = lazy(() =>
  import('./components/AuthScreen').then((m) => ({ default: m.AuthScreen })),
);
const SetupScreen = lazy(() =>
  import('./components/SetupScreen').then((m) => ({ default: m.SetupScreen })),
);
const ForcedPasswordChange = lazy(() =>
  import('./components/ForcedPasswordChange').then((m) => ({ default: m.ForcedPasswordChange })),
);
const ForbiddenView = lazy(() =>
  import('./components/ForbiddenView').then((m) => ({ default: m.ForbiddenView })),
);

// Lazy-loaded Modals (Downloaded only when opened)
const DetailModal = lazy(() =>
  import('./components/DetailModal').then((m) => ({ default: m.DetailModal })),
);
const AddMediaModal = lazy(() =>
  import('./components/AddMediaModal').then((m) => ({ default: m.AddMediaModal })),
);
const TrailerModal = lazy(() =>
  import('./components/TrailerModal').then((m) => ({ default: m.TrailerModal })),
);
const EditProfileModal = lazy(() =>
  import('./components/EditProfileModal').then((m) => ({ default: m.EditProfileModal })),
);
const EditMediaModal = lazy(() =>
  import('./components/EditMediaModal').then((m) => ({ default: m.EditMediaModal })),
);
const AIAssistantModal = lazy(() =>
  import('./components/AIAssistantModal').then((m) => ({ default: m.AIAssistantModal })),
);

const Splash: React.FC = () => (
  <div className="min-h-dvh bg-[#0A0A0B] flex flex-col items-center justify-center gap-5">
    <LogoMark size={64} />
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
      Cargando ScreenLog Pro...
    </div>
  </div>
);

const ViewLoader: React.FC = () => (
  <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3 text-slate-400">
    <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
    <span className="text-xs font-medium tracking-wide">Preparando vista...</span>
  </div>
);

/**
 * Portal Público ("AFUERA"):
 * Diseño editorial independiente con su propia barra de portada, mural cinemático y footer amplio.
 * No comparte el Navbar operativo ni el aspecto interno del sistema.
 */
const PublicPortalShell: React.FC = () => {
  const { selectedMediaId, isTrailerModalOpen, isAssistantOpen } = useMedia();
  return (
    <>
      <LandingPublicView />
      <Suspense fallback={null}>
        {selectedMediaId && <DetailModal />}
        {isTrailerModalOpen && <TrailerModal />}
        {isAssistantOpen && <AIAssistantModal />}
      </Suspense>
    </>
  );
};

/**
 * Espacio de Trabajo Privado ("ADENTRO"):
 * Entorno de aplicación operativo con Navbar de herramientas, buscador, IA, estadísticas y dashboard privado.
 */
const MainAppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    mediaList,
    toastMessage,
    selectedMediaId,
    isAddModalOpen,
    isTrailerModalOpen,
    isEditProfileModalOpen,
    isEditMediaModalOpen,
    isAssistantOpen,
  } = useMedia();
  const { currentUser, isWorkspaceGuest, exitToPublic } = useAuth();
  const isStaffUser = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const renderTab = () => {
    if (activeTab === 'explorar') return <CatalogView />;
    if (activeTab === 'recomendados') return <CineMatchView />;
    if (activeTab === 'mi_lista') return <MyListView />;
    if (activeTab === 'estadisticas') return <UserStatsPanel standalone />;
    if (activeTab === 'admin') {
      return isStaffUser ? (
        <AdminPanelView />
      ) : (
        <ForbiddenView
          section="Panel de administración"
          onBack={() => setActiveTab('sistema')}
          onHome={() => setActiveTab('sistema')}
        />
      );
    }
    if (activeTab === 'cuenta') {
      return currentUser ? <AccountView /> : <SystemDashboardView />;
    }
    return <SystemDashboardView />;
  };

  return (
    <div className="min-h-dvh bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      <Navbar />

      {/* Subtle indicator when browsing workspace as guest */}
      {!currentUser && isWorkspaceGuest && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-[11px] sm:text-xs text-amber-200 flex items-center justify-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Estás en vista de <strong>Invitado</strong> dentro del sistema. Crea una cuenta para guardar tu lista de forma permanente.
          </span>
          <button
            type="button"
            onClick={() => exitToPublic(true)}
            className="underline font-bold text-amber-300 hover:text-white"
          >
            Salir a la portada
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-28 md:pb-10">
        <Suspense fallback={<ViewLoader />}>{renderTab()}</Suspense>
      </main>

      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 rounded-2xl bg-[#161618] border border-white/15 text-xs sm:text-sm font-semibold text-white shadow-2xl">
          {toastMessage.text}
        </div>
      )}

      <Suspense fallback={null}>
        {selectedMediaId && <DetailModal />}
        {isAddModalOpen && <AddMediaModal />}
        {isTrailerModalOpen && <TrailerModal />}
        {isEditProfileModalOpen && <EditProfileModal />}
        {isEditMediaModalOpen && <EditMediaModal />}
        {isAssistantOpen && <AIAssistantModal />}
      </Suspense>

      <footer className="border-t border-white/5 bg-[#121215] text-slate-400 py-6 mt-auto mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <LogoLockup size={34} showTagline={false} />

          <nav className="flex items-center gap-5 text-xs font-semibold" aria-label="Navegación interna">
            <button type="button" onClick={() => setActiveTab('sistema')} className="hover:text-white transition-colors">
              Mi Sala
            </button>
            <button type="button" onClick={() => setActiveTab('explorar')} className="hover:text-white transition-colors">
              Explorar
            </button>
            <button type="button" onClick={() => setActiveTab('recomendados')} className="hover:text-white transition-colors">
              CineMatch
            </button>
            <button type="button" onClick={() => setActiveTab('mi_lista')} className="hover:text-white transition-colors">
              Mi Lista
            </button>
            <button type="button" onClick={() => setActiveTab('estadisticas')} className="hover:text-white transition-colors">
              Estadísticas
            </button>
          </nav>

          <div className="text-[11px] text-slate-500 text-center md:text-right">
            <span>{mediaList.length} títulos catalogados</span>
            <span className="mx-2 text-slate-700">•</span>
            <span>Espacio de Trabajo · ScreenLog Pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppGate: React.FC = () => {
  const { loading, needsSetup, currentUser, isGuest, isWorkspaceGuest, pendingLoginMode } = useAuth();

  if (loading) return <Splash />;
  if (needsSetup) {
    return (
      <Suspense fallback={<Splash />}>
        <SetupScreen />
      </Suspense>
    );
  }
  if (currentUser?.mustChangePassword) {
    return (
      <Suspense fallback={<Splash />}>
        <ForcedPasswordChange />
      </Suspense>
    );
  }
  if (!currentUser && !isGuest) {
    return (
      <Suspense fallback={<Splash />}>
        <AuthScreen key={pendingLoginMode} initialMode={pendingLoginMode} />
      </Suspense>
    );
  }
  if (!currentUser && !isWorkspaceGuest) return <PublicPortalShell />;
  return <MainAppContent />;
};

export default function App() {
  return (
    <AuthProvider>
      <MediaProvider>
        <AppGate />
      </MediaProvider>
    </AuthProvider>
  );
}
