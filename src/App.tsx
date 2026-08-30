import React from 'react';
import { MediaProvider, useMedia } from './context/MediaContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { CatalogView } from './components/CatalogView';
import { MyListView } from './components/MyListView';
import { DetailModal } from './components/DetailModal';
import { AddMediaModal } from './components/AddMediaModal';
import { TrailerModal } from './components/TrailerModal';
import { AuthModal } from './components/AuthModal';
import { Film, Clapperboard, Sparkles, Heart, Bookmark, Star, Plus } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, setActiveTab, setIsAddModalOpen, mediaList, myListEntries, currentUser } = useMedia();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'inicio' && <HomeView />}
        {activeTab === 'explorar' && <CatalogView />}
        {activeTab === 'mi_lista' && <MyListView />}
      </main>

      {/* Modals */}
      <DetailModal />
      <AddMediaModal />
      <TrailerModal />
      <AuthModal />

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

          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <button onClick={() => setActiveTab('inicio')} className="hover:text-rose-400 transition-colors">
              Inicio
            </button>
            <button onClick={() => setActiveTab('explorar')} className="hover:text-rose-400 transition-colors">
              Catálogo
            </button>
            {myListEntries.length > 0 && (
              <button onClick={() => setActiveTab('mi_lista')} className="hover:text-rose-400 transition-colors">
                Mi Lista ({myListEntries.length})
              </button>
            )}
            {!currentUser && (
            <button 
              onClick={() => {
                setActiveTab('inicio');
                setTimeout(() => {
                  document.getElementById('user-testimonials-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} 
              className="hover:text-rose-400 transition-colors"
            >
              Opiniones de la Web
            </button>
            )}
            <button 
              onClick={() => {
                setActiveTab('inicio');
                setTimeout(() => {
                  document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} 
              className="hover:text-rose-400 transition-colors"
            >
              Contáctanos & Soporte
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="hover:text-rose-400 transition-colors">
              + Añadir Película
            </button>
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
