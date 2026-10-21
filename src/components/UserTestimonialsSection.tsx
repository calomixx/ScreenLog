import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Star, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  UserCheck,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMedia } from '../context/MediaContext';
import { apiRequest } from '../lib/api';

export interface SiteComment {
  id: string;
  userName: string;
  userAvatar: string;
  userRole: 'owner' | 'admin' | 'user' | 'guest';
  rating: number;
  highlightFeature: string;
  content: string;
  date: string;
}

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

  const [comments, setComments] = useState<SiteComment[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ success: boolean; data: any[] }>('/api/testimonials')
      .then((response) => {
        if (cancelled || !Array.isArray(response.data)) return;
        setComments(
          response.data.map((item) => ({
            id: String(item.id),
            userName: item.userName || 'Usuario',
            userAvatar: item.userAvatar || '',
            userRole: ['owner', 'admin', 'user'].includes(item.userRole) ? item.userRole : 'guest',
            rating: Number(item.rating) || 0,
            highlightFeature: item.highlightFeature || 'General',
            content: item.content || '',
            date: item.dateStr || (item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES') : ''),
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const [filterTag, setFilterTag] = useState<string>('todos');

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [selectedFeature, setSelectedFeature] = useState<string>(FEATURE_TAGS[0]);
  const [commentText, setCommentText] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    if (!commentText.trim() || !selectedRating) return;

    setIsSubmitting(true);
    setFormError('');

    try {
      const response = await apiRequest<{ success: boolean; data: any }>('/api/testimonials', {
        method: 'POST',
        body: JSON.stringify({
          rating: selectedRating,
          highlightFeature: selectedFeature,
          content: commentText.trim(),
        }),
      });

      const item = response.data;
      const newComment: SiteComment = {
        id: String(item.id),
        userName: item.userName || currentUser.name,
        userAvatar: item.userAvatar || currentUser.avatar,
        userRole: item.userRole || currentUser.role,
        rating: Number(item.rating) || selectedRating,
        highlightFeature: item.highlightFeature || selectedFeature,
        content: item.content || commentText.trim(),
        date: 'Hoy',
      };

      setComments(prev => [newComment, ...prev]);
      setCommentText('');
      setSelectedRating(0);
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
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo publicar tu opinión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComments = comments.filter(c => filterTag === 'todos' ? true : c.highlightFeature === filterTag);

  const averageRating = comments.length
    ? (comments.reduce((acc, c) => acc + c.rating, 0) / comments.length).toFixed(1)
    : null;

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
            Descubre las opiniones de los miembros de la comunidad sobre las herramientas de seguimiento, calificación y catálogo.
          </p>
        </div>

        {/* Aggregate Badge */}
        <div className="flex items-center gap-3 bg-[#161618] border border-white/10 p-3 rounded-2xl shadow-lg flex-shrink-0">
          <div className="text-center px-2 border-r border-white/10">
            <span className="text-2xl font-display font-black text-amber-400 block leading-none">
              {averageRating ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {averageRating ? 'de 5.0' : 'sin valoraciones'}
            </span>
          </div>
          <div className="space-y-0.5">
            <div className={`flex items-center ${averageRating ? 'text-amber-400' : 'text-slate-600'}`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-3.5 h-3.5 ${averageRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
              ))}
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              <strong className="text-rose-400">{comments.length}</strong> {comments.length === 1 ? 'opinión' : 'opiniones'} de la web
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

            {currentUser ? (
              <form onSubmit={handleSubmitComment} className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                  <img 
                    src={currentUser.avatar} 
                    alt={currentUser.name} 
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-rose-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-rose-400 uppercase font-semibold">{currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'admin' ? 'Administrador' : 'Cinéfilo Registrado'}</p>
                  </div>
                </div>

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
                    {selectedRating === 5 ? '¡Excelente (5/5)!' : selectedRating > 0 ? `${selectedRating} / 5` : 'Selecciona una calificación'}
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

              {formError && (
                <p className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300">
                  {formError}
                </p>
              )}

              <button
                id="submit-site-comment-btn"
                type="submit"
                disabled={isSubmitting || !commentText.trim() || !selectedRating}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs sm:text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Publicando...' : 'Publicar Comentario en la Web'}
              </button>
            </form>
            ) : (
              <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                <UserCheck className="w-8 h-8 mx-auto text-rose-400" />
                <p className="text-sm text-slate-300">
                  Inicia sesión para compartir tu opinión. Las opiniones se publican con tu cuenta real.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
                >
                  Iniciar sesión
                </button>
              </div>
            )}
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
              {['Mi Lista', 'Votación', 'Plataformas'].map((label, index) => {
                const tag = FEATURE_TAGS[index];
                return (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      filterTag === tag
                        ? 'bg-rose-600 text-white shadow'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

          </div>

          {/* Comments List */}
          <div className="space-y-3.5">
            {filteredComments.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/10 bg-[#161618]/60 p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-white">Todavía no hay opiniones</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Sé la primera persona en compartir su experiencia con ScreenLog usando el formulario.
                </p>
              </div>
            )}
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="bg-[#161618] hover:bg-[#1a1a1e] border border-white/10 hover:border-white/20 rounded-3xl p-5 sm:p-6 shadow-lg transition-all duration-200 space-y-3 group"
              >
                {/* Author row & rating */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {comment.userAvatar ? (
                      <img
                        src={comment.userAvatar}
                        alt={comment.userName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10 group-hover:ring-rose-500/40 transition-all"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-rose-600/20 text-rose-300 ring-2 ring-white/10 flex items-center justify-center font-bold">
                        {comment.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">
                          {comment.userName}
                        </h4>
                        {comment.userRole === 'owner' && (
                          <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-amber-600/20 text-amber-400 border border-amber-500/30">
                            Owner
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
                    <span className="text-xs font-bold">{comment.rating.toFixed(1)}</span>
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

              </div>
            ))}
          </div>

        </div>

      </div>

    </section>
  );
};
