# SECURITY SPECIFICATION: TRACK.STUDIO SYSTEM ZERO-TRUST FIRESTORE

## 1. Data Invariants
- An athlete profile can only be read, created, or updated by the verified owner possessing the identical UID.
- Activity logs are strictly nested within parent `/athletes/{athleteId}/activities` subcollections, fully restricted to ownership scopes. Relational deletion or mutation outside authorization triggers automatic permission exceptions.

## 2. The Dirty Dozen (Identified Attack Vectors)
1. **Identity Spoofing**: Attempt to insert `ownerId: "someone_else_uid"`. Enforced check: `data.athleteUid == request.auth.uid`.
2. **Path Variables Poisoning**: Attempt to request `/athletes/invalid#char$path/activities`. Enforced check: `isValidId(athleteId)`.
3. **Ghost Fields injection**: Attempt to insert `isVerified: true` into profile doc. Enforced check: Strict key size matching in rules.
4. **Time Spoofing (Client Side Timestamps)**: Attempt to set future custom timestamps. Enforced check: `incoming().updatedAt == request.time`.
5. **PII Query leaks**: Attempt to query user database with a blanket query. Enforced check: `allow list` requires Owner ID evaluation.
6. **Privilege Escalation**: Attempt to set custom claims or `isAdmin` tags globally on profile. Enforced check: Strict keys count prevents non-profile schemas.
7. **Volume Bloat**: Input 2MB long strings into athlete names to increase storage bills. Enforced check: `name.size() <= 120`.
8. **Orphaned Writes**: Write activity items with fake parent paths. Enforced check: Nested matches only.
9. **Mutation of Immutable Fields**: Change the `id` of an activity after registration. Enforced check: `incoming().id == existing().id`.
10. **State Shortcutting**: Skipping steps in training load indicators by writing bypass values.
11. **Anonymized Hijack**: Writing data using verified claims blocks while `email_verified` is unverified.
12. **Recursive DoS reads**: Injecting O(n) lookups in list operations. Enforced check: No dynamic `get()` in listing blocks.
