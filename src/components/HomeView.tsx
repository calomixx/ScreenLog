import React, { useState } from 'react';
import { 
  Sparkles, 
  Trophy, 
  TrendingUp, 
  Flame, 
  Film, 
  Tv, 
  Award, 
  Plus, 
  ArrowRight,
  Bookmark,
  Star,
  CheckCircle2
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { HeroSlider } from './HeroSlider';
import { MediaCard } from './MediaCard';
import { FeaturesShowcase } from './FeaturesShowcase';
import { UserTestimonialsSection } from './UserTestimonialsSection';
import { ContactSection } from './ContactSection';
import { MediaType } from '../types';

export const HomeView: React.FC = () => {
  const { 
    featuredMedia, 
    topClassifiedMedia, 
    mostAddedMedia, 
    mediaList, 
    setActiveTab, 
    setIsAddModalOpen,
    openAuthModal,
    currentUser
  } = useMedia();

  const [topTypeFilter, setTopTypeFilter] = useState<'todos' | MediaType>('todos');
  const [addedTypeFilter, setAddedTypeFilter] = useState<'todos' | MediaType>('todos');

  const filteredTopClassified = topClassifiedMedia
    .filter((m) => (topTypeFilter === 'todos' ? true : m.type === topTypeFilter))
    .slice(0, 10);

  const filteredMostAdded = mostAddedMedia
    .filter((m) => (addedTypeFilter === 'todos' ? true : m.type === addedTypeFilter))
    .slice(0, 10);

  const customUserCreated = mediaList.filter((m) => m.isCustomUserCreated);

  return (
    <div id="home-view-container" className="space-y-14 pb-16">
      
      {/* Animated Hero Carousel with Dynamic Moving Backdrops */}
      <HeroSlider items={featuredMedia.length > 0 ? featuredMedia : mediaList.slice(0, 5)} />

      {/* WHAT WE OFFER & HOW WE DO IT (Showcase) - visitors only */}
      {!currentUser && <FeaturesShowcase />}

      {/* SECTION 1: MÁS CLASIFICADAS (Top Rated) */}
      <section id="section-top-clasificadas" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-600/10 text-rose-500 border border-rose-500/20 shadow-sm">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
                Más Clasificadas por la Comunidad
              </h2>
              <p className="text-xs text-slate-400">
                Títulos con la mayor puntuación de estrellas y evaluaciones críticas
              </p>
            </div>
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['todos', 'pelicula', 'serie', 'anime'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTopTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  topTypeFilter === t
                    ? 'bg-rose-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredTopClassified.map((media) => (
            <MediaCard key={media.id} media={media} />
          ))}
        </div>
      </section>

      {/* SECTION 2: MÁS AÑADIDAS A SU LISTA */}
      <section id="section-mas-anadidas" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
                Más Añadidas a las Listas de Usuarios
              </h2>
              <p className="text-xs text-slate-400">
                Las obras en seguimiento constante y con más listas de pendientes
              </p>
            </div>
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
            {(['todos', 'pelicula', 'serie', 'anime'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setAddedTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  addedTypeFilter === t
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {filteredMostAdded.map((media) => (
            <MediaCard key={media.id} media={media} />
          ))}
        </div>
      </section>

      {/* SECTION 3: TÍTULOS REGISTRADOS POR TI O LA COMUNIDAD */}
      {customUserCreated.length > 0 && (
        <section id="section-titulos-propios" className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight">
                  Títulos Creados por Usuarios & Admin
                </h2>
                <p className="text-xs text-slate-400">
                  Películas y series subidas con carátulas personalizadas y votaciones activas
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {customUserCreated.map((media) => (
              <MediaCard key={media.id} media={media} />
            ))}
          </div>
        </section>
      )}

      {/* Banner CTA: Añade tus películas y califica */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/60 via-[#161618] to-[#161618] border border-rose-500/30 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-rose-900/30">
            ¡Tu Criterio Cuenta!
          </span>
          <h3 className="text-2xl sm:text-4xl font-display font-black text-white leading-tight">
            ¿Viste una película que no está en el catálogo?
          </h3>
          <p className="text-sm text-slate-300 font-light leading-relaxed">
            Puedes añadir cualquier película o serie, subir su carátula, registrar el año, director, plataforma donde la viste y tu crítica completa con estrellas y evaluación.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-600/25 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Añadir Nueva Película
            </button>

            <button
              onClick={() => setActiveTab('mi_lista')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 transition-colors"
            >
              <Bookmark className="w-4 h-4 text-rose-400" />
              Ir a Mi Lista
            </button>
          </div>
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500 to-transparent" />
      </section>

      {/* SECTION 4: USER TESTIMONIALS & WHAT PEOPLE LIKE ABOUT THE SITE */}
      {!currentUser && <UserTestimonialsSection />}

      {/* SECTION 5: CONTACT & SUPPORT */}
      {!currentUser && <ContactSection />}

    </div>
  );
};
