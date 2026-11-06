/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies all 12 adversarial payloads against the ScreenLog Firestore ruleset.
 */

export interface AdversarialTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: AdversarialTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Library Create',
    operation: 'create',
    path: '/user_library/uid_victim_m1',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    payload: {
      userId: 'uid_victim',
      mediaId: 'm1',
      status: 'pendiente',
      personalRating: 4,
      rewatch: 'si',
      liked: true,
      personalComment: 'Nice',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/community_reviews/rev_1',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: false },
    payload: {
      userId: 'u1',
      mediaId: 'm1',
      author: 'User 1',
      avatar: 'https://example.com/a.jpg',
      rating: 5,
      comment: 'Great movie',
      likes: 0,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Public Profile',
    operation: 'create',
    path: '/users_public/u1',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      userId: 'u1',
      name: 'Ana',
      username: 'ana',
      avatar: 'https://example.com/a.jpg',
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Leak Read on Private Info',
    operation: 'get',
    path: '/users/uid_victim/private/info',
    auth: { uid: 'uid_other', email: 'other@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'ID Poisoning with Invalid Characters',
    operation: 'create',
    path: '/community_reviews/invalid$id!',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      userId: 'u1',
      mediaId: 'm1',
      author: 'User',
      avatar: 'https://example.com/a.jpg',
      rating: 4,
      comment: 'Good',
      likes: 0,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Denial of Wallet Oversized String',
    operation: 'create',
    path: '/community_reviews/rev_big',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      userId: 'u1',
      mediaId: 'm1',
      author: 'User',
      avatar: 'https://example.com/a.jpg',
      rating: 4,
      comment: 'x'.repeat(2500),
      likes: 0,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unbounded Array Poisoning on Favorite Genres',
    operation: 'create',
    path: '/users_public/u1',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      userId: 'u1',
      name: 'User',
      username: 'user',
      avatar: 'https://example.com/a.jpg',
      favoriteGenres: Array.from({ length: 15 }, (_, i) => `Genre ${i}`),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/user_library/u1_m1',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      userId: 'u1',
      mediaId: 'm1',
      status: 'terminada',
      personalRating: 5,
      rewatch: 'si',
      liked: true,
      personalComment: 'Forged time',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immortal Field Mutation on Library Update',
    operation: 'update',
    path: '/user_library/u1_m1',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      userId: 'uid_other',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Update (Out-of-Bounds Rating)',
    operation: 'update',
    path: '/user_library/u1_m1',
    auth: { uid: 'u1', email: 'u1@example.com', email_verified: true },
    payload: {
      personalRating: 99,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Cross-User Library List',
    operation: 'list',
    path: '/user_library',
    auth: { uid: 'uid_attacker', email: 'attacker@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Admin Email Spoofing without Verification',
    operation: 'delete',
    path: '/community_reviews/rev_other',
    auth: { uid: 'uid_spoof', email: 'cmigueltorrealba03@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
];
