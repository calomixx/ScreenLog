import { z } from 'zod';

// Disallowed disposable / fake / spam email domains
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'throwawaymail.com',
  'fake.com',
  'test.com',
  'testing.com',
  'example.com',
  'sample.com',
  'dispostable.com',
  'trashmail.com',
  'getairmail.com',
  'generator.email',
  'fakemail.net',
  'nada.ltd',
  'mohmal.com',
  'mytemp.email',
  'crazymailing.com',
  'mailnesia.com',
  'spam4.me',
  'bccto.me',
  'chacuo.net',
  '0815.ru',
  'inboxbear.com'
]);

// Reserved / dummy prefixes that indicate fake emails
const FAKE_LOCAL_PARTS = new Set([
  'test',
  'testing',
  'asdf',
  'asdfgh',
  'qwerty',
  'fake',
  'nobody',
  'none',
  'null',
  'undefined',
  '123456',
  'abc',
  'no-reply',
  'noreply',
  'ejemplo',
  'prueba'
]);

/**
 * Validates whether an email has real structure, valid RFC compliance,
 * a legitimate public domain, and is not a disposable or placeholder inbox.
 */
export function isRealEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'El correo electrónico es obligatorio.' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic length constraints
  if (trimmed.length < 5 || trimmed.length > 254) {
    return { isValid: false, error: 'El correo debe tener entre 5 y 254 caracteres.' };
  }

  // RFC 5322 strict pattern
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Formato de correo inválido (ejemplo: usuario@gmail.com).' };
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) {
    return { isValid: false, error: 'El correo debe contener exactamente un @.' };
  }

  const [localPart, domain] = parts;

  // Check local part
  if (localPart.length > 64) {
    return { isValid: false, error: 'La parte previa al @ no puede exceder 64 caracteres.' };
  }

  if (FAKE_LOCAL_PARTS.has(localPart)) {
    return { isValid: false, error: 'Por favor ingresa un correo personal o corporativo real.' };
  }

  // Check domain structure
  if (!domain.includes('.')) {
    return { isValid: false, error: 'El dominio del correo debe incluir una extensión (.com, .es, etc.).' };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];

  if (!tld || tld.length < 2 || !/^[a-z]+$/.test(tld)) {
    return { isValid: false, error: 'La extensión de dominio (.com, .org, .es) no es válida.' };
  }

  // Reject disposable domains
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return {
      isValid: false,
      error: `El dominio "@${domain}" es temporal o desechable. Usa un proveedor real (Gmail, Outlook, Yahoo, Proton, iCloud, etc.).`
    };
  }

  return { isValid: true };
}

export function getEmailValidationError(email: string): string | null {
  const check = isRealEmail(email);
  return check.isValid ? null : (check.error || 'El correo electrónico no es válido.');
}

// Zod Schema for real verified email
export const realEmailSchema = z
  .string()
  .trim()
  .min(5, 'El correo electrónico es requerido.')
  .max(254, 'El correo no puede exceder 254 caracteres.')
  .superRefine((val, ctx) => {
    const check = isRealEmail(val);
    if (!check.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.error || 'Correo no válido'
      });
    }
  });

// Password strength analysis
export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: 'Muy Débil' | 'Débil' | 'Aceptable' | 'Fuerte' | 'Excelente';
  color: string;
  requirements: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const requirements = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  };

  let count = 0;
  if (requirements.minLength) count++;
  if (requirements.hasUpper && requirements.hasLower) count++;
  if (requirements.hasNumber) count++;
  if (requirements.hasSpecial) count++;

  let label: PasswordStrengthResult['label'] = 'Muy Débil';
  let color = 'bg-rose-500';

  if (count === 1) {
    label = 'Débil';
    color = 'bg-orange-500';
  } else if (count === 2) {
    label = 'Aceptable';
    color = 'bg-amber-500';
  } else if (count === 3) {
    label = 'Fuerte';
    color = 'bg-emerald-500';
  } else if (count >= 4 && password.length >= 10) {
    label = 'Excelente';
    color = 'bg-teal-400';
  }

  return {
    score: count,
    label,
    color,
    requirements
  };
}

// Zod password schema
export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128, 'La contraseña no puede exceder 128 caracteres.')
  .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula.')
  .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula.')
  .regex(/[0-9]/, 'Debe incluir al menos un número.');

// Helper to extract clean 11-char YouTube ID from any format
export function extractYouTubeId(urlOrId: string): string {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  const trimmed = urlOrId.trim();

  // If already bare 11 chars
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard youtube.com/watch?v=ID
  const matchWatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch) return matchWatch[1];

  // youtu.be/ID or youtube.com/embed/ID or youtube.com/shorts/ID
  const matchShort = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed|shorts)\/)([a-zA-Z0-9_-]{11})/);
  if (matchShort) return matchShort[1];

  return '';
}

