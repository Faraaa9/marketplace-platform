import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import * as claimService from "@/lib/imported/claim-service";
import { prisma } from "@/lib/prisma";
import ClaimAccountStep from "./ClaimAccountStep";

export const metadata: Metadata = {
  title: "El. pašto patvirtinimas — PaslaugųRinka",
  description: "Tiekėjo profilio perėmimo el. pašto patvirtinimas.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ClaimVerifyPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <VerifyLayout
        icon={<XCircle className="h-12 w-12 text-red-400" />}
        title="Trūksta patvirtinimo žetono"
        description="Nuoroda netinkama. Patikrinkite, ar spaudžiate teisingą nuorodą iš el. laiško."
      />
    );
  }

  const result = await claimService.verifyToken(token);

  if ("error" in result) {
    const isExpired = result.error === "EXPIRED_TOKEN";
    const isAlreadyVerified = result.error === "ALREADY_VERIFIED";

    if (isAlreadyVerified) {
      const claim = await claimService.getClaimByToken(token);
      const accountExists = claim ? await hasAccountForEmail(claim.requestedByEmail) : false;

      return (
        <VerifyLayout
          icon={<CheckCircle2 className="h-12 w-12 text-emerald-400" />}
          title="Jau patvirtinta"
          description="Jūsų el. paštas jau buvo patvirtintas anksčiau. Tai dar nėra prisijungimo paskyra, todėl kitas žingsnis yra prisijungti arba susikurti slaptažodį."
          showBackLink
        >
          {claim && (
            <ClaimAccountStep
              token={token}
              email={claim.requestedByEmail}
              supplierName={claim.supplier?.displayName ?? "Tiekėjas"}
              accountExists={accountExists}
              claimStatus={claim.status}
            />
          )}
        </VerifyLayout>
      );
    }

    if (isExpired) {
      return (
        <VerifyLayout
          icon={<Clock className="h-12 w-12 text-amber-400" />}
          title="Nuoroda nebegalioja"
          description="Šis patvirtinimo žetonas nebegalioja. Pateikite naują prašymą, jei norite perimti profilį."
          showBackLink
        />
      );
    }

    return (
      <VerifyLayout
        icon={<XCircle className="h-12 w-12 text-red-400" />}
        title="Patvirtinimas nepavyko"
        description="Neteisingas arba nerastas žetonas. Patikrinkite, ar spaudžiate teisingą nuorodą iš el. laiško."
      />
    );
  }

  const supplierName = result.claim.supplier?.displayName ?? "Tiekėjas";
  const accountExists = await hasAccountForEmail(result.claim.requestedByEmail);

  return (
    <VerifyLayout
      icon={<CheckCircle2 className="h-12 w-12 text-emerald-400" />}
      title="El. paštas patvirtintas!"
      description={`Patvirtinome, kad valdote el. paštą, kuriuo prašote perimti „${supplierName}". Sukurkite slaptažodį — paskyra bus iš karto tiekėjo tipo. Administratorius atskirai patvirtins profilio perėmimą.`}
      showBackLink
    >
      <div className="mt-6 rounded-lg border border-surface-200 bg-white p-4 text-left dark:border-surface-700 dark:bg-surface-900">
        <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
          Kas vyksta toliau?
        </p>
        <ol className="mt-3 space-y-2 text-body-sm text-surface-600 dark:text-surface-300">
          <li>1. El. paštas patvirtintas — nuosavybė įrodyta.</li>
          <li>2. Susikurkite slaptažodį — paskyra bus iš karto tiekėjo tipo, nereikia spausti „tapti tiekėju".</li>
          <li>3. Administratorius patikrins perėmimo prašymą.</li>
          <li>4. Po patvirtinimo profilis atsiras tiekėjo panelėje ir galėsite jį redaguoti.</li>
        </ol>
      </div>
      <ClaimAccountStep
        token={token}
        email={result.claim.requestedByEmail}
        supplierName={supplierName}
        accountExists={accountExists}
        claimStatus={result.claim.status}
      />
    </VerifyLayout>
  );
}

async function hasAccountForEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return !!user;
}

function VerifyLayout({
  icon,
  title,
  description,
  showBackLink,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  showBackLink?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="mx-auto mb-4">{icon}</div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-white">
          {title}
        </h1>
        <p className="mt-3 text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed">
          {description}
        </p>
        {children}
        {showBackLink && (
          <Link
            href="/meistrai/katalogas"
            className="mt-8 inline-flex items-center gap-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Grįžti į katalogą
          </Link>
        )}
      </div>
    </div>
  );
}
