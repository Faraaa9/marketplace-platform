import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Circle,
  Coins,
  Eye,
  FileText,
  Lightbulb,
  MessageCircle,
} from "lucide-react";
import { DismissibleCard } from "@/components/ui/DismissibleCard";
import { isCardDismissed } from "@/lib/dismissible-cards";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";

function pasiulymaiLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} pasiūlymas`;
  if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) {
    return `${count} pasiūlymai`;
  }
  return `${count} pasiūlymų`;
}
import {
  getProviderWorkCenterData,
  initials,
  type ReadinessStep,
  type WorkConversation,
} from "./provider-work-center-data";

const ACTION_GREEN = "bg-brand-600 hover:bg-brand-700";

function stateLabelClass(label: WorkConversation["stateLabel"]) {
  if (label === "Nauja žinutė" || label === "Naujas atsakymas") {
    return "bg-[#E8F1FF] text-[#1769E0]";
  }
  return "bg-[#F1EEE8] text-[#6D675F]";
}

export type WorkQueueFilter = "visos" | "zinutes" | "uzklausos";

const QUEUE_FILTERS: { value: WorkQueueFilter; label: string; href: string }[] = [
  { value: "visos", label: "Visos", href: "/tiekejas" },
  { value: "zinutes", label: "Žinutės", href: "/tiekejas?rodyti=zinutes" },
  { value: "uzklausos", label: "Užklausos", href: "/tiekejas?rodyti=uzklausos" },
];

export async function ProviderWorkCenter({
  userId,
  slug,
  filter = "visos",
}: {
  userId: string;
  slug?: string | null;
  filter?: WorkQueueFilter;
}) {
  const data = await getProviderWorkCenterData(userId);
  // Server-side gate so a dismissed one-off card never paints (no flash / CLS).
  // Safe under Cache Components: this subtree is dynamic (Suspense + per-user
  // Prisma reads), so the cookie read inside isCardDismissed is allowed here.
  const welcomeTipDismissed = await isCardDismissed("provider-welcome-tip");
  const primaryLabel = data.missingReadiness ? "Sutvarkyti" : "Atidaryti žinutes";
  const primaryHref = data.missingReadiness?.href ?? "/tiekejas/zinutes";
  // "Reikia dėmesio" surfaces only items where something is new / awaiting a
  // reply (unread). Read-through conversations and idle requests live in the
  // full lists (/tiekejas/zinutes, /paskyra/uzklausos) — keeping them out here
  // is the "ekranas lieka ramus" behaviour.
  const attention = data.conversations.filter((c) => c.unread);
  const queueSource =
    filter === "zinutes"
      ? attention.filter((c) => c.kind === "message")
      : filter === "uzklausos"
        ? attention.filter((c) => c.kind === "request")
        : attention;
  const workQueue = queueSource.slice(0, data.workQueueLimit);

  return (
    <>
      <header className="mb-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-micro font-bold uppercase tracking-[0.14em] text-brand-600">
            Tiekėjo darbo centras
          </p>
          <h1 className="mt-2 text-[40px] font-semibold leading-none tracking-normal text-[#24211D] dark:text-white sm:text-[56px]">
            Kas laukia šiandien
          </h1>
          <p className="mt-3 max-w-xl text-body-sm leading-relaxed text-[#6D675F] dark:text-surface-400">
            Viena vieta klientų žinutėms, atsakymo terminams ir profilio būsenai.
            Jeigu nėra veiksmo, ekranas lieka ramus.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={primaryHref}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-body-sm font-semibold text-white shadow-[0_10px_22px_rgba(55,42,31,0.16)] transition-colors ${ACTION_GREEN}`}
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={`/meistrai/${slug ?? userId}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DED7CC] bg-white px-5 text-body-sm font-semibold text-[#24211D] transition-colors hover:bg-[#F7F5F0] dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
          >
            Viešas profilis
          </Link>
        </div>
      </header>

      {!welcomeTipDismissed && (
        <DismissibleCard id="provider-welcome-tip" className="mb-4">
          <section className="rounded-[20px] border border-[#DED7CC] bg-white p-4 pr-12 shadow-[0_12px_32px_rgba(55,42,31,0.08)] dark:border-surface-700 dark:bg-surface-900">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F6E9E3] text-[#A84E2E]">
                <Lightbulb className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-body-sm font-semibold text-[#24211D] dark:text-white">
                  Greitas atsakymas laimi klientą
                </h3>
                <p className="mt-1 text-caption leading-relaxed text-[#6D675F] dark:text-surface-400">
                  Klientai dažniausiai renkasi pirmą atsakiusį tiekėją. Atsakyk į
                  naujas žinutes per kelias valandas - taip gausi daugiau darbų.
                </p>
              </div>
            </div>
          </section>
        </DismissibleCard>
      )}

      <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          value={data.myRequestsActiveCount}
          suffix={data.myRequestsActiveCount === 1 ? "aktyvi" : "aktyvios"}
          label={
            data.myRequestsUnreadCount > 0
              ? `Pateiktos užklausos - ${data.myRequestsUnreadCount} nauj${data.myRequestsUnreadCount === 1 ? "as atsakymas" : "i atsakymai"}`
              : "Pateiktos užklausos"
          }
          href="/paskyra/uzklausos"
        />
        <SummaryTile value={data.activeCount} suffix="aktyvūs" label="Pokalbiai su klientais" href="/tiekejas/zinutes" />
        <SummaryTile value={`${data.completeness}%`} label="Profilio paruošimas" href="/tiekejas/profilis" />
        <SummaryTile value={data.creditBalance} label="Kreditai atsakymams" href="/tiekejas/planai" />
      </section>

      <main className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)]">
        <section className="overflow-hidden rounded-[22px] border border-[#DED7CC] bg-[#FFFDF8] shadow-[0_18px_55px_rgba(55,42,31,0.12)] dark:border-surface-700 dark:bg-surface-900">
          <div className="flex flex-col gap-3 border-b border-[#DED7CC] px-5 py-4 dark:border-surface-700 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-body-lg font-semibold text-[#24211D] dark:text-white">
                Reikia dėmesio
              </h2>
              <p className="mt-1 text-caption text-[#6D675F] dark:text-surface-400">
                Žinutės ir pateiktos užklausos kartu - pirmiausia tos, kur kažkas naujo.
              </p>
            </div>
            <div className="flex w-fit rounded-full border border-[#DED7CC] bg-[#F5F1EA] p-1 text-caption font-semibold text-[#6D675F] dark:border-surface-700 dark:bg-surface-800">
              {QUEUE_FILTERS.map((item) =>
                item.value === filter ? (
                  <span
                    key={item.value}
                    className="rounded-full bg-white px-3 py-1.5 text-[#24211D] shadow-sm dark:bg-surface-700 dark:text-white"
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link key={item.value} href={item.href} className="px-3 py-1.5">
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          {workQueue.length > 0 ? (
            <div>
              {workQueue.map((conversation) =>
                conversation.kind === "request" ? (
                  <RequestRow key={conversation.id} conversation={conversation} />
                ) : (
                  <ConversationRow key={conversation.id} conversation={conversation} />
                ),
              )}
            </div>
          ) : (
            <div className="grid min-h-[280px] place-items-center px-6 py-12 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#F1EEE8] text-[#6D675F]">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-body font-semibold text-[#24211D] dark:text-white">
                  {filter === "uzklausos" ? "Naujų atsakymų nėra" : "Nieko naujo"}
                </h3>
                <p className="mt-1 max-w-sm text-body-sm text-[#6D675F] dark:text-surface-400">
                  {filter === "uzklausos"
                    ? "Kai tiekėjas atsakys į tavo užklausą, ji atsiras čia."
                    : "Kai klientas parašys arba atsakys į tavo pasiūlymą, pokalbis atsiras čia."}
                </p>
              </div>
            </div>
          )}
        </section>

        <aside className="grid gap-3">
          <ReadinessCard
            completeness={data.completeness}
            missingItems={data.missingItems}
            readinessSteps={data.readinessSteps}
            missingReadiness={data.missingReadiness}
          />
          <SideCard
            icon={Coins}
            title="Kreditai"
            body={`Turite ${data.creditBalance} kredit${data.creditBalance === 1 ? "ą" : "us"}. Jie naudojami atsakymams, kai klientas atėjo iš platformos užklausos.`}
            primary={{ label: "Papildyti", href: "/tiekejas/planai" }}
            secondary={{ label: "Istorija", href: "/tiekejas/planai" }}
          />
          <SideCard
            icon={Eye}
            title="Matomumas"
            body={
              data.profile?.isActive
                ? "Profilis aktyvus. Klientai gali rašyti tiesiai į žinutes."
                : "Profilis šiuo metu nerodomas klientams."
            }
            primary={{ label: "Redaguoti", href: "/tiekejas/profilis" }}
            secondary={{ label: "Peržiūrėti", href: `/meistrai/${slug ?? userId}` }}
          />
        </aside>
      </main>
    </>
  );
}

function SummaryTile({
  value,
  suffix,
  label,
  href,
}: {
  value: number | string;
  suffix?: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="relative min-h-[88px] overflow-hidden rounded-[18px] border border-[#DED7CC]/80 bg-white/80 px-4 py-3.5 shadow-[0_10px_26px_rgba(55,42,31,0.055)] transition-colors before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-brand-600/45 hover:bg-white dark:border-surface-700 dark:bg-surface-900 dark:hover:bg-surface-800"
    >
      <div className="flex items-baseline gap-1.5 text-[27px] font-semibold leading-none tracking-normal text-[#24211D] dark:text-white">
        {value}
        {suffix && (
          <span className="text-[12px] font-semibold text-[#6D675F] dark:text-surface-400">
            {suffix}
          </span>
        )}
      </div>
      <p className="mt-2 text-caption leading-snug text-[#6D675F] dark:text-surface-400">
        {label}
      </p>
    </Link>
  );
}

function ConversationRow({ conversation }: { conversation: WorkConversation }) {
  return (
    <Link href={conversation.href} className="group block">
      <article
        className={`grid min-h-[96px] grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-[#DED7CC]/70 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#F7F5F0] dark:border-surface-700 dark:hover:bg-surface-800 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5 ${
          conversation.unread ? "bg-[#FFF9ED]" : "bg-[#FFFDF8] dark:bg-surface-900"
        }`}
      >
        <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-[#D1D5DB] text-caption font-bold text-[#4B5563]">
          {conversation.avatarImage ? (
            <Image
              src={conversation.avatarImage}
              alt=""
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            initials(conversation.title)
          )}
          {conversation.unread && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FFFDF8] bg-[#20B46B] dark:border-surface-900" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate text-body-sm font-semibold text-[#24211D] dark:text-white">
              {decodeHtmlEntities(conversation.title)}
            </h3>
            {conversation.stateLabel && (
              <span className={`inline-flex min-h-[22px] items-center rounded-full px-2 text-[11px] font-bold ${stateLabelClass(conversation.stateLabel)}`}>
                {conversation.stateLabel}
              </span>
            )}
            <span className="inline-flex min-h-[22px] items-center rounded-full bg-[#F1EEE8] px-2 text-[11px] font-bold text-[#6D675F]">
              {conversation.roleLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-caption text-[#6D675F] dark:text-surface-400">
            {decodeHtmlEntities(conversation.meta)}
          </p>
          <p className={`mt-1 truncate text-body-sm ${conversation.unread ? "text-[#24211D] dark:text-white" : "text-[#6D675F] dark:text-surface-400"}`}>
            {conversation.fromProvider && <span>Jūs: </span>}
            {decodeHtmlEntities(conversation.preview)}
          </p>
        </div>
        <div className="col-start-2 flex flex-col gap-2 sm:col-auto sm:items-end">
          <time className="hidden text-caption font-semibold text-[#8D857B] sm:block" dateTime={conversation.lastMessageAt.toISOString()}>
            {formatRelativeDate(conversation.lastMessageAt)}
          </time>
          <span
            className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-caption font-semibold transition-colors ${
              conversation.unread
                ? `${ACTION_GREEN} text-white`
                : "border border-[#DED7CC] bg-white text-[#24211D] group-hover:bg-[#F7F5F0] dark:border-surface-700 dark:bg-surface-900 dark:text-white"
            }`}
          >
            {conversation.unread ? "Atsakyti" : "Atidaryti"}
          </span>
        </div>
      </article>
    </Link>
  );
}

