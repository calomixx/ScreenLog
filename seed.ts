import { db } from './src/db/index';
import { users, mediaItems } from './src/db/schema';
import { INITIAL_MEDIA_LIST } from './src/data/initialMedia';

export async function seedDb() {
  console.log('Seeding DB...');
  const DEMO_USERS = [
    {
      id: 'user-0',
      name: 'demon',
      email: 'demon@screenlog.app',
      password: '123456',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      role: 'admin',
      favoriteGenres: ['Acción', 'Sci-Fi'],
      bio: 'Super administrador.'
    },
    {
      id: 'user-1',
      name: 'Miguel Torrealba',
      email: 'miguel@screenlog.app',
      password: '123456',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      role: 'admin',
      favoriteGenres: ['Ciencia Ficción', 'Drama', 'Thriller'],
      bio: 'Cinéfilo empedernido. Amante del cine de autor, Nolan, Villeneuve y clásicos de culto.'
    },
    {
      id: 'user-2',
      name: 'Elena Vega',
      email: 'elena@screenlog.app',
      password: '123456',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      role: 'critic',
      favoriteGenres: ['Drama', 'Terror / Suspense', 'Animación'],
      bio: 'Crítica de cine independiente y redactora. Analizando guiones y cinematografía.'
    },
    {
      id: 'user-3',
      name: 'Carlos Ruiz',
      email: 'carlos@screenlog.app',
      password: '123456',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      role: 'user',
      favoriteGenres: ['Acción', 'Aventura', 'Ciencia Ficción'],
      bio: 'Maratoneando series los fines de semana y buscando siempre la siguiente joya oculta.'
    }
  ];

  for (const user of DEMO_USERS) {
    await db.insert(users).values(user).onConflictDoNothing({ target: users.id });
  }

  for (const m of INITIAL_MEDIA_LIST) {
    const newItem = {
      id: m.id,
      title: m.title,
      originalTitle: m.originalTitle || m.title,
      year: Number(m.year) || new Date().getFullYear(),
      type: m.type || 'pelicula',
      genres: m.genres || ['Drama'],
      director: m.director || 'Desconocido',
      cast: m.cast || [],
      synopsis: m.synopsis || '',
      posterUrl: m.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
      backdropUrl: m.backdropUrl || m.posterUrl,
      trailerUrl: m.trailerYoutubeId,
      duration: m.duration || '2h 00m',
      seasons: null,
      episodes: null,
      streamingPlatforms: [m.defaultPlatform],
      rating: m.communityRating || 5,
      ratingCount: m.communityVotesCount || 1,
      featured: Boolean(m.isFeatured),
      trending: Boolean(m.isTrending),
      topRated: Boolean(m.isTopClassified),
      createdByUserId: null
    };
    await db.insert(mediaItems).values(newItem).onConflictDoNothing({ target: mediaItems.id });
  }
  console.log('Seeding completed.');
}
