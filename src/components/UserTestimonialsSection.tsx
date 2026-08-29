import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Star, 
  Sparkles, 
  Send, 
  ThumbsUp, 
  CheckCircle2, 
  UserCheck, 
  Filter, 
  Film, 
  Tv, 
  SlidersHorizontal,
  Flame,
  Award,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMedia } from '../context/MediaContext';

export interface SiteComment {
  id: string;
  userName: string;
  userEmail?: string;
  userAvatar: string;
  userRole: 'user' | 'critic' | 'admin' | 'guest';
  rating: number;
  highlightFeature: string;
  content: string;
  date: string;
  likes: number;
  likedByMe?: boolean;
}

const STORAGE_COMMENTS_KEY = 'screenlog_site_testimonials_v1';

const INITIAL_SITE_COMMENTS: SiteComment[] = [
  {
    id: 'site-comm-1',
    userName: 'Elena Vega',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    userRole: 'critic',
    rating: 5,
    highlightFeature: '🎼 Votación Técnica y Guión',
    content: '¡ScreenLog es exactamente lo que la comunidad cinéfila necesitaba! El desglose para evaluar guión, actuaciones y dirección por separado le da una profundidad crítica que otras páginas no tienen. La interfaz oscura es una maravilla visual.',
    date: 'Hace 2 horas',
    likes: 24,
    likedByMe: true
  },
  {
    id: 'site-comm-2',
    userName: 'Carlos Ruiz',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    userRole: 'user',
    rating: 5,
    highlightFeature: '📺 Registro de Plataformas de Streaming',
    content: 'Lo que más me encanta de esta web es poder anotar en qué plataforma (Netflix, HBO, Apple TV o Cine) vi cada película y filtrar mi lista de pendientes. Es súper rápido y no tiene nada de anuncios molestos.',
    date: 'Ayer',
    likes: 18,
    likedByMe: false
  },
  {
    id: 'site-comm-3',
    userName: 'Sofía Tarantino',
    userAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    userRole: 'critic',
    rating: 5,
    highlightFeature: '🎯 Mi Lista y Cuaderno Personal',
    content: 'El cuaderno de notas personales donde puedo escribir mi análisis antes de publicarlo es mi función favorita. Además el tráiler integrado en modal y las carátulas en alta definición hacen que navegar sea un deleite.',
    date: 'Hace 3 días',
    likes: 15,
    likedByMe: false
  },
  {
    id: 'site-comm-4',
    userName: 'Alejandro Morales',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    userRole: 'user',
    rating: 5,
    highlightFeature: '➕ Añadir Títulos Propios',
    content: 'Pude subir películas clásicas y documentales independientes que no encontraba en otros lados, asignándoles carátula y puntuación. ¡10/10 esta página!',
    date: 'Hace 5 días',
    likes: 12,
    likedByMe: false
  }
];

const FEATURE_TAGS = [
  '🎯 Mi Lista y Seguimiento',
  '🎼 Votación Técnica y Guión',
  '📺 Registro de Plataformas',
  '✨ Diseño y Experiencia',
  '➕ Añadir Títulos Propios',
  '🎬 Reseñas Comunitarias'
];

