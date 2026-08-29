import { MediaItem, UserReview } from '../types';

export const INITIAL_MEDIA_LIST: MediaItem[] = [
  {
    id: 'oppenheimer-2023',
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    type: 'pelicula',
    year: 2023,
    genres: ['Drama', 'Biografía', 'Historia'],
    director: 'Christopher Nolan',
    cast: ['Cillian Murphy', 'Emily Blunt', 'Matt Damon', 'Robert Downey Jr.', 'Florence Pugh'],
    synopsis: 'La historia del físico estadounidense J. Robert Oppenheimer, su papel en el Proyecto Manhattan y el desarrollo de la bomba atómica que cambió el curso de la historia de la humanidad.',
    duration: '3h 00m',
    posterUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'uYPbbksJxIg',
    defaultPlatform: 'Max (HBO)',
    communityRating: 4.8,
    communityVotesCount: 14250,
    addedToListCount: 28400,
    isFeatured: true,
    isTrending: true,
    isTopClassified: true,
    createdAt: '2023-07-21',
    detailedVotes: {
      script: 9.4,
      acting: 9.8,
      soundtrack: 9.7,
      visuals: 9.6,
      direction: 9.9,
      totalVotes: 14250,
      ratingDistribution: { 1: 120, 2: 240, 3: 890, 4: 3400, 5: 9600 }
    },
    comments: [
      {
        id: 'c1',
        author: 'Carlos G.',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'La actuación de Cillian Murphy y la banda sonora de Ludwig Göransson crean una tensión asfixiante. Obra cumbre de Nolan.',
        date: '2024-01-15',
        likes: 142
      },
      {
        id: 'c2',
        author: 'Sofía Valdés',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
        rating: 4.5,
        comment: 'El tercer acto con el juicio político es pura tensión psicológica. Brillante edición de sonido.',
        date: '2024-02-10',
        likes: 89
      }
    ]
  },
  {
    id: 'dune-part-two-2024',
    title: 'Dune: Parte Dos',
    originalTitle: 'Dune: Part Two',
    type: 'pelicula',
    year: 2024,
    genres: ['Ciencia Ficción', 'Aventura', 'Drama'],
    director: 'Denis Villeneuve',
    cast: ['Timothée Chalamet', 'Zendaya', 'Rebecca Ferguson', 'Javier Bardem', 'Austin Butler'],
    synopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia, enfrentándose a una elección entre el amor de su vida y el destino del universo.',
    duration: '2h 46m',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'Way9Dexny3w',
    defaultPlatform: 'Max (HBO)',
    communityRating: 4.9,
    communityVotesCount: 18900,
    addedToListCount: 34100,
    isFeatured: true,
    isTrending: true,
    isTopClassified: true,
    createdAt: '2024-03-01',
    detailedVotes: {
      script: 9.3,
      acting: 9.4,
      soundtrack: 9.9,
      visuals: 10.0,
      direction: 9.8,
      totalVotes: 18900,
      ratingDistribution: { 1: 80, 2: 150, 3: 670, 4: 2900, 5: 15100 }
    },
    comments: [
      {
        id: 'c3',
        author: 'Mateo Morales',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'La escena en Giedi Prime en blanco y negro infrarrojo y el sonido del Shai-Hulud en IMAX son irrepetibles.',
        date: '2024-03-12',
        likes: 215
      }
    ]
  },
  {
    id: 'arcane-league-of-legends',
    title: 'Arcane',
    originalTitle: 'Arcane: League of Legends',
    type: 'anime',
    year: 2021,
    genres: ['Animación', 'Acción', 'Ciencia Ficción', 'Drama'],
    director: 'Pascal Charrue, Arnaud Delord',
    cast: ['Hailee Steinfeld', 'Ella Purnell', 'Kevin Alejandro', 'Katie Leung'],
    synopsis: 'En medio del conflicto entre las ciudades gemelas de Piltóver y Zaun, dos hermanas luchan en bandos opuestos de una guerra entre tecnologías mágicas y convicciones incompatibles.',
    duration: '2 Temporadas (18 eps)',
    posterUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'fXmAurh012s',
    defaultPlatform: 'Netflix',
    communityRating: 4.9,
    communityVotesCount: 22400,
    addedToListCount: 41200,
    isFeatured: true,
    isTrending: true,
    isTopClassified: true,
    createdAt: '2021-11-06',
    detailedVotes: {
      script: 9.6,
      acting: 9.7,
      soundtrack: 9.9,
      visuals: 10.0,
      direction: 9.8,
      totalVotes: 22400,
      ratingDistribution: { 1: 50, 2: 90, 3: 410, 4: 2150, 5: 19700 }
    },
    comments: [
      {
        id: 'c4',
        author: 'Elena Romero',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'La mejor serie animada de la década. El arte de Fortiche Studios traspasa cualquier estándar.',
        date: '2024-04-02',
        likes: 310
      }
    ]
  },
  {
    id: 'breaking-bad',
    title: 'Breaking Bad',
    originalTitle: 'Breaking Bad',
    type: 'serie',
    year: 2008,
    genres: ['Crimen', 'Drama', 'Suspense'],
    director: 'Vince Gilligan',
    cast: ['Bryan Cranston', 'Aaron Paul', 'Anna Gunn', 'Dean Norris', 'Bob Odenkirk'],
    synopsis: 'Un profesor de química de secundaria diagnosticado con cáncer de pulmón inoperable decide fabricar y vender metanfetamina para asegurar el futuro financiero de su familia con la ayuda de un exalumno.',
    duration: '5 Temporadas (62 eps)',
    posterUrl: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'HhesaQXLuRY',
    defaultPlatform: 'Netflix',
    communityRating: 5.0,
    communityVotesCount: 39500,
    addedToListCount: 52000,
    isFeatured: true,
    isTrending: false,
    isTopClassified: true,
    createdAt: '2008-01-20',
    detailedVotes: {
      script: 10.0,
      acting: 10.0,
      soundtrack: 9.5,
      visuals: 9.4,
      direction: 9.9,
      totalVotes: 39500,
      ratingDistribution: { 1: 20, 2: 60, 3: 200, 4: 2100, 5: 37120 }
    },
    comments: [
      {
        id: 'c5',
        author: 'Diego S.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'Ozymandias es probablemente la mejor hora en la historia de la televisión mundial.',
        date: '2024-05-18',
        likes: 420
      }
    ]
  },
  {
    id: 'interstellar-2014',
    title: 'Interestelar',
    originalTitle: 'Interstellar',
    type: 'pelicula',
    year: 2014,
    genres: ['Ciencia Ficción', 'Drama', 'Aventura'],
    director: 'Christopher Nolan',
    cast: ['Matthew McConaughey', 'Anne Hathaway', 'Jessica Chastain', 'Michael Caine'],
    synopsis: 'Un equipo de exploradores viaja a través de un agujero de gusano en el espacio en un intento desesperado por asegurar la supervivencia de la humanidad ante el colapso de la Tierra.',
    duration: '2h 49m',
    posterUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'zSWdZVtXT7E',
    defaultPlatform: 'Prime Video',
    communityRating: 4.9,
    communityVotesCount: 31200,
    addedToListCount: 47800,
    isFeatured: true,
    isTrending: false,
    isTopClassified: true,
    createdAt: '2014-11-07',
    detailedVotes: {
      script: 9.5,
      acting: 9.6,
      soundtrack: 10.0,
      visuals: 9.9,
      direction: 9.8,
      totalVotes: 31200,
      ratingDistribution: { 1: 90, 2: 120, 3: 550, 4: 3100, 5: 27340 }
    },
    comments: [
      {
        id: 'c6',
        author: 'Valeria M.',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'La banda sonora con órgano de Hans Zimmer y el mensaje sobre el amor y el tiempo me hacen llorar cada vez.',
        date: '2024-06-01',
        likes: 275
      }
    ]
  },
  {
    id: 'the-last-of-us',
    title: 'The Last of Us',
    originalTitle: 'The Last of Us',
    type: 'serie',
    year: 2023,
    genres: ['Drama', 'Terror', 'Aventura', 'Ciencia Ficción'],
    director: 'Craig Mazin, Neil Druckmann',
    cast: ['Pedro Pascal', 'Bella Ramsey', 'Gabriel Luna', 'Anna Torv'],
    synopsis: 'Veinte años después de que una infección por hongos destruyera la civilización moderna, Joel, un curtido superviviente, es contratado para sacar a Ellie, una niña de 14 años, fuera de una opresiva zona de cuarentena.',
    duration: '1 Temporada (9 eps)',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'uLtkt8BonwM',
    defaultPlatform: 'Max (HBO)',
    communityRating: 4.7,
    communityVotesCount: 16800,
    addedToListCount: 29500,
    isFeatured: false,
    isTrending: true,
    isTopClassified: true,
    createdAt: '2023-01-15',
    detailedVotes: {
      script: 9.3,
      acting: 9.7,
      soundtrack: 9.4,
      visuals: 9.5,
      direction: 9.4,
      totalVotes: 16800,
      ratingDistribution: { 1: 110, 2: 190, 3: 800, 4: 4100, 5: 11600 }
    },
    comments: [
      {
        id: 'c7',
        author: 'Javier P.',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'El episodio 3 con Nick Offerman y Murray Bartlett es una de las mayores joyas de la televisión.',
        date: '2024-02-18',
        likes: 184
      }
    ]
  },
  {
    id: 'spirited-away-2001',
    title: 'El Viaje de Chihiro',
    originalTitle: 'Sen to Chihiro no Kamikakushi',
    type: 'anime',
    year: 2001,
    genres: ['Animación', 'Fantasía', 'Aventura'],
    director: 'Hayao Miyazaki',
    cast: ['Rumi Hiiragi', 'Miyu Irino', 'Mari Natsuki', 'Takashi Naito'],
    synopsis: 'Durante el traslado de su familia a los suburbios, una niña de 10 años se adentra en un mundo gobernado por dioses, brujas y espíritus, donde los humanos se convierten en bestias.',
    duration: '2h 05m',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'ByXuk9QqQkk',
    defaultPlatform: 'Netflix',
    communityRating: 4.9,
    communityVotesCount: 26500,
    addedToListCount: 38900,
    isFeatured: false,
    isTrending: false,
    isTopClassified: true,
    createdAt: '2001-07-20',
    detailedVotes: {
      script: 9.7,
      acting: 9.5,
      soundtrack: 9.9,
      visuals: 10.0,
      direction: 10.0,
      totalVotes: 26500,
      ratingDistribution: { 1: 40, 2: 80, 3: 400, 4: 2800, 5: 23180 }
    },
    comments: [
      {
        id: 'c8',
        author: 'Andrea Silva',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'Pura magia visual y sensorial. La música de Joe Hisaishi en la escena del tren es inmortal.',
        date: '2024-03-24',
        likes: 198
      }
    ]
  },
  {
    id: 'spider-man-across-spider-verse',
    title: 'Spider-Man: A Través del Spider-Verso',
    originalTitle: 'Spider-Man: Across the Spider-Verse',
    type: 'pelicula',
    year: 2023,
    genres: ['Animación', 'Acción', 'Aventura', 'Ciencia Ficción'],
    director: 'Joaquim Dos Santos, Kemp Powers, Justin K. Thompson',
    cast: ['Shameik Moore', 'Hailee Steinfeld', 'Oscar Isaac', 'Daniel Kaluuya'],
    synopsis: 'Miles Morales es catapultado a través del Multiverso, donde se encuentra con un equipo de Spider-People encargados de proteger su propia existencia ante una amenaza catastrófica.',
    duration: '2h 20m',
    posterUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'cqGjhVJWtEg',
    defaultPlatform: 'Max (HBO)',
    communityRating: 4.8,
    communityVotesCount: 20400,
    addedToListCount: 31000,
    isFeatured: false,
    isTrending: true,
    isTopClassified: true,
    createdAt: '2023-06-02',
    detailedVotes: {
      script: 9.4,
      acting: 9.3,
      soundtrack: 9.8,
      visuals: 10.0,
      direction: 9.7,
      totalVotes: 20400,
      ratingDistribution: { 1: 60, 2: 120, 3: 600, 4: 3200, 5: 16420 }
    },
    comments: [
      {
        id: 'c9',
        author: 'Lucas Castro',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'Cada fotograma es una pintura viviente con estilos artísticos que cambian según el universo.',
        date: '2024-04-10',
        likes: 167
      }
    ]
  },
  {
    id: 'our-planet-documentary',
    title: 'Nuestro Planeta',
    originalTitle: 'Our Planet',
    type: 'documental',
    year: 2019,
    genres: ['Documental', 'Naturaleza'],
    director: 'Alastair Fothergill',
    cast: ['David Attenborough', 'Salma Hayek', 'Penélope Cruz'],
    synopsis: 'Impresionante experiencia visual que muestra la belleza natural de la Tierra y analiza cómo el cambio climático afecta a todos los seres vivos en los hábitats más remotos.',
    duration: '2 Temporadas (12 eps)',
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
    trailerYoutubeId: 'aETNYyrqNYE',
    defaultPlatform: 'Netflix',
    communityRating: 4.9,
    communityVotesCount: 11200,
    addedToListCount: 18400,
    isFeatured: false,
    isTrending: false,
    isTopClassified: true,
    createdAt: '2019-04-05',
    detailedVotes: {
      script: 9.2,
      acting: 9.0,
      soundtrack: 9.7,
      visuals: 10.0,
      direction: 9.8,
      totalVotes: 11200,
      ratingDistribution: { 1: 30, 2: 50, 3: 310, 4: 1800, 5: 9010 }
    },
    comments: [
      {
        id: 'c10',
        author: 'Carolina Diaz',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
        rating: 5,
        comment: 'La fotografía de la vida salvaje en 4K y la narración te dejan sin palabras y con profunda reflexión.',
        date: '2024-05-04',
        likes: 95
      }
    ]
  }
];

