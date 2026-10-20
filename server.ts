import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { db } from './src/db/index';
import { users, mediaItems, userListEntries, mediaReviews, siteTestimonials, contactTickets } from './src/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { seedDb } from './seed';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  await seedDb().catch(console.error);

  app.use(express.json());

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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
        ratingCount: 1,
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
    }
  });

  // 3. Users Endpoints
  app.get('/api/users', async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json({ success: true, data: allUsers });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
    }
  });

  app.post('/api/users/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
      
      if (!user || user.length === 0) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (password && user[0].password !== password) {
        return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      }

      res.json({ success: true, user: user[0] });
    } catch (error: any) {
      console.error('Error logging in:', error);
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
        set: { name: newUser.name, avatar: newUser.avatar, bio: newUser.bio },
      });

      res.json({ success: true, user: newUser });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
        status: body.status || 'por_ver',
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
    }
  });

  // 6. Testimonials Endpoints
  app.get('/api/testimonials', async (req, res) => {
    try {
      const items = await db.select().from(siteTestimonials).orderBy(desc(siteTestimonials.likes));
      res.json({ success: true, data: items });
    } catch (error: any) {
      console.error('Error fetching testimonials:', error);
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
    }
  });

  // 7. Contact Tickets Endpoints
  app.post('/api/contact', async (req, res) => {
    try {
      const body = req.body;
      const id = `ticket-${Date.now()}`;
      const ticketCode = `SL-${Math.floor(10000 + Math.random() * 90000)}`;

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
      res.status(500).json({ success: false, error: error.message, detail: error.cause ? String(error.cause) : String(error) });
    }
  });

  // 8. ScreenLog AI Assistant Endpoint (Gemini API)
  app.post('/api/assistant', async (req, res) => {
    try {
      const { message, history = [], context = {} } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ success: false, error: 'Mensaje requerido' });
        return;
      }

      const activeTab = context.activeTab || 'inicio';
      const userName = context.userName || 'Usuario';
      const listCount = context.listCount || 0;

      const systemInstruction = `Eres "ScreenLog AI", el asistente inteligente oficial e interactivo de la aplicación ScreenLog Pro (Plataforma de Clasificación y Reseñas de Películas y Series).
Tu propósito es ayudar y guiar a los usuarios a navegar, aprender a usar todas las herramientas de la app y darles recomendaciones cinéfilas personalizadas.

Contexto actual del usuario:
- Nombre: ${userName}
- Pestaña activa en pantalla: ${activeTab}
- Títulos en su lista: ${listCount}

Funcionalidades de ScreenLog Pro que debes conocer y enseñar a usar:
1. Inicio / Sistema:
   - Carrusel de películas destacadas con reproducción directa de trailers de YouTube en modal cinemático.
   - Estado de la base de datos PostgreSQL activa en tiempo real.
   - Listados de "Más Clasificadas por la Comunidad" y "Más Añadidas a Listas".
   - Títulos propios creados por usuarios.
2. Explorar Catálogo:
   - Buscador en tiempo real por título, director o actor.
   - Pestañas de tipo (Película, Serie, Anime, Documental).
   - Barra de filtros avanzada:
     * Filtro por Género (Acción, Drama, Ciencia Ficción, Animación, Comedia, etc.) con selección rápida.
     * Filtro por Año de Estreno (décadas 2020s, 2010s, antes de 2010 y años específicos).
     * Filtro por Calificación Mínima (3.0+, 4.0+, 4.5+, 4.8+ Obras Maestras).
     * Filtro por Plataforma (Netflix, Max, Prime Video, Disney+, etc.).
     * Ordenamiento por calificación, popularidad, año y título.
3. Mi Lista y Cuaderno de Críticas:
   - 3 estados para cada título:
     * "Pendiente" (por ver).
     * "En proceso" (viendo actualmente).
     * "Terminada" (vista y evaluada).
   - Ficha detallada de terminada: Calificación de 1 a 5 estrellas, Etiqueta de evaluación (ej: Obra Maestra, Excelente, Muy Buena), dónde la vio (plataforma o sala de cine), fecha exacta de visualización, si la volvería a ver (Sí totalmente, Quizás, No, Jamás) y redacción de crítica personal.
   - 3 modos de visualización: Cuadrícula de tarjetas, Tabla detallada con todas las columnas y Cuaderno / Diario de críticas.
   - Botón para exportar la lista completa a archivo JSON de respaldo.
4. Panel de Estadísticas (Recharts):
   - Gráfico de barras interactivo con Recharts que muestra la cantidad de películas vistas por género.
   - Tooltips con estrellas promedio y títulos incluidos.
   - Filtros de alcance (Vistas/Terminadas, Solo Películas, Toda Mi Lista).
   - Desglose interactivo al hacer clic en cualquier barra o botón de género.
5. Añadir Películas y Series:
   - Botón "+ Añadir Título" disponible en la barra de navegación superior, pie de página y dentro del catálogo.
   - Permite subir títulos propios con póster (URL), tráiler de YouTube, género, director, sinopsis y plataforma.
6. Cuenta y Perfiles:
   - Inicio de sesión y registro rápido con avatares y roles (Cinéfilo, Crítico, Administrador) y cambio rápido de cuenta.

Directrices de respuesta:
- Responde siempre en español, con un tono amable, claro, entusiasta y cinéfilo.
- Estructura las explicaciones con pasos claros o viñetas.
- Sugiere atajos o botones exactos que el usuario puede pulsar en la app.
- Si piden recomendaciones de películas, sugiere títulos destacados del catálogo (ej: Oppenheimer, Dune: Parte Dos, Arcane, Interestelar, Spider-Man: A Través del Spider-Verso, El Viaje de Chihiro, Breaking Bad, The Last of Us) explicando brevemente por qué verlas.`;

      // If Gemini API Key is available, call Gemini API
      if (geminiApiKey) {
        try {
          const contents = [
            ...history.slice(-6).map((h: any) => ({
              role: h.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: String(h.text || h.content || '') }],
            })),
            {
              role: 'user',
              parts: [{ text: message }],
            },
          ];

          const geminiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });

          const replyText = geminiResponse.text || '';
          if (replyText.trim()) {
            res.json({ success: true, reply: replyText });
            return;
          }
        } catch (apiError: any) {
          console.warn('Gemini API call warning, falling back to local assistant engine:', apiError?.message || apiError);
        }
      }

      // Smart CineBot Rule-Based Fallback Engine (guarantees instantaneous helpful responses)
      const q = message.toLowerCase();
      let fallbackReply = '';

      if (q.includes('lista') || q.includes('agregar') || q.includes('añadir') && q.includes('lista')) {
        fallbackReply = `🎬 **Cómo agregar y gestionar películas en Mi Lista:**\n\n1. Ve a **Explorar Catálogo** o al **Inicio** y haz clic sobre cualquier película o serie.\n2. En la ficha de detalle que se abrirá, verás el selector de estado con 3 opciones:\n   - 📌 **Pendiente**: Para las que tienes en tu lista de espera.\n   - ⏳ **En Proceso**: Para las que estás viendo actualmente.\n   - ⭐ **Terminada**: Para las que ya viste y quieres calificar.\n3. Si seleccionas **Terminada**, podrás calificar con estrellas (1 a 5★), elegir si la volverías a ver, anotar la plataforma donde la viste y redactar tu propia crítica.\n4. Para ver toda tu colección, pulsa **Mi Lista** en la barra de navegación superior.`;
      } else if (q.includes('filtro') || q.includes('filtrar') || q.includes('catalogo') || q.includes('año') || q.includes('genero')) {
        fallbackReply = `🔍 **Cómo usar la Barra de Filtros del Catálogo:**\n\nEn la sección **Explorar Catálogo**, encontrarás la nueva barra de filtros interactiva:\n\n- 🎭 **Por Género**: Despliega el menú o pulsa las píldoras de acceso rápido (Ciencia Ficción, Drama, Animación, etc.).\n- 📅 **Por Año de Estreno**: Filtra por décadas completas (2020s, 2010s, antes de 2010) o elige un año exacto (2024, 2023, 2014, etc.).\n- ⭐ **Por Calificación Mínima**: Selecciona ver solo títulos con 3.0+, 4.0+, 4.5+ o 4.8+ estrellas (Obras Maestras).\n- 📺 **Por Plataforma**: Elige Netflix, Max, Prime Video, Disney+ o Cine.\n- 🔄 **Restablecer**: Si tienes filtros activos, pulsa "Restablecer filtros" para volver a ver todo el catálogo.`;
      } else if (q.includes('estadistica') || q.includes('grafico') || q.includes('barras') || q.includes('recharts')) {
        fallbackReply = `📊 **Panel de Estadísticas con Gráfico de Barras:**\n\n¡ScreenLog incluye un panel analítico completo hecho con **Recharts**!\n\n- **Dónde encontrarlo**: Haz clic en **Estadísticas** en la barra superior o ve a **Mi Lista**.\n- **Qué muestra**: Un gráfico de barras interactivo con la cantidad de películas vistas agrupadas por género.\n- **Filtros de análisis**: Puedes cambiar entre *Vistas/Terminadas*, *Solo Películas* o *Toda Mi Lista*.\n- **Interactividad**: Al pasar el ratón verás el promedio de estrellas de ese género, y al hacer clic en cualquier barra se desglosan las películas correspondientes.`;
      } else if (q.includes('recomiend') || q.includes('sugier') || q.includes('que ver') || q.includes('pelicula')) {
        fallbackReply = `🍿 **Recomendaciones destacadas del catálogo de ScreenLog:**\n\n1. **Oppenheimer (2023)** — *Drama / Historia* (4.8★): La aclamada obra de Christopher Nolan sobre el Proyecto Manhattan. Disponible en Max.\n2. **Dune: Parte Dos (2024)** — *Ciencia Ficción / Aventura* (4.9★): Espectacular epopeya visual de Denis Villeneuve con Timothée Chalamet y Zendaya.\n3. **Spider-Man: A Través del Spider-Verso (2023)** — *Animación / Acción* (4.8★): Una revolución visual en el cine de animación.\n4. **Interestelar (2014)** — *Ciencia Ficción* (4.9★): Un emotivo viaje al espacio profundo con la icónica música de Hans Zimmer.\n5. **El Viaje de Chihiro (2001)** — *Anime / Fantasía* (4.9★): Clásico inmortal de Hayao Miyazaki y Studio Ghibli.\n\n¿Buscas algún género en específico (terror, comedia, anime)? ¡Dímelo y te recomiendo más!`;
      } else if (q.includes('nueva') || q.includes('crear') || q.includes('subir') || q.includes('añadir')) {
        fallbackReply = `✨ **Cómo registrar una nueva película o serie en la app:**\n\n1. Pulsa el botón rojo **"+ Añadir Título"** ubicado en la esquina superior derecha de la barra de navegación.\n2. Completa los datos en el modal:\n   - Título y año de estreno.\n   - Tipo (Película, Serie, Anime o Documental).\n   - Géneros (puedes seleccionar varios).\n   - Director y reparto.\n   - URL de la carátula / póster y fondo.\n   - ID o enlace de YouTube para el tráiler.\n   - Plataforma de streaming.\n3. Haz clic en **"Guardar en la Base de Datos"** y tu título quedará catalogado de inmediato con soporte en PostgreSQL.`;
      } else {
        fallbackReply = `👋 ¡Hola! Soy **ScreenLog AI**, tu asistente para guiarte en ScreenLog Pro.\n\nPuedo ayudarte con cualquiera de estas opciones:\n\n- 🎬 **¿Cómo agregar películas a Mi Lista?** Te enseño a clasificar entre pendientes, en proceso y terminadas.\n- 🔍 **¿Cómo usar los filtros del Catálogo?** Aprende a filtrar por género, año y estrellas mínimas.\n- 📊 **¿Dónde ver mis Estadísticas?** Descubre tu gráfico de barras por géneros.\n- 🍿 **Recomendaciones**: Pídeme títulos según tus gustos.\n- ➕ **Añadir títulos**: Aprende a subir nuevas películas a la base de datos.\n\n¿En qué te gustaría que te oriente hoy?`;
      }

      res.json({ success: true, reply: fallbackReply });
    } catch (error: any) {
      console.error('Error in AI assistant route:', error);
      res.status(500).json({ success: false, error: 'Error procesando la consulta del asistente' });
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