// Own submitted requests render distinctly from chat threads: a file glyph
// (requests have no avatar — easy to spot), a green "Gyvai" chip when open,
// "N pasiūlymų · prieš X" meta, and a numeric badge of providers with news.
// No message preview — that text belongs to the proposal threads inside.
function RequestRow({ conversation }: { conversation: WorkConversation }) {
  const isLive = conversation.requestStatus === "OPEN";
  const proposalCount = conversation.proposalCount ?? 0;
  const unreadCount = conversation.proposalUnreadCount ?? 0;
  return (
    <Link href={conversation.href} className="group block">
      <article
        className={`grid min-h-[96px] grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-[#DED7CC]/70 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-[#F7F5F0] dark:border-surface-700 dark:hover:bg-surface-800 sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5 ${
          conversation.unread ? "bg-[#FFF9ED]" : "bg-[#FFFDF8] dark:bg-surface-900"
        }`}
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#F6E9E3] text-[#A84E2E]">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="min-w-0 truncate text-body-sm font-semibold text-[#24211D] dark:text-white">
              {decodeHtmlEntities(conversation.title)}
            </h3>
            <span className="inline-flex min-h-[22px] items-center rounded-full bg-[#F6E9E3] px-2 text-[11px] font-bold text-[#A84E2E]">
              Užklausa
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#A84E2E] px-1.5 text-[11px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-caption text-[#6D675F] dark:text-surface-400">
            {isLive && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                />
                Gyvai
              </span>
            )}
            <span>{pasiulymaiLabel(proposalCount)}</span>
            <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-[#C9C1B2]" />
            <span>{formatRelativeDate(conversation.lastMessageAt)}</span>
          </div>
        </div>
        <div className="col-start-2 flex flex-col gap-2 sm:col-auto sm:items-end">
          <span
            className={`inline-flex min-h-9 items-center justify-center rounded-xl px-3 text-caption font-semibold transition-colors ${
              conversation.unread
                ? `${ACTION_GREEN} text-white`
                : "border border-[#DED7CC] bg-white text-[#24211D] group-hover:bg-[#F7F5F0] dark:border-surface-700 dark:bg-surface-900 dark:text-white"
            }`}
          >
            {conversation.unread ? "Peržiūrėti" : "Atidaryti"}
          </span>
        </div>
      </article>
    </Link>
  );
}

