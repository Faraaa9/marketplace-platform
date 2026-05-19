# Auth, Access Control & Supplier Dashboard — Integration Notes

## Architecture Overview

Existing NextAuth (credentials provider, JWT strategy) is preserved. No new auth framework introduced.

### User ↔ Supplier Binding

Three mechanisms connect platform users to imported supplier profiles:

1. **Claim with logged-in user** — When a logged-in user submits a claim (`POST /api/claims`), their `userId` is stored on `ClaimRequest.requestedByUserId`.

2. **Approve → bind** — When admin approves a claim, `userId` flows from `ClaimRequest` to `SupplierIdentity.userId` via `claim-service.approveClaim()`.

3. **Auto-bind on login** — The NextAuth `signIn` event calls `attachIdentityToUserByEmail()`, which finds any `SupplierIdentity` records where `contactEmail` matches the user's email and `userId` is null, then binds them.

### Access Control

`canManageSupplier(userId, slug)` in `src/lib/imported/supplier-access.ts` checks whether a user has an approved `SupplierIdentity` for the given supplier. This is used:

- **API layer**: `PUT /api/suppliers/[slug]` returns 403 if `canManageSupplier()` returns null.
- **Page layer**: `/tiekejai/katalogas/[slug]` computes `isOwner` to show/hide management CTA.

### Supplier Edit Flow

- **Zod validation**: `supplierEditSchema` in `src/lib/imported/supplier-update.ts` validates editable fields.
- **Protected fields**: `externalSource`, `externalSourceUrl`, `companyCode`, categories, and snapshots are never editable by the owner — source provenance is preserved.
- **Editable fields**: `displayName`, `shortSummary`, `description`, `phonePublic`, `emailPublic`, `websiteUrl`, `city`.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/tiekejas/katalogas` | Server page (auth required) | List user's claimed supplier profiles |
| `/tiekejas/katalogas/[slug]/redaguoti` | Client page (auth required) | Edit supplier profile form |
| `/tiekejai/katalogas/[slug]` | Server page (public) | Public supplier detail with owner/claim CTA |
| `GET /api/suppliers/[slug]` | API (public) | Supplier data by slug |
| `PUT /api/suppliers/[slug]` | API (auth + ownership) | Update supplier fields |

## Testing Scenarios

### 1. Login and see claimed suppliers
- Register/login as a user whose email matches a `SupplierIdentity.contactEmail`
- On login, `attachIdentityToUserByEmail` auto-binds the identity
- Navigate to `/tiekejas/katalogas` — the supplier should appear in the list

### 2. Claim approval flow
- Submit claim from `/claim/some-slug` while logged in
- Admin approves via `POST /api/internal/claims/[id]/approve`
- Identity is created with `userId` bound
- User sees supplier in `/tiekejas/katalogas`

### 3. Unauthorized edit blocked
- Login as a user who does NOT own a supplier
- `PUT /api/suppliers/[slug]` returns `403`
- Edit page at `/tiekejas/katalogas/[slug]/redaguoti` shows forbidden state

### 4. Save edits
- Login as owner, navigate to edit page
- Modify `displayName`, `shortSummary`, etc.
- Submit — `PUT /api/suppliers/[slug]` validates with Zod, updates DB
- Source provenance fields remain unchanged

### 5. CTA visibility on public detail page
- **Owner viewing own supplier**: sees "Valdyti profili" with edit + dashboard links
- **Visitor viewing unclaimed supplier**: sees "Perimti profilį" CTA
- **Visitor viewing claimed-by-other supplier**: sees no CTA
