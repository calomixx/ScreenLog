import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  MediaItem,
  UserReview,
  WatchStatus,
  RewatchChoice,
  CommunityComment,
  DetailedCommunityVotes,
  UserProfile,
  OfflineSyncAction,
  LocalBackupData,
} from '../types';
import { INITIAL_MEDIA_LIST } from '../data/initialMedia';
import { canEditCatalog, useAuth } from './AuthContext';
import { apiRequest, ApiError } from '../lib/api';
import confetti from 'canvas-confetti';

export type AppTab =
  | 'landing'
  | 'sistema'
  | 'explorar'
  | 'mi_lista'
  | 'estadisticas'
  | 'opiniones'
  | 'contacto'
  | 'admin'
  | 'cuenta'
  | 'inicio';

interface MediaContextType {
  mediaList: MediaItem[];
  userReviews: Record<string, UserReview>;
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
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

  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  openAssistant: (initialPrompt?: string) => void;
  closeAssistant: () => void;
  assistantInitialPrompt: string | null;

  currentUser: UserProfile | null;
  usersList: UserProfile[];
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  login: (email: string, password?: string) => { success: boolean; message?: string };
  register: (userData: {
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    favoriteGenres?: string[];
    bio?: string;
    role?: UserProfile['role'];
  }) => { success: boolean; message?: string };
  logout: () => void;
  updateProfile: (data: Partial<UserProfile>) => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;

  updateMediaItem: (item: MediaItem, summary?: string) => { success: boolean; message?: string };
  deleteMediaItem: (id: string) => Promise<{ success: boolean; message?: string }>;
  restoreMediaItem: (id: string) => { success: boolean; message?: string };
  restoreAllMedia: () => void;
  undoLastMediaChange: (id: string) => { success: boolean; message?: string };
  isEditMediaModalOpen: boolean;
  setIsEditMediaModalOpen: (open: boolean) => void;
  mediaToEdit: MediaItem | null;
  setMediaToEdit: (media: MediaItem | null) => void;
  openEditMediaModal: (media: MediaItem) => boolean;

  isEditProfileModalOpen: boolean;
  setIsEditProfileModalOpen: (open: boolean) => void;

