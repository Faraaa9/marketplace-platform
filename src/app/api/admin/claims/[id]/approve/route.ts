import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as claimService from "@/lib/imported/claim-service";
import { sendEmail, claimApprovedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/claims/:id/approve — approve a pending claim.
 * Requires ADMIN session.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const result = await claimService.approveClaim(id, {
      reviewNotes: body.reviewNotes,
      reviewedByUserId: session.user.id,
    });

    if ("error" in result) {
      const status =
        result.error === "NOT_FOUND"
          ? 404
          : result.error === "APPROVAL_CONFLICT" || result.error === "IDENTITY_EXISTS"
            ? 409
            : 400;
      return NextResponse.json({ success: false, error: result.message, code: result.error }, { status });
    }

    // Send approval email
    const supplierName = result.claim.supplier?.displayName ?? "Tiekėjas";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const dashboardPath = "/tiekejas/katalogas";
    const dashboardUrl = `${appUrl}/prisijungti?email=${encodeURIComponent(result.claim.requestedByEmail)}&callbackUrl=${encodeURIComponent(dashboardPath)}`;
    const registerUrl = `${appUrl}/registruotis?email=${encodeURIComponent(result.claim.requestedByEmail)}`;
    const emailContent = claimApprovedEmail(supplierName, dashboardUrl, registerUrl);
    await sendEmail({
      to: result.claim.requestedByEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    }).catch((err) => console.error("Failed to send claim approved email:", err));

    return NextResponse.json({ success: true, data: { claim: result.claim } });
  } catch (error) {
    console.error("POST /api/admin/claims/:id/approve error:", error);
    return NextResponse.json({ success: false, error: "Vidinė serverio klaida" }, { status: 500 });
  }
}
