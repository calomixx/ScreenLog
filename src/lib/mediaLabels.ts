import type { MediaType } from '../types';

/**
 * Etiquetas visibles para cada tipo de medio.
 * Evita que la UI muestre valores internos como "pelicula" o "documental"
 * en minúsculas y sin tildes.
 */
export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  pelicula: 'Película',
  serie: 'Serie',
  anime: 'Anime',
  novela: 'Novela',
  documental: 'Documental',
};

export const MEDIA_TYPE_PLURALS: Record<MediaType, string> = {
  pelicula: 'Películas',
  serie: 'Series',
  anime: 'Anime',
  novela: 'Novelas',
  documental: 'Documentales',
};

export const MEDIA_TYPE_SHORT_LABELS: Record<MediaType, string> = {
  pelicula: 'Cine',
  serie: 'Serie',
  anime: 'Anime',
  novela: 'Novela',
  documental: 'Docu',
};

export type MediaTypeFilter = 'todos' | MediaType;

export interface MediaTypeFilterOption {
  value: MediaTypeFilter;
  label: string;
}

/** Fuente única para las pestañas/chips de filtro por tipo. */
export const MEDIA_TYPE_FILTERS: MediaTypeFilterOption[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'pelicula', label: MEDIA_TYPE_PLURALS.pelicula },
  { value: 'serie', label: MEDIA_TYPE_PLURALS.serie },
  { value: 'anime', label: MEDIA_TYPE_PLURALS.anime },
  { value: 'documental', label: MEDIA_TYPE_PLURALS.documental },
  { value: 'novela', label: MEDIA_TYPE_PLURALS.novela },
];

export const getMediaTypeLabel = (type: string): string =>
  MEDIA_TYPE_LABELS[type as MediaType] ?? type;

export const getMediaTypePlural = (type: string): string =>
  MEDIA_TYPE_PLURALS[type as MediaType] ?? type;
