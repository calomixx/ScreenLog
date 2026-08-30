import React, { createContext, useContext, useState, useEffect } from 'react';
import { MediaItem, UserReview, WatchStatus, CommunityComment, DetailedCommunityVotes, UserProfile } from '../types';
import { INITIAL_MEDIA_LIST, INITIAL_USER_REVIEWS } from '../data/initialMedia';
import confetti from 'canvas-confetti';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-1',
    name: 'Miguel Torrealba',
    email: 'miguel@screenlog.app',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    role: 'admin',
    favoriteGenres: ['Ciencia Ficción', 'Drama', 'Thriller'],
    bio: 'Cinéfilo empedernido. Amante del cine de autor, Nolan, Villeneuve y clásicos de culto.',
    joinedDate: '2024-01-15'
  },
  {
    id: 'user-2',
    name: 'Elena Vega',
    email: 'elena@screenlog.app',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    role: 'critic',
    favoriteGenres: ['Drama', 'Terror / Suspense', 'Animación'],
    bio: 'Crítica de cine independiente y redactora. Analizando guiones y cinematografía.',
    joinedDate: '2024-03-10'
  },
  {
    id: 'user-3',
    name: 'Carlos Ruiz',
    email: 'carlos@screenlog.app',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    role: 'user',
    favoriteGenres: ['Acción', 'Aventura', 'Ciencia Ficción'],
    bio: 'Maratoneando series los fines de semana y buscando siempre la siguiente joya oculta.',
    joinedDate: '2024-04-20'
  }
];

interface MediaContextType {
  mediaList: MediaItem[];
  userReviews: Record<string, UserReview>;
  activeTab: 'inicio' | 'explorar' | 'mi_lista';
  setActiveTab: (tab: 'inicio' | 'explorar' | 'mi_lista') => void;
  selectedMediaId: string | null;
  setSelectedMediaId: (id: string | null) => void;
  selectedMedia: MediaItem | null;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isTrailerModalOpen: boolean;
  setIsTrailerModalOpen: (open: boolean) => void;
  activeTrailerUrl: string | null;
  openTrailer: (youtubeIdOrUrl?: string) => void;
  closeTrailer: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  // Auth state & actions
  currentUser: UserProfile | null;
  usersList: UserProfile[];
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password?: string) => { success: boolean; message?: string };
  register: (userData: { name: string; email: string; password?: string; avatar?: string; favoriteGenres?: string[]; bio?: string; role?: UserProfile['role'] }) => { success: boolean; message?: string };
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  
  // Actions
  addCustomMedia: (item: Partial<MediaItem> & { title: string; type: MediaItem['type'] }) => string;
  updateUserReview: (review: UserReview) => void;
  updateMediaStatus: (mediaId: string, status: WatchStatus) => void;
  removeFromMyList: (mediaId: string) => void;
  addCommunityComment: (mediaId: string, text: string, rating: number) => void;
  toggleCommentLike: (mediaId: string, commentId: string) => void;
  submitDetailedVote: (mediaId: string, scores: Partial<DetailedCommunityVotes>) => void;
  
  // Current user info (backwards compatibility)
  userName: string;
  setUserName: (name: string) => void;
  userAvatar: string;
  
  // Helpers
  getReview: (mediaId: string) => UserReview | undefined;
  topClassifiedMedia: MediaItem[];
  mostAddedMedia: MediaItem[];
  featuredMedia: MediaItem[];
  myListEntries: { media: MediaItem; review: UserReview }[];
  statusCounts: { all: number; pendiente: number; en_proceso: number; terminada: number };
}

const MediaContext = createContext<MediaContextType | undefined>(undefined);

