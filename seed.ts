import { db } from './src/db/index';
import { users, mediaItems } from './src/db/schema';
import { INITIAL_MEDIA_LIST } from './src/data/initialMedia';

export async function seedDb() {
  await db.delete(users).catch(() => undefined);

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
      rating: 0,
      ratingCount: 0,
      featured: Boolean(m.isFeatured),
      trending: Boolean(m.isTrending),
      topRated: Boolean(m.isTopClassified),
      createdByUserId: null,
    };
    await db.insert(mediaItems).values(newItem).onConflictDoUpdate({
      target: mediaItems.id,
      set: {
        title: newItem.title,
        originalTitle: newItem.originalTitle,
        year: newItem.year,
        type: newItem.type,
        genres: newItem.genres,
        director: newItem.director,
        cast: newItem.cast,
        synopsis: newItem.synopsis,
        posterUrl: newItem.posterUrl,
        backdropUrl: newItem.backdropUrl,
        trailerUrl: newItem.trailerUrl,
        duration: newItem.duration,
        streamingPlatforms: newItem.streamingPlatforms,
        rating: 0,
        ratingCount: 0,
        featured: newItem.featured,
        trending: newItem.trending,
        topRated: newItem.topRated,
      },
    });
  }
}
