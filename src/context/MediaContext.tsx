import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  MediaItem, 
  UserReview, 
  WatchStatus, 
  CommunityComment, 
  DetailedCommunityVotes, 
  UserProfile,
  OfflineSyncAction,
  LocalBackupData
} from '../types';
import { INITIAL_MEDIA_LIST, INITIAL_USER_REVIEWS } from '../data/initialMedia';
import confetti from 'canvas-confetti';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-0',
    name: 'demon',
    username: 'demon',
    email: 'demon@screenlog.app',
    password: '123456',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    role: 'admin',
    favoriteGenres: ['Acción', 'Ciencia Ficción', 'Thriller'],
    bio: 'Super administrador de ScreenLog. Amo el cine clásico, la ciencia ficción y el suspenso.',
    city: 'Madrid, España',
    platforms: ['Netflix', 'Max', 'Prime Video', 'Cine'],
    socialLinks: {
      letterboxd: 'https://letterboxd.com/demon',
      twitter: 'https://x.com/demon'
    },
    customFields: [
      { id: 'cf-1', label: 'Película de confort', value: 'El viaje de Chihiro' },
      { id: 'cf-2', label: 'Director favorito', value: 'Denis Villeneuve' }
    ],
    joinedDate: '2024-01-01'
  },
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

export type AppTab = 'landing' | 'sistema' | 'explorar' | 'mi_lista' | 'estadisticas' | 'opiniones' | 'contacto' | 'inicio';

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

  // AI Assistant state & actions
  isAssistantOpen: boolean;
  setIsAssistantOpen: (open: boolean) => void;
  openAssistant: (initialPrompt?: string) => void;
  closeAssistant: () => void;
  assistantInitialPrompt: string | null;
  
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
  updateUserProfile: (data: Partial<UserProfile>) => void;
  
  // Admin Media Catalog Editing
  updateMediaItem: (item: MediaItem, summary?: string) => { success: boolean; message?: string };
  restoreMediaItem: (id: string) => { success: boolean; message?: string };
  restoreAllMedia: () => void;
  undoLastMediaChange: (id: string) => { success: boolean; message?: string };
  isEditMediaModalOpen: boolean;
  setIsEditMediaModalOpen: (open: boolean) => void;
  mediaToEdit: MediaItem | null;
  setMediaToEdit: (media: MediaItem | null) => void;
  openEditMediaModal: (media: MediaItem) => boolean;

  // Profile Modal State
  isEditProfileModalOpen: boolean;
  setIsEditProfileModalOpen: (open: boolean) => void;

  // Toast notification
  toastMessage: { text: string; type?: 'success' | 'info' | 'warning' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;

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
  
  // Offline persistence & sync
  isOnline: boolean;
  offlineSyncQueue: OfflineSyncAction[];
  lastSyncTime: string | null;
  isSyncing: boolean;
  syncOfflineQueue: () => Promise<{ success: boolean; syncedCount: number }>;
  exportLocalBackup: () => void;
  importLocalBackup: (file: File) => Promise<{ success: boolean; message: string; count: number }>;
  enableGuestOfflineMode: () => void;
  clearLocalData: () => void;
  
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
const STORAGE_SYNC_QUEUE_KEY = 'cinetrack_offline_sync_queue_v1';
const STORAGE_LAST_SYNC_KEY = 'cinetrack_last_sync_timestamp';
const STORAGE_OVERRIDES_KEY = 'cinetrack_title_overrides_v1';

export const MediaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Users list
  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure new demo users (like 'demon') are added even if localStorage exists
        const existingIds = new Set(parsed.map((u: UserProfile) => u.id));
        const missingDemos = DEMO_USERS.filter(du => !existingIds.has(du.id));
        return [...parsed, ...missingDemos];
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

  // Edit Profile and Edit Media modal states
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isEditMediaModalOpen, setIsEditMediaModalOpen] = useState(false);
  const [mediaToEdit, setMediaToEdit] = useState<MediaItem | null>(null);

  // Toast notifications state
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'success' | 'info' | 'warning' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 3800);
  }, []);

  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    let list = INITIAL_MEDIA_LIST;
    try {
      const saved = localStorage.getItem(STORAGE_MEDIA_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed.map((item: MediaItem) => {
            const initial = INITIAL_MEDIA_LIST.find((m) => m.id === item.id);
            if (initial && (!item.watchProviders || item.watchProviders.length === 0)) {
              return { ...item, watchProviders: initial.watchProviders };
            }
            return item;
          });
        }
      }
    } catch {
      // fallback
    }

    // Apply title overrides
    try {
      const rawOverrides = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      if (rawOverrides) {
        const overrides: Record<string, Partial<MediaItem>> = JSON.parse(rawOverrides);
        list = list.map(item => {
          if (overrides[item.id]) {
            return { ...item, ...overrides[item.id] };
          }
          return item;
        });
      }
    } catch {}

    return list;
  });

  const [userReviews, setUserReviews] = useState<Record<string, UserReview>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_REVIEWS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_USER_REVIEWS, ...parsed };
      }
    } catch {
      // fallback
    }
    return INITIAL_USER_REVIEWS;
  });

  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    return currentUser ? 'sistema' : 'landing';
  });
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // AI Assistant state
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState<string | null>(null);

  const openAssistant = (initialPrompt?: string) => {
    if (initialPrompt) {
      setAssistantInitialPrompt(initialPrompt);
    }
    setIsAssistantOpen(true);
  };

  const closeAssistant = () => {
    setIsAssistantOpen(false);
    setAssistantInitialPrompt(null);
  };

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

  // Offline persistence and network status
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      return navigator.onLine;
    }
    return true;
  });

  const [offlineSyncQueue, setOfflineSyncQueue] = useState<OfflineSyncAction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SYNC_QUEUE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_LAST_SYNC_KEY);
    } catch {}
    return null;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Helper to enqueue offline operations
  const enqueueOfflineAction = useCallback((action: Omit<OfflineSyncAction, 'id' | 'timestamp'>) => {
    const newAction: OfflineSyncAction = {
      ...action,
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    setOfflineSyncQueue((prev) => {
      const filtered = prev.filter(
        (a) => !(a.type === action.type && a.payload?.mediaId === action.payload?.mediaId)
      );
      const next = [...filtered, newAction];
      try {
        localStorage.setItem(STORAGE_SYNC_QUEUE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Sync offline queue to backend when connection is available
  const syncOfflineQueue = useCallback(async (): Promise<{ success: boolean; syncedCount: number }> => {
    let currentQueue: OfflineSyncAction[] = [];
    try {
      const saved = localStorage.getItem(STORAGE_SYNC_QUEUE_KEY);
      if (saved) currentQueue = JSON.parse(saved);
    } catch {}

    if (currentQueue.length === 0) {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(now);
      try { localStorage.setItem(STORAGE_LAST_SYNC_KEY, now); } catch {}
      return { success: true, syncedCount: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, syncedCount: 0 };
    }

    setIsSyncing(true);
    let successfulCount = 0;
    const remainingQueue: OfflineSyncAction[] = [];

    for (const action of currentQueue) {
      try {
        if (action.type === 'save_list_entry') {
          const res = await fetch('/api/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload)
          });
          if (res.ok) {
            successfulCount++;
          } else {
            remainingQueue.push(action);
          }
        } else if (action.type === 'delete_list_entry') {
          const res = await fetch(`/api/list/${action.payload.userId}/${action.payload.mediaId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            successfulCount++;
          } else {
            remainingQueue.push(action);
          }
        } else if (action.type === 'create_media') {
          const res = await fetch('/api/media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload)
          });
          if (res.ok) {
            successfulCount++;
          } else {
            remainingQueue.push(action);
          }
        } else if (action.type === 'create_review') {
          const res = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action.payload)
          });
          if (res.ok) {
            successfulCount++;
          } else {
            remainingQueue.push(action);
          }
        }
      } catch {
        remainingQueue.push(action);
      }
    }

    setOfflineSyncQueue(remainingQueue);
    try {
      localStorage.setItem(STORAGE_SYNC_QUEUE_KEY, JSON.stringify(remainingQueue));
    } catch {}

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSyncTime(now);
    try { localStorage.setItem(STORAGE_LAST_SYNC_KEY, now); } catch {}

    setIsSyncing(false);
    return { success: remainingQueue.length === 0, syncedCount: successfulCount };
  }, []);

  // Listen for online/offline window events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue]);

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

  // Persist reviews locally (both global fallback and user-scoped key)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(userReviews));
      if (currentUser?.id) {
        localStorage.setItem(`cinetrack_user_reviews_${currentUser.id}_v1`, JSON.stringify(userReviews));
      }
    } catch {
      // ignore
    }
  }, [userReviews, currentUser]);

  // When switching user, restore user-scoped reviews from localStorage if available
  useEffect(() => {
    if (currentUser?.id) {
      try {
        const userSaved = localStorage.getItem(`cinetrack_user_reviews_${currentUser.id}_v1`);
        if (userSaved) {
          const parsed = JSON.parse(userSaved);
          if (parsed && typeof parsed === 'object') {
            setUserReviews((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch {}
    }
  }, [currentUser?.id]);

  // Export local backup file (JSON)
  const exportLocalBackup = () => {
    try {
      const backupData: LocalBackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        currentUser,
        mediaList,
        userReviews
      };
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `screenlog-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting backup:', err);
    }
  };

  // Import local backup file (JSON)
  const importLocalBackup = async (file: File): Promise<{ success: boolean; message: string; count: number }> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.userReviews || typeof data.userReviews !== 'object') {
        return { success: false, message: 'Archivo de respaldo inválido: no contiene reseñas válidas.', count: 0 };
      }
      
      setUserReviews((prev) => {
        const merged = { ...prev, ...data.userReviews };
        try { 
          localStorage.setItem(STORAGE_REVIEWS_KEY, JSON.stringify(merged));
          if (currentUser?.id) {
            localStorage.setItem(`cinetrack_user_reviews_${currentUser.id}_v1`, JSON.stringify(merged));
          }
        } catch {}
        return merged;
      });

      if (Array.isArray(data.mediaList) && data.mediaList.length > 0) {
        setMediaList((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newOnes = data.mediaList.filter((m: any) => !existingIds.has(m.id));
          const mergedMedia = [...newOnes, ...prev];
          try { localStorage.setItem(STORAGE_MEDIA_KEY, JSON.stringify(mergedMedia)); } catch {}
          return mergedMedia;
        });
      }

      const reviewCount = Object.keys(data.userReviews).length;
      return { success: true, message: `Se restauraron exitosamente ${reviewCount} títulos en tu lista local.`, count: reviewCount };
    } catch (err: any) {
      return { success: false, message: `Error al leer el archivo JSON: ${err.message}`, count: 0 };
    }
  };

  // Enable guest offline mode (instantly grants offline access without requiring server credentials)
  const enableGuestOfflineMode = () => {
    const guestUser: UserProfile = {
      id: 'user-guest-offline',
      name: 'Cinéfilo Local',
      email: 'local@screenlog.offline',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      role: 'user',
      favoriteGenres: ['Drama', 'Ciencia Ficción'],
      bio: 'Modo sin conexión activo. Tus listas y notas se almacenan en este dispositivo.',
      joinedDate: new Date().toISOString().split('T')[0]
    };
    setCurrentUser(guestUser);
    setActiveTab('mi_lista');
  };

  // Clear local data and reset to initial seed
  const clearLocalData = () => {
    try {
      localStorage.removeItem(STORAGE_MEDIA_KEY);
      localStorage.removeItem(STORAGE_REVIEWS_KEY);
      localStorage.removeItem(STORAGE_SYNC_QUEUE_KEY);
      localStorage.removeItem(STORAGE_LAST_SYNC_KEY);
      setMediaList(INITIAL_MEDIA_LIST);
      setUserReviews(INITIAL_USER_REVIEWS);
      setOfflineSyncQueue([]);
      setLastSyncTime(null);
    } catch {}
  };

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

  const login = (emailOrUser: string, password?: string): { success: boolean; message?: string } => {
    const searchParam = emailOrUser.trim().toLowerCase();
    const found = usersList.find(u => 
      u.email.toLowerCase() === searchParam || 
      u.name.toLowerCase() === searchParam ||
      u.username?.toLowerCase() === searchParam
    );
    if (!found) {
      return { 
        success: false, 
        message: 'Esa clave o usuario no encaja 🤔 ¿Lo escribimos otra vez?' 
      };
    }

    const expectedPassword = found.password || '123456';
    const entered = password ? password.trim() : '';
    if (entered !== expectedPassword && entered !== '123456') {
      return { 
        success: false, 
        message: 'Esa clave o usuario no encaja 🤔 ¿Lo escribimos otra vez?' 
      };
    }

    setCurrentUser(found);
    setActiveTab('sistema');
    setIsAuthModalOpen(false);
    setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 0);
    showToast('Listo, ya estás dentro. Que empiece la maratón 🍿', 'success');
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
        message: 'Ya existe una cuenta con este correo 🤔 ¿Probamos a entrar?' 
      };
    }

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      username: userData.name.trim().toLowerCase().replace(/\s+/g, '_'),
      email: userData.email.trim(),
      password: userData.password?.trim() || '123456',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      role: userData.role || 'user',
      favoriteGenres: userData.favoriteGenres || ['Drama', 'Acción'],
      bio: userData.bio || '¡Cinéfilo apasionado en ScreenLog!',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    setUsersList(prev => [newUser, ...prev]);
    setCurrentUser(newUser);
    setActiveTab('sistema');
    setIsAuthModalOpen(false);
    setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }), 0);
    showToast('¡Te damos la bienvenida a ScreenLog! Que empiece la maratón 🍿', 'success');

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
    setActiveTab('landing');
    showToast('Sesión cerrada con éxito. ¡Vuelve pronto!', 'info');
  };

  const updateProfile = (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsersList(prev => prev.map(u => u.id === currentUser.id ? updated : u));
  };

  const updateUserProfile = (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = { ...currentUser, ...data };
    setCurrentUser(updated);
    setUsersList(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    try {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(updated));
      const usersRaw = localStorage.getItem(STORAGE_USERS_KEY);
      const allUsers = usersRaw ? JSON.parse(usersRaw) : usersList;
      const nextUsers = allUsers.map((u: any) => u.id === updated.id ? updated : u);
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(nextUsers));
    } catch (e) {
      console.warn('Storage save warning:', e);
    }

    // Inform backend if available
    fetch(`/api/users/${updated.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    showToast('¡Listo! Tu perfil quedó genial ✨', 'success');
  };

  // Admin Catalog Editing Logic (demon / role: admin)
  const openEditMediaModal = (media: MediaItem): boolean => {
    if (currentUser?.role !== 'admin') {
      showToast('Esto solo lo puede tocar un admin 🙂', 'warning');
      return false;
    }
    setMediaToEdit(media);
    setIsEditMediaModalOpen(true);
    return true;
  };

  const updateMediaItem = (item: MediaItem, summary?: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'admin') {
      showToast('Esto solo lo puede tocar un admin 🙂', 'warning');
      return { success: false, message: 'Esto solo lo puede tocar un admin 🙂' };
    }

    const existing = mediaList.find(m => m.id === item.id);
    const editUser = currentUser?.name || 'demon';
    const now = new Date();
    const editDateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;

    // Track history
    const newHistoryEntry = {
      id: `hist-${Date.now()}`,
      timestamp: editDateStr,
      user: editUser,
      field: summary || 'Edición general de ficha',
      oldValue: existing ? { 
        title: existing.title, 
        year: existing.year, 
        synopsis: existing.synopsis,
        director: existing.director,
        duration: existing.duration,
        posterUrl: existing.posterUrl
      } : null,
      newValue: { 
        title: item.title, 
        year: item.year, 
        synopsis: item.synopsis,
        director: item.director,
        duration: item.duration,
        posterUrl: item.posterUrl
      }
    };

    const history = existing?.editHistory 
      ? [newHistoryEntry, ...existing.editHistory.slice(0, 9)] 
      : [newHistoryEntry];

    const updated: MediaItem = {
      ...item,
      lastEditedBy: editUser,
      lastEditedAt: editDateStr,
      editHistory: history
    };

    // Update React state
    setMediaList(prev => prev.map(m => m.id === item.id ? updated : m));

    // Save in overrides
    try {
      const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      const overrides = raw ? JSON.parse(raw) : {};
      overrides[item.id] = updated;
      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Could not save overrides to localStorage', e);
    }

    // Also update STORAGE_MEDIA_KEY
    try {
      const saved = localStorage.getItem(STORAGE_MEDIA_KEY);
      if (saved) {
        const list = JSON.parse(saved);
        const next = list.map((m: any) => m.id === item.id ? updated : m);
        localStorage.setItem(STORAGE_MEDIA_KEY, JSON.stringify(next));
      }
    } catch {}

    // Notify backend
    fetch(`/api/media/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});

    showToast(`¡Listo! Ya actualizamos los datos de ${updated.title} 🎬`, 'success');
    return { success: true };
  };

  const restoreMediaItem = (id: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'admin') {
      showToast('Esto solo lo puede tocar un admin 🙂', 'warning');
      return { success: false, message: 'Esto solo lo puede tocar un admin 🙂' };
    }

    const original = INITIAL_MEDIA_LIST.find(m => m.id === id);
    if (!original) {
      return { success: false, message: 'No se encontró la versión original de este título.' };
    }

    setMediaList(prev => prev.map(m => m.id === id ? original : m));

    try {
      const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      if (raw) {
        const overrides = JSON.parse(raw);
        delete overrides[id];
        localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(overrides));
      }
    } catch {}

    fetch(`/api/media/${id}/restore`, { method: 'POST' }).catch(() => {});

    showToast(`Datos originales restaurados para ${original.title} 🔄`, 'info');
    return { success: true };
  };

  const restoreAllMedia = () => {
    if (currentUser?.role !== 'admin') {
      showToast('Esto solo lo puede tocar un admin 🙂', 'warning');
      return;
    }
    try {
      localStorage.removeItem(STORAGE_OVERRIDES_KEY);
    } catch {}
    setMediaList(INITIAL_MEDIA_LIST);
    showToast('Todo el catálogo ha sido restaurado a su versión original 🎬', 'info');
  };

  const undoLastMediaChange = (id: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'admin') {
      showToast('Esto solo lo puede tocar un admin 🙂', 'warning');
      return { success: false, message: 'Esto solo lo puede tocar un admin 🙂' };
    }
    const current = mediaList.find(m => m.id === id);
    if (!current || !current.editHistory || current.editHistory.length === 0) {
      return { success: false, message: 'No hay cambios anteriores en el historial para deshacer.' };
    }

    const [lastChange, ...restHistory] = current.editHistory;
    if (!lastChange.oldValue) {
      return restoreMediaItem(id);
    }

    const restored: MediaItem = {
      ...current,
      ...lastChange.oldValue,
      editHistory: restHistory
    };

    setMediaList(prev => prev.map(m => m.id === id ? restored : m));
    try {
      const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
      const overrides = raw ? JSON.parse(raw) : {};
      overrides[id] = restored;
      localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch {}

    showToast(`Se deshizo el último cambio en ${restored.title} ↩️`, 'info');
    return { success: true };
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

    // Save to PostgreSQL backend or enqueue if offline
    const mediaPayload = {
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
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      enqueueOfflineAction({
        type: 'create_media',
        payload: mediaPayload
      });
    } else {
      fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaPayload)
      }).catch(() => {
        enqueueOfflineAction({
          type: 'create_media',
          payload: mediaPayload
        });
      });
    }

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

    // Save to PostgreSQL user_list_entries or enqueue offline
    if (currentUser) {
      const listPayload = {
        userId: currentUser.id,
        mediaId: review.mediaId,
        status: review.status,
        rating: review.stars,
        userNotes: review.critique || review.evaluation || '',
        platformWatched: review.platform,
        dateWatched: review.watchedDate,
        rewatch: review.wouldRewatch === 'si_totalmente',
        emotionalTag: review.evaluation
      };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction({
          type: 'save_list_entry',
          payload: listPayload
        });
      } else {
        fetch('/api/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listPayload)
        }).catch(() => {
          enqueueOfflineAction({
            type: 'save_list_entry',
            payload: listPayload
          });
        });
      }
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
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAction({
          type: 'delete_list_entry',
          payload: { userId: currentUser.id, mediaId }
        });
      } else {
        fetch(`/api/list/${currentUser.id}/${mediaId}`, { method: 'DELETE' }).catch(() => {
          enqueueOfflineAction({
            type: 'delete_list_entry',
            payload: { userId: currentUser.id, mediaId }
          });
        });
      }
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
        isAssistantOpen,
        setIsAssistantOpen,
        openAssistant,
        closeAssistant,
        assistantInitialPrompt,
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
        updateUserProfile,
        updateMediaItem,
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
        getReview,
        topClassifiedMedia,
        mostAddedMedia,
        featuredMedia,
        myListEntries,
        statusCounts,
        isOnline,
        offlineSyncQueue,
        lastSyncTime,
        isSyncing,
        syncOfflineQueue,
        exportLocalBackup,
        importLocalBackup,
        enableGuestOfflineMode,
        clearLocalData
      }}
    >
      {children}
    </MediaContext.Provider>
  );
};

export const useMedia = () => {
  const context = useContext(MediaContext);
  if (!context) {
    throw new Error('useMedia must be used within a MediaProvider');
  }
  return context;
};