const STORAGE_MEDIA_KEY = 'cinetrack_media_items_v1';
const STORAGE_REVIEWS_KEY = 'cinetrack_user_reviews_v1';
const STORAGE_USERS_KEY = 'cinetrack_registered_users_v1';
const STORAGE_CURRENT_USER_KEY = 'cinetrack_active_user_v1';

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Users list
  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEMO_USERS;
  });

  // Current logged in user (null by default unless restored from localStorage)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return null;
  });

  // Auth modal
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MEDIA_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_MEDIA_LIST;
  });

  const [userReviews, setUserReviews] = useState<Record<string, UserReview>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REVIEWS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_USER_REVIEWS;
  });

  const [activeTab, setActiveTab] = useState<'inicio' | 'explorar' | 'mi_lista'>('inicio');
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial media and users from PostgreSQL backend on mount
  useEffect(() => {
    const syncFromDb = async () => {
      try {
        const mediaRes = await fetch('/api/media');
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          if (mediaData.success && Array.isArray(mediaData.data) && mediaData.data.length > 0) {
            // Merge with local media
            setMediaList((prev) => {
              const existingIds = new Set(prev.map(m => m.id));
              const newItems = mediaData.data.filter((d: any) => !existingIds.has(d.id)).map((d: any) => ({
                id: d.id,
                title: d.title,
                originalTitle: d.originalTitle || d.title,
                type: d.type || 'pelicula',
                year: d.year,
                genres: d.genres || ['Drama'],
                director: d.director || 'Desconocido',
                cast: d.cast || [],
                synopsis: d.synopsis || '',
                duration: d.duration || '2h 00m',
                posterUrl: d.posterUrl,
                backdropUrl: d.backdropUrl || d.posterUrl,
                trailerYoutubeId: d.trailerUrl || '',
                defaultPlatform: (d.streamingPlatforms && d.streamingPlatforms[0]) || 'Max (HBO)',
                communityRating: d.rating || 5.0,
                communityVotesCount: d.ratingCount || 1,
                addedToListCount: 1,
                isFeatured: Boolean(d.featured),
                isTrending: Boolean(d.trending),
                isTopClassified: Boolean(d.topRated),
                createdAt: d.createdAt,
                detailedVotes: {
                  script: 9.0,
                  acting: 9.0,
                  soundtrack: 9.0,
                  visuals: 9.0,
                  direction: 9.0,
                  totalVotes: 1,
                  ratingDistribution: { 5: 1 }
                },
                comments: []
              }));
              return [...newItems, ...prev];
            });
          }
        }
      } catch {
        // silent fallback to local state
      }
    };

    syncFromDb();
  }, []);

  // Persist active user
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  // Persist media
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MEDIA_KEY, JSON.stringify(mediaList));
    } catch {
      // ignore
    }
  }, [mediaList]);

  // Persist reviews
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(userReviews));
    } catch {
      // ignore
    }
  }, [userReviews]);

  const userName = currentUser?.name || 'Invitado';
  const userAvatar = currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

  const setUserName = (name: string) => {
    if (currentUser) {
      const updated = { ...currentUser, name };
      setCurrentUser(updated);
      setUsersList(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    }
  };

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = (email: string, password?: string): { success: boolean; message?: string } => {
    const found = usersList.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!found) {
      return { 
        success: false, 
        message: 'No encontramos ninguna cuenta registrada con este correo electrónico.' 
      };
    }

    const expectedPassword = found.password || '123456';
    if (!password || password.trim() !== expectedPassword) {
      return { 
        success: false, 
        message: 'Contraseña incorrecta. Por favor verifícala e intenta de nuevo (Demo: 123456).' 
      };
    }

    setCurrentUser(found);
    setIsAuthModalOpen(false);
    setActiveTab('inicio');
    setSelectedMediaId(null);
    try {
      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
    return { success: true };
  };

  const register = (userData: { 
    name: string; 
    email: string; 
    password?: string;
    avatar?: string; 
    favoriteGenres?: string[]; 
    bio?: string; 
    role?: UserProfile['role'] 
  }): { success: boolean; message?: string } => {
    const existing = usersList.find(u => u.email.toLowerCase() === userData.email.trim().toLowerCase());
    if (existing) {
      return { 
        success: false, 
        message: 'Ya existe una cuenta registrada con este correo. Por favor inicia sesión.' 
      };
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      email: userData.email.trim(),
      password: userData.password?.trim() || '123456',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      role: userData.role || 'user',
      favoriteGenres: userData.favoriteGenres || ['Drama', 'Acción'],
      bio: userData.bio || '¡Nuevo miembro cinéfilo en Cinephile Pro!',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    setUsersList(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setIsAuthModalOpen(false);
    setActiveTab('inicio');
    setSelectedMediaId(null);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }

    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveTab('inicio');
    setSelectedMediaId(null);
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsersList(prev => prev.map(u => u.id === currentUser.id ? updated : u));
  };

  const selectedMedia = mediaList.find((m) => m.id === selectedMediaId) || null;

  const openTrailer = (youtubeIdOrUrl?: string) => {
    if (youtubeIdOrUrl) {
      setActiveTrailerUrl(youtubeIdOrUrl);
      setIsTrailerModalOpen(true);
    }
  };

  const closeTrailer = () => {
    setIsTrailerModalOpen(false);
    setActiveTrailerUrl(null);
  };

  const getReview = (mediaId: string): UserReview | undefined => {
    return userReviews[mediaId];
  };

  const addCustomMedia = (item: Partial<MediaItem> & { title: string; type: MediaItem['type'] }): string => {
    const newId = `custom-${Date.now()}-${item.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const newMedia: MediaItem = {
      id: newId,
      title: item.title,
      originalTitle: item.originalTitle || item.title,
      type: item.type,
      year: item.year || new Date().getFullYear(),
      genres: item.genres && item.genres.length > 0 ? item.genres : ['Drama'],
      director: item.director || 'Director Desconocido',
      cast: item.cast || [],
      synopsis: item.synopsis || 'Sinopsis no disponible por el momento.',
      duration: item.duration || (item.type === 'pelicula' ? '2h 00m' : '1 Temporada'),
      posterUrl: item.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      backdropUrl: item.backdropUrl || item.posterUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
      trailerYoutubeId: item.trailerYoutubeId || '',
      defaultPlatform: item.defaultPlatform || 'Netflix',
      communityRating: 5.0,
      communityVotesCount: 1,
      addedToListCount: 1,
      isFeatured: false,
      isTrending: true,
      isTopClassified: false,
      createdAt: new Date().toISOString(),
      isCustomUserCreated: true,
      detailedVotes: {
        script: 9.0,
        acting: 9.0,
        soundtrack: 9.0,
        visuals: 9.0,
        direction: 9.0,
        totalVotes: 1,
        ratingDistribution: { 5: 1 }
      },
      comments: [
        {
          id: `comment-init-${Date.now()}`,
          author: userName,
          avatar: userAvatar,
          rating: 5,
          comment: '¡Título añadido recientemente a la comunidad de CineTrack!',
          date: new Date().toISOString().split('T')[0],
          likes: 1
        }
      ]
    };

    setMediaList((prev) => [newMedia, ...prev]);

    // Automatically add to user's list as pending
    setUserReviews((prev) => ({
      ...prev,
      [newId]: {
        mediaId: newId,
        status: 'pendiente',
        stars: 5,
        year: newMedia.year,
        genres: newMedia.genres,
        evaluation: '',
        critique: '',
        director: newMedia.director,
        watchedDate: '',
        platform: newMedia.defaultPlatform,
        wouldRewatch: 'si_totalmente',
        updatedAt: new Date().toISOString()
      }
    }));

    // Save to PostgreSQL backend
    fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newId,
        title: newMedia.title,
        originalTitle: newMedia.originalTitle,
        year: newMedia.year,
        type: newMedia.type,
        genres: newMedia.genres,
        director: newMedia.director,
        cast: newMedia.cast,
        synopsis: newMedia.synopsis,
        posterUrl: newMedia.posterUrl,
        backdropUrl: newMedia.backdropUrl,
        trailerUrl: newMedia.trailerYoutubeId,
        duration: newMedia.duration,
        streamingPlatforms: [newMedia.defaultPlatform],
        rating: 5.0,
        createdByUserId: currentUser?.id
      })
    }).catch(() => {});

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }

    return newId;
  };

const updateUserReview = (review: UserReview) => {
    const isNowTerminada = review.status === 'terminada';
    const wasTerminada = userReviews[review.mediaId]?.status === 'terminada';

    // Save to PostgreSQL user_list_entries
    if (currentUser) {
      fetch('/api/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          mediaId: review.mediaId,
          status: review.status,
          rating: review.stars,
          userNotes: review.critique || review.evaluation || '',
          platformWatched: review.platform,
          dateWatched: review.watchedDate,
          rewatch: review.wouldRewatch === 'si_totalmente',
          emotionalTag: review.evaluation
        })
      }).catch(() => {});
    }

    setUserReviews((prev) => ({
      ...prev,
      [review.mediaId]: {
        ...review,
        updatedAt: new Date().toISOString()
      }
    }));

    // Update community rating when user finishes & rates
    if (isNowTerminada && review.stars > 0) {
      setMediaList((prev) =>
        prev.map((m) => {
          if (m.id === review.mediaId) {
            const newCount = m.communityVotesCount + (wasTerminada ? 0 : 1);
            const currentTotal = m.communityRating * m.communityVotesCount;
            const newTotal = wasTerminada
              ? currentTotal - (userReviews[review.mediaId]?.stars || review.stars) + review.stars
              : currentTotal + review.stars;
            const newRating = Number((newTotal / newCount).toFixed(1));
            return {
              ...m,
              communityRating: Math.min(5, Math.max(1, newRating)),
              communityVotesCount: newCount
            };
          }
          return m;
        })
      );
    } else if (wasTerminada && !isNowTerminada) {
      // User is leaving "terminada" status - remove old rating from community average
      setMediaList((prev) =>
        prev.map((m) => {
          if (m.id === review.mediaId) {
            const newCount = Math.max(0, m.communityVotesCount - 1);
            const currentTotal = m.communityRating * m.communityVotesCount;
            const newTotal = currentTotal - (userReviews[review.mediaId]?.stars || review.stars);
            const newRating = newCount > 0 ? Number((newTotal / newCount).toFixed(1)) : 0;
            return {
              ...m,
              communityRating: Math.min(5, Math.max(1, newRating)),
              communityVotesCount: newCount
            };
          }
          return m;
        })
      );
    }

    if (review.stars >= 4) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      }
  };

  const updateMediaStatus = (mediaId: string, status: WatchStatus) => {
    const targetMedia = mediaList.find((m) => m.id === mediaId);
    if (!targetMedia) return;

    const existingReview = userReviews[mediaId];
    const isAddingFirstTime = !existingReview;

    const updatedReview: UserReview = {
      mediaId,
      status,
      stars: existingReview?.stars || 4.5,
      year: existingReview?.year || targetMedia.year,
      genres: existingReview?.genres || targetMedia.genres,
      evaluation: existingReview?.evaluation || (status === 'terminada' ? 'Excelente (9/10)' : ''),
      critique: existingReview?.critique || '',
      director: existingReview?.director || targetMedia.director,
      watchedDate: existingReview?.watchedDate || (status === 'terminada' ? new Date().toISOString().split('T')[0] : ''),
      platform: existingReview?.platform || targetMedia.defaultPlatform,
      wouldRewatch: existingReview?.wouldRewatch || 'si_totalmente',
      favoriteMoment: existingReview?.favoriteMoment || '',
      updatedAt: new Date().toISOString()
    };

    setUserReviews((prev) => ({
      ...prev,
      [mediaId]: updatedReview
    }));

    if (isAddingFirstTime) {
      setMediaList((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, addedToListCount: m.addedToListCount + 1 } : m))
      );
    }
  };

  const removeFromMyList = (mediaId: string) => {
    if (currentUser) {
      fetch(`/api/list/${currentUser.id}/${mediaId}`, { method: 'DELETE' }).catch(() => {});
    }

    setUserReviews((prev) => {
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });

    setMediaList((prev) =>
      prev.map((m) => (m.id === mediaId ? { ...m, addedToListCount: Math.max(0, m.addedToListCount - 1) } : m))
    );
  };

  const addCommunityComment = (mediaId: string, text: string, rating: number) => {
    if (!text.trim()) return;

    const newComment: CommunityComment = {
      id: `comment-${Date.now()}`,
      author: userName,
      avatar: userAvatar,
      rating: rating > 0 ? rating : 5,
      comment: text.trim(),
      date: new Date().toISOString().split('T')[0],
      likes: 0
    };

    // Save review to PostgreSQL
    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaId,
        userId: currentUser?.id,
        userName,
        userAvatar,
        userRole: currentUser?.role || 'user',
        rating: newComment.rating,
        comment: newComment.comment,
        dateStr: 'Hoy'
      })
    }).catch(() => {});

    setMediaList((prev) =>
      prev.map((m) => {
        if (m.id === mediaId) {
          return {
            ...m,
            comments: [newComment, ...m.comments]
          };
        }
        return m;
      })
    );
  };

  const toggleCommentLike = (mediaId: string, commentId: string) => {
    setMediaList((prev) =>
      prev.map((m) => {
        if (m.id === mediaId) {
          return {
            ...m,
            comments: m.comments.map((c) => {
              if (c.id === commentId) {
                const isLiked = !!c.isUserLiked;
                return {
                  ...c,
                  isUserLiked: !isLiked,
                  likes: isLiked ? c.likes - 1 : c.likes + 1
                };
              }
              return c;
            })
          };
        }
        return m;
      })
    );
  };

  const submitDetailedVote = (mediaId: string, scores: Partial<DetailedCommunityVotes>) => {
    setMediaList((prev) =>
      prev.map((m) => {
        if (m.id === mediaId) {
          const dv = m.detailedVotes;
          const newVotes = dv.totalVotes + 1;
          return {
            ...m,
            detailedVotes: {
              ...dv,
              script: scores.script ? Number(((dv.script * dv.totalVotes + scores.script) / newVotes).toFixed(1)) : dv.script,
              acting: scores.acting ? Number(((dv.acting * dv.totalVotes + scores.acting) / newVotes).toFixed(1)) : dv.acting,
              soundtrack: scores.soundtrack ? Number(((dv.soundtrack * dv.totalVotes + scores.soundtrack) / newVotes).toFixed(1)) : dv.soundtrack,
              visuals: scores.visuals ? Number(((dv.visuals * dv.totalVotes + scores.visuals) / newVotes).toFixed(1)) : dv.visuals,
              direction: scores.direction ? Number(((dv.direction * dv.totalVotes + scores.direction) / newVotes).toFixed(1)) : dv.direction,
              totalVotes: newVotes
            }
          };
        }
        return m;
      })
    );
  };

  // Filtered views
  const topClassifiedMedia = [...mediaList].sort((a, b) => b.communityRating - a.communityRating || b.communityVotesCount - a.communityVotesCount);
  const mostAddedMedia = [...mediaList].sort((a, b) => b.addedToListCount - a.addedToListCount);
  const featuredMedia = mediaList.filter((m) => m.isFeatured || m.communityRating >= 4.8);

  const myListEntries = Object.entries(userReviews)
    .map(([mId, rev]) => {
      const media = mediaList.find((m) => m.id === mId);
      return media ? { media, review: rev } : null;
    })
    .filter(Boolean) as { media: MediaItem; review: UserReview }[];

  const statusCounts = {
    all: myListEntries.length,
    pendiente: myListEntries.filter((e) => e.review.status === 'pendiente').length,
    en_proceso: myListEntries.filter((e) => e.review.status === 'en_proceso').length,
    terminada: myListEntries.filter((e) => e.review.status === 'terminada').length
  };

  return (
    <MediaContext.Provider
      value={{
        mediaList,
        userReviews,
        activeTab,
        setActiveTab,
        selectedMediaId,
        setSelectedMediaId,
        selectedMedia,
        isAddModalOpen,
        setIsAddModalOpen,
        isTrailerModalOpen,
        setIsTrailerModalOpen,
        activeTrailerUrl,
        openTrailer,
        closeTrailer,
        searchQuery,
        setSearchQuery,
        currentUser,
        usersList,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
        updateProfile,
        addCustomMedia,
        updateUserReview,
        updateMediaStatus,
        removeFromMyList,
        addCommunityComment,
        toggleCommentLike,
        submitDetailedVote,
        userName,
        setUserName,
        userAvatar,
        getReview,
        topClassifiedMedia,
        mostAddedMedia,
        featuredMedia,
        myListEntries,
        statusCounts
      }}
    >
      {children}
    </MediaContext.Provider>
  );
}

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};
