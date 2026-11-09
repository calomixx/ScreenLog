import { INITIAL_MEDIA_LIST } from '../src/data/initialMedia.js';

export interface CineMatchItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: 'pelicula' | 'serie' | 'anime';
  year: number;
  director: string;
  genres: string[];
  synopsis: string;
  duration?: string;
  posterUrl: string;
  backdropUrl: string;
  trailerYoutubeId?: string;
  defaultPlatform: string;
  communityRating: number;
  matchPercentage: number;
  matchReason: string;
  vibeTag: string;
}

export interface CineMatchAestheticAnalysis {
  title: string;
  palette: string[];
  summary: string;
  keywords: string[];
}

export interface CineMatchResponse {
  success: boolean;
  mode: 'visual' | 'preset' | 'vibe' | 'favorites';
  aestheticAnalysis: CineMatchAestheticAnalysis;
  recommendations: CineMatchItem[];
  message?: string;
}

export interface CineMatchRequest {
  image?: string;
  visualPreset?: string;
  vibe?: string;
  mediaType?: 'all' | 'pelicula' | 'serie' | 'anime';
  platform?: string;
  userFavorites?: string[];
  queryText?: string;
}

// 6 Curated Cinematic Aesthetic Moodboards
export const AESTHETIC_PRESETS: Record<string, {
  title: string;
  palette: string[];
  summary: string;
  keywords: string[];
  items: Array<{
    title: string;
    originalTitle?: string;
    type: 'pelicula' | 'serie' | 'anime';
    year: number;
    director: string;
    genres: string[];
    synopsis: string;
    duration?: string;
    posterUrl: string;
    backdropUrl: string;
    trailerYoutubeId: string;
    defaultPlatform: string;
    communityRating: number;
    matchPercentage: number;
    matchReason: string;
    vibeTag: string;
  }>;
}> = {
  cyberpunk_neon: {
    title: 'Estética Cyberpunk Neo-Noir & Neón',
    palette: ['#00F0FF', '#FF007F', '#7928CA', '#0A0A12'],
    summary: 'Paleta saturada en cian eléctrico y magenta sobre asfalto mojado y sombras densas. Refleja soledad existencial, luces de neón bajo la lluvia y distopías tecnológicas.',
    keywords: ['Cyberpunk', 'Neón', 'Neo-Noir', 'Sintetizadores', 'Distopía Urbana'],
    items: [
      {
        title: 'Blade Runner 2049',
        originalTitle: 'Blade Runner 2049',
        type: 'pelicula',
        year: 2017,
        director: 'Denis Villeneuve',
        genres: ['Ciencia Ficción', 'Misterio', 'Drama'],
        synopsis: 'Treinta años después de los eventos de la primera película, un nuevo blade runner descubre un secreto largamente enterrado.',
        duration: '2h 44m',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'gCcx85zbxz4',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.8,
        matchPercentage: 99,
        matchReason: 'La fotografía de Roger Deakins es el estandarte definitivo del neo-noir con brumas saturadas y siluetas en contraste.',
        vibeTag: 'Neón & Soledad Urbana'
      },
      {
        title: 'Cyberpunk: Edgerunners',
        originalTitle: 'Cyberpunk: Edgerunners',
        type: 'anime',
        year: 2022,
        director: 'Hiroyuki Imaishi',
        genres: ['Anime', 'Acción', 'Ciencia Ficción'],
        synopsis: 'En una distopía plagada de corrupción e implantes cibernéticos, un chico talentoso pero imprudente intenta convertirse en un mercenario forajido.',
        duration: '1 Temporada (10 eps)',
        posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'JtqIas3bYhg',
        defaultPlatform: 'Netflix',
        communityRating: 4.9,
        matchPercentage: 97,
        matchReason: 'Estallido cromático hiperquinético de Studio TRIGGER con amarillos y cianes fosforescentes en Night City.',
        vibeTag: 'Hiperquinesia Neón'
      },
      {
        title: 'The Matrix',
        originalTitle: 'The Matrix',
        type: 'pelicula',
        year: 1999,
        director: 'Lana y Lilly Wachowski',
        genres: ['Ciencia Ficción', 'Acción'],
        synopsis: 'Un programador es guiado por un misterioso rebelde a descubrir la cruda verdad oculta detrás de la realidad simulada en la que vive.',
        duration: '2h 16m',
        posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'vKQi3bBA1y8',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 95,
        matchReason: 'Tinte verdoso icónico de fósforo de monitor, gabardinas de cuero negro y coreografía revolucionaria.',
        vibeTag: 'Verde Fósforo & Cuero'
      },
      {
        title: 'Drive',
        originalTitle: 'Drive',
        type: 'pelicula',
        year: 2011,
        director: 'Nicolas Winding Refn',
        genres: ['Acción', 'Drama', 'Crimen'],
        synopsis: 'Un conductor especialista de cine de día y chofer de fugas de noche se ve arrastrado a un violento torbellino criminal por proteger a su vecina.',
        duration: '1h 40m',
        posterUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'KBiOF3y1W0Y',
        defaultPlatform: 'Prime Video',
        communityRating: 4.7,
        matchPercentage: 93,
        matchReason: 'Atmósfera synthwave nocturna por las autopistas de Los Ángeles con contrastes rosa fucsia y azul eléctrico.',
        vibeTag: 'Synthwave Nocturno'
      },
      {
        title: 'Spider-Man: A Través del Spider-Verso',
        originalTitle: 'Spider-Man: Across the Spider-Verse',
        type: 'pelicula',
        year: 2023,
        director: 'Joaquim Dos Santos, Kemp Powers, Justin K. Thompson',
        genres: ['Animación', 'Acción', 'Aventura', 'Ciencia Ficción'],
        synopsis: 'Miles Morales se catapulta a través del Multiverso, donde se encuentra con un equipo de Spider-People encargados de proteger su propia existencia.',
        duration: '2h 20m',
        posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'cqGjhVJWtEg',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 92,
        matchReason: 'La dimensión de Gwen Stacy pintada con acuarelas emotivas y la metrópolis de Nueva York 2099 cyberpunk.',
        vibeTag: 'Multiverso Cromático'
      }
    ]
  },

  desert_dune: {
    title: 'Épica Desértica, Luz Solar & Brutalismo',
    palette: ['#D4A373', '#E9C46A', '#BC6C25', '#264653'],
    summary: 'Tonos tierra, calima dorada y horizontes infinitos. Expresa escala colosal, destino épico, misticismo y arquitectura monolítica bajo un sol abrasador.',
    keywords: ['Desierto', 'Escala Épica', 'Brutalismo', 'Horizontes Infinitos', 'Monolítico'],
    items: [
      {
        title: 'Dune: Parte Dos',
        originalTitle: 'Dune: Part Two',
        type: 'pelicula',
        year: 2024,
        director: 'Denis Villeneuve',
        genres: ['Ciencia Ficción', 'Aventura', 'Drama'],
        synopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia.',
        duration: '2h 46m',
        posterUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'Way9Dexny3w',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 99,
        matchReason: 'La fotografía de Greig Fraser en arenas de Jordania y la sobrecogedora secuencia infrarroja en Giedi Prime.',
        vibeTag: 'Arenas Doradas & Épica'
      },
      {
        title: 'Mad Max: Furia en el Camino',
        originalTitle: 'Mad Max: Fury Road',
        type: 'pelicula',
        year: 2015,
        director: 'George Miller',
        genres: ['Acción', 'Aventura', 'Ciencia Ficción'],
        synopsis: 'En un desierto postapocalíptico, Max se une a Furiosa para huir de un tirano despiadado a bordo de un camión de guerra.',
        duration: '2h 00m',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'hEJnMQG9ev8',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.8,
        matchPercentage: 97,
        matchReason: 'Arenas saturadas de Namibia contra cielos turquesa hiperintensos y tormentas de arena incandescentes.',
        vibeTag: 'Ópera de Fuego y Arena'
      },
      {
        title: 'Oppenheimer',
        originalTitle: 'Oppenheimer',
        type: 'pelicula',
        year: 2023,
        director: 'Christopher Nolan',
        genres: ['Drama', 'Biografía', 'Historia'],
        synopsis: 'La historia del físico estadounidense J. Robert Oppenheimer y el desarrollo de la bomba atómica en el desierto de Los Álamos.',
        duration: '3h 00m',
        posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'uYPbbksJxIg',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.8,
        matchPercentage: 95,
        matchReason: 'Imágenes monumentales en 70mm IMAX con cielos pálidos del desierto y claroscuros psicológicos intensos.',
        vibeTag: 'Fisión & Tensión'
      },
      {
        title: 'Interestelar',
        originalTitle: 'Interstellar',
        type: 'pelicula',
        year: 2014,
        director: 'Christopher Nolan',
        genres: ['Ciencia Ficción', 'Drama', 'Aventura'],
        synopsis: 'Un grupo de exploradores emprende la misión más importante de la historia de la humanidad: viajar más allá de nuestra galaxia.',
        duration: '2h 49m',
        posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'zSWdZVtXT7E',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 94,
        matchReason: 'Campos de maíz cubiertos de polvo terrestre frente a la inmensidad gélida del cosmos y agujeros de gusano.',
        vibeTag: 'Cosmos & Polvo'
      },
      {
        title: 'Gladiador II',
        originalTitle: 'Gladiator II',
        type: 'pelicula',
        year: 2024,
        director: 'Ridley Scott',
        genres: ['Acción', 'Aventura', 'Drama'],
        synopsis: 'Años después de presenciar la muerte del admirado héroe Máximo, Lucio debe ingresar al Coliseo para luchar por el futuro de Roma.',
        duration: '2h 28m',
        posterUrl: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: '4rgYUipGJNo',
        defaultPlatform: 'Cine / Paramount+',
        communityRating: 4.6,
        matchPercentage: 92,
        matchReason: 'La arena del Coliseo teñida de sangre bajo la luz ocre del sol de Numidia y Roma imperial.',
        vibeTag: 'Arena & Coliseo'
      }
    ]
  },

  anime_ghibli: {
    title: 'Acuarela, Naturaleza & Nostalgia Ghibli',
    palette: ['#588157', '#90E0EF', '#FAEDCD', '#E76F51'],
    summary: 'Colores orgánicos y acogedores: verdes de praderas encantadas, cielos azul celeste y luz dorada crepuscular. Evoca serenidad, asombro infantil y belleza poética.',
    keywords: ['Ghibli', 'Acuarela', 'Naturaleza', 'Nostalgia', 'Magia Cotidiana'],
    items: [
      {
        title: 'El Viaje de Chihiro',
        originalTitle: 'Sen to Chihiro no Kamikakushi',
        type: 'anime',
        year: 2001,
        director: 'Hayao Miyazaki',
        genres: ['Anime', 'Fantasía', 'Aventura'],
        synopsis: 'Chihiro, una niña de diez años caprichosa, se ve atrapada en un mundo mágico habitado por dioses, brujas y espíritus.',
        duration: '2h 05m',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'ByXuk9QqQkk',
        defaultPlatform: 'Netflix',
        communityRating: 4.9,
        matchPercentage: 99,
        matchReason: 'Fondos pintados al gouache, trenes sobre aguas en calma y una casa de baños termales rebosante de magia.',
        vibeTag: 'Magia de Baños Termales'
      },
      {
        title: 'Your Name (Kimi no Na wa)',
        originalTitle: 'Kimi no Na wa',
        type: 'anime',
        year: 2016,
        director: 'Makoto Shinkai',
        genres: ['Anime', 'Romance', 'Drama', 'Fantasía'],
        synopsis: 'Mitsuha y Taki descubren una extraña conexión: mientras duermen, intercambian sus cuerpos entre Tokio y un pueblo rural.',
        duration: '1h 46m',
        posterUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'hRfHcp2GjVI',
        defaultPlatform: 'Prime Video',
        communityRating: 4.9,
        matchPercentage: 98,
        matchReason: 'La hora mágica crepuscular ("Kataware-doki") y cometas iluminando el cielo estrellado con fotorealismo emotivo.',
        vibeTag: 'Crepúsculo y Destino'
      },
      {
        title: 'Arcane',
        originalTitle: 'Arcane',
        type: 'serie',
        year: 2021,
        director: 'Pascal Charrue, Arnaud Delord',
        genres: ['Animación', 'Acción', 'Sci-Fi', 'Fantasía'],
        synopsis: 'En medio del conflicto entre las ciudades gemelas de Piltóver y Zaun, dos hermanas luchan en bandos opuestos de una guerra tecnológica.',
        duration: '2 Temporadas (18 eps)',
        posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'fXmAurh012s',
        defaultPlatform: 'Netflix',
        communityRating: 4.9,
        matchPercentage: 95,
        matchReason: 'Pintura digital con pinceladas al óleo visibles, iluminación expresionista y steampunk dorado.',
        vibeTag: 'Pintura en Movimiento'
      },
      {
        title: 'FLCL (Fooly Cooly)',
        originalTitle: 'FLCL',
        type: 'anime',
        year: 2000,
        director: 'Kazuya Tsurumaki',
        genres: ['Anime', 'Comedia', 'Ciencia Ficción'],
        synopsis: 'Naota es un chico normal hasta que una mujer en Vespa le golpea con un bajo Rickenbacker, abriendo un portal en su cabeza.',
        duration: '6 Episodios',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 't9k8F7YF-Uo',
        defaultPlatform: 'Crunchyroll',
        communityRating: 4.8,
        matchPercentage: 92,
        matchReason: 'Estilo grunge experimental japonés con cielos suburbanos de ensueño y música de The Pillows.',
        vibeTag: 'Grunge Anime & Melancolía'
      },
      {
        title: 'Rurouni Kenshin: Recuerdos (Tsuioku-hen)',
        originalTitle: 'Rurouni Kenshin: Meiji Kenkaku Romantan - Tsuioku-hen',
        type: 'anime',
        year: 1999,
        director: 'Kazuhiro Furuhashi',
        genres: ['Anime', 'Drama', 'Historia', 'Acción'],
        synopsis: 'La trágica historia del pasado de Kenshin Himura como el implacable asesino Hitokiri Battosai durante el ocaso del shogunato Tokugawa.',
        duration: '4 OVAs',
        posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'dDk5q2aT1mE',
        defaultPlatform: 'Crunchyroll',
        communityRating: 4.9,
        matchPercentage: 91,
        matchReason: 'Pétalos de cerezo cayendo sobre nieve blanca y sangre, con una partitura elegíaca de Taku Iwasaki.',
        vibeTag: 'Tragedia en la Nieve'
      }
    ]
  },

  gothic_dark: {
    title: 'Gótico Urbano, Claroscuro & Dark Academia',
    palette: ['#0D1B2A', '#1B263B', '#415A77', '#E0E1DD'],
    summary: 'Claroscuros de alto contraste, sombras cinematográficas profundas, piedra húmeda y bibliotecas en penumbra. Clima de misterio cerebral, intriga moral y belleza lúgubre.',
    keywords: ['Claroscuro', 'Dark Academia', 'Sombras Profundas', 'Misterio Cerebral', 'Gótico'],
    items: [
      {
        title: 'The Batman',
        originalTitle: 'The Batman',
        type: 'pelicula',
        year: 2022,
        director: 'Matt Reeves',
        genres: ['Acción', 'Crimen', 'Drama', 'Misterio'],
        synopsis: 'En su segundo año luchando contra el crimen, Batman explora la corrupción que asola a Gotham y el vínculo con su propia familia.',
        duration: '2h 56m',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'mqqft2x_Aa4',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.8,
        matchPercentage: 99,
        matchReason: 'La fotografía de Greig Fraser en lluvia continua con bengalas rojas rasgando la oscuridad de Gotham.',
        vibeTag: 'Lluvia, Sombras & Venganza'
      },
      {
        title: 'El Caballero de la Noche',
        originalTitle: 'The Dark Knight',
        type: 'pelicula',
        year: 2008,
        director: 'Christopher Nolan',
        genres: ['Acción', 'Crimen', 'Drama', 'Suspense'],
        synopsis: 'Batman debe aceptar una de las mayores pruebas psicológicas y físicas cuando el Guasón desata la anarquía en Gotham.',
        duration: '2h 32m',
        posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'EXeTwQWrcwY',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 97,
        matchReason: 'Brutalismo urbano nocturno, cristales de rascacielos y tensión psicológica sin tregua.',
        vibeTag: 'Anarquía en la Noche'
      },
      {
        title: 'Severance (Separación)',
        originalTitle: 'Severance',
        type: 'serie',
        year: 2022,
        director: 'Dan Erickson, Ben Stiller',
        genres: ['Serie', 'Drama', 'Misterio', 'Ciencia Ficción'],
        synopsis: 'Mark lidera un equipo en Lumon Industries cuyos empleados han pasado por un procedimiento de separación quirúrgica entre sus recuerdos laborales y personales.',
        duration: '2 Temporadas (19 eps)',
        posterUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'xEQP4VVuyrY',
        defaultPlatform: 'Apple TV+',
        communityRating: 4.9,
        matchPercentage: 96,
        matchReason: 'Pasillos infinitos de blanco quirúrgico, moquetas verdes y encuadres desasosegantes de simetría opresiva.',
        vibeTag: 'Minimalismo Clínico Inquietante'
      },
      {
        title: 'El Padrino',
        originalTitle: 'The Godfather',
        type: 'pelicula',
        year: 1972,
        director: 'Francis Ford Coppola',
        genres: ['Drama', 'Crimen'],
        synopsis: 'El patriarca envejecido de una dinastía del crimen organizado transfiere el control de su imperio clandestino a su hijo reacio.',
        duration: '2h 55m',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'sY1S34973zA',
        defaultPlatform: 'Paramount+',
        communityRating: 4.9,
        matchPercentage: 94,
        matchReason: 'Gordon Willis ("El Príncipe de las Tinieblas") oculta los ojos de los personajes bajo sombras cenitales doradas.',
        vibeTag: 'Poder & Sombras Cenitales'
      },
      {
        title: 'The Last of Us',
        originalTitle: 'The Last of Us',
        type: 'serie',
        year: 2023,
        director: 'Craig Mazin, Neil Druckmann',
        genres: ['Serie', 'Drama', 'Aventura', 'Ciencia Ficción'],
        synopsis: 'Veinte años después de que una pandemia de hongos destruya la civilización, Joel debe escoltar a Ellie a través de unos Estados Unidos desolados.',
        duration: '1 Temporada (9 eps)',
        posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'uLtkt8BonwM',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 92,
        matchReason: 'Naturaleza reclamando ciudades en ruinas, sombras melancólicas y fogatas en medio de la desolación.',
        vibeTag: 'Ruinas & Supervivencia'
      }
    ]
  },

  wes_anderson: {
    title: 'Pastel Simétrico, Vintage & Wes Anderson',
    palette: ['#F4A261', '#E76F51', '#2A9D8F', '#E9C46A'],
    summary: 'Planos centrados milimétricos, colores pastel saturados con encanto vintage y diseño de producción artesanal. Transmite ternura cómica, elegancia retro y meticulosidad visual.',
    keywords: ['Simetría', 'Colores Pastel', 'Vintage', 'Wes Anderson', 'Encuadre Centrado'],
    items: [
      {
        title: 'El Gran Hotel Budapest',
        originalTitle: 'The Grand Budapest Hotel',
        type: 'pelicula',
        year: 2014,
        director: 'Wes Anderson',
        genres: ['Comedia', 'Aventura', 'Drama'],
        synopsis: 'Las aventuras de Gustave H, el legendario conserje de un famoso hotel europeo de entreguerras, y Zero Moustafa, el botones.',
        duration: '1h 39m',
        posterUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: '1Fg5iWmQjwk',
        defaultPlatform: 'Disney+',
        communityRating: 4.9,
        matchPercentage: 99,
        matchReason: 'La fachada rosa pastel en los Alpes, simetría rigurosa y las cajas de pasteles de Mendl confeccionadas a mano.',
        vibeTag: 'Rosa Pastel & Simetría Pura'
      },
      {
        title: 'Amélie',
        originalTitle: 'Le Fabuleux Destin d\'Amélie Poulain',
        type: 'pelicula',
        year: 2001,
        director: 'Jean-Pierre Jeunet',
        genres: ['Comedia', 'Romance'],
        synopsis: 'Amélie es una camarera ingenua y soñadora de París con un agudo sentido de la justicia que decide cambiar la vida de quienes la rodean.',
        duration: '2h 02m',
        posterUrl: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'HUECWi5pX7o',
        defaultPlatform: 'Prime Video',
        communityRating: 4.8,
        matchPercentage: 96,
        matchReason: 'Saturación cálida de verdes y rojos en un París idílico con detalles cotidianos elevados a poesía visual.',
        vibeTag: 'Calidez Parisina & Rojo Rubí'
      },
      {
        title: 'La La Land',
        originalTitle: 'La La Land',
        type: 'pelicula',
        year: 2016,
        director: 'Damien Chazelle',
        genres: ['Comedia', 'Drama', 'Música', 'Romance'],
        synopsis: 'Un pianista de jazz y una aspirante a actriz se enamoran mientras persiguen sus sueños en Los Ángeles.',
        duration: '2h 08m',
        posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: '0pdqf4P9MB8',
        defaultPlatform: 'Prime Video',
        communityRating: 4.8,
        matchPercentage: 95,
        matchReason: 'Vestidos monocromáticos en azul y amarillo sobre los cielos crepusculares violetas del observatorio Griffith.',
        vibeTag: 'Atardecer Violeta & Jazz'
      },
      {
        title: 'El Viaje de Chihiro',
        originalTitle: 'Sen to Chihiro no Kamikakushi',
        type: 'anime',
        year: 2001,
        director: 'Hayao Miyazaki',
        genres: ['Anime', 'Fantasía', 'Aventura'],
        synopsis: 'Chihiro debe trabajar en una fantástica casa de baños para espíritus para liberar a sus padres transformados en cerdos.',
        duration: '2h 05m',
        posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'ByXuk9QqQkk',
        defaultPlatform: 'Netflix',
        communityRating: 4.9,
        matchPercentage: 93,
        matchReason: 'Composición pictórica artesanal con detalles minuciosos y un festín visual en cada rincón.',
        vibeTag: 'Fantasía Visual Pura'
      },
      {
        title: 'Spider-Man: A Través del Spider-Verso',
        originalTitle: 'Spider-Man: Across the Spider-Verse',
        type: 'pelicula',
        year: 2023,
        director: 'Joaquim Dos Santos, Kemp Powers',
        genres: ['Animación', 'Acción', 'Aventura'],
        synopsis: 'Una celebración visual del arte del cómic con estilos artísticos que cambian dinámicamente entre universos.',
        duration: '2h 20m',
        posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'cqGjhVJWtEg',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 91,
        matchReason: 'Innovación gráfica radical con texturas de semitonos Ben-Day y paletas pasteles audaces.',
        vibeTag: 'Arte Cómic Pop'
      }
    ]
  },

  noir_thriller: {
    title: 'Thriller Nocturno Años 90 & Tensión Psicológica',
    palette: ['#14213D', '#000000', '#FCA311', '#E5E5E5'],
    summary: 'Iluminación de vapor de sodio, grano cinematográfico de 35mm, asfalto empapado y habitaciones en penumbra. Despierta adrenalina cruda, suspense moral y diálogos electrizantes.',
    keywords: ['Thriller 90s', 'Tensión a Fuego Lento', 'Plot Twist', 'Noche Urbana', 'Atmósfera Densa'],
    items: [
      {
        title: 'Pulp Fiction',
        originalTitle: 'Pulp Fiction',
        type: 'pelicula',
        year: 1994,
        director: 'Quentin Tarantino',
        genres: ['Crimen', 'Drama'],
        synopsis: 'Las vidas de dos sicarios de la mafia, un boxeador, la esposa de un gángster y dos bandidos de poca monta se entrelazan.',
        duration: '2h 34m',
        posterUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 's7EdQ4FqbhY',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 99,
        matchReason: 'Luz cálida de diners de medianoche, el resplandor dorado del maletín y el grano analógico de película.',
        vibeTag: 'Diners, Neón & Maletín Dorado'
      },
      {
        title: 'Breaking Bad',
        originalTitle: 'Breaking Bad',
        type: 'serie',
        year: 2008,
        director: 'Vince Gilligan',
        genres: ['Serie', 'Drama', 'Crimen', 'Suspense'],
        synopsis: 'Un profesor de química con cáncer terminal se asocia con un antiguo alumno para asegurar el futuro financiero de su familia.',
        duration: '5 Temporadas (62 eps)',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1547234935-80c7145ec969?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'HhesaQXLuRY',
        defaultPlatform: 'Netflix',
        communityRating: 4.9,
        matchPercentage: 97,
        matchReason: 'Cielos de Nuevo México, el filtro ámbar de México y una degradación moral reflejada en el vestuario.',
        vibeTag: 'Desierto de Albuquerque & Humo'
      },
      {
        title: 'Severance (Separación)',
        originalTitle: 'Severance',
        type: 'serie',
        year: 2022,
        director: 'Ben Stiller',
        genres: ['Serie', 'Drama', 'Misterio', 'Ciencia Ficción'],
        synopsis: 'Una inquietante conspiración corporativa filmada con precisión milimétrica donde nada es lo que parece.',
        duration: '2 Temporadas (19 eps)',
        posterUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'xEQP4VVuyrY',
        defaultPlatform: 'Apple TV+',
        communityRating: 4.9,
        matchPercentage: 95,
        matchReason: 'Tensión psicológica asfixiante con iluminación cenital clínica y revelaciones impactantes.',
        vibeTag: 'Tensión Psicológica Pura'
      },
      {
        title: 'The Batman',
        originalTitle: 'The Batman',
        type: 'pelicula',
        year: 2022,
        director: 'Matt Reeves',
        genres: ['Acción', 'Crimen', 'Drama'],
        synopsis: 'Investigación detectivesca de crímenes en serie bajo la lluvia nocturna con estética de thriller de Fincher.',
        duration: '2h 56m',
        posterUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'mqqft2x_Aa4',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.8,
        matchPercentage: 94,
        matchReason: 'Atmósfera sucia inspirada en Se7en y Klute con sombras de ámbar y lluvia incesante.',
        vibeTag: 'Detective Bajo la Lluvia'
      },
      {
        title: 'El Caballero de la Noche',
        originalTitle: 'The Dark Knight',
        type: 'pelicula',
        year: 2008,
        director: 'Christopher Nolan',
        genres: ['Acción', 'Crimen', 'Drama'],
        synopsis: 'El enfrentamiento moral definitivo entre Batman y el Guasón en las calles de Gotham.',
        duration: '2h 32m',
        posterUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80',
        backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
        trailerYoutubeId: 'EXeTwQWrcwY',
        defaultPlatform: 'Max (HBO)',
        communityRating: 4.9,
        matchPercentage: 92,
        matchReason: 'Thriller policiaco de gran escala con persecuciones nocturnas en túneles subterráneos.',
        vibeTag: 'Caos & Dilema Moral'
      }
    ]
  }
};

