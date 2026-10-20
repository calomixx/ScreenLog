import React from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { Navbar } from './components/Navbar';
import { LandingPublicView } from './components/LandingPublicView';
import { SystemDashboardView } from './components/SystemDashboardView';
import { CatalogView } from './components/CatalogView';
import { MyListView } from './components/MyListView';
import { UserStatsPanel } from './components/UserStatsPanel';
import { DetailModal } from './components/DetailModal';
import { AddMediaModal } from './components/AddMediaModal';
import { TrailerModal } from './components/TrailerModal';
import { AuthModal } from './components/AuthModal';
import { EditProfileModal } from './components/EditProfileModal';
import { EditMediaModal } from './components/EditMediaModal';
import { AIAssistantModal } from './components/AIAssistantModal';
import { Clapperboard, Twitter, Instagram, Github, Linkedin } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, setIsAddModalOpen, mediaList, myListEntries, currentUser } = useMedia();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Public Landing View (¿Qué ofrecemos?, ¿Cómo lo hacemos?, Opiniones, Contáctanos) */}
        {(activeTab === 'landing' || activeTab === 'inicio' || activeTab === 'opiniones' || activeTab === 'contacto') && (
          <LandingPublicView />
        )}

        {/* Authenticated / Inside the System View (Hero Slider, Top Rated, Tendencias, Títulos Propios, DB Banner) */}
        {activeTab === 'sistema' && (
          <SystemDashboardView />
        )}

        {/* Catalog Exploration */}
        {activeTab === 'explorar' && (
          <CatalogView />
        )}

        {/* Personal Watchlist & Log */}
        {activeTab === 'mi_lista' && (
          <MyListView />
        )}

        {/* User Statistics Panel */}
        {activeTab === 'estadisticas' && (
          <UserStatsPanel standalone />
        )}
      </main>

      {/* Modals & AI Assistant */}
      <DetailModal />
      <AddMediaModal />
      <TrailerModal />
      <AuthModal />
      <EditProfileModal />
      <EditMediaModal />
      <AIAssistantModal />

      {/* Cinematic Footer */}
      <footer className="border-t border-white/5 bg-[#161618]/90 text-slate-400 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-900/30">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <span className="font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400 text-base">ScreenLog</span>
              <p className="text-xs text-slate-400">Plataforma de Clasificación & Reseñas de Películas y Series</p>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter / X"
              title="Síguenos en Twitter / X"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/10 transition-all duration-200 active:scale-95"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Síguenos en Instagram"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-pink-400 hover:border-pink-500/40 hover:bg-pink-500/10 transition-all duration-200 active:scale-95"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              title="Repositorio en GitHub"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all duration-200 active:scale-95"
            >
              <Github className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              title="Conéctate en LinkedIn"
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10 transition-all duration-200 active:scale-95"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          </div>

          <div className="text-xs text-slate-400 text-center md:text-right">
            <span>{mediaList.length} títulos catalogados</span> • <span className="text-rose-400/80 font-medium">Hecho para verdaderos amantes del cine</span>
          </div>

        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <MediaProvider>
      <MainAppContent />
    </MediaProvider>
  );
}
