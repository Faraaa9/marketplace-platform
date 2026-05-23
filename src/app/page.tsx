import type { Metadata } from &rdquo;next&rdquo;;
import Link from &rdquo;next/link&rdquo;;
import { unstable_cache } from &rdquo;next/cache&rdquo;;
import HeroSearch from &rdquo;@/components/marketing/HeroSearch&rdquo;;
import ProviderCtaLink from &rdquo;@/components/marketing/ProviderCtaLink&rdquo;;
import RecentRequestBanner from &rdquo;@/components/guest/RecentRequestBanner&rdquo;;
import { prisma } from &rdquo;@/lib/prisma&rdquo;;
import { formatRelativeDate, truncate } from &rdquo;@/lib/utils&rdquo;;
import { BUDGET_OPTIONS } from &rdquo;@/lib/constants&rdquo;;
import {
  getServiceCategoryGroups,
  getServiceCategoryNameMap,
} from &rdquo;@/lib/service-categories&rdquo;;
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from &rdquo;@/components/ui/accordion&rdquo;;
import {
  Zap, Sparkles, ArrowRight, MapPin, Clock,
  MessageSquare, FileText, Users, ShieldCheck, Check, Package, Maximize2, Search, Tag,
} from &rdquo;lucide-react&rdquo;;

export const metadata: Metadata = {
  title: &rdquo;Raskite geriausius paslaugų tiekėjus Lietuvoje&rdquo;,
  description:
    &rdquo;PaslaugųRinka – patikima platforma paslaugų paieškai. Pateikite užklausą ir gaukite pasiūlymus iš patikrintų specialistų per kelias minutes.&rdquo;,
};