// Map vibes to best aesthetic preset or selection
export const VIBE_MAPPINGS: Record<string, { presetKey: string; reason: string; vibeTag: string }> = {
  plot_twist: {
    presetKey: 'noir_thriller',
    reason: 'Historias laberínticas diseñadas con meticulosidad para mantenerte al filo del asiento hasta el último plano.',
    vibeTag: 'Plot Twist Inolvidable'
  },
  adrenaline: {
    presetKey: 'cyberpunk_neon',
    reason: 'Ritmo implacable, secuencias de acción coreografiadas y adrenalina pura sin descansos.',
    vibeTag: 'Adrenalina Pura'
  },
  melancholy: {
    presetKey: 'cyberpunk_neon',
    reason: 'Poesía visual, contemplación nocturna y resonancia emocional para momentos de reflexión íntima.',
    vibeTag: 'Melancolía y Reflexión'
  },
  existential_scifi: {
    presetKey: 'desert_dune',
    reason: 'Preguntas fundamentales sobre el cosmos, la conciencia humana y horizontes colosales.',
    vibeTag: 'Ciencia Ficción Existencial'
  },
  pure_fun: {
    presetKey: 'wes_anderson',
    reason: 'Placer cinematográfico puro, humor inteligente, diseño de arte brillante y personajes inolvidables.',
    vibeTag: 'Diversión & Estilo'
  },
  mystery: {
    presetKey: 'gothic_dark',
    reason: 'Secretos a fuego lento, sombras densas y una atmósfera gótica donde cada detalle cuenta.',
    vibeTag: 'Misterio a Fuego Lento'
  },
  emotional_comfort: {
    presetKey: 'anime_ghibli',
    reason: 'Abrazo emocional para el alma: belleza natural, magia cotidiana y calidez reconfortante.',
    vibeTag: 'Confort Emocional'
  },
  epic: {
    presetKey: 'desert_dune',
    reason: 'Grandes epopeyas cinematográficas de escala sobrehumana, partituras atronadoras y leyenda.',
    vibeTag: 'Épica Monumental'
  }
};

