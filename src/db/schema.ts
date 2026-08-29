import { pgTable, text, timestamp, integer, boolean, real, jsonb } from 'drizzle-orm/pg-core';

// 1. Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  avatar: text('avatar').notNull(),
  role: text('role').notNull().default('user'), // 'user' | 'critic' | 'admin'
  bio: text('bio'),
  favoriteGenres: jsonb('favorite_genres').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Media Items (Movies & Series) Table
export const mediaItems = pgTable('media_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  originalTitle: text('original_title'),
  year: integer('year').notNull(),
  type: text('type').notNull().default('pelicula'), // 'pelicula' | 'serie' | 'documental' | 'anime'
  genres: jsonb('genres').$type<string[]>().notNull(),
  director: text('director'),
  cast: jsonb('cast').$type<string[]>().default([]),
  synopsis: text('synopsis').notNull(),
  posterUrl: text('poster_url').notNull(),
  backdropUrl: text('backdrop_url'),
  trailerUrl: text('trailer_url'),
  duration: text('duration'),
  seasons: integer('seasons'),
  episodes: integer('episodes'),
  streamingPlatforms: jsonb('streaming_platforms').$type<string[]>().default([]),
  rating: real('rating').notNull().default(0),
  ratingCount: integer('rating_count').default(0),
  featured: boolean('featured').default(false),
  trending: boolean('trending').default(false),
  topRated: boolean('top_rated').default(false),
  createdByUserId: text('created_by_user_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. User MyList & Private Journal Table
export const userListEntries = pgTable('user_list_entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaId: text('media_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('por_ver'), // 'por_ver' | 'viendo' | 'completada' | 'abandonada'
  rating: real('rating').default(0),
  userNotes: text('user_notes'),
  platformWatched: text('platform_watched'),
  dateWatched: text('date_watched'),
  rewatch: boolean('rewatch').default(false),
  scriptScore: real('script_score'),
  actingScore: real('acting_score'),
  directionScore: real('direction_score'),
  emotionalTag: text('emotional_tag'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Public Media Reviews Table
export const mediaReviews = pgTable('media_reviews', {
  id: text('id').primaryKey(),
  mediaId: text('media_id').notNull().references(() => mediaItems.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar').notNull(),
  userRole: text('user_role').notNull().default('user'),
  rating: real('rating').notNull().default(5),
  comment: text('comment').notNull(),
  platformWatched: text('platform_watched'),
  dateStr: text('date_str'),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Site Testimonials / Community Feedback Table
export const siteTestimonials = pgTable('site_testimonials', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar').notNull(),
  userRole: text('user_role').notNull().default('user'),
  rating: integer('rating').notNull().default(5),
  highlightFeature: text('highlight_feature').notNull(),
  content: text('content').notNull(),
  dateStr: text('date_str'),
  likes: integer('likes').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Support & Contact Tickets Table
export const contactTickets = pgTable('contact_tickets', {
  id: text('id').primaryKey(),
  ticketCode: text('ticket_code').notNull(),
  userId: text('user_id'),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  urgency: text('urgency').default('normal'),
  status: text('status').default('open'), // 'open' | 'in_progress' | 'resolved'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
