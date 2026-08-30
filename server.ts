import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index';
import { users, mediaItems, userListEntries, mediaReviews, siteTestimonials, contactTickets } from './src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors({
    origin: process.env.APP_URL || 'http://localhost:3000',
    credentials: true
  }));

  // 1. Database Health & Status Endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), database: 'PostgreSQL (Cloud SQL)' });
  });

  app.get('/api/db-status', async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      const allMedia = await db.select().from(mediaItems);
      const allList = await db.select().from(userListEntries);
      const allReviews = await db.select().from(mediaReviews);
      const allTestimonials = await db.select().from(siteTestimonials);
      const allTickets = await db.select().from(contactTickets);

      res.json({
        success: true,
        database: 'PostgreSQL (Cloud SQL)',
        counts: {
          users: allUsers.length,
          media: allMedia.length,
          myListEntries: allList.length,
          reviews: allReviews.length,
          testimonials: allTestimonials.length,
          tickets: allTickets.length,
        },
      });
    } catch (error: any) {
      console.error('Error fetching db status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Media Items (Movies / Series) Endpoints
  app.get('/api/media', async (req, res) => {
    try {
      const items = await db.select().from(mediaItems).orderBy(desc(mediaItems.createdAt));
      res.json({ success: true, data: items });
    } catch (error: any) {
      console.error('Error fetching media:', error);
      res.status(500).json({ success: false, error: 'Error querying media from database' });
    }
  });

  app.post('/api/media', async (req, res) => {
    try {
      const body = req.body;
      
      // Validación básica
      if (!body.title) {
        return res.status(400).json({ success: false, error: 'El título es obligatorio' });
      }
      const id = body.id || `media-${Date.now()}`;
      
      const newItem = {
        id,
        title: body.title,
        originalTitle: body.originalTitle || body.title,
        year: Number(body.year) || new Date().getFullYear(),
        type: body.type || 'pelicula',
        genres: body.genres || ['Drama'],
        director: body.director || 'Desconocido',
        cast: body.cast || [],
        synopsis: body.synopsis || '',
        posterUrl: body.posterUrl || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80',
        backdropUrl: body.backdropUrl || body.posterUrl,
        trailerUrl: body.trailerYoutubeId || body.trailerUrl,
        duration: body.duration || '2h 00m',
        seasons: body.seasons,
        episodes: body.episodes,
        streamingPlatforms: body.streamingPlatforms || body.platforms || ['Max (HBO)'],
        rating: Number(body.communityRating || body.rating || 5.0),
        // ratingCount se mantiene en caso de update, solo se establece en insert nuevo
        featured: Boolean(body.isFeatured),
        trending: Boolean(body.isTrending),
        topRated: Boolean(body.isTopClassified),
        createdByUserId: body.createdByUserId || null,
      };

      await db.insert(mediaItems).values(newItem).onConflictDoUpdate({
        target: mediaItems.id,
        set: newItem,
      });

      res.json({ success: true, data: newItem });
    } catch (error: any) {
      console.error('Error inserting media item:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 3. Users Endpoints
  app.get('/api/users', async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json({ success: true, data: allUsers });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/users/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
      
      if (!user || user.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (!password || user[0].password !== password) {
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      }

      const { password: _, ...userWithoutPassword } = user[0];
      res.json({ success: true, user: userWithoutPassword });
    } catch (error: any) {
      console.error('Error logging in:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/users/register', async (req, res) => {
    try {
      const { name, email, password, avatar, role, favoriteGenres, bio } = req.body;
      const id = `user-${Date.now()}`;
      
      const newUser = {
        id,
        name: name || 'Cinéfilo',
        email: email.toLowerCase().trim(),
        password: password || '123456',
        avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        role: role || 'user',
        bio: bio || 'Apasionado del cine.',
        favoriteGenres: favoriteGenres || ['Drama', 'Ciencia Ficción'],
      };

      await db.insert(users).values(newUser).onConflictDoUpdate({
        target: users.email,
        set: { name: newUser.name, avatar: newUser.avatar, bio: newUser.bio, password: newUser.password, role: newUser.role },
      });

      res.json({ success: true, user: newUser });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 4. User List (MyList & Journal) Endpoints
  app.get('/api/list/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const entries = await db.select().from(userListEntries).where(eq(userListEntries.userId, userId));
      res.json({ success: true, data: entries });
    } catch (error: any) {
      console.error('Error fetching user list:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/list', async (req, res) => {
    try {
      const body = req.body;
      const id = body.id || `entry-${body.userId}-${body.mediaId}`;

      const entry = {
        id,
        userId: body.userId,
        mediaId: body.mediaId,
        status: body.status || 'pendiente',
        rating: Number(body.rating || 0),
        userNotes: body.userNotes || '',
        platformWatched: body.platformWatched || null,
        dateWatched: body.dateWatched || null,
        rewatch: Boolean(body.rewatch),
        scriptScore: body.scriptScore ? Number(body.scriptScore) : null,
        actingScore: body.actingScore ? Number(body.actingScore) : null,
        directionScore: body.directionScore ? Number(body.directionScore) : null,
        emotionalTag: body.emotionalTag || null,
      };

      await db.insert(userListEntries).values(entry).onConflictDoUpdate({
        target: userListEntries.id,
        set: entry,
      });

      res.json({ success: true, data: entry });
    } catch (error: any) {
      console.error('Error saving user list entry:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete('/api/list/:userId/:mediaId', async (req, res) => {
    try {
      const { userId, mediaId } = req.params;
      await db.delete(userListEntries).where(
        and(eq(userListEntries.userId, userId), eq(userListEntries.mediaId, mediaId))
      );
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting user list entry:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 5. Media Reviews Endpoints
  app.get('/api/reviews/:mediaId', async (req, res) => {
    try {
      const { mediaId } = req.params;
      const reviews = await db.select().from(mediaReviews).where(eq(mediaReviews.mediaId, mediaId)).orderBy(desc(mediaReviews.createdAt));
      res.json({ success: true, data: reviews });
    } catch (error: any) {
      console.error('Error fetching media reviews:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    try {
      const body = req.body;
      const id = `rev-${Date.now()}`;
      
      const newReview = {
        id,
        mediaId: body.mediaId,
        userId: body.userId || null,
        userName: body.userName || 'Cinéfilo Anónimo',
        userAvatar: body.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        userRole: body.userRole || 'user',
        rating: Number(body.rating || 5),
        comment: body.comment,
        platformWatched: body.platformWatched || null,
        dateStr: body.dateStr || 'Hoy',
        likes: 0,
      };

      await db.insert(mediaReviews).values(newReview);
      res.json({ success: true, data: newReview });
    } catch (error: any) {
      console.error('Error saving review:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 6. Testimonials Endpoints
  app.get('/api/testimonials', async (req, res) => {
    try {
      const items = await db.select().from(siteTestimonials).orderBy(desc(siteTestimonials.likes));
      res.json({ success: true, data: items });
    } catch (error: any) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post('/api/testimonials', async (req, res) => {
    try {
      const body = req.body;
      const id = `testimonial-${Date.now()}`;

      const newTestimonial = {
        id,
        userId: body.userId || null,
        userName: body.userName || 'Cinéfilo',
        userAvatar: body.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        userRole: body.userRole || 'user',
        rating: Number(body.rating || 5),
        highlightFeature: body.highlightFeature || 'General',
        content: body.content,
        dateStr: body.dateStr || 'Hoy',
        likes: 1,
      };

      await db.insert(siteTestimonials).values(newTestimonial);
      res.json({ success: true, data: newTestimonial });
    } catch (error: any) {
      console.error('Error saving testimonial:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 7. Contact Tickets Endpoints
  app.post('/api/contact', async (req, res) => {
    try {
      const body = req.body;
      const id = `ticket-${Date.now()}`;
      const ticketCode = `SL-${Math.floor(10000 + Math.random() * 90000)}`;

      // Validación básica de campos requeridos
      if (!body.name || !body.email || !body.subject || !body.message) {
        return res.status(400).json({ success: false, error: 'Todos los campos son obligatorios' });
      }

      const newTicket = {
        id,
        ticketCode,
        userId: body.userId || null,
        name: body.name,
        email: body.email,
        subject: body.subject,
        message: body.message,
        urgency: body.urgency || 'normal',
        status: 'open',
      };

      await db.insert(contactTickets).values(newTicket);
      res.json({ success: true, data: newTicket });
    } catch (error: any) {
      console.error('Error creating contact ticket:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScreenLog Server with Cloud SQL PostgreSQL running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
