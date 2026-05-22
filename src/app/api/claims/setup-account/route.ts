import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/imported/token";
import { getClientIp, rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const setupAccountSchema = z.object({
  token: z.string().min(20, "Trūksta patvirtinimo žetono"),
  name: z.string().min(2, "Vardas turi būti bent 2 simbolių").max(100),
  password: z.string().min(6, "Slaptažodis turi būti bent 6 simbolių"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = await rateLimitAsync(`claim-account:${ip}`, RATE_LIMITS.auth);
    if (!limit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = setupAccountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(parsed.data.token);
    const claim = await prisma.claimRequest.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        providerProfileId: true,
        requestedByEmail: true,
        requestedByUserId: true,
        status: true,
        expiresAt: true,
        emailVerifiedAt: true,
        providerProfile: { select: { id: true, displayName: true, slug: true, userId: true } },
      },
    });

    if (!claim) {
      return NextResponse.json(
        { success: false, error: "Perėmimo prašymas nerastas" },
        { status: 404 }
      );
    }

    if (!claim.emailVerifiedAt) {
      return NextResponse.json(
        { success: false, error: "Pirmiausia patvirtinkite el. paštą" },
        { status: 409 }
      );
    }

    if (!["pending", "approved"].includes(claim.status) || claim.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Šis perėmimo prašymas nebegalioja" },
        { status: 410 }
      );
    }

    const isApproved = claim.status === "approved";

    // ── Existing user ───────────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({
      where: { email: claim.requestedByEmail },
      select: { id: true, email: true, emailVerified: true, role: true },
    });

    if (existingUser) {
      await prisma.$transaction(async (tx) => {
        // Upgrade role to PROVIDER (unless ADMIN)
        const updates: Record<string, unknown> = {};
        if (!existingUser.emailVerified) updates.emailVerified = new Date();
        if (existingUser.role !== "ADMIN" && existingUser.role !== "PROVIDER") updates.role = "PROVIDER";

        if (Object.keys(updates).length > 0) {
          await tx.user.update({
            where: { id: existingUser.id },
            data: updates,
            select: { id: true },
          });
        }

        // If the claim was already approved but the imported profile was
        // not yet bound (approved before the account existed), bind it now.
        if (
          isApproved &&
          existingUser.role !== "ADMIN" &&
          claim.providerProfile &&
          !claim.providerProfile.userId
        ) {
          await tx.providerProfile.update({
            where: { id: claim.providerProfile.id },
            data: { userId: existingUser.id, status: "claimed", isActive: true },
            select: { id: true },
          });
        }

        // Link claim to user
        await tx.claimRequest.update({
          where: { id: claim.id },
          data: { requestedByUserId: existingUser.id },
          select: { id: true },
        });
      });

      return NextResponse.json({
        success: true,
        data: {
          accountStatus: "exists" as const,
          email: existingUser.email,
          role: existingUser.role === "ADMIN" ? "ADMIN" : "PROVIDER",
          supplierName: claim.providerProfile?.displayName || null,
          claimStatus: claim.status,
          canManageSupplier: isApproved,
          nextPath: isApproved ? "/tiekejas/katalogas" : "/tiekejas",
        },
      });
    }

    // ── New user — create as PROVIDER ───────────────────────────────
    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: claim.requestedByEmail,
          password: hashedPassword,
          role: "PROVIDER",
          emailVerified: new Date(),
        },
        select: { id: true, email: true },
      });

      // If the claim was already approved, bind the imported profile to
      // the new user now (approval ran before this account existed).
      if (isApproved && claim.providerProfile && !claim.providerProfile.userId) {
        await tx.providerProfile.update({
          where: { id: claim.providerProfile.id },
          data: { userId: created.id, status: "claimed", isActive: true },
          select: { id: true },
        });
      }

      // Link claim to user
      await tx.claimRequest.update({
        where: { id: claim.id },
        data: { requestedByUserId: created.id },
        select: { id: true },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      data: {
        accountStatus: "created" as const,
        email: user.email,
        role: "PROVIDER",
        supplierName: claim.providerProfile?.displayName || null,
        claimStatus: claim.status,
        canManageSupplier: isApproved,
        nextPath: isApproved ? "/tiekejas/katalogas" : "/tiekejas",
      },
    });
  } catch (error) {
    console.error("POST /api/claims/setup-account error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko sukurti paskyros" },
      { status: 500 }
    );
  }
}
