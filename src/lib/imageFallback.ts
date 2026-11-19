import type { SyntheticEvent } from 'react';
export const FALLBACK_POSTER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">' +
      '<rect width="400" height="600" fill="#161618"/>' +
      '<circle cx="200" cy="260" r="44" fill="none" stroke="#3f3f46" stroke-width="3"/>' +
      '<path d="M186 238l34 22-34 22z" fill="#f43f5e"/>' +
      '<text x="200" y="340" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#71717a">Sin carátula</text>' +
      '</svg>',
  );

/** Placeholder más ancho para backdrops/hero. */
export const FALLBACK_BACKDROP =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#161618"/><stop offset="1" stop-color="#241018"/>' +
      '</linearGradient></defs>' +
      '<rect width="1280" height="720" fill="url(#g)"/>' +
      '<text x="640" y="370" text-anchor="middle" font-family="system-ui,sans-serif" font-size="40" fill="#f43f5e">ScreenLog</text>' +
      '</svg>',
  );

export const handleImageError = (event: SyntheticEvent<HTMLImageElement>, fallback = FALLBACK_POSTER) => {
  const image = event.currentTarget;
  if (image.src !== fallback) image.src = fallback;
};
