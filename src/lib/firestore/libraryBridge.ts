import { auth } from '../firebase';
import type { UserReview } from '../../types';
import {
  deleteClassification,
  getClassification,
  subscribeToClassifications,
  upsertClassification,
} from './classifications';
import { classificationToUserReview, userReviewToClassificationInput } from './schema';

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