export const INITIAL_USER_REVIEWS: Record<string, UserReview> = {
  'oppenheimer-2023': {
    mediaId: 'oppenheimer-2023',
    status: 'terminada',
    stars: 5,
    year: 2023,
    genres: ['Drama', 'Biografía', 'Historia'],
    evaluation: 'Obra Maestra (10/10)',
    critique: 'Una obra monumental sobre la arrogancia científica, la culpa ética y las consecuencias políticas de abrir la caja de Pandora. La banda sonora y el ritmo no dan descanso.',
    director: 'Christopher Nolan',
    watchedDate: '2024-02-14',
    platform: 'Cine / Sala',
    wouldRewatch: 'si_totalmente',
    favoriteMoment: 'La prueba Trinity en silencio sepulcral hasta la onda expansiva.',
    updatedAt: new Date().toISOString()
  },
  'dune-part-two-2024': {
    mediaId: 'dune-part-two-2024',
    status: 'en_proceso',
    stars: 4.5,
    year: 2024,
    genres: ['Ciencia Ficción', 'Aventura'],
    evaluation: 'Excelente (9/10)',
    critique: '',
    director: 'Denis Villeneuve',
    watchedDate: '',
    platform: 'Max (HBO)',
    wouldRewatch: 'si_totalmente',
    updatedAt: new Date().toISOString()
  },
  'arcane-league-of-legends': {
    mediaId: 'arcane-league-of-legends',
    status: 'pendiente',
    stars: 0,
    year: 2021,
    genres: ['Animación', 'Acción', 'Drama'],
    evaluation: '',
    critique: '',
    director: 'Pascal Charrue, Arnaud Delord',
    watchedDate: '',
    platform: 'Netflix',
    wouldRewatch: 'quizas',
    updatedAt: new Date().toISOString()
  }
};