const AVATARS = [
  { initials: &rdquo;JK&rdquo;, color: &rdquo;#C25E3A&rdquo; },
  { initials: &rdquo;RM&rdquo;, color: &rdquo;#5E8C50&rdquo; },
  { initials: &rdquo;AB&rdquo;, color: &rdquo;#5A79A4&rdquo; },
  { initials: &rdquo;GT&rdquo;, color: &rdquo;#7C6AA6&rdquo; },
  { initials: &rdquo;VL&rdquo;, color: &rdquo;#B08A2E&rdquo; },
  { initials: &rdquo;DP&rdquo;, color: &rdquo;#9A6440&rdquo; },
];

const HOW_IT_WORKS = [
  {
    title: &rdquo;Aprašyk užduotį&rdquo;,
    desc: &rdquo;Užpildyk trumpą formą — ką reikia padaryti, kur ir kada.&rdquo;,
    icon: <FileText className=&rdquo;h-7 w-7&rdquo; />,
  },
  {
    title: &rdquo;Gauk pasiūlymus&rdquo;,
    desc: &rdquo;Patikrinti specialistai peržiūri tavo užklausą ir atsiunčia pasiūlymus.&rdquo;,
    icon: <Users className=&rdquo;h-7 w-7&rdquo; />,
  },
  {
    title: &rdquo;Pasirink geriausią&rdquo;,
    desc: &rdquo;Palygink kainas bei atsiliepimus ir susisiek tiesiogiai.&rdquo;,
    icon: <ShieldCheck className=&rdquo;h-7 w-7&rdquo; />,
  },
];

const HOME_PAGE_FALLBACK_DATA = {
  recentRequests: [] as Array<{
    id: string;
    title: string;
    description: string;
    categoryRef: { name: string; slug: string } | null;
    location: string;
    budget: string | null;
    createdAt: Date;
    _count: { responses: number };
  }>,
  providerCount: 0,
  requestCount: 0,
  responseCount: 0,
};

const FAQ_ITEMS = [
  {
    value: &rdquo;free&rdquo;,
    question: &rdquo;Ar klientams platforma nemokama?&rdquo;,
    answer:
      &rdquo;Taip. Užklausą galite pateikti nemokamai ir be įsipareigojimo. Pirmiausia gaunate pasiūlymus, o tik tada sprendžiate ar norite tęsti su pasirinktu tiekėju.&rdquo;,
  },
  {
    value: &rdquo;speed&rdquo;,
    question: &rdquo;Per kiek laiko gausiu pasiūlymų?&rdquo;,
    answer:
      &rdquo;Dažniausiai pirmų atsakymų sulaukiama tą pačią dieną, o skubesnėse kategorijose ir greičiau. Tikslus greitis priklauso nuo miesto, kategorijos ir užklausos aiškumo.&rdquo;,
  },
  {
    value: &rdquo;registration&rdquo;,
    question: &rdquo;Ar reikia registracijos, kad pateikčiau užklausą?&rdquo;,
    answer:
      &rdquo;Ne būtinai. Užklausą galite pateikti ir be pilnos registracijos, tačiau paskyra leidžia patogiau sekti savo užklausas, pasiūlymus ir žinutes vienoje vietoje.&rdquo;,
  },
  {
    value: &rdquo;providers&rdquo;,
    question: &rdquo;Kaip tiekėjai gauna užklausas?&rdquo;,
    answer:
      &rdquo;Tiekėjai mato užklausas pagal savo specializacijas ir vietovę. Tai reiškia, kad santechnikas nemato elektros darbų kaip tinkamų atsakymui, o klientai gauna labiau taiklius pasiūlymus.&rdquo;,
  },
  {
    value: &rdquo;contacts&rdquo;,
    question: &rdquo;Kada tiekėjas mato mano kontaktus?&rdquo;,
    answer:
      &rdquo;Kontaktų matomumas priklauso nuo tiekėjo plano ir konkretaus platformos flow. Pagrindinis tikslas yra pirmiausia leisti gauti pasiūlymą, o tada pereiti prie tiesioginio kontakto tada, kai yra realus susidomėjimas.&rdquo;,
  },
  {
    value: &rdquo;trust&rdquo;,
    question: &rdquo;Kaip žinoti, ar tiekėjas patikimas?&rdquo;,
    answer:
      &rdquo;Platformoje galite matyti tiekėjo profilį, aprašymą, specializacijas, darbų pavyzdžius, planą ir atsiliepimus. Ilgainiui tai padeda greičiau atsirinkti patikimiausius specialistus.&rdquo;,
  },
];

const getHomePageData = unstable_cache(
  async () => {
    try {
      const [recentRequests, providerCount, requestCount, responseCount] = await Promise.all([
        prisma.serviceRequest.findMany({
          where: { status: &rdquo;OPEN&rdquo;, moderationStatus: &rdquo;APPROVED&rdquo; },
          select: {
            id: true,
            title: true,
            description: true,
            categoryRef: { select: { name: true, slug: true } },
            location: true,
            budget: true,
            createdAt: true,
            _count: { select: { responses: true } },
          },
          orderBy: { createdAt: &rdquo;desc&rdquo; },
          take: 6,
        }),
        prisma.user.count({
          where: {
            role: &rdquo;PROVIDER&rdquo;,
            emailVerified: { not: null },
            providerProfile: { isActive: true, moderationStatus: &rdquo;APPROVED&rdquo; },
          },
        }),
        prisma.serviceRequest.count(),
        prisma.response.count(),
      ]);

      return {
        recentRequests,
        providerCount,
        requestCount,
        responseCount,
      };
    } catch (error) {
      console.error(&rdquo;Home page data error:&rdquo;, error);
      return HOME_PAGE_FALLBACK_DATA;
    }
  },
  [&rdquo;home-page-data&rdquo;],
  { revalidate: 60, tags: [&rdquo;home-data&rdquo;, &rdquo;providers&rdquo;, &rdquo;requests&rdquo;] }
);

export default async function HomePage() {
  const [
    { recentRequests, providerCount, requestCount, responseCount },
    categoryGroups,
  ] = await Promise.all([getHomePageData(), getServiceCategoryGroups()]);

  // Depth-1 categories are the granular services users actually pick — the
  // roots are just group headers, so they don't count toward the stat.
  const categoryCount = categoryGroups.reduce(
    (sum, group) => sum + group.categories.length,
    0,
  );

  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  const trustCount = Math.max(providerCount, requestCount);
  const trustText =
    trustCount >= 25
      ? `Mumis pasitiki ${Math.floor(trustCount / 10) * 10}+ žmonių visoje Lietuvoje`
      : &rdquo;Patikrinti specialistai iš visos Lietuvos&rdquo;;

  const stats = [
    { value: providerCount || 1, label: &rdquo;Specialistų&rdquo; },
    { value: requestCount || 1, label: &rdquo;Pateiktų užklausų&rdquo; },
    { value: responseCount || 1, label: &rdquo;Pateiktų pasiūlymų&rdquo; },
    { value: categoryCount || 1, label: &rdquo;Kategorijų&rdquo; },
  ];

  return (
    <div>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className=&rdquo;relative flex min-h-[calc(100svh-72px)] flex-col overflow-hidden&rdquo;>
        {/* Warm glow behind the headline */}
        <div
          aria-hidden
          className=&rdquo;pointer-events-none absolute left-1/2 top-[38%] h-[440px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F6F1E6]/75 blur-3xl dark:bg-[#3a3128]/30&rdquo;
        />

        {/* Floating decorations (wide screens only) */}
        <div aria-hidden className=&rdquo;pointer-events-none absolute inset-0 z-[5] hidden xl:block&rdquo;>
          {/* Left — dashed journey path with nodes */}
          <div className=&rdquo;absolute left-[1.5%] top-[15%] h-[70%] w-[360px]&rdquo;>
            <svg viewBox=&rdquo;0 0 360 600&rdquo; className=&rdquo;h-full w-full&rdquo; fill=&rdquo;none&rdquo;>
              <path
                d=&rdquo;M250,28 C200,140 108,180 106,308 C104,438 168,500 212,576&rdquo;
                stroke=&rdquo;#C6BFB0&rdquo;
                className=&rdquo;dark:stroke-[#3f3a32]&rdquo;
                strokeWidth=&rdquo;2&rdquo;
                strokeDasharray=&rdquo;5 7&rdquo;
                strokeLinecap=&rdquo;round&rdquo;
              />
            </svg>
            <div className=&rdquo;absolute&rdquo; style={{ left: &rdquo;69%&rdquo;, top: &rdquo;5%&rdquo;, transform: &rdquo;translate(-50%,-50%)&rdquo; }}>
              <div className=&rdquo;grid h-[58px] w-[58px] place-items-center rounded-full bg-[#E1DAEC] ring-1 ring-[#CABFE0] dark:bg-[#2e2740] dark:ring-[#43395f]&rdquo;>
                <Package className=&rdquo;h-6 w-6 text-[#7C6AA6] dark:text-[#b3a3d6]&rdquo; />
              </div>
            </div>
            <div className=&rdquo;absolute&rdquo; style={{ left: &rdquo;30%&rdquo;, top: &rdquo;52%&rdquo;, transform: &rdquo;translate(-50%,-50%)&rdquo; }}>
              <div className=&rdquo;relative grid h-[58px] w-[58px] place-items-center rounded-full bg-[#D4E5CD] ring-1 ring-[#BBD3B0] dark:bg-[#26331f] dark:ring-[#3a4d30]&rdquo;>
                <Search className=&rdquo;h-6 w-6 text-[#5E8C50] dark:text-[#9cc088]&rdquo; />
                <span className=&rdquo;absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full rounded-md bg-[#4A463F] px-2 py-[3px] text-[11px] font-medium text-white&rdquo;>
                  Tu
                </span>
              </div>
            </div>
            <div className=&rdquo;absolute&rdquo; style={{ left: &rdquo;58%&rdquo;, top: &rdquo;96%&rdquo;, transform: &rdquo;translate(-50%,-50%)&rdquo; }}>
              <div className=&rdquo;grid h-[58px] w-[58px] place-items-center rounded-full bg-[#D5E0EC] ring-1 ring-[#BCCCDF] dark:bg-[#222d3b] dark:ring-[#374559]&rdquo;>
                <Check className=&rdquo;h-6 w-6 text-[#5A79A4] dark:text-[#9db5d6]&rdquo; />
              </div>
            </div>
          </div>

          {/* Right — sample request card */}
          <div className=&rdquo;absolute right-[2.5%] top-[16%] w-[256px] rotate-[2.5deg]&rdquo;>
            <div className=&rdquo;rounded-2xl border border-[#E2DDD2] bg-[#FBFAF6] p-4 shadow-[0_20px_44px_-20px_rgba(40,35,30,0.32)] dark:border-surface-800 dark:bg-surface-900&rdquo;>
              <div className=&rdquo;flex items-center justify-between&rdquo;>
                <div className=&rdquo;flex items-center gap-1.5 text-[#8C877D] dark:text-surface-400&rdquo;>
                  <FileText className=&rdquo;h-3.5 w-3.5&rdquo; />
                  <span className=&rdquo;text-[11px] font-medium&rdquo;>Nauja užklausa</span>
                </div>
                <Maximize2 className=&rdquo;h-3 w-3 text-[#B5AFA2] dark:text-surface-500&rdquo; />
              </div>
              <p className=&rdquo;mt-2.5 text-[13px] font-semibold leading-snug text-[#26231F] dark:text-surface-100&rdquo;>
                Vonios kambario remontas — Vilnius
              </p>
              <div className=&rdquo;mt-3 space-y-1.5&rdquo;>
                <div className=&rdquo;h-1.5 w-full rounded-full bg-[#E8E3D8] dark:bg-surface-800&rdquo; />
                <div className=&rdquo;h-1.5 w-3/4 rounded-full bg-[#E8E3D8] dark:bg-surface-800&rdquo; />
              </div>
              <div className=&rdquo;mt-3.5 flex items-center justify-between border-t border-[#EAE5DA] pt-2.5 dark:border-surface-800&rdquo;>
                <span className=&rdquo;text-[11px] text-[#8C877D] dark:text-surface-400&rdquo;>6 specialistai atsakė</span>
                <span className=&rdquo;grid h-5 w-5 place-items-center rounded-full bg-[#C25E3A] text-[9px] font-bold text-white&rdquo;>
                  P
                </span>
              </div>
            </div>
          </div>

          {/* Right — sticky note tip + hand-drawn arrow pointing at the AI button */}
          <div className=&rdquo;absolute right-[4%] top-[45%] w-[242px] -rotate-[5deg]&rdquo;>
            <div className=&rdquo;rounded-xl bg-[#F4E6A8] p-4 shadow-[0_18px_36px_-18px_rgba(40,35,30,0.4)]&rdquo;>
              <p className=&rdquo;text-[12.5px] leading-relaxed text-[#7C6B2E]&rdquo;>
                <span className=&rdquo;font-bold&rdquo;>Patarimas:</span> nežinai, kaip
                aprašyti? Spausk{&rdquo; &rdquo;}
                <span className=&rdquo;font-semibold&rdquo;>&ldquo;Sutvarkyti aprašymą&rdquo;</span> —
                dirbtinis intelektas sutvarkys tekstą ir patars, ką dar pridėti.
              </p>
            </div>
          </div>

          {/* Hand-drawn arrow from the tip down to the AI button */}
          <div className=&rdquo;absolute left-[62%] top-[58%] h-[185px] w-[300px]&rdquo;>
            <svg
              viewBox=&rdquo;0 0 300 185&rdquo;
              className=&rdquo;h-full w-full&rdquo;
              fill=&rdquo;none&rdquo;
              stroke=&rdquo;#C25E3A&rdquo;
              strokeWidth=&rdquo;2.6&rdquo;
              strokeLinecap=&rdquo;round&rdquo;
              strokeLinejoin=&rdquo;round&rdquo;
            >
              <path d=&rdquo;M256,28 C240,82 214,110 122,128&rdquo; />
              <path d=&rdquo;M137,132 L122,128 L135,118&rdquo; />
            </svg>
          </div>
        </div>

        {/* Centered content */}
        <div className=&rdquo;relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-12 pb-10&rdquo;>
          <span className=&rdquo;mb-7 inline-flex items-center rounded-full bg-[#2A2723] px-3.5 py-1.5 text-xs font-medium tracking-wide text-[#ECE9E2] dark:bg-surface-800 dark:text-surface-200&rdquo;>
            Paslaugų rinka
          </span>
          <h1 className=&rdquo;text-center text-[2.75rem] font-bold leading-[1.05] tracking-tight text-[#26231F] dark:text-surface-50 sm:text-[3.5rem] lg:text-[4.25rem]&rdquo;>
            Rask specialistą,
            <br />
            kurio tikrai reikia
          </h1>
          <p className=&rdquo;mt-5 max-w-xl text-center text-lg leading-relaxed text-[#6B6760] dark:text-surface-300&rdquo;>
            Aprašyk paprastais žodžiais, ko reikia, ir gauk pasiūlymų iš
            specialistų visoje Lietuvoje.
          </p>
          <div className=&rdquo;mt-9 flex w-full justify-center&rdquo;>
            <HeroSearch />
          </div>
        </div>

        {/* Social proof */}
        <div className=&rdquo;relative z-10 flex justify-center px-6 pb-12&rdquo;>
          <div className=&rdquo;flex items-center gap-3&rdquo;>
            <div className=&rdquo;flex -space-x-2&rdquo;>
              {AVATARS.map((a) => (
                <span
                  key={a.initials}
                  className=&rdquo;grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold text-white ring-2 ring-[#ECE9E2] dark:ring-surface-900&rdquo;
                  style={{ backgroundColor: a.color }}
                >
                  {a.initials}
                </span>
              ))}
            </div>
            <span className=&rdquo;text-sm text-[#6B6760] dark:text-surface-300&rdquo;>{trustText}</span>
          </div>
        </div>
      </section>

      {/* Guest request recovery */}
      <div className=&rdquo;mx-auto max-w-2xl px-6 [&:not(:empty)]:py-8&rdquo;>
        <RecentRequestBanner />
      </div>

      {/* ──────────────────── Recent requests ──────────────────── */}
      {recentRequests.length > 0 && (
        <section className=&rdquo;py-20&rdquo;>
          <div className=&rdquo;mx-auto max-w-7xl px-6&rdquo;>
            <div className=&rdquo;mb-12 text-center&rdquo;>
              <span className=&rdquo;mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-[#C25E3A] dark:text-brand-400&rdquo;>
                Naujausi darbai
              </span>
              <h2 className=&rdquo;text-3xl font-bold tracking-tight text-[#26231F] dark:text-surface-50 sm:text-4xl&rdquo;>
                Ką šiuo metu ieško klientai
              </h2>
              <p className=&rdquo;mt-3 text-[#6B6760] dark:text-surface-300&rdquo;>
                Peržiūrėk naujausias užklausas ir pateik savo pasiūlymą
              </p>
            </div>
            <div className=&rdquo;grid gap-5 md:grid-cols-2 lg:grid-cols-3&rdquo;>
              {recentRequests.map((r) => (
                <Link
                  key={r.id}
                  href=&rdquo;/uzklausos&rdquo;
                  className=&rdquo;group rounded-2xl border border-[#E2DDD2] bg-[#FBFAF6] p-5 transition-all hover:-translate-y-0.5 hover:border-[#D3CCBD] hover:shadow-[0_16px_36px_-18px_rgba(40,35,30,0.3)] dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700&rdquo;
                >
                  <div className=&rdquo;flex items-start justify-between gap-3&rdquo;>
                    <h3 className=&rdquo;line-clamp-1 font-semibold text-[#26231F] dark:text-surface-100&rdquo;>
                      {r.title}
                    </h3>
                    {r.budget && (
                      <span className=&rdquo;shrink-0 text-sm font-semibold text-[#C25E3A] dark:text-brand-400&rdquo;>
                        {budgetLabel(r.budget)}
                      </span>
                    )}
                  </div>
                  <p className=&rdquo;mt-2 line-clamp-2 text-sm text-[#6B6760] dark:text-surface-400&rdquo;>
                    {truncate(r.description, 100)}
                  </p>
                  <div className=&rdquo;mt-4 flex flex-wrap items-center gap-2&rdquo;>
                    {r.categoryRef?.name && (
                      <span className=&rdquo;rounded-lg bg-[#EFE0D6] px-2.5 py-1 text-xs font-medium text-[#A84E2E] dark:bg-brand-950/60 dark:text-brand-300&rdquo;>
                        {r.categoryRef.name}
                      </span>
                    )}
                    <span className=&rdquo;inline-flex items-center gap-1 text-xs text-[#8C877D] dark:text-surface-400&rdquo;>
                      <MapPin className=&rdquo;h-3 w-3&rdquo; />
                      {r.location}
                    </span>
                  </div>
                  <div className=&rdquo;mt-3 flex items-center gap-3 border-t border-[#EAE5DA] pt-3 text-xs text-[#8C877D] dark:border-surface-800 dark:text-surface-400&rdquo;>
                    <span className=&rdquo;inline-flex items-center gap-1&rdquo;>
                      <Clock className=&rdquo;h-3 w-3&rdquo; />
                      {formatRelativeDate(r.createdAt)}
                    </span>
                    <span className=&rdquo;inline-flex items-center gap-1&rdquo;>
                      <MessageSquare className=&rdquo;h-3 w-3&rdquo; />
                      {r._count.responses} pasiūl.
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className=&rdquo;mt-10 text-center&rdquo;>
              <Link
                href=&rdquo;/uzklausos&rdquo;
                className=&rdquo;group inline-flex items-center gap-2 rounded-full border border-[#D8D2C6] bg-[#FBFAF6] px-5 py-2.5 text-sm font-semibold text-[#26231F] transition-colors hover:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700&rdquo;
              >
                Visos užklausos
                <ArrowRight className=&rdquo;h-4 w-4 transition-transform group-hover:translate-x-0.5&rdquo; />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────── How it works ───────────────────── */}
      <section id=&rdquo;kaip-veikia&rdquo; className=&rdquo;scroll-mt-24 py-20&rdquo;>
        <div className=&rdquo;mx-auto max-w-7xl px-6&rdquo;>
          <div className=&rdquo;mb-12 text-center&rdquo;>
            <span className=&rdquo;mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-[#C25E3A] dark:text-brand-400&rdquo;>
              Kaip tai veikia
            </span>
            <h2 className=&rdquo;text-3xl font-bold tracking-tight text-[#26231F] dark:text-surface-50 sm:text-4xl&rdquo;>
              Trys paprasti žingsniai
            </h2>
          </div>
          <div className=&rdquo;grid gap-6 md:grid-cols-3&rdquo;>
            {HOW_IT_WORKS.map((item, idx) => (
              <div
                key={item.title}
                className=&rdquo;relative rounded-2xl border border-[#E2DDD2] bg-[#FBFAF6] p-8 dark:border-surface-800 dark:bg-surface-900&rdquo;
              >
                <div className=&rdquo;mb-5 grid h-12 w-12 place-items-center rounded-xl bg-[#C25E3A] text-lg font-bold text-white&rdquo;>
                  {idx + 1}
                </div>
                <div className=&rdquo;absolute right-6 top-6 text-[#E0DACB] dark:text-surface-700&rdquo;>
                  {item.icon}
                </div>
                <h3 className=&rdquo;text-lg font-semibold text-[#26231F] dark:text-surface-100&rdquo;>
                  {item.title}
                </h3>
                <p className=&rdquo;mt-2 text-sm leading-relaxed text-[#6B6760] dark:text-surface-400&rdquo;>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── Categories ────────────────────── */}
      <section id=&rdquo;kategorijos&rdquo; className=&rdquo;scroll-mt-24 py-20&rdquo;>
        <div className=&rdquo;mx-auto max-w-7xl px-6&rdquo;>
          <div className=&rdquo;mb-12 text-center&rdquo;>
            <span className=&rdquo;mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-[#C25E3A] dark:text-brand-400&rdquo;>
              Kategorijos
            </span>
            <h2 className=&rdquo;text-3xl font-bold tracking-tight text-[#26231F] dark:text-surface-50 sm:text-4xl&rdquo;>
              Paslaugų kategorijos
            </h2>
          </div>
          <div className=&rdquo;grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3&rdquo;>
            {categoryGroups.map((group) => (
              <Link
                key={group.root.id}
                href={`/uzklausos?category=${group.root.slug}`}
                className=&rdquo;group flex flex-col items-center gap-3 rounded-2xl border border-[#E2DDD2] bg-[#FBFAF6] p-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#D3CCBD] hover:shadow-[0_16px_36px_-18px_rgba(40,35,30,0.3)] dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700&rdquo;
              >
                <div className=&rdquo;grid h-12 w-12 place-items-center rounded-xl bg-[#EFE0D6] text-[#C25E3A] dark:bg-brand-950/60 dark:text-brand-300&rdquo;>
                  <Tag className=&rdquo;h-6 w-6&rdquo; />
                </div>
                <span className=&rdquo;text-sm font-medium text-[#26231F] dark:text-surface-100&rdquo;>
                  {group.root.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── Stats ───────────────────────── */}
      <section className=&rdquo;py-20&rdquo;>
        <div className=&rdquo;mx-auto max-w-7xl px-6&rdquo;>
          <div className=&rdquo;rounded-3xl border border-[#E2DDD2] bg-[#FBFAF6] p-10 dark:border-surface-800 dark:bg-surface-900&rdquo;>
            <div className=&rdquo;grid grid-cols-2 gap-8 md:grid-cols-4&rdquo;>
              {stats.map((stat) => (
                <div key={stat.label} className=&rdquo;text-center&rdquo;>
                  <div className=&rdquo;text-4xl font-bold text-[#C25E3A] sm:text-[2.75rem] dark:text-brand-400&rdquo;>
                    {stat.value}
                  </div>
                  <div className=&rdquo;mt-2 text-sm font-medium text-[#6B6760] dark:text-surface-400&rdquo;>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────  FAQ  ──────────────────────── */}
      <section className=&rdquo;py-20&rdquo;>
        <div className=&rdquo;mx-auto max-w-7xl px-6&rdquo;>
          <div className=&rdquo;grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16&rdquo;>
            <div>
              <span className=&rdquo;mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-[#C25E3A] dark:text-brand-400&rdquo;>
                Klausimai ir atsakymai
              </span>
              <h2 className=&rdquo;text-3xl font-bold tracking-tight text-[#26231F] dark:text-surface-50 sm:text-4xl&rdquo;>
                Ką verta žinoti prieš pradedant
              </h2>
              <p className=&rdquo;mt-4 max-w-md leading-relaxed text-[#6B6760] dark:text-surface-300&rdquo;>
                Trumpi atsakymai į dažniausius klausimus. Jei vis tiek lieka
                neaišku, gali pradėti nuo pirmos užklausos ir išbandyti platformą
                praktiškai.
              </p>
            </div>
            <div className=&rdquo;rounded-3xl border border-[#E2DDD2] bg-[#FBFAF6] p-6 dark:border-surface-800 dark:bg-surface-900&rdquo;>
              <Accordion type=&rdquo;single&rdquo; collapsible defaultValue=&rdquo;free&rdquo; className=&rdquo;w-full&rdquo;>
                {FAQ_ITEMS.map((item) => (
                  <AccordionItem key={item.value} value={item.value} className=&rdquo;border-[#EAE5DA] dark:border-surface-800&rdquo;>
                    <AccordionTrigger className=&rdquo;text-[#26231F] hover:text-[#C25E3A] dark:text-surface-100 dark:hover:text-brand-400&rdquo;>
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className=&rdquo;text-[#6B6760] dark:text-surface-400&rdquo;>
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA for providers ────────────────── */}
      <section className=&rdquo;px-6 py-20&rdquo;>
        <div className=&rdquo;mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-[#2A2723] px-6 py-16 text-center&rdquo;>
          <span className=&rdquo;mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[#E8E3D8]&rdquo;>
            <Sparkles className=&rdquo;h-3.5 w-3.5&rdquo; />
            Pradėk nemokamai
          </span>
          <h2 className=&rdquo;text-3xl font-bold tracking-tight text-[#F4F1EA] sm:text-4xl&rdquo;>
            Esi paslaugų tiekėjas?
          </h2>
          <p className=&rdquo;mx-auto mt-4 max-w-xl text-[#B3AEA3]&rdquo;>
            Prisijunk prie platformos ir gauk naujų klientų kiekvieną dieną.
            Pradėti nieko nekainuoja.
          </p>
          <ProviderCtaLink
            className=&rdquo;group mt-8 inline-flex items-center rounded-full bg-[#ECE9E2] px-7 py-3.5 font-semibold text-[#26231F] transition-all hover:-translate-y-0.5 hover:bg-white&rdquo;
            providerLabel={
              <>
                Eiti į valdymo panelę
                <ArrowRight className=&rdquo;ml-2 h-5 w-5 transition-transform group-hover:translate-x-1&rdquo; />
              </>
            }
          >
            Registruotis nemokamai
            <ArrowRight className=&rdquo;ml-2 h-5 w-5 transition-transform group-hover:translate-x-1&rdquo; />
          </ProviderCtaLink>
        </div>
      </section>
    </div>
  );
}