function ReadinessCard({
  completeness,
  missingItems,
  readinessSteps,
  missingReadiness,
}: {
  completeness: number;
  missingItems: string[];
  readinessSteps: ReadinessStep[];
  missingReadiness?: ReadinessStep;
}) {
  const title = missingReadiness
    ? missingItems.length <= 1
      ? "Trūksta vieno dalyko"
      : "Sutvarkykite profilį"
    : "Profilis paruoštas";
  const body = missingReadiness
    ? `${missingReadiness.label} yra artimiausias blokatorius. Sutvarkius, klientams bus lengviau jumis pasitikėti.`
    : "Profilis aktyvus ir pasiruošęs priimti klientų žinutes.";

  return (
    <section className={`rounded-[20px] border p-4 shadow-[0_12px_32px_rgba(55,42,31,0.08)] ${
      missingReadiness
        ? "border-amber-200 bg-amber-50"
        : "border-[#DED7CC] bg-white dark:border-surface-700 dark:bg-surface-900"
    }`}>
      <h3 className="text-body-sm font-semibold text-[#24211D] dark:text-white">{title}</h3>
      <p className="mt-2 text-caption leading-relaxed text-[#6D675F] dark:text-surface-400">
        {body}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E4DED4] dark:bg-surface-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400"
          style={{ width: `${completeness}%` }}
        />
      </div>
      <div className="mt-3 grid gap-2">
        {readinessSteps.map((step) => (
          <Link key={step.label} href={step.href} className="flex min-h-7 items-center gap-2 text-caption text-[#6D675F] dark:text-surface-300">
            <span className={`grid h-[18px] w-[18px] place-items-center rounded-full ${
              step.done
                ? "bg-emerald-50 text-emerald-700"
                : "border border-[#CFC6B8] text-transparent"
            }`}>
              {step.done ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2" />}
            </span>
            {step.label}
          </Link>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={missingReadiness?.href ?? "/tiekejas/profilis"}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DED7CC] bg-white px-3 text-caption font-semibold text-[#24211D] transition-colors hover:bg-[#F7F5F0]"
        >
          {missingReadiness ? "Užpildyti" : "Profilis"}
        </Link>
        <Link
          href="/tiekejas/profilis"
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DED7CC] bg-white px-3 text-caption font-semibold text-[#24211D] transition-colors hover:bg-[#F7F5F0]"
        >
          Redaguoti
        </Link>
      </div>
    </section>
  );
}

function SideCard({
  icon: Icon,
  title,
  body,
  primary,
  secondary,
}: {
  icon: typeof Coins;
  title: string;
  body: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  return (
    <section className="rounded-[20px] border border-[#DED7CC] bg-white p-4 shadow-[0_12px_32px_rgba(55,42,31,0.08)] dark:border-surface-700 dark:bg-surface-900">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="text-body-sm font-semibold text-[#24211D] dark:text-white">{title}</h3>
      </div>
      <p className="mt-2 text-caption leading-relaxed text-[#6D675F] dark:text-surface-400">
        {body}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={primary.href}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DED7CC] bg-white px-3 text-caption font-semibold text-[#24211D] transition-colors hover:bg-[#F7F5F0] dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
        >
          {primary.label}
        </Link>
        <Link
          href={secondary.href}
          className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#DED7CC] bg-white px-3 text-caption font-semibold text-[#24211D] transition-colors hover:bg-[#F7F5F0] dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
        >
          {secondary.label}
        </Link>
      </div>
    </section>
  );
}