// Media Form Schema
const currentYear = new Date().getFullYear();
export const mediaFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'El título debe tener al menos 2 caracteres.')
    .max(200, 'El título no puede exceder 200 caracteres.'),
  originalTitle: z.string().trim().max(200).optional(),
  type: z.enum(['pelicula', 'serie', 'anime', 'documental']),
  year: z
    .number()
    .int('El año debe ser un número entero.')
    .min(1888, 'El año debe ser 1888 o posterior (nacimiento del cine).')
    .max(currentYear + 2, `El año no puede ser superior a ${currentYear + 2}.`),
  director: z
    .string()
    .trim()
    .min(2, 'El nombre del director debe tener al menos 2 caracteres.')
    .max(160, 'El director no puede exceder 160 caracteres.'),
  genres: z
    .array(z.string().trim().min(1))
    .min(1, 'Debes seleccionar al menos un género cinematográfico.')
    .max(12, 'Máximo 12 géneros permitidos.'),
  synopsis: z
    .string()
    .trim()
    .max(4000, 'La sinopsis no puede exceder 4000 caracteres.')
    .optional(),
  duration: z.string().trim().max(60).optional(),
  posterUrl: z
    .string()
    .trim()
    .url('La URL del póster debe ser una dirección web válida (ej. https://...).')
    .max(1000, 'La URL del póster es demasiado larga.')
    .or(z.literal('')),
  backdropUrl: z
    .string()
    .trim()
    .url('La URL del fondo debe ser una dirección web válida.')
    .max(1000)
    .optional()
    .or(z.literal('')),
  trailerUrl: z.string().trim().max(300).optional(),
  trailerYoutubeId: z.string().trim().max(120).optional(),
  defaultPlatform: z.string().trim().min(1, 'Selecciona una plataforma principal.').max(80)
});

// User Review & Watch Status Schema with business rules
export const userReviewSchema = z
  .object({
    mediaId: z.string().trim().min(1, 'ID de título requerido.'),
    status: z.enum(['pendiente', 'en_proceso', 'terminada']),
    stars: z.number().min(0).max(5).default(0),
    watchedDate: z.string().trim().optional(),
    platform: z.string().trim().max(80).optional(),
    evaluation: z.string().trim().max(80).optional(),
    critique: z.string().trim().max(4000).optional(),
    director: z.string().trim().max(120).optional(),
    year: z.number().optional(),
    genres: z.array(z.string()).optional(),
    wouldRewatch: z.enum(['si_totalmente', 'quizas', 'no_suficiente', 'jamas']).optional(),
    favoriteMoment: z.string().trim().max(500).optional()
  })
  .superRefine((data, ctx) => {
    // Business invariant: If completed, stars and valid date are mandatory
    if (data.status === 'terminada') {
      if (data.stars < 0.5 || data.stars > 5.0) {
        ctx.addIssue({
          path: ['stars'],
          code: z.ZodIssueCode.custom,
          message: 'Debes asignar una calificación entre 0.5 y 5 estrellas al terminar la obra.'
        });
      }

      if (data.watchedDate) {
        const parsedDate = new Date(data.watchedDate);
        if (isNaN(parsedDate.getTime())) {
          ctx.addIssue({
            path: ['watchedDate'],
            code: z.ZodIssueCode.custom,
            message: 'La fecha de visualización tiene un formato no válido (YYYY-MM-DD).'
          });
        } else if (parsedDate > new Date()) {
          ctx.addIssue({
            path: ['watchedDate'],
            code: z.ZodIssueCode.custom,
            message: 'La fecha de visualización no puede ser en el futuro.'
          });
        }
      }
    }
  });

// Auth Registration Schema
export const registerUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres.')
    .max(80, 'El nombre no puede exceder 80 caracteres.'),
  email: realEmailSchema,
  password: passwordSchema,
  avatar: z.string().trim().url().optional().or(z.literal('')),
  favoriteGenres: z.array(z.string()).optional(),
  bio: z.string().trim().max(500).optional()
});

// Auth Login Schema
export const loginUserSchema = z.object({
  identifier: z.string().trim().min(3, 'Ingresa tu correo o nombre de usuario.'),
  password: z.string().min(1, 'Ingresa tu contraseña.')
});

// Community Comment Schema
export const communityCommentSchema = z.object({
  mediaId: z.string().trim().min(1, 'Media ID requerido.'),
  rating: z.number().min(1, 'La calificación mínima es 1★').max(5, 'La calificación máxima es 5★'),
  comment: z
    .string()
    .trim()
    .min(3, 'El comentario debe tener al menos 3 caracteres.')
    .max(2000, 'El comentario no puede exceder 2000 caracteres.')
});

// Support / Contact Ticket Schema
export const contactTicketSchema = z.object({
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(80),
  email: realEmailSchema,
  subject: z.string().trim().min(3, 'El asunto debe tener al menos 3 caracteres.').max(160),
  message: z.string().trim().min(10, 'El mensaje debe tener al menos 10 caracteres.').max(4000)
});
