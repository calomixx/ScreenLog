/**
 * Generador nativo HTML5 Canvas de "Pasaporte Cinéfilo" (CineWrapped)
 * Exporta una tarjeta vertical de alta definición lista para compartir o descargar en PNG.
 * 100% libre de dependencias externas.
 */

export interface CinephilePassportData {
  userName: string;
  totalWatched: number;
  totalHours: number;
  avgRating: string;
  topGenre: string;
  levelTitle: string;
  levelNum: number;
  xp: number;
  badgesUnlocked: number;
  totalBadges: number;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function downloadCinephilePassport(data: CinephilePassportData): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background deep dark cinema
  const bgGrad = ctx.createLinearGradient(0, 0, 900, 1200);
  bgGrad.addColorStop(0, '#0C0C10');
  bgGrad.addColorStop(0.5, '#13131A');
  bgGrad.addColorStop(1, '#09090D');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 900, 1200);

  // Decorative ambient glow
  const glow = ctx.createRadialGradient(450, 160, 20, 450, 160, 420);
  glow.addColorStop(0, 'rgba(244, 63, 94, 0.28)');
  glow.addColorStop(0.5, 'rgba(251, 191, 36, 0.12)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 900, 500);

  // Outer border with gold/rose accent
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 840, 1140);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, 828, 1128);

  // Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCREENLOG PRO', 450, 95);

  ctx.fillStyle = '#F43F5E';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('PASAPORTE CINÉFILO OFICIAL', 450, 125);

  // Divider
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.moveTo(100, 150);
  ctx.lineTo(800, 150);
  ctx.stroke();

  // User Section
  // Monogram circle
  ctx.fillStyle = '#E11D48';
  ctx.beginPath();
  ctx.arc(450, 230, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#FBBF24';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 40px sans-serif';
  ctx.textBaseline = 'middle';
  const initial = (data.userName || 'C').charAt(0).toUpperCase();
  ctx.fillText(initial, 450, 230);
  ctx.textBaseline = 'alphabetic';

  // Name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(data.userName, 450, 315);

  // Rank Pill
  ctx.fillStyle = 'rgba(251, 191, 36, 0.15)';
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 270, 335, 360, 38, 19);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Nv.${data.levelNum} ${data.levelTitle} · ${data.xp} XP`, 450, 360);

  // 4 Stats Bento Grid
  const stats = [
    { label: 'TÍTULOS COMPLETADOS', val: `${data.totalWatched}`, sub: 'películas y series' },
    { label: 'HORAS DE VISUALIZACIÓN', val: `${data.totalHours}h`, sub: 'tiempo acumulado' },
    { label: 'CALIFICACIÓN PROMEDIO', val: `${data.avgRating}★`, sub: 'criterio personal' },
    { label: 'GÉNERO DOMINANTE', val: data.topGenre || 'Variado', sub: 'preferencia #1' },
  ];

  stats.forEach((s, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 90 + col * 370;
    const y = 410 + row * 150;

    // Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, 350, 130, 16);
    ctx.fill();
    ctx.stroke();

    // Box content
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(s.label, x + 24, y + 36);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(s.val, x + 24, y + 82);

    ctx.fillStyle = '#64748B';
    ctx.font = '13px sans-serif';
    ctx.fillText(s.sub, x + 24, y + 108);
  });

  // Insignias Vitrine Box
  const vY = 735;
  ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
  ctx.strokeStyle = 'rgba(244, 63, 94, 0.25)';
  roundRect(ctx, 90, vY, 720, 160, 20);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#F43F5E';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('🏅 VITRINA DE INSIGNIAS DESBLOQUEADAS', 450, vY + 42);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`${data.badgesUnlocked} de ${data.totalBadges} Medallas de Honor`, 450, vY + 88);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px sans-serif';
  ctx.fillText('Verificadas por el Sistema Cinephile Rank de ScreenLog Pro', 450, vY + 122);

  // Footer & Seal
  const fY = 950;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  ctx.moveTo(100, fY);
  ctx.lineTo(800, fY);
  ctx.stroke();

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  ctx.fillStyle = '#64748B';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Expedido el ${dateStr} · Verificado para Google AI Studio`, 450, fY + 45);

  ctx.fillStyle = '#F43F5E';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('screenlog.pro · Bitácora Cinéfila Digital', 450, fY + 75);

  // Trigger Download
  const link = document.createElement('a');
  const safeName = (data.userName || 'usuario').toLowerCase().replace(/[^a-z0-9]/g, '-');
  link.download = `pasaporte-cinefilo-${safeName}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
