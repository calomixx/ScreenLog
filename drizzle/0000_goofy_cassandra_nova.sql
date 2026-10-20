CREATE TABLE "contact_tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_code" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"urgency" text DEFAULT 'normal',
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"original_title" text,
	"year" integer NOT NULL,
	"type" text DEFAULT 'pelicula' NOT NULL,
	"genres" jsonb NOT NULL,
	"director" text,
	"cast" jsonb DEFAULT '[]'::jsonb,
	"synopsis" text NOT NULL,
	"poster_url" text NOT NULL,
	"backdrop_url" text,
	"trailer_url" text,
	"duration" text,
	"seasons" integer,
	"episodes" integer,
	"streaming_platforms" jsonb DEFAULT '[]'::jsonb,
	"rating" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0,
	"featured" boolean DEFAULT false,
	"trending" boolean DEFAULT false,
	"top_rated" boolean DEFAULT false,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"media_id" text NOT NULL,
	"user_id" text,
	"user_name" text NOT NULL,
	"user_avatar" text NOT NULL,
	"user_role" text DEFAULT 'user' NOT NULL,
	"rating" real DEFAULT 5 NOT NULL,
	"comment" text NOT NULL,
	"platform_watched" text,
	"date_str" text,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"user_name" text NOT NULL,
	"user_avatar" text NOT NULL,
	"user_role" text DEFAULT 'user' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"highlight_feature" text NOT NULL,
	"content" text NOT NULL,
	"date_str" text,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_list_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"media_id" text NOT NULL,
	"status" text DEFAULT 'por_ver' NOT NULL,
	"rating" real DEFAULT 0,
	"user_notes" text,
	"platform_watched" text,
	"date_watched" text,
	"rewatch" boolean DEFAULT false,
	"script_score" real,
	"acting_score" real,
	"direction_score" real,
	"emotional_tag" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"avatar" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"bio" text,
	"favorite_genres" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "media_reviews" ADD CONSTRAINT "media_reviews_media_id_media_items_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_list_entries" ADD CONSTRAINT "user_list_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_list_entries" ADD CONSTRAINT "user_list_entries_media_id_media_items_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;