  toastMessage: { text: string; type?: 'success' | 'info' | 'warning' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;

  addCustomMedia: (item: Partial<MediaItem> & { title: string; type: MediaItem['type'] }) => string;
  updateUserReview: (review: UserReview) => void;
  updateMediaStatus: (mediaId: string, status: WatchStatus) => void;
  removeFromMyList: (mediaId: string) => void;
  addCommunityComment: (mediaId: string, text: string, rating: number) => void;
  toggleCommentLike: (mediaId: string, commentId: string) => void;
  submitDetailedVote: (mediaId: string, scores: Partial<DetailedCommunityVotes>) => void;

  userName: string;
  setUserName: (name: string) => void;
  userAvatar: string;

  isOnline: boolean;
  offlineSyncQueue: OfflineSyncAction[];
  lastSyncTime: string | null;
  isSyncing: boolean;
  syncOfflineQueue: () => Promise<{ success: boolean; syncedCount: number }>;
  exportLocalBackup: () => void;
  importLocalBackup: (file: File) => Promise<{ success: boolean; message: string; count: number }>;
  enableGuestOfflineMode: () => void;
  clearLocalData: () => void;

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
const STORAGE_SYNC_QUEUE_KEY = 'cinetrack_offline_sync_queue_v1';
const STORAGE_LAST_SYNC_KEY = 'cinetrack_last_sync_timestamp';
const STORAGE_OVERRIDES_KEY = 'cinetrack_title_overrides_v1';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';

function emptyDetailedVotes(): DetailedCommunityVotes {
  return {
    script: 0,
    acting: 0,
    soundtrack: 0,
    visuals: 0,
    direction: 0,
    totalVotes: 0,
    ratingDistribution: {},
  };
}

interface ServerReview {
  id: string;
  mediaId: string;
  author: string;
  avatar?: string;
  rating: number;
  comment: string;
  date: string;
  createdAt?: string;
  likes: number;
}

function mapServerMedia(raw: any): MediaItem {
  const initial = INITIAL_MEDIA_LIST.find((item) => item.id === raw.id);
  const platforms: string[] = Array.isArray(raw.streamingPlatforms) ? raw.streamingPlatforms : [];
  return {
    ...(initial || {}),
    ...raw,
    id: String(raw.id),
    title: raw.title || initial?.title || 'Sin título',
    originalTitle: raw.originalTitle || raw.title || initial?.originalTitle || '',
    type: raw.type || initial?.type || 'pelicula',
    year: Number(raw.year) || initial?.year || new Date().getFullYear(),
    genres: Array.isArray(raw.genres) && raw.genres.length > 0 ? raw.genres : initial?.genres || ['Drama'],
    director: raw.director || initial?.director || 'Desconocido',
    cast: Array.isArray(raw.cast) ? raw.cast : initial?.cast || [],
    synopsis: raw.synopsis || initial?.synopsis || '',
    duration: raw.duration || initial?.duration || '2h 00m',
    posterUrl: raw.posterUrl || initial?.posterUrl || '',
    backdropUrl: raw.backdropUrl || raw.posterUrl || initial?.backdropUrl || '',
    trailerYoutubeId: raw.trailerYoutubeId || raw.trailerUrl || initial?.trailerYoutubeId || '',
    defaultPlatform: raw.defaultPlatform || platforms[0] || initial?.defaultPlatform || 'Otra',
    communityRating: Number(raw.communityRating ?? raw.rating) || 0,
    communityVotesCount: Number(raw.communityVotesCount ?? raw.ratingCount) || 0,
    addedToListCount: Number(raw.addedToListCount) || 0,
    isFeatured: Boolean(raw.isFeatured ?? raw.featured ?? initial?.isFeatured),
    isTrending: Boolean(raw.isTrending ?? raw.trending ?? initial?.isTrending),
    isTopClassified: Boolean(raw.isTopClassified ?? raw.topRated ?? initial?.isTopClassified),
    createdAt: raw.createdAt || initial?.createdAt,
    comments: [],
    detailedVotes: raw.detailedVotes || emptyDetailedVotes(),
    isCustomUserCreated: initial?.isCustomUserCreated ?? !initial,
  } as MediaItem;
}

function mapCommunityComment(review: ServerReview): CommunityComment {
  return {
    id: review.id,
    author: review.author,
    avatar: review.avatar || DEFAULT_AVATAR,
    rating: Number(review.rating) || 0,
    comment: review.comment,
    date: review.date || (review.createdAt ? review.createdAt.slice(0, 10) : ''),
    likes: Number(review.likes) || 0,
    isUserLiked: false,
  };
}

function withComments(item: MediaItem, comments: CommunityComment[]): MediaItem {
  const votes = comments.length;
  const total = comments.reduce((sum, comment) => sum + (Number(comment.rating) || 0), 0);
  const distribution: { [key: number]: number } = {};
  comments.forEach((comment) => {
    const rounded = Math.max(1, Math.min(5, Math.round(comment.rating)));
    distribution[rounded] = (distribution[rounded] || 0) + 1;
  });
  return {
    ...item,
    comments,
    communityRating: votes > 0 ? Number((total / votes).toFixed(1)) : 0,
    communityVotesCount: votes,
    detailedVotes: {
      ...item.detailedVotes,
      ratingDistribution: distribution,
      totalVotes: 0,
    },
  };
}

function attachCommunityReviews(items: MediaItem[], reviews: ServerReview[]): MediaItem[] {
  const byMedia = new Map<string, CommunityComment[]>();
  reviews.forEach((review) => {
    const list = byMedia.get(review.mediaId) || [];
    list.push(mapCommunityComment(review));
    byMedia.set(review.mediaId, list);
  });
  return items.map((item) => withComments(item, byMedia.get(item.id) || []));
}

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser: authUser, requestLogin, continueAsGuest, logout: authLogout, updateProfile: authUpdateProfile } = useAuth();
  const currentUser = authUser as UserProfile | null;

