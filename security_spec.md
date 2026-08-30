# Security Specification - Cricket Manager 26 Beta

## Data Invariants
1. A user can only access their own user profile document.
2. A user can only access their own save games.
3. Save games must belong to the authenticated user (userId in data matches request.auth.uid).
4. `createdAt` and `userId` fields are immutable after creation.
5. `updatedAt` must be updated to the server time on every write.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Attempt to create a user profile for a different UID.
2. **Identity Spoofing (Save)**: Attempt to create a save game with a different `userId`.
3. **Cross-User Access**: Authenticated User A tries to read User B's save.
4. **Unauthenticated Read**: Try to read users collection without being signed in.
5. **Malicious ID**: Attempt to create a save with a 2KB junk string as ID.
6. **Immutable Field Attack**: Try to change `userId` of an existing save.
7. **Immutable Field Attack (User)**: Try to change `uid` of a user profile.
8. **Resource Exhaustion**: Try to save a 5MB data object (Firestore will block >1MB, but rule should check string sizes if applicable).
9. **State Shortcutting**: (N/A for this simple save blob structure, but could apply if matches were individual docs).
10. **Privilege Escalation**: Try to set a `role: 'admin'` field on a user doc (unsupported but rule should block).
11. **Timestamp Forgery**: Provide a client-side `updatedAt` instead of server timestamp.
12. **Ghost Field Update**: Try to update a save with an extra field `isHacked: true`.

## Test Runner (firestore.rules.test.ts)
(This will be implemented if I had a test environment, but I will simulate the logic in my head and via the Red Team Audit).
