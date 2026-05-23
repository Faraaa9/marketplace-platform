import type { Metadata } from &rdquo;next&rdquo;;
import Link from &rdquo;next/link&rdquo;;
import { CheckCircle2, XCircle, Clock, ArrowLeft } from &rdquo;lucide-react&rdquo;;
import * as claimService from &rdquo;@/lib/imported/claim-service&rdquo;;
import { prisma } from &rdquo;@/lib/prisma&rdquo;;
import ClaimAccountStep from &rdquo;./ClaimAccountStep&rdquo;;

export const metadata: Metadata = {
  title: &rdquo;El. pašto patvirtinimas — PaslaugųRinka&rdquo;,
  description: &rdquo;Tiekėjo profilio perėmimo el. pašto patvirtinimas.&rdquo;,
};

export const dynamic = &rdquo;force-dynamic&rdquo;;

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ClaimVerifyPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <VerifyLayout
        icon={<XCircle className=&rdquo;h-12 w-12 text-red-400&rdquo; />}
        title=&rdquo;Trūksta patvirtinimo žetono&rdquo;
        description=&rdquo;Nuoroda netinkama. Patikrinkite, ar spaudžiate teisingą nuorodą iš el. laiško.&rdquo;
      />
    );
  }

  const result = await claimService.verifyToken(token);

  if (&rdquo;error&rdquo; in result) {
    const isExpired = result.error === &rdquo;EXPIRED_TOKEN&rdquo;;
    const isAlreadyVerified = result.error === &rdquo;ALREADY_VERIFIED&rdquo;;

    if (isAlreadyVerified) {
      const claim = await claimService.getClaimByToken(token);
      const accountExists = claim ? await hasAccountForEmail(claim.requestedByEmail) : false;

      return (
        <VerifyLayout
          icon={<CheckCircle2 className=&rdquo;h-12 w-12 text-emerald-400&rdquo; />}
          title=&rdquo;Jau patvirtinta&rdquo;
          description=&rdquo;Jūsų el. paštas jau buvo patvirtintas anksčiau. Tai dar nėra prisijungimo paskyra, todėl kitas žingsnis yra prisijungti arba susikurti slaptažodį.&rdquo;
          showBackLink
        >
          {claim && (
            <ClaimAccountStep
              token={token}
              email={claim.requestedByEmail}
              supplierName={claim.supplier?.displayName ?? &rdquo;Tiekėjas&rdquo;}
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
          icon={<Clock className=&rdquo;h-12 w-12 text-amber-400&rdquo; />}
          title=&rdquo;Nuoroda nebegalioja&rdquo;
          description=&rdquo;Šis patvirtinimo žetonas nebegalioja. Pateikite naują prašymą, jei norite perimti profilį.&rdquo;
          showBackLink
        />
      );
    }

    return (
      <VerifyLayout
        icon={<XCircle className=&rdquo;h-12 w-12 text-red-400&rdquo; />}
        title=&rdquo;Patvirtinimas nepavyko&rdquo;
        description=&rdquo;Neteisingas arba nerastas žetonas. Patikrinkite, ar spaudžiate teisingą nuorodą iš el. laiško.&rdquo;
      />
    );
  }

  const supplierName = result.claim.supplier?.displayName ?? &rdquo;Tiekėjas&rdquo;;
  const accountExists = await hasAccountForEmail(result.claim.requestedByEmail);

  return (
    <VerifyLayout
      icon={<CheckCircle2 className=&rdquo;h-12 w-12 text-emerald-400&rdquo; />}
      title=&rdquo;El. paštas patvirtintas!&rdquo;
      description={`Patvirtinome, kad valdote el. paštą, kuriuo prašote perimti &ldquo;${supplierName}&rdquo;. Sukurkite slaptažodį — paskyra bus iš karto tiekėjo tipo. Administratorius atskirai patvirtins profilio perėmimą.`}
      showBackLink
    >
      <div className=&rdquo;mt-6 rounded-lg border border-surface-200 bg-white p-4 text-left dark:border-surface-700 dark:bg-surface-900&rdquo;>
        <p className=&rdquo;text-body-sm font-semibold text-surface-900 dark:text-white&rdquo;>
          Kas vyksta toliau?
        </p>
        <ol className=&rdquo;mt-3 space-y-2 text-body-sm text-surface-600 dark:text-surface-300&rdquo;>
          <li>1. El. paštas patvirtintas — nuosavybė įrodyta.</li>
          <li>2. Susikurkite slaptažodį — paskyra bus iš karto tiekėjo tipo, nereikia spausti &ldquo;tapti tiekėju&rdquo;.</li>
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
    <div className=&rdquo;min-h-screen&rdquo;>
      <div className=&rdquo;mx-auto max-w-lg px-4 py-16 text-center&rdquo;>
        <div className=&rdquo;mx-auto mb-4&rdquo;>{icon}</div>
        <h1 className=&rdquo;text-xl font-bold text-surface-900 dark:text-white&rdquo;>
          {title}
        </h1>
        <p className=&rdquo;mt-3 text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed&rdquo;>
          {description}
        </p>
        {children}
        {showBackLink && (
          <Link
            href=&rdquo;/meistrai/katalogas&rdquo;
            className=&rdquo;mt-8 inline-flex items-center gap-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400&rdquo;
          >
            <ArrowLeft className=&rdquo;h-4 w-4&rdquo; />
            Grįžti į katalogą
          </Link>
        )}
      </div>
    </div>
  );
}
