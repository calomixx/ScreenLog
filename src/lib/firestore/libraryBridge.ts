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

/**
 * Puente entre el modelo de UI (`UserReview`) y el modelo persistido
 * (`MovieClassification`). Mantiene las firmas que ya usa MediaContext.
 */

export interface MediaLookupEntry {
  year?: number;
  genres?: string[];
  director?: string;
}

export type MediaLookup = Map<string, MediaLookupEntry>;

export async function saveLibraryEntryToFirestore(review: UserReview): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) return;
  try {
    const previous = await getClassification(fbUser.uid, review.mediaId);
    const input = userReviewToClassificationInput(review, previous);
    await upsertClassification(fbUser.uid, review.mediaId, input);
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
    console.error('No se pudo guardar la clasificación en Firestore:', error);
  }
}

export async function removeLibraryEntryFromFirestore(rawMediaId: string): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) return;
  try {
    await deleteClassification(fbUser.uid, rawMediaId);
  } catch (error) {
    console.error('No se pudo borrar la clasificación de Firestore:', error);
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