export const UserTestimonialsSection: React.FC = () => {
  const { currentUser, openAuthModal } = useMedia();

  const [comments, setComments] = useState<SiteComment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COMMENTS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_SITE_COMMENTS;
  });

  const [filterTag, setFilterTag] = useState<string>('todos');
  const [sortOrder, setSortOrder] = useState<'top' | 'recientes'>('top');

  // Form states
  const [authorName, setAuthorName] = useState('');
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedFeature, setSelectedFeature] = useState<string>(FEATURE_TAGS[0]);
  const [commentText, setCommentText] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync author name with current user
  useEffect(() => {
    if (currentUser) {
      setAuthorName(currentUser.name);
    }
  }, [currentUser]);

  // Persist comments
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(comments));
    } catch {
      // ignore
    }
  }, [comments]);

  const handleLike = (commentId: string) => {
    setComments(prev => 
      prev.map(c => {
        if (c.id === commentId) {
          const wasLiked = c.likedByMe;
          return {
            ...c,
            likes: wasLiked ? c.likes - 1 : c.likes + 1,
            likedByMe: !wasLiked
          };
        }
        return c;
      })
    );
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);

    const newComment: SiteComment = {
      id: `site-comm-${Date.now()}`,
      userName: currentUser?.name || authorName.trim() || 'Cinéfilo Entusiasta',
      userEmail: currentUser?.email,
      userAvatar: currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      userRole: currentUser?.role || 'user',
      rating: selectedRating,
      highlightFeature: selectedFeature,
      content: commentText.trim(),
      date: 'Justo ahora',
      likes: 1,
      likedByMe: true
    };

    // Persist to PostgreSQL backend
    fetch('/api/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser?.id,
        userName: newComment.userName,
        userAvatar: newComment.userAvatar,
        userRole: newComment.userRole,
        rating: newComment.rating,
        highlightFeature: newComment.highlightFeature,
        content: newComment.content,
        dateStr: 'Hoy'
      })
    }).catch(() => {});

    setTimeout(() => {
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      setIsSubmitting(false);
      setShowSuccessToast(true);

      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {
        // ignore
      }

      setTimeout(() => setShowSuccessToast(false), 4000);
    }, 200);
  };

  // Filter & sort
  const filteredComments = comments
    .filter(c => filterTag === 'todos' ? true : c.highlightFeature === filterTag)
    .sort((a, b) => {
      if (sortOrder === 'top') {
        return b.likes - a.likes;
      }
      return 0; // retain natural order
    });

  const averageRating = (comments.reduce((acc, c) => acc + c.rating, 0) / (comments.length || 1)).toFixed(1);

  return (
    <section id="user-testimonials-section" className="space-y-8 pt-4">
      
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/10 border border-rose-500/25 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            Comunidad y Experiencias
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            ¿Qué le ha gustado a los usuarios de ScreenLog?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-light">
            Descubre las opiniones de espectadores, críticos y miembros de nuestra comunidad sobre las herramientas de seguimiento, calificación y catálogo.
          </p>
        </div>

        {/* Aggregate Badge */}
        <div className="flex items-center gap-3 bg-[#161618] border border-white/10 p-3 rounded-2xl shadow-lg flex-shrink-0">
          <div className="text-center px-2 border-r border-white/10">
            <span className="text-2xl font-display font-black text-amber-400 block leading-none">
              {averageRating}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">de 5.0</span>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              <strong className="text-rose-400">{comments.length}</strong> opiniones de la web
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN (lg:col-span-5): Form to leave feedback */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#161618] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 sticky top-24">
            
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="p-2.5 rounded-2xl bg-rose-600/15 text-rose-400 border border-rose-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-white">
                  Deja tu Opinión sobre ScreenLog
                </h3>
                <p className="text-xs text-slate-400">
                  Cuéntanos qué función te gusta más o qué ha mejorado tu experiencia
                </p>
              </div>
            </div>

            {showSuccessToast && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>¡Gracias por tu comentario! Ya está publicado en el muro de ScreenLog.</span>
              </div>
            )}

            <form onSubmit={handleSubmitComment} className="space-y-4">
              
              {/* User info banner */}
              {currentUser ? (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-rose-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-rose-400 uppercase font-semibold">{currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'critic' ? 'Crítico Fílmico' : 'Cinéfilo Registrado'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase">
                      Tu Nombre o Alias
                    </label>
                    <button
                      type="button"
                      onClick={() => openAuthModal('login')}
                      className="text-[11px] text-rose-400 hover:underline font-semibold"
                    >
                      ¿Iniciar sesión?
                    </button>
                  </div>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="ej: Mateo Cinefilo, Valen..."
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Star Rating for the platform */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  Tu Calificación para ScreenLog
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setSelectedRating(star)}
                      className="p-1 text-slate-600 hover:text-amber-400 transition-colors focus:outline-none"
                    >
                      <Star 
                        className={`w-6 h-6 transition-all ${
                          star <= selectedRating 
                            ? 'text-amber-400 fill-amber-400 scale-110' 
                            : 'text-slate-600 hover:scale-105'
                        }`} 
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-400 ml-2">
                    {selectedRating === 5 ? '¡Excelente (5/5)!' : `${selectedRating} / 5`}
                  </span>
                </div>
              </div>

              {/* Highlight feature selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  ¿Qué es lo que más te gusta de la página?
                </label>
                <select
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none transition-colors"
                >
                  {FEATURE_TAGS.map((tag) => (
                    <option key={tag} value={tag} className="bg-[#161618]">
                      {tag}
                    </option>
                  ))}
                </select>
              </div>

              {/* Comment text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase block">
                  Tu Comentario o Testimonio
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={3}
                  placeholder="Escribe aquí tu experiencia, por qué te gusta la web, cómo organizas tus películas o qué función te resulta más útil..."
                  required
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none resize-none transition-colors"
                />
              </div>

              <button
                id="submit-site-comment-btn"
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Publicar Comentario en la Web
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-7): Comment stream & filters */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161618] p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
              <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filtrar:
              </span>
              <button
                onClick={() => setFilterTag('todos')}
                className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  filterTag === 'todos'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                Todos ({comments.length})
              </button>
              {FEATURE_TAGS.slice(0, 3).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilterTag(tag)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    filterTag === tag
                      ? 'bg-rose-600 text-white shadow'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {tag.split(' ')[1] || tag}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <button
                onClick={() => setSortOrder('top')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  sortOrder === 'top' ? 'text-rose-400 font-bold bg-rose-600/15 border border-rose-500/20' : 'hover:text-white'
                }`}
              >
                Más valorados
              </button>
              <span>•</span>
              <button
                onClick={() => setSortOrder('recientes')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                  sortOrder === 'recientes' ? 'text-rose-400 font-bold bg-rose-600/15 border border-rose-500/20' : 'hover:text-white'
                }`}
              >
                Recientes
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-3.5">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="bg-[#161618] hover:bg-[#1a1a1e] border border-white/10 hover:border-white/20 rounded-3xl p-5 sm:p-6 shadow-lg transition-all duration-200 space-y-3 group"
              >
                {/* Author row & rating */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={comment.userAvatar} 
                      alt={comment.userName} 
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-rose-500/40 transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          {comment.userName}
                        </h4>
                        {comment.userRole === 'critic' && (
                          <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30">
                            Crítico
                          </span>
                        )}
                        {comment.userRole === 'admin' && (
                          <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-rose-600/20 text-rose-400 border border-rose-500/30">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {comment.date}
                      </span>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="text-xs font-bold">{comment.rating}.0</span>
                  </div>
                </div>

                {/* Highlight Tag */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-600/10 text-rose-300 border border-rose-500/20 text-[11px] font-semibold">
                    <Sparkles className="w-3 h-3 text-rose-400" />
                    Le gustó: <strong className="text-white">{comment.highlightFeature}</strong>
                  </span>
                </div>

                {/* Comment Body */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                  "{comment.content}"
                </p>

                {/* Footer with Like Button */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-slate-400">
                  <span className="text-[11px]">¿Te resulta útil esta opinión?</span>
                  
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                      comment.likedByMe
                        ? 'bg-rose-600/20 text-rose-400 border-rose-500/40 font-bold shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/5'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${comment.likedByMe ? 'fill-rose-400' : ''}`} />
                    <span>{comment.likes}</span>
                    <span className="hidden sm:inline">Útil</span>
                  </button>
                </div>

              </div>
            ))}
          </div>

        </div>

      </div>

    </section>
  );
};
