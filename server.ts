import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createApiRouter, requireCatalogEditor, requireSessionUser } from './server/routes';

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY || '';
let ai: any = null;
try {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} catch (e: any) {
  console.warn('Gemini AI init failed:', e?.message);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use('/api', createApiRouter());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), storage: 'json' });
  });

  // AI Media Autofill Endpoint via Gemini 2.5 Flash
  app.post('/api/autofill', requireCatalogEditor, async (req, res) => {
    try {
      const { title } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length < 2) {
        return res.status(400).json({ 
          success: false, 
          error: 'El título debe tener al menos 2 caracteres para autocompletar' 
        });
      }

      const activeKey = process.env.GEMINI_API_KEY || geminiApiKey;
      if (!activeKey) {
        return res.status(503).json({ 
          success: false, 
          error: 'GEMINI_API_KEY no está disponible en las variables de entorno del servidor.' 
        });
      }

      const aiClient = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Título en español de la película o serie' },
          originalTitle: { type: Type.STRING, description: 'Título original en su idioma de origen' },
          type: { 
            type: Type.STRING, 
            enum: ['pelicula', 'serie', 'anime', 'documental'],
            description: 'Tipo de producción audiovisual' 
          },
          year: { type: Type.INTEGER, description: 'Año de estreno o emisión inicial' },
          director: { type: Type.STRING, description: 'Director, creador o showrunner principal' },
          cast: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: '3 a 6 actores o actrices principales' 
          },
          genres: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: 'Lista de géneros en español' 
          },
          synopsis: { type: Type.STRING, description: 'Sinopsis o resumen argumental en español' },
          duration: { 
            type: Type.STRING, 
            description: 'Duración. Películas en formato "2h 15m"; series/animes en "X Temporadas (Y eps)"' 
          },
          defaultPlatform: { 
            type: Type.STRING, 
            enum: ['Netflix', 'Max (HBO)', 'Prime Video', 'Disney+', 'Apple TV+', 'Crunchyroll', 'Cine / Sala de Cine', 'Otra'],
            description: 'Plataforma de streaming legal o sala de cine' 
          },
          trailerYoutubeId: { 
            type: Type.STRING, 
            description: 'ID de YouTube del tráiler oficial (11 caracteres) o cadena vacía si no estás 100% seguro. Nunca inventes URLs.' 
          },
          confidence: { 
            type: Type.NUMBER, 
            description: 'Nivel de confianza en los datos entre 0.0 y 1.0' 
          }
        },
        required: [
          'title',
          'originalTitle',
          'type',
          'year',
          'director',
          'cast',
          'genres',
          'synopsis',
          'duration',
          'defaultPlatform',
          'trailerYoutubeId',
          'confidence'
        ]
      };

      const systemInstruction = `Eres un asistente de base de datos cinematográfica para "ScreenLog". Tu tarea es autocompletar la ficha técnica oficial de una película, serie, anime o documental basándote en el título ingresado por el usuario.

REGLAS ESTRICTAS:
1. Todos los textos deben estar en español (título si tiene traducción común, sinopsis y géneros).
2. Géneros: Selecciona preferentemente de: Acción, Aventura, Animación, Ciencia Ficción, Comedia, Crimen, Documental, Drama, Fantasía, Historia, Misterio, Romance, Suspense, Terror, Biografía. Si ninguno aplica, usa el género real en español.
3. Formato de duración:
   - Películas y documentales: formato exacto como "2h 15m" o "1h 48m".
   - Series y animes: formato exacto como "X Temporadas (Y eps)", por ejemplo "4 Temporadas (32 eps)" o "1 Temporada (12 eps)".
4. defaultPlatform: Debe ser exactamente una de estas opciones: Netflix, Max (HBO), Prime Video, Disney+, Apple TV+, Crunchyroll, Cine / Sala de Cine, Otra.
5. NO inventes enlaces ni identificadores: para trailerYoutubeId solo incluye el ID si lo conoces con certeza (11 caracteres, ej. "dQw4w9WgXcQ"); si no estás 100% seguro, devuelve cadena vacía "". Prohibido inventar URLs de imágenes.
6. Confidence: Devuelve un valor numérico entre 0.0 y 1.0 indicando tu grado de confianza en que los datos corresponden a la obra buscada. Si el título es muy vago o no existe certeza, asigna menos de 0.5. Si no hay certeza en algún campo de texto, usa cadena vacía "", o 0 para año.`;

      const prompt = `Proporciona los datos técnicos verídicos de la siguiente película o serie para catalogación: "${title.trim()}".`;

      const geminiResponse = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
          temperature: 0.1,
        },
      });

      const responseText = geminiResponse.text;
      if (!responseText) {
        return res.status(500).json({ success: false, error: 'No se obtuvo respuesta de la IA' });
      }

      const parsedData = JSON.parse(responseText);
      res.json({ success: true, data: parsedData });
    } catch (error: any) {
      console.error('Error in /api/autofill endpoint:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message || 'Error al procesar el autocompletado con IA' 
      });
    }
  });

  // ScreenLog AI Assistant Endpoint (Gemini API)
  app.post('/api/assistant', requireSessionUser, async (req, res) => {
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
   - Panel con el catálogo y la actividad de la comunidad.
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
5. Añadir Películas y Series (solo Owner/Admin):
   - Botón "+ Añadir Título" disponible en la barra de navegación superior, pie de página y dentro del catálogo.
   - Permite subir títulos propios con póster (URL), tráiler de YouTube, género, director, sinopsis y plataforma.
6. Cuenta y Perfiles:
   - Inicio de sesión, registro y cuentas con roles (Usuario, Administrador y Owner). Solo Owner y Administrador pueden editar el catálogo.

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
        fallbackReply = `🍿 **Recomendaciones destacadas del catálogo de ScreenLog:**\n\n1. **Oppenheimer (2023)** — *Drama / Historia* : La aclamada obra de Christopher Nolan sobre el Proyecto Manhattan. Disponible en Max.\n2. **Dune: Parte Dos (2024)** — *Ciencia Ficción / Aventura* : Espectacular epopeya visual de Denis Villeneuve con Timothée Chalamet y Zendaya.\n3. **Spider-Man: A Través del Spider-Verso (2023)** — *Animación / Acción* : Una revolución visual en el cine de animación.\n4. **Interestelar (2014)** — *Ciencia Ficción* : Un emotivo viaje al espacio profundo con la icónica música de Hans Zimmer.\n5. **El Viaje de Chihiro (2001)** — *Anime / Fantasía* : Clásico inmortal de Hayao Miyazaki y Studio Ghibli.\n\n¿Buscas algún género en específico (terror, comedia, anime)? ¡Dímelo y te recomiendo más!`;
      } else if (q.includes('nueva') || q.includes('crear') || q.includes('subir') || q.includes('añadir')) {
        fallbackReply = `✨ **Cómo registrar una nueva película o serie en la app:**\n\n1. Pulsa el botón rojo **"+ Añadir Título"** ubicado en la esquina superior derecha de la barra de navegación.\n2. Completa los datos en el modal:\n   - Título y año de estreno.\n   - Tipo (Película, Serie, Anime o Documental).\n   - Géneros (puedes seleccionar varios).\n   - Director y reparto.\n   - URL de la carátula / póster y fondo.\n   - ID o enlace de YouTube para el tráiler.\n   - Plataforma de streaming.\n3. Haz clic en **"Guardar en la Base de Datos"** y el título quedará guardado en el catálogo del servidor.`;
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
    console.log(`ScreenLog Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