  const [mediaList, setMediaList] = useState<MediaItem[]>(() => INITIAL_MEDIA_LIST);
  const [userReviews, setUserReviews] = useState<Record<string, UserReview>>({});
  const [activeTab, setActiveTab] = useState<AppTab>(() => (currentUser ? 'sistema' : 'landing'));
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpenState] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(null);

  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditMediaModalOpen, setIsEditMediaModalOpen] = useState(false);
  const [mediaToEdit, setMediaToEdit] = useState<MediaItem | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' | 'warning' } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    window.setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3800);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let items = INITIAL_MEDIA_LIST;
      let reviews: ServerReview[] = [];
      try {
        const mediaResponse = await apiRequest<{ success: boolean; data: any[] }>('/api/media');
        if (Array.isArray(mediaResponse.data) && mediaResponse.data.length > 0) {
          items = mediaResponse.data.map(mapServerMedia);
        }
      } catch {
        items = INITIAL_MEDIA_LIST;
      }
      try {
        const reviewResponse = await apiRequest<{ success: boolean; data: ServerReview[] }>('/api/community/reviews');
        if (Array.isArray(reviewResponse.data)) reviews = reviewResponse.data;
      } catch {
        reviews = [];
      }
      if (!cancelled) setMediaList(attachCommunityReviews(items, reviews));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setUserReviews({});
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const response = await apiRequest<{ success: boolean; data: Record<string, UserReview> }>('/api/me/library');
        if (!cancelled) setUserReviews(response.data || {});
      } catch {
        if (!cancelled) setUserReviews({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser?.id]);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, []);

  useEffect(() => {
    if (authUser) {
      setActiveTab((prev) => (prev === 'landing' ? 'sistema' : prev));
    } else {
      setActiveTab('landing');
    }
  }, [authUser?.id]);

  const openAuthModal = useCallback(
    (mode: 'login' | 'register' = 'login') => {
      requestLogin(mode);
    },
    [requestLogin],
  );

  const closeAuthModal = useCallback(() => undefined, []);

  const openAssistant = useCallback((initialPrompt?: string) => {
    if (initialPrompt) setAssistantInitialPrompt(initialPrompt);
    setIsAssistantOpen(true);
  }, []);

  const closeAssistant = useCallback(() => {
    setIsAssistantOpen(false);
    setAssistantInitialPrompt(null);
  }, []);

  const setAddModalOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsAddModalOpenState(false);
        return;
      }
      if (!authUser) {
        requestLogin('login');
        return;
      }
      setIsAddModalOpenState(true);
    },
    [authUser, requestLogin, showToast],
  );

  const setUserName = useCallback(
    (name: string) => {
      if (!authUser || !name.trim()) return;
      void authUpdateProfile({ name: name.trim() });
    },
    [authUser, authUpdateProfile],
  );

  const updateProfile = useCallback(
    (data: Partial<UserProfile>) => {
      if (!authUser) return;
      void authUpdateProfile(data);
    },
    [authUser, authUpdateProfile],
  );

  const updateUserProfile = useCallback(
    (data: Partial<UserProfile>) => {
      if (!authUser) return;
      void authUpdateProfile(data).then((result) => {
        if (result.success) showToast('Perfil actualizado correctamente.', 'success');
        else showToast(result.message || 'No se pudo actualizar el perfil.', 'warning');
      });
    },
    [authUser, authUpdateProfile, showToast],
  );

  const openTrailer = useCallback((youtubeIdOrUrl?: string) => {
    if (!youtubeIdOrUrl) return;
    setActiveTrailerUrl(youtubeIdOrUrl);
    setIsTrailerModalOpen(true);
  }, []);

  const closeTrailer = useCallback(() => {
    setIsTrailerModalOpen(false);
    setActiveTrailerUrl(null);
  }, []);

  const updateUserReview = useCallback(
    (review: UserReview) => {
      if (!authUser) {
        requestLogin();
        return;
      }
      const normalized: UserReview = { ...review, updatedAt: new Date().toISOString() };
      setUserReviews((prev) => ({ ...prev, [review.mediaId]: normalized }));

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        showToast('Sin conexión: el cambio no se ha guardado en el servidor.', 'warning');
        return;
      }

      apiRequest(`/api/me/library/${encodeURIComponent(review.mediaId)}`, {
        method: 'PUT',
        body: JSON.stringify({ review: normalized }),
      }).catch((error) => {
        showToast(error instanceof ApiError ? error.message : 'No se pudo guardar el cambio.', 'warning');
      });

      if (review.status === 'terminada' && review.stars >= 4) {
        try {
          confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }
    },
    [authUser, requestLogin, showToast],
  );

  const updateMediaStatus = useCallback(
    (mediaId: string, status: WatchStatus) => {
      if (!authUser) {
        requestLogin();
        return;
      }
      const targetMedia = mediaList.find((media) => media.id === mediaId);
      if (!targetMedia) return;
      const existingReview = userReviews[mediaId];
      const isAddingFirstTime = !existingReview;

      updateUserReview({
        mediaId,
        status,
        stars: existingReview?.stars ?? 0,
        year: existingReview?.year || targetMedia.year,
        genres: existingReview?.genres || targetMedia.genres,
        evaluation: existingReview?.evaluation || '',
        critique: existingReview?.critique || '',
        director: existingReview?.director || targetMedia.director,
        watchedDate: existingReview?.watchedDate || (status === 'terminada' ? new Date().toISOString().split('T')[0] : ''),
        platform: existingReview?.platform || targetMedia.defaultPlatform,
        wouldRewatch: existingReview?.wouldRewatch || '',
        favoriteMoment: existingReview?.favoriteMoment || '',
        updatedAt: new Date().toISOString(),
      });

      if (isAddingFirstTime) {
        setMediaList((prev) =>
          prev.map((media) => (media.id === mediaId ? { ...media, addedToListCount: media.addedToListCount + 1 } : media)),
        );
      }
    },
    [authUser, mediaList, userReviews, updateUserReview, requestLogin],
  );

  const removeFromMyList = useCallback(
    (mediaId: string) => {
      if (!authUser) {
        requestLogin();
        return;
      }
      setUserReviews((prev) => {
        const next = { ...prev };
        delete next[mediaId];
        return next;
      });
      setMediaList((prev) =>
        prev.map((media) =>
          media.id === mediaId ? { ...media, addedToListCount: Math.max(0, media.addedToListCount - 1) } : media,
        ),
      );
      apiRequest(`/api/me/library/${encodeURIComponent(mediaId)}`, { method: 'DELETE' }).catch((error) => {
        showToast(error instanceof ApiError ? error.message : 'No se pudo eliminar el título.', 'warning');
      });
    },
    [authUser, requestLogin, showToast],
  );

  const addCommunityComment = useCallback(
    (mediaId: string, text: string, rating: number) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!authUser) {
        requestLogin();
        return;
      }
      apiRequest<{ success: boolean; data: ServerReview }>('/api/community/reviews', {
        method: 'POST',
        body: JSON.stringify({ mediaId, comment: trimmed, rating }),
      })
        .then((response) => {
          const comment = mapCommunityComment(response.data);
          setMediaList((prev) =>
            prev.map((media) =>
              media.id === mediaId ? withComments(media, [comment, ...media.comments]) : media,
            ),
          );
          showToast('Reseña publicada en la comunidad.', 'success');
        })
        .catch((error) => {
          showToast(error instanceof ApiError ? error.message : 'No se pudo publicar la reseña.', 'warning');
        });
    },
    [authUser, requestLogin, showToast],
  );

  const toggleCommentLike = useCallback(
    (mediaId: string, commentId: string) => {
      if (!authUser) {
        requestLogin();
        return;
      }
      apiRequest<{ success: boolean; data: { liked: boolean; likes: number } }>(
        `/api/community/reviews/${encodeURIComponent(commentId)}/like`,
        { method: 'POST' },
      )
        .then((response) => {
          setMediaList((prev) =>
            prev.map((media) => {
              if (media.id !== mediaId) return media;
              return {
                ...media,
                comments: media.comments.map((comment) =>
                  comment.id === commentId
                    ? { ...comment, likes: response.data.likes, isUserLiked: response.data.liked }
                    : comment,
                ),
              };
            }),
          );
        })
        .catch((error) => {
          showToast(error instanceof ApiError ? error.message : 'No se pudo registrar el voto.', 'warning');
        });
    },
    [authUser, requestLogin, showToast],
  );

  const submitDetailedVote = useCallback(
    (mediaId: string, scores: Partial<DetailedCommunityVotes>) => {
      if (!authUser) {
        requestLogin();
        return;
      }
      setMediaList((prev) =>
        prev.map((media) => {
          if (media.id !== mediaId) return media;
          const votes = media.detailedVotes.totalVotes + 1;
          const nextScore = (current: number, incoming?: number) =>
            incoming ? Number(((current * media.detailedVotes.totalVotes + incoming) / votes).toFixed(1)) : current;
          return {
            ...media,
            detailedVotes: {
              ...media.detailedVotes,
              script: nextScore(media.detailedVotes.script, scores.script),
              acting: nextScore(media.detailedVotes.acting, scores.acting),
              soundtrack: nextScore(media.detailedVotes.soundtrack, scores.soundtrack),
              visuals: nextScore(media.detailedVotes.visuals, scores.visuals),
              direction: nextScore(media.detailedVotes.direction, scores.direction),
              totalVotes: votes,
            },
          };
        }),
      );
      showToast('Votación técnica registrada.', 'success');
    },
    [authUser, requestLogin, showToast],
  );

  const updateMediaItem = useCallback(
    (item: MediaItem, summary?: string): { success: boolean; message?: string } => {
      if (!authUser || !canEditCatalog(authUser.role)) {
        showToast('Solo administradores y el Owner pueden editar el catálogo.', 'warning');
        return { success: false, message: 'No tienes permisos para editar el catálogo.' };
      }
      const existing = mediaList.find((media) => media.id === item.id);
      const now = new Date();
      const editDateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
      const historyEntry = {
        id: `hist-${Date.now()}`,
        timestamp: editDateStr,
        user: authUser.name,
        field: summary || 'Edición general de ficha',
        oldValue: existing
          ? {
              title: existing.title,
              year: existing.year,
              synopsis: existing.synopsis,
              director: existing.director,
              duration: existing.duration,
              posterUrl: existing.posterUrl,
            }
          : null,
        newValue: {
          title: item.title,
          year: item.year,
          synopsis: item.synopsis,
          director: item.director,
          duration: item.duration,
          posterUrl: item.posterUrl,
        },
      };
      const updated: MediaItem = {
        ...item,
        lastEditedBy: authUser.name,
        lastEditedAt: editDateStr,
        editHistory: existing?.editHistory
          ? [historyEntry, ...existing.editHistory.slice(0, 9)]
          : [historyEntry],
      };
      setMediaList((prev) => prev.map((media) => (media.id === item.id ? updated : media)));
      apiRequest(`/api/media/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        body: JSON.stringify(updated),
      })
        .then(() => showToast(`Ficha de ${updated.title} actualizada.`, 'success'))
        .catch((error) => {
          showToast(error instanceof ApiError ? error.message : 'El cambio no se guardó en el servidor.', 'warning');
        });
      return { success: true };
    },
    [authUser, mediaList, showToast],
  );

  const restoreMediaItem = useCallback(
    (id: string): { success: boolean; message?: string } => {
      if (!authUser || !canEditCatalog(authUser.role)) {
        showToast('Solo administradores y el Owner pueden restaurar fichas.', 'warning');
        return { success: false, message: 'No tienes permisos.' };
      }
      const original = INITIAL_MEDIA_LIST.find((media) => media.id === id);
      if (!original) return { success: false, message: 'No se encontró la versión original.' };
      setMediaList((prev) => prev.map((media) => (media.id === id ? original : media)));
      apiRequest(`/api/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(original),
      }).catch(() => undefined);
      showToast(`Datos originales restaurados para ${original.title}.`, 'info');
      return { success: true };
    },
    [authUser, showToast],
  );

  const restoreAllMedia = useCallback(() => {
    if (!authUser || !canEditCatalog(authUser.role)) {
      showToast('Solo administradores y el Owner pueden restaurar el catálogo.', 'warning');
      return;
    }
    setMediaList(INITIAL_MEDIA_LIST);
    showToast('Catálogo restaurado en esta sesión.', 'info');
  }, [authUser, showToast]);

  const undoLastMediaChange = useCallback(
    (id: string): { success: boolean; message?: string } => {
      if (!authUser || !canEditCatalog(authUser.role)) {
        showToast('Solo administradores y el Owner pueden deshacer cambios.', 'warning');
        return { success: false, message: 'No tienes permisos.' };
      }
      const current = mediaList.find((media) => media.id === id);
      if (!current || !current.editHistory || current.editHistory.length === 0) {
        return { success: false, message: 'No hay cambios anteriores para deshacer.' };
      }
      const [lastChange, ...restHistory] = current.editHistory;
      if (!lastChange.oldValue) return restoreMediaItem(id);
      const restored: MediaItem = { ...current, ...lastChange.oldValue, editHistory: restHistory };
      setMediaList((prev) => prev.map((media) => (media.id === id ? restored : media)));
      apiRequest(`/api/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(restored),
      }).catch(() => undefined);
      showToast(`Se deshizo el último cambio en ${restored.title}.`, 'info');
      return { success: true };
    },
    [authUser, mediaList, restoreMediaItem, showToast],
  );

  const openEditMediaModal = useCallback(
    (media: MediaItem): boolean => {
      if (!authUser || !canEditCatalog(authUser.role)) {
        showToast('Solo administradores y el Owner pueden editar el catálogo.', 'warning');
        return false;
      }
      setMediaToEdit(media);
      setIsEditMediaModalOpen(true);
      return true;
    },
    [authUser, showToast],
  );

  const deleteMediaItem = useCallback(
    async (id: string): Promise<{ success: boolean; message?: string }> => {
      if (!authUser || !canEditCatalog(authUser.role)) {
        showToast('Solo administradores y el Owner pueden eliminar títulos del catálogo.', 'warning');
        return { success: false, message: 'No tienes permisos para eliminar títulos del catálogo.' };
      }

      const itemToDelete = mediaList.find((m) => m.id === id);
      const title = itemToDelete?.title || 'Título';

      try {
        await apiRequest(`/api/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
        setMediaList((prev) => prev.filter((m) => m.id !== id));
        if (selectedMediaId === id) {
          setSelectedMediaId(null);
        }
        showToast(`"${title}" ha sido eliminado del catálogo.`, 'info');
        return { success: true };
      } catch (err: any) {
        const errorMsg = err instanceof ApiError ? err.message : 'No se pudo eliminar el título del servidor.';
        showToast(errorMsg, 'warning');
        return { success: false, message: errorMsg };
      }
    },
    [authUser, mediaList, selectedMediaId, showToast, setSelectedMediaId],
  );

  const addCustomMedia = useCallback(
    (item: Partial<MediaItem> & { title: string; type: MediaItem['type'] }): string => {
      if (!authUser) {
        requestLogin('login');
        return '';
      }

      // Check for duplicates: allow remakes (different year) or extended/director cuts
      const normalizedNew = (item.title || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
      const existing = mediaList.find((m) => {
        const norm = (m.title || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
        return norm === normalizedNew && m.type === item.type;
      });

      if (existing) {
        const itemYear = Number(item.year) || new Date().getFullYear();
        const isRemakeOfOtherEra = Math.abs(itemYear - existing.year) >= 2;
        if (!isRemakeOfOtherEra) {
          showToast(
            `Ya existe "${existing.title}" (${existing.year}) en el catálogo. Para registrarlo nuevamente, debe tratarse de un remake (año distinto con al menos 2 años de diferencia) o especificar una variante en el título (ej: 'Versión Extendida', 'Director's Cut').`,
            'warning',
          );
          return '';
        }
      }

      const newId = `custom-${Date.now()}-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const now = new Date().toISOString();
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
        posterUrl:
          item.posterUrl ||
          'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
        backdropUrl:
          item.backdropUrl ||
          item.posterUrl ||
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: item.trailerYoutubeId || '',
        defaultPlatform: item.defaultPlatform || 'Netflix',
        streamingPlatforms: item.streamingPlatforms || [item.defaultPlatform || 'Netflix'],
        communityRating: 0,
        communityVotesCount: 0,
        addedToListCount: 0,
        isFeatured: false,
        isTrending: true,
        isTopClassified: false,
        createdAt: now,
        isCustomUserCreated: true,
        createdByUserId: authUser.id,
        detailedVotes: emptyDetailedVotes(),
        comments: [],
        seasonsCount: item.seasonsCount,
        episodesCount: item.episodesCount,
        releaseDate: item.releaseDate,
        country: item.country,
        language: item.language,
        ageRating: item.ageRating,
      };

      setMediaList((prev) => [newMedia, ...prev]);

      apiRequest('/api/media', {
        method: 'POST',
        body: JSON.stringify({
          id: newMedia.id,
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
          streamingPlatforms: newMedia.streamingPlatforms,
          rating: 0,
          ratingCount: 0,
          createdByUserId: authUser.id,
          seasonsCount: newMedia.seasonsCount,
          episodesCount: newMedia.episodesCount,
          releaseDate: newMedia.releaseDate,
          country: newMedia.country,
          language: newMedia.language,
          ageRating: newMedia.ageRating,
        }),
      })
        .then(() => showToast(`Título añadido: ${newMedia.title}.`, 'success'))
        .catch((error) => {
          setMediaList((prev) => prev.filter((m) => m.id !== newMedia.id));
          showToast(error instanceof ApiError ? error.message : 'El título no se guardó en el servidor.', 'warning');
        });

      return newId;
    },
    [authUser, mediaList, showToast, requestLogin],
  );

  const getReview = useCallback((mediaId: string) => userReviews[mediaId], [userReviews]);

  const enableGuestOfflineMode = useCallback(() => {
    continueAsGuest();
    setActiveTab('explorar');
  }, [continueAsGuest]);

  const syncOfflineQueue = useCallback(async () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSyncTime(now);
    return { success: true, syncedCount: 0 };
  }, []);

  const exportLocalBackup = useCallback(() => {
    try {
      const backup: LocalBackupData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        currentUser: currentUser || null,
        mediaList: mediaList.filter((m) => m.isCustomUserCreated),
        userReviews,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `screenlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      showToast('Copia de seguridad exportada correctamente.', 'success');
    } catch {
      showToast('No se pudo exportar el respaldo.', 'warning');
    }
  }, [currentUser, mediaList, userReviews, showToast]);

  const importLocalBackup = useCallback(
    async (file: File): Promise<{ success: boolean; message: string; count: number }> => {
      if (!authUser) {
        return { success: false, message: 'Inicia sesión para importar un respaldo.', count: 0 };
      }

      // 1. File existence and size limit (max 10MB)
      if (!file) {
        return { success: false, message: 'No se seleccionó ningún archivo.', count: 0 };
      }
      if (file.size > 10 * 1024 * 1024) {
        return { success: false, message: 'El archivo excede el tamaño máximo permitido (10 MB).', count: 0 };
      }

      // 2. File type validation
      const fileName = file.name.toLowerCase();
      if (!fileName.endsWith('.json') && file.type && !file.type.includes('json') && file.type !== 'text/plain') {
        return { success: false, message: 'Formato inválido. Debe ser un archivo .json de respaldo.', count: 0 };
      }

      try {
        const text = await file.text();
        if (!text || !text.trim()) {
          return { success: false, message: 'El archivo está vacío.', count: 0 };
        }

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          return { success: false, message: 'El archivo no contiene un JSON válido o está dañado.', count: 0 };
        }

        // 3. Extract candidate reviews and media items from various backup formats
        let candidateReviews: any[] = [];
        let candidateMedia: MediaItem[] = [];

        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.review && typeof item.review === 'object') {
              candidateReviews.push(item.review);
              if (item.media && typeof item.media === 'object') candidateMedia.push(item.media);
            } else if (item?.mediaId && item?.status) {
              candidateReviews.push(item);
            }
          }
        } else if (parsed && typeof parsed === 'object') {
          if (parsed.userReviews && typeof parsed.userReviews === 'object') {
            candidateReviews = Object.values(parsed.userReviews);
          }
          if (Array.isArray(parsed.mediaList)) {
            candidateMedia = parsed.mediaList;
          }
        }

        if (candidateReviews.length === 0 && candidateMedia.length === 0) {
          return {
            success: false,
            message: 'El archivo no contiene reseñas ni títulos compatibles con ScreenLog.',
            count: 0,
          };
        }

        // 4. Restore custom media items so reviews will not be orphaned
        if (candidateMedia.length > 0) {
          for (const media of candidateMedia) {
            if (media?.id && media?.title && media.isCustomUserCreated) {
              const alreadyExists = mediaList.some((m) => m.id === media.id);
              if (!alreadyExists) {
                try {
                  await apiRequest('/api/media', {
                    method: 'POST',
                    body: JSON.stringify(media),
                  });
                  setMediaList((prev) => [media, ...prev]);
                } catch {
                  // Ignore if already registered
                }
              }
            }
          }
        }

        // 5. Sanitize, validate and persist each review
        let imported = 0;
        const validStatuses: WatchStatus[] = ['pendiente', 'en_proceso', 'terminada'];
        const validRewatches: RewatchChoice[] = ['si_totalmente', 'quizas', 'no_suficiente', 'jamas'];

        for (const raw of candidateReviews) {
          if (!raw || typeof raw !== 'object' || !raw.mediaId || typeof raw.mediaId !== 'string') continue;

          const mediaId = String(raw.mediaId).slice(0, 120).trim();
          if (!mediaId) continue;

          const status: WatchStatus =
            raw.status === 'viendo'
              ? 'en_proceso'
              : validStatuses.includes(raw.status)
              ? raw.status
              : 'pendiente';
          const stars = typeof raw.stars === 'number' && !isNaN(raw.stars) ? Math.max(0, Math.min(5, raw.stars)) : 0;
          const wouldRewatch: RewatchChoice =
            validRewatches.includes(raw.wouldRewatch)
              ? raw.wouldRewatch
              : raw.rewatch === 'si'
              ? 'si_totalmente'
              : raw.rewatch === 'no'
              ? 'no_suficiente'
              : 'quizas';
          const platform = typeof raw.platform === 'string' ? raw.platform.slice(0, 80) : '';
          const critique = typeof raw.critique === 'string' ? raw.critique.slice(0, 4000) : '';
          const watchedDate = typeof raw.watchedDate === 'string' ? raw.watchedDate.slice(0, 40) : '';

          const sanitizedReview: UserReview = {
            mediaId,
            status,
            stars,
            wouldRewatch,
            platform,
            critique,
            watchedDate,
            year: Number(raw.year) || new Date().getFullYear(),
            genres: Array.isArray(raw.genres) ? raw.genres : [],
            evaluation: typeof raw.evaluation === 'string' ? raw.evaluation : '',
            director: typeof raw.director === 'string' ? raw.director : '',
            updatedAt: raw.updatedAt && typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
          };

          try {
            await apiRequest(`/api/me/library/${encodeURIComponent(mediaId)}`, {
              method: 'PUT',
              body: JSON.stringify({ review: sanitizedReview }),
            });
            imported += 1;
          } catch {
            // continue with remaining entries
          }
        }

        // 6. Refresh library in local state
        const response = await apiRequest<{ success: boolean; data: Record<string, UserReview> }>('/api/me/library');
        setUserReviews(response.data || {});

        return {
          success: true,
          message: `Respaldo restaurado con éxito: ${imported} reseñas validadas y sincronizadas.`,
          count: imported,
        };
      } catch (err: any) {
        return {
          success: false,
          message: err?.message || 'Error inesperado al procesar el archivo.',
          count: 0,
        };
      }
    },
    [authUser, mediaList],
  );

  const clearLocalData = useCallback(() => {
    try {
      [STORAGE_MEDIA_KEY, STORAGE_REVIEWS_KEY, STORAGE_SYNC_QUEUE_KEY, STORAGE_LAST_SYNC_KEY, STORAGE_OVERRIDES_KEY].forEach(
        (key) => localStorage.removeItem(key),
      );
    } catch {
      // ignore
    }
    setUserReviews({});
    setMediaList(INITIAL_MEDIA_LIST);
    showToast('Datos locales eliminados.', 'info');
  }, [showToast]);

  const logout = useCallback(() => {
    void authLogout();
    setSelectedMediaId(null);
    setActiveTab('landing');
    showToast('Sesión cerrada.', 'info');
  }, [authLogout, showToast]);

  const topClassifiedMedia = useMemo(
    () =>
      [...mediaList].sort(
        (a, b) => b.communityRating - a.communityRating || b.communityVotesCount - a.communityVotesCount || b.year - a.year,
      ),
    [mediaList],
  );
  const mostAddedMedia = useMemo(
    () => [...mediaList].sort((a, b) => b.addedToListCount - a.addedToListCount || b.year - a.year),
    [mediaList],
  );
  const featuredMedia = useMemo(
    () => mediaList.filter((media) => media.isFeatured),
    [mediaList],
  );
  const myListEntries = useMemo(
    () =>
      Object.entries(userReviews)
        .map(([mediaId, review]) => {
          const media = mediaList.find((item) => item.id === mediaId);
          return media ? { media, review } : null;
        })
        .filter(Boolean) as { media: MediaItem; review: UserReview }[],
    [mediaList, userReviews],
  );
  const statusCounts = useMemo(
    () => ({
      all: myListEntries.length,
      pendiente: myListEntries.filter((entry) => entry.review.status === 'pendiente').length,
      en_proceso: myListEntries.filter((entry) => entry.review.status === 'en_proceso').length,
      terminada: myListEntries.filter((entry) => entry.review.status === 'terminada').length,
    }),
    [myListEntries],
  );

  const selectedMedia = mediaList.find((media) => media.id === selectedMediaId) || null;
  const userName = currentUser?.name || 'Invitado';
  const userAvatar = currentUser?.avatar || DEFAULT_AVATAR;

  const value: MediaContextType = {
    mediaList,
    userReviews,
    activeTab,
    setActiveTab,
    selectedMediaId,
    setSelectedMediaId,
    selectedMedia,
    isAddModalOpen,
    setIsAddModalOpen: setAddModalOpen,
    isTrailerModalOpen,
    setIsTrailerModalOpen,
    activeTrailerUrl,
    openTrailer,
    closeTrailer,
    searchQuery,
    setSearchQuery,
    isAssistantOpen,
    setIsAssistantOpen,
    openAssistant,
    closeAssistant,
    assistantInitialPrompt,
    currentUser,
    usersList: currentUser ? [currentUser] : [],
    isAuthModalOpen: false,
    authModalMode: 'login',
    openAuthModal,
    closeAuthModal,
    login: () => ({ success: false, message: 'Usa la pantalla de acceso para iniciar sesión.' }),
    register: () => ({ success: false, message: 'Usa la pantalla de acceso para registrarte.' }),
    logout,
    updateProfile,
    updateUserProfile,
    updateMediaItem,
    deleteMediaItem,
    restoreMediaItem,
    restoreAllMedia,
    undoLastMediaChange,
    isEditMediaModalOpen,
    setIsEditMediaModalOpen,
    mediaToEdit,
    setMediaToEdit,
    openEditMediaModal,
    isEditProfileModalOpen,
    setIsEditProfileModalOpen,
    toastMessage,
    showToast,
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
    isOnline,
    offlineSyncQueue: [],
    lastSyncTime,
    isSyncing,
    syncOfflineQueue,
    exportLocalBackup,
    importLocalBackup,
    enableGuestOfflineMode,
    clearLocalData,
    getReview,
    topClassifiedMedia,
    mostAddedMedia,
    featuredMedia,
    myListEntries,
    statusCounts,
  };

  return <MediaContext.Provider value={value}>{children}</MediaContext.Provider>;
};

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};
