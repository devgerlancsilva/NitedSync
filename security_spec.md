# Security Specification - Fluxo de Atividades

## Data Invariants
- An activity must have a title, status, and creator.
- `status` must be one of: 'pendente', 'em_andamento', 'concluido'.
- `createdAt` and `updatedAt` must be server timestamps.
- Users can only create activities where `createdBy` matches their UID.

## The Dirty Dozen Payloads (Target: DENY)
1. **Identity Spoofing**: Create activity with `createdBy` != `request.auth.uid`.
2. **Immortality Breach**: Update `createdAt` after creation.
3. **State Corruption**: Set `status` to "invalid_status".
4. **Resource Poisoning**: Set `title` to a string > 500 chars.
5. **Anonymous Write**: Attempt to create activity without being signed in.
6. **Unverified Write**: Attempt to create activity with unverified email (if configured).
7. **Bypass Validation**: Create activity with missing `status`.
8. **Spoofing Handover**: Set `assigneeId` to someone else without being signed in.
9. **Timestamp Fraud**: Set `updatedAt` to a past date (not server timestamp).
10. **ID Poisoning**: Use a document ID with special characters like `/` or extremely long.
11. **Mass Overwrite**: Attempt to update `createdBy` field.
12. **Ghost Field**: Add a field `isPremium: true` to an activity.

## Test Strategy
The rules will be validated to reject these payloads using `isValidActivity` helper.