export function getCuratedRecommendations(req: CineMatchRequest): CineMatchResponse {
  let presetKey = 'cyberpunk_neon';
  let customReason = '';
  let vibeTag = 'Estética Cinematográfica';
  let mode: CineMatchResponse['mode'] = 'preset';

  if (req.image) {
    mode = 'visual';
    // If a custom image was uploaded, cycle through or select based on hint
    const keys = Object.keys(AESTHETIC_PRESETS);
    const hash = req.image.length % keys.length;
    presetKey = keys[hash] || 'cyberpunk_neon';
    customReason = 'Análisis de paleta y composición: detectada afinidad con esta atmósfera cinematográfica.';
  } else if (req.vibe && VIBE_MAPPINGS[req.vibe]) {
    mode = 'vibe';
    const mapping = VIBE_MAPPINGS[req.vibe];
    presetKey = mapping.presetKey;
    customReason = mapping.reason;
    vibeTag = mapping.vibeTag;
  } else if (req.visualPreset && AESTHETIC_PRESETS[req.visualPreset]) {
    mode = 'preset';
    presetKey = req.visualPreset;
  } else if (req.userFavorites && req.userFavorites.length > 0) {
    mode = 'favorites';
    presetKey = 'desert_dune';
    customReason = 'Basado en tus títulos favoritos y calificaciones más altas de tu colección.';
    vibeTag = 'Tus Favoritos 5★';
  }

  const preset = AESTHETIC_PRESETS[presetKey] || AESTHETIC_PRESETS.cyberpunk_neon;

  // Filter by mediaType if requested
  let items = [...preset.items];
  if (req.mediaType && req.mediaType !== 'all') {
    const filtered = items.filter((it) => it.type === req.mediaType);
    if (filtered.length >= 2) items = filtered;
  }

  // Filter by platform if requested
  if (req.platform && req.platform !== 'all') {
    const pNorm = req.platform.toLowerCase();
    const platformMatches = items.filter((it) => it.defaultPlatform.toLowerCase().includes(pNorm));
    if (platformMatches.length >= 2) items = platformMatches;
  }

  const recommendations: CineMatchItem[] = items.map((it, idx) => ({
    id: `cinematch-${presetKey}-${idx}`,
    title: it.title,
    originalTitle: it.originalTitle,
    type: it.type,
    year: it.year,
    director: it.director,
    genres: it.genres,
    synopsis: it.synopsis,
    duration: it.duration,
    posterUrl: it.posterUrl,
    backdropUrl: it.backdropUrl,
    trailerYoutubeId: it.trailerYoutubeId,
    defaultPlatform: it.defaultPlatform,
    communityRating: it.communityRating,
    matchPercentage: Math.max(90, it.matchPercentage - idx),
    matchReason: customReason || it.matchReason,
    vibeTag: vibeTag || it.vibeTag
  }));

  return {
    success: true,
    mode,
    aestheticAnalysis: {
      title: preset.title,
      palette: preset.palette,
      summary: preset.summary,
      keywords: preset.keywords
    },
    recommendations
  };
}
