import { doc, increment, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserReview } from '../../types';
import {
  deleteClassification,
  getClassification,
  subscribeToClassifications,
  upsertClassification,
} from './classifications';
import {
  classificationToUserReview,
  sanitizeFirestoreId,
  userReviewToClassificationInput,
} from './schema';
import { recordWriteAttempt, recordWriteFailure, recordWriteSuccess } from './diagnostics';

/**
 * Puente entre el modelo de UI (`UserReview`) y el modelo persistido
 * (`MovieClassification`). Mantiene las firmas que ya usa MediaContext.
 */

/**
 * La app se autentica contra su propio servidor, pero Firestore necesita una
 * sesión de Firebase Auth para aceptar escrituras. Si falta, no se puede
 * guardar nada en la nube: hay que volver a iniciar sesión para crearla.
 */
export class FirebaseSessionMissingError extends Error {
  readonly code = 'firestore/no-session';

  constructor() {
    super(
      'No hay sesión de Firebase vinculada. Cierra sesión y vuelve a entrar para guardar en la nube.',
    );
    this.name = 'FirebaseSessionMissingError';
  }
}

export interface MediaLookupEntry {
  year?: number;
  genres?: string[];
  director?: string;
}

export type MediaLookup = Map<string, MediaLookupEntry>;

export async function saveLibraryEntryToFirestore(review: UserReview): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) {
    const error = new FirebaseSessionMissingError();
    recordWriteFailure(error);
    throw error;
  }
  recordWriteAttempt();
  try {
    const previous = await getClassification(fbUser.uid, review.mediaId);
    const input = userReviewToClassificationInput(review, previous);
    await upsertClassification(fbUser.uid, review.mediaId, input);
    recordWriteSuccess();
    if (!previous) {
      // Paridad con el modelo anterior: mantiene el contador del catálogo.
      // Es best-effort: si el usuario no está verificado, la regla lo rechaza
      // y no debe impedir guardar su clasificación privada.
      void setDoc(
        doc(db, 'catalog_media', sanitizeFirestoreId(review.mediaId)),
        { addedToListCount: increment(1) },
        { merge: true },
      ).catch((err) => {
        console.warn('No se pudo actualizar addedToListCount:', err);
      });
    }
  } catch (error) {
    recordWriteFailure(error);
    console.error('No se pudo guardar la clasificación en Firestore:', error);
    throw error;
  }
}

export async function removeLibraryEntryFromFirestore(rawMediaId: string): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) {
    const error = new FirebaseSessionMissingError();
    recordWriteFailure(error);
    throw error;
  }
  recordWriteAttempt();
  try {
    await deleteClassification(fbUser.uid, rawMediaId);
    recordWriteSuccess();
  } catch (error) {
    recordWriteFailure(error);
    console.error('No se pudo borrar la clasificación de Firestore:', error);
    throw error;
  }
}

/**
 * Suscripción en tiempo real a la biblioteca persistida. Devuelve el mismo
 * mapa indexado por mediaId que consumía la app.
 */
export function subscribeToUserLibrary(
  uid: string,
  onEntries: (reviews: Record<string, UserReview>) => void,
  mediaLookup?: MediaLookup,
): () => void {
  return subscribeToClassifications(
    uid,
    (classifications) => {
      const map: Record<string, UserReview> = {};
      for (const classification of classifications) {
        map[classification.movieId] = classificationToUserReview(
          classification,
          mediaLookup?.get(classification.movieId),
        );
      }
      onEntries(map);
    },
    (error) => {
      console.warn('Suscripción a la biblioteca de Firestore falló:', error.message);
    },
  );
}
