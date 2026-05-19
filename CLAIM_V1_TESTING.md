# Claim V1 — Manual Test Scenarios

## Prerequisites
- Dev server running (`npm run dev`)
- Database migrated with ClaimRequest fields (`emailVerifiedAt`, `reviewedAt`, `reviewedByUserId`)
- At least one SupplierRecord with `status: "unclaimed"` in the database
- An ADMIN user account for approval/rejection
- Check dev emails at `/api/dev/emails` (when RESEND_API_KEY is not set)

---

## 1. Create Claim (email method)

1. Visit `/tiekejai/katalogas` — find an unclaimed supplier (amber "Laisvas" badge)
2. Click supplier → detail page at `/tiekejai/katalogas/[slug]`
3. Verify the blue CTA says "Tai jūsų įmonė?" with button "Perimti profilį"
4. Click "Perimti profilį" → lands on `/claim/[slug]`
5. Verify supplier name and city shown in the summary card
6. Fill in email, select "El. pašto patvirtinimas", submit
7. **Expected**: green success banner "Prašymas sukurtas. Patikrinkite savo el. paštą..."
8. **Expected**: no raw token in the browser network response JSON
9. Check `/api/dev/emails` — verification email should be there with a `/claim/verify?token=...` link

## 2. Create Claim (manual method)

1. Visit `/claim/[slug]` for an unclaimed supplier
2. Fill in email, select "Rankinis patvirtinimas", optionally add evidence text
3. Submit
4. **Expected**: green success "Administratorius peržiūrės jūsų prašymą artimiausiu metu."

## 3. Duplicate Claim

1. Try creating another claim for the same supplier
2. **Expected**: 409 error "An active claim request already exists for this supplier"

## 4. Already Claimed Supplier

1. Visit `/claim/[slug]` for a supplier with `status: "claimed"`
2. **Expected**: "Profilis jau perimtas" message with back link

## 5. Verify Email Token

1. Copy the verify URL from dev email log
2. Open in browser → `/claim/verify?token=...`
3. **Expected**: "El. paštas patvirtintas!" page with admin review note
4. Visit the same URL again
5. **Expected**: "Jau patvirtinta" (already verified)

## 6. Invalid / Expired Token

1. Visit `/claim/verify?token=garbage`
2. **Expected**: "Patvirtinimas nepavyko" error
3. Visit `/claim/verify` (no token)
4. **Expected**: "Trūksta patvirtinimo žetono"

## 7. Admin Approve

1. Log in as ADMIN
2. Visit `/admin/claims` — claim should appear in "Laukiantys" tab
3. Verify supplier name, email, verification method, email-verified badge shown
4. Click "Patvirtinti" → enter optional notes → confirm
5. **Expected**:
   - Claim status changes to "Patvirtintas"
   - SupplierRecord.status → "claimed"
   - SupplierIdentity created with `ownershipStatus: "owner"`
   - Approval email sent (check `/api/dev/emails`)

## 8. Admin Reject

1. Create another claim, verify email
2. In `/admin/claims`, click "Atmesti" → enter reason → confirm
3. **Expected**: claim status "Atmestas", rejection email sent with reason

## 9. Non-admin Blocked

1. Log in as a non-admin user
2. `GET /api/admin/claims` → **Expected**: 401
3. `POST /api/admin/claims/[id]/approve` → **Expected**: 401
4. `POST /api/internal/claims/[id]/approve` → **Expected**: 401

## 10. Auto-bind on Login

1. After admin approves a claim, the SupplierIdentity is created with the claimant's email
2. If the claimant does not yet have an account: register with the same email
3. On login/register, `attachIdentityToUserByEmail` binds the identity to the user
4. **Expected**: `/tiekejas/katalogas` shows the claimed supplier

## 11. Owner Dashboard

1. Log in as the claim owner (identity bound)
2. Visit `/tiekejas` → "Katalogo profiliai" card → `/tiekejas/katalogas`
3. **Expected**: claimed supplier listed with "Perimtas" badge and Edit button
4. Click "Redaguoti" → edit page loads at `/tiekejas/katalogas/[slug]/redaguoti`
5. Public detail page `/tiekejai/katalogas/[slug]` shows green owner management CTA

## 12. Non-owner Cannot Edit

1. Log in as a different user (not the owner)
2. `PUT /api/suppliers/[slug]` with any body → **Expected**: 403 "Neturite teisės redaguoti šio profilio"
3. Visit `/tiekejai/katalogas/[slug]` — no owner CTA shown, claim CTA hidden (supplier is claimed)

---

## Status Badge Glossary (Lithuanian)

| DB status   | Display     |
|-------------|-------------|
| unclaimed   | Laisvas     |
| claimed     | Perimtas    |
| pending     | Laukia      |
| approved    | Patvirtintas|
| rejected    | Atmestas    |
| expired     | Pasibaigęs  |
