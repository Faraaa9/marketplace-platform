import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/validations";
import { sendEmail, requestConfirmationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = serviceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    const { title, description, category, location, budget, clientName, clientEmail, clientPhone, createAccount, password } = parsed.data;

    let clientId: string | undefined;

    // Optionally create account
    if (createAccount && password) {
      const existing = await prisma.user.findUnique({ where: { email: clientEmail } });
      if (existing) {
        clientId = existing.id;
      } else {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
          data: {
            email: clientEmail,
            name: clientName,
            password: hashedPassword,
            role: "CLIENT",
          },
        });
        clientId = user.id;
      }
    }

    const request = await prisma.serviceRequest.create({
      data: {
        title,
        description,
        category,
        location,
        budget: budget || null,
        clientEmail,
        clientName,
        clientPhone: clientPhone || null,
        clientId: clientId || null,
      },
    });

    // Send confirmation email
    const emailData = requestConfirmationEmail(clientName, request.id);
    await sendEmail({ to: clientEmail, ...emailData });

    return NextResponse.json({ success: true, data: { id: request.id } });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ success: false, error: "Nepavyko sukurti užklausos" }, { status: 500 });
  }
}
