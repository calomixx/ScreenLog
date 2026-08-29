import React from 'react';
import { 
  Sparkles, 
  Film, 
  Star, 
  CheckCircle2, 
  Tv, 
  SlidersHorizontal, 
  MessageSquare, 
  Play, 
  Bookmark, 
  Layers, 
  Trophy, 
  Share2, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  BarChart3,
  ListPlus
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

export const FeaturesShowcase: React.FC = () => {
  const { openAuthModal, setActiveTab, currentUser, setIsAddModalOpen } = useMedia();

  const offerings = [
    {
      icon: Film,
      title: 'Catálogo Cinemático Completo',
      desc: 'Películas de autor, estrenos de taquilla, series de culto y animes con información de directores, elenco, plataformas de streaming y años.',
      badge: 'Multiformato',
      accent: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30'
    },
    {
      icon: Star,
      title: 'Clasificación y Reseñas Pro',
      desc: 'Sistema de 1 a 5 estrellas con medios puntos, etiquetas cualitativas ("Obra Maestra", "Excelente"), fecha de visionado y opción de rewatch.',
      badge: 'Criterio Crítico',
      accent: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30'
    },
    {
      icon: SlidersHorizontal,
      title: 'Votación Técnica por Dimensiones',
      desc: 'Desglose evaluativo de 1 a 10 en Guión, Actuación, Banda Sonora, Efectos Visuales y Dirección para análisis cinematográfico profundo.',
      badge: 'Análisis Fílmico',
      accent: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30'
    },
    {
      icon: Bookmark,
      title: 'Mi Lista & Cuaderno Personal',
      desc: 'Organiza tus obras en "Pendientes (Por ver)", "En Proceso" y "Terminadas". Visualiza tu progreso en cuadrícula, tabla detallada o notas.',
      badge: 'Seguimiento Total',
      accent: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30'
    },
    {
      icon: MessageSquare,
      title: 'Comunidad Viva & Debates',
      desc: 'Lee críticas de otros espectadores, participa con comentarios directos, vota las opiniones más acertadas y descubre joyas ocultas.',
      badge: 'Social & Cinefilia',
      accent: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30'
    },
    {
      icon: ListPlus,
      title: 'Añade Tus Propios Títulos',
      desc: 'Libertad total: sube cualquier película o serie con carátula personalizada, enlace de tráiler en YouTube y datos del creador.',
      badge: '100% Personalizable',
      accent: 'from-pink-500/20 to-pink-600/5 text-pink-400 border-pink-500/30'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Explora o Registra',
      desc: 'Busca entre nuestros títulos destacados o añade cualquier producción de tu preferencia con un par de clics.'
    },
    {
      number: '02',
      title: 'Organiza en Tu Lista',
      desc: 'Marca tu estado de visionado: Por ver, En proceso o Terminada para construir tu bitácora personal.'
    },
    {
      number: '03',
      title: 'Evalúa con Criterio',
      desc: 'Puntúa con estrellas, redacta tu crítica sincera y desglosa el guión, actuaciones y apartado técnico.'
    },
    {
      number: '04',
      title: 'Comparte e Inspírate',
      desc: 'Compara tus notas con el consenso de la comunidad cinéfila y exporta tus listas cuando lo desees.'
    }
  ];

  return (
    <div id="features-showcase-section" className="space-y-16 py-6">
      
      {/* SECTION 1: QUÉ OFRECEMOS */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/10 border border-rose-500/25 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Nuestra Propuesta de Valor
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight leading-tight">
            ¿Qué Ofrecemos en ScreenLog?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-light">
            Todo lo que un verdadero apasionado del cine y las series necesita para catalogar, calificar y debatir sus obras favoritas en un solo lugar.
          </p>
        </div>

        {/* Offerings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offerings.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="group relative bg-[#161618] hover:bg-[#1c1c20] border border-white/10 hover:border-white/20 rounded-3xl p-6 sm:p-7 shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${item.accent} border shadow-inner`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-display font-bold text-white group-hover:text-rose-400 transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Disponible para todos los usuarios</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: CÓMO LO HACEMOS (Workflow / Step-by-Step) */}
      <section className="relative overflow-hidden rounded-3xl bg-[#111113] border border-white/10 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Flujo Simple y Potente
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                ¿Cómo lo Hacemos?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Así es como transformas tu experiencia de ver películas en una bitácora cinéfila organizada:
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!currentUser ? (
                <button
                  onClick={() => openAuthModal('register')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  Crear Cuenta Gratis
                </button>
              ) : (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                >
                  <ListPlus className="w-4 h-4" />
                  Añadir Mi Primera Película
                </button>
              )}
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st, i) => (
              <div 
                key={st.number}
                className="relative p-6 rounded-2xl bg-[#161618] border border-white/10 hover:border-rose-500/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-400">
                    {st.number}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                </div>
                <h4 className="text-base font-bold text-white">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Live Platform Stats Counter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-rose-400">+100%</span>
              <span className="text-[11px] text-slate-400">Sin publicidad invasiva</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-amber-400">1 - 5 ⭐</span>
              <span className="text-[11px] text-slate-400">Escala de estrellas con medias</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-purple-400">5 Ejes</span>
              <span className="text-[11px] text-slate-400">Métricas técnicas de análisis</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-emerald-400">100% Libre</span>
              <span className="text-[11px] text-slate-400">Acceso a todas las funciones</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
