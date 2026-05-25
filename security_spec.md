# Security Specification for AHIM AI Firebase Integration

## 1. Data Invariants
- **Session Integrity**: No chat session can be read, created, updated, or deleted unless the user is fully authenticated and their `uid` exactly matches the session's `userId`.
- **Message Nested Dependency**: No message can be inserted or read in `sessions/{sessionId}/messages/{messageId}` unless the parent session at `sessions/{sessionId}` exists and its `userId` matches the authenticated `uid`.
- **ID Security**: All document IDs used for sessions or messages must be safe strings (at most 128 characters, matching alphanumerics plus hyphen/underscore) to prevent injection.
- **Immortal Fields**: Fields such as `userId` and `createdAt` must be immutable once created.
- **Temporal Enforcement**: Timestamps must correspond to the request time of the server.

---

## 2. The "Dirty Dozen" Payloads (Vulnerability Scenarios)
These 12 payloads represent malicious attempts to bypass security rules. The rules must mathematically prevent all of these:

1. **Unauthenticated Session Creation**
   - Attempt to write to `/sessions/malicious-session` without an authorization header/context.
   - *Expected Action*: `PERMISSION_DENIED`
2. **Session Identity Spoofing (Owner Spoof)**
   - Authenticated user `user-123` tries to create `/sessions/session-abc` with `userId: "user-456"`.
   - *Expected Action*: `PERMISSION_DENIED`
3. **Foreign Session Read Attempt**
   - Authenticated user `user-123` tries to fetch `/sessions/session-456` owned by `user-456`.
   - *Expected Action*: `PERMISSION_DENIED`
4. **Foreign Session Update Attempt**
   - Authenticated user `user-123` tries to rename `/sessions/session-456` owned by `user-456`.
   - *Expected Action*: `PERMISSION_DENIED`
5. **Foreign Session Deletion Attempt**
   - Authenticated user `user-123` tries to hard delete `/sessions/session-456` owned by `user-456`.
   - *Expected Action*: `PERMISSION_DENIED`
6. **Orphaned Message Creation**
   - Authenticated user `user-123` tries to create a message `/sessions/session-456/messages/msg-1` where `/sessions/session-456` is owned by `user-456`.
   - *Expected Action*: `PERMISSION_DENIED` (Master Gate rule checks parent owner).
7. **Ad-hoc Message Owner Spoofing**
   - Authenticated user `user-123` tries to create a message in their own session but sets `userId: "user-456"` in the nested message payload.
   - *Expected Action*: `PERMISSION_DENIED`
8. **Junk Key Injection (Shadow Field Attack)**
   - Authenticated user `user-123` tries to write a session document containing `isAdmin: true` or `isPremium: true` that is not part of the allowed schema keys.
   - *Expected Action*: `PERMISSION_DENIED`
9. **Resource Poisoning (Huge ID Attack)**
   - Attempt to target a session with a 2-kilobyte document ID consisting of special characters.
   - *Expected Action*: `PERMISSION_DENIED`
10. **Immutable History Mutability (Rename owner)**
    - User `user-123` tries to update an existing session `/sessions/session-abc` modifying the immutable `userId` field to `user-789`.
    - *Expected Action*: `PERMISSION_DENIED`
11. **Client Timestamp Spoofing**
    - User tries to set `createdAt` manually to a timezone-manipulated future/past date instead of using the server's sync timestamp check `request.time`.
    - *Expected Action*: `PERMISSION_DENIED`
12. **Blanket Query Scraping (Insecure List)**
    - User tries to call a list/collection query for all sessions without restricting the where clause to their own `userId`.
    - *Expected Action*: `PERMISSION_DENIED`

---

## 3. Test Runner Design (`firestore.rules.test.ts`)
We will enforce validation checks directly in our security rules as defined under the fortress rules section.

Let's secure the rules using `firestore.rules`!
