# ScreenLog Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Identity Integrity**: Every document created in `users_public/{userId}`, `users/{userId}/private/{docId}`, `user_library/{entryId}`, `community_reviews/{reviewId}`, and `catalog_media/{mediaId}` must have its owner/author field (`userId` or `authorId`) strictly equal to `request.auth.uid`, and the authenticated user must have `request.auth.token.email_verified == true`.
2. **PII Isolation (Split Collection)**: Email addresses (`email`) are strictly stored in `/users/{userId}/private/info` and never in `/users_public/{userId}`. Only the owner (`request.auth.uid == userId`) or a verified admin (`isAdmin()`) may read `/users/{userId}/private/{docId}`.
3. **Immutable Ownership & Creation Timestamps**: Once created, `userId`, `authorId`, `mediaId` (on library/reviews), and `createdAt` can never be mutated during an `update`.
4. **Temporal Integrity**: `createdAt` on `create` and `updatedAt` on both `create` and `update` must equal `request.time`.
5. **Strict Key & Size Enforcement**: Every entity validation helper enforces `hasAll` and `hasOnly` on document keys, bounded string lengths, and bounded array sizes (`<= 10` elements).

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Identity Spoofing on Library Create)**: Authenticated user `uid_attacker` creates `/user_library/uid_victim_m1` with `{ userId: "uid_victim", mediaId: "m1", ... }`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/community_reviews/rev_1`. -> `PERMISSION_DENIED`
3. **Payload 3 (Shadow Field Injection on Public Profile)**: User sends `{ userId: "u1", name: "Ana", username: "ana", avatar: "https://...", updatedAt: request.time, isAdmin: true }`. -> `PERMISSION_DENIED`
4. **Payload 4 (PII Leak Read)**: Authenticated user `uid_other` attempts `get` on `/users/uid_victim/private/info`. -> `PERMISSION_DENIED`
5. **Payload 5 (ID Poisoning)**: User attempts `create` on `/community_reviews/invalid$id!with spaces` or >128 chars. -> `PERMISSION_DENIED`
6. **Payload 6 (Denial of Wallet Oversized String)**: User sends a 5,000-character `comment` in `/community_reviews/rev_1` (`maxLength` is 2000). -> `PERMISSION_DENIED`
7. **Payload 7 (Unbounded Array Poisoning)**: User sends 25 genres in `favoriteGenres` on `/users_public/u1` (max 10 allowed). -> `PERMISSION_DENIED`
8. **Payload 8 (Client Timestamp Forgery)**: User sends a forged past/future timestamp for `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`
9. **Payload 9 (Immortal Field Mutation)**: User updates `/user_library/entry_1` and attempts to change `createdAt` or `userId`. -> `PERMISSION_DENIED`
10. **Payload 10 (Value Poisoning on Update)**: User updates whitelisted field `personalRating` on `/user_library/entry_1` with `"five"` (string) or `99` (out of range `0..5`). -> `PERMISSION_DENIED`
11. **Payload 11 (Unauthorized Cross-User Library List)**: User `uid_attacker` runs an unconstrained `list` query on `/user_library` without filtering `userId == request.auth.uid`. -> `PERMISSION_DENIED`
12. **Payload 12 (Admin Email Spoofing without Verification)**: Attacker with `email: "cmigueltorrealba03@gmail.com"` and `email_verified: false` attempts admin delete on another user's review. -> `PERMISSION_DENIED`
