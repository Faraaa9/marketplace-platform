import {
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Search,
  Send,
  Settings,
  Smile,
} from "lucide-react";

const conversations = [
  {
    name: "Driverio pamokos",
    avatar: "A",
    time: "Prieš 5 val.",
    status: "Tiesioginė",
    preview: "Galite paskambinti?",
    active: true,
    unread: false,
    accent: "#D38331",
  },
  {
    name: "Ramūnas Bruožis",
    avatar: "R",
    time: "Prieš 8 val.",
    status: "Tiesioginė",
    preview: "Jūs: Kada atvyksite?",
    unread: true,
    accent: "#B58E74",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80",
  },
  {
    name: "Justas",
    avatar: "J",
    time: "Prieš 6 val.",
    status: "Užsakyta",
    preview: "Jūs: Galite paskambinti?",
    unread: false,
    accent: "#D8C4A8",
  },
  {
    name: "Balkono remontas su pakėlimu",
    avatar: "B",
    time: "Prieš 7 val.",
    status: "Atidaryta",
    preview: "Jūs: Ačiū!",
    unread: false,
    accent: "#D8C4A8",
  },
  {
    name: "Baseino kasimas kieme",
    avatar: "B",
    time: "Prieš 18 val.",
    status: "Vykdoma",
    preview: "Jūs: Kokia kaina?",
    unread: false,
    accent: "#D8C4A8",
  },
  {
    name: "Anne Castillo",
    avatar: "A",
    time: "Prieš 2 d.",
    status: "Tiesioginė",
    preview: "Jūs: Kokia kaina?",
    unread: false,
    accent: "#D8C4A8",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
  },
];

const ownMessages = [
  ["Galite paskambinti?", "18:27"],
  ["Kokia kaina?", "18:27"],
  ["Galite paskambinti?", "18:28"],
  ["Ačiū!", "18:28"],
  ["Kada atvyksite?", "18:28"],
  ["Galite paskambinti?", "18:31 · Matyta"],
];

const otherMessages = [
  ["Kokia kaina?", "18:31"],
  ["Kokia kaina?", "18:31"],
  ["Gailte paskambinti?", "18:32"],
];

const quickReplies = ["Kada atvyksite?", "Kokia kaina?", "Ačiū!", "Galite paskambinti?"];

function StatusPill({ label }: { label: string }) {
  const dot =
    label === "Vykdoma" ? "bg-amber-500" : label === "Atidaryta" ? "bg-[#A36545]" : "bg-[#B99170]";
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EFE7DB] px-2 py-0.5 text-[10px] font-medium leading-4 text-[#6F6258]">
      {label !== "Tiesioginė" && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}

function Avatar({
  label,
  image,
  active,
  accent = "#D38331",
}: {
  label: string;
  image?: string;
  active?: boolean;
  accent?: string;
}) {
  return (
    <div className="relative h-11 w-11 shrink-0">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full rounded-full object-cover ring-1 ring-[#D7C7B6]" />
      ) : (
        <div
          className="grid h-full w-full place-items-center rounded-full text-body font-semibold text-white ring-1 ring-[#D7C7B6]"
          style={{ backgroundColor: accent }}
        >
          {label}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FFFDF8] ${
          active ? "bg-emerald-500" : "bg-[#B99170]"
        }`}
      />
    </div>
  );
}

export default function ChatPreviewPage() {
  return (
    <main className="min-h-screen bg-[#EFECE5] p-4 text-[#1E1B18] md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <p className="text-micro font-semibold uppercase tracking-wide text-[#8A796B]">
            Chat UI Preview
          </p>
          <h1 className="mt-1 text-heading-2 font-semibold">Warm Premium Messaging Direction</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-[#6F6258]">
            Izoliuotas dizaino preview. Čia galima vertinti spalvas, hierarchiją ir proporcijas prieš
            perkeliant kryptį į realų chat komponentą.
          </p>
        </div>

        <div className="mb-3 inline-flex rounded-full border border-[#D7C7B6] bg-[#FFFDF8] px-3 py-1 text-caption font-semibold text-[#6F6258]">
          Variant A · warm brown
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#DDD3C5] bg-[#FFFDF8] shadow-[0_18px_48px_rgba(93,70,54,0.12)]">
          <div className="grid h-[780px] min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-[#DDD3C5] bg-[#FFFDF8]">
              <div className="flex min-h-[70px] items-center justify-between border-b border-[#DDD3C5] px-5">
                <div>
                  <p className="text-body font-semibold">Visos žinutės</p>
                  <p className="text-caption text-[#6F6258]">← Valdymo panelė</p>
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-full border border-[#D7C7B6] bg-[#FFFDF8] text-[#6F6258]">
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(100%-70px)] overflow-y-auto p-3">
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <article
                      key={conversation.name}
                      className={`p-3 transition ${
                        conversation.active
                          ? "rounded-xl border border-[#9F7B66] bg-[#F1E7DA] shadow-[0_8px_18px_rgba(93,70,54,0.10)]"
                          : "border-b border-[#DDD3C5] hover:bg-[#F7F1E8]"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          label={conversation.avatar}
                          image={conversation.image}
                          active={conversation.active || conversation.unread}
                          accent={conversation.accent}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 truncate text-body-sm font-semibold">
                              {conversation.name}
                            </p>
                            <time className="shrink-0 text-[11px] font-medium text-[#6F6258]">
                              {conversation.time}
                            </time>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {conversation.unread && <span className="h-2 w-2 rounded-full bg-[#A7826D]" />}
                            <StatusPill label={conversation.status} />
                          </div>
                          <p
                            className={`mt-2 truncate text-body-sm ${
                              conversation.unread ? "font-semibold text-[#1E1B18]" : "text-[#4E463F]"
                            }`}
                          >
                            {conversation.preview}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-[#FFFDF8]">
              <header className="flex min-h-[70px] items-center justify-between border-b border-[#DDD3C5] px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar label="A" active accent="#D38331" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#A7826D]" />
                      <p className="truncate text-body font-semibold">Driverio pamokos</p>
                      <StatusPill label="Tiesioginė" />
                    </div>
                    <p className="mt-0.5 text-caption text-[#6F6258]">Prisijungęs neseniai</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#D7C7B6] bg-[#FFFDF8] text-[#6F6258]">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#D7C7B6] bg-[#FFFDF8] text-[#6F6258]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-[#E4D8C9] px-5 py-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-[#DED2C1] bg-[#FFFDF8] px-4 py-3 shadow-[0_8px_24px_rgba(93,70,54,0.08)]">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold">Užsakymas: Tiesioginė užklausa</p>
                    <p className="mt-1 text-caption font-medium text-[#6F6258]">
                      Statusas: Tiesioginė užklausa
                    </p>
                  </div>
                  <button className="min-h-10 rounded-lg border border-[#D7C7B6] bg-[#EFE4D5] px-4 text-body-sm font-semibold text-[#3B2D24] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                    Peržiūrėti
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <button className="mx-auto mb-6 flex min-h-9 items-center gap-2 rounded-full border border-[#D9C9B8] bg-[#FFFDF8] px-4 text-caption font-semibold text-[#6F5646] shadow-[0_4px_14px_rgba(93,70,54,0.08)]">
                  Įkelti ankstesnes
                </button>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[70%] space-y-2">
                      {ownMessages.map(([text, time]) => (
                        <div key={`${text}-${time}`} className="flex flex-col items-end gap-1">
                          <div className="rounded-2xl rounded-tr-md border border-[#8A6653] bg-[#8A6653] px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_1px_2px_rgba(93,70,54,0.16)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#6F6258]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-2.5">
                    <Avatar label="A" active accent="#D38331" />
                    <div className="max-w-[70%] space-y-2">
                      {otherMessages.map(([text, time]) => (
                        <div key={`${text}-${time}`} className="flex flex-col items-start gap-1">
                          <div className="rounded-2xl rounded-tl-md border border-[#E5D9C8] bg-[#F1ECE4] px-5 py-3 text-[15px] leading-relaxed text-[#111827] shadow-[0_1px_2px_rgba(93,70,54,0.08)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#6F6258]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="p-5">
                <div className="rounded-2xl border border-[#E1D4C4] bg-[#EFE4D5] p-3 shadow-[0_16px_34px_rgba(93,70,54,0.12)]">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto">
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#8A796B]">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        className="min-h-9 shrink-0 rounded-xl border border-[#D7C7B6] bg-[#F8F2EA] px-4 py-2 text-sm font-medium text-[#3B2D24]"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 gap-1 text-[#8A796B]">
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-[52px] rounded-2xl border border-[#D7C7B6] bg-[#FFFDF8] py-3 pl-[5.5rem] pr-14 text-body-sm text-[#8A796B] shadow-[inset_0_1px_2px_rgba(93,70,54,0.05)]">
                      Rašyti žinutę...
                    </div>
                    <button className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-[#E6D9C7] text-[#7B5D49]">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </footer>
            </section>
          </div>
        </section>

        <section className="mt-5 grid gap-3 text-body-sm text-[#4E463F] md:grid-cols-3">
          <div className="rounded-xl border border-[#DDD3C5] bg-[#FFFDF8] p-4">
            <p className="font-semibold">Svarbiausia idėja</p>
            <p className="mt-1 text-[#6F6258]">Šilta estetika, bet ne viskas vienodai ruda.</p>
          </div>
          <div className="rounded-xl border border-[#DDD3C5] bg-[#FFFDF8] p-4">
            <p className="font-semibold">Hierarchija</p>
            <p className="mt-1 text-[#6F6258]">Active row, CTA ir own bubbles turi aiškius prioritetus.</p>
          </div>
          <div className="rounded-xl border border-[#DDD3C5] bg-[#FFFDF8] p-4">
            <p className="font-semibold">Ką vertinti</p>
            <p className="mt-1 text-[#6F6258]">Ar spalvos atrodo premium, ar per šiltos / per monotoniškos.</p>
          </div>
        </section>

        <div className="mb-3 mt-10 inline-flex rounded-full border border-[#D9D3CB] bg-[#FAF9F6] px-3 py-1 text-caption font-semibold text-[#60646C]">
          Variant B · soft stone / clay, less brown
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#D9D3CB] bg-[#FAF9F6] shadow-[0_18px_48px_rgba(48,55,68,0.08)]">
          <div className="grid h-[780px] min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-[#D9D3CB] bg-[#FCFBF8]">
              <div className="flex min-h-[70px] items-center justify-between border-b border-[#D9D3CB] px-5">
                <div>
                  <p className="text-body font-semibold text-[#20242B]">Visos žinutės</p>
                  <p className="text-caption text-[#6B7078]">← Valdymo panelė</p>
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-full border border-[#D9D3CB] bg-white text-[#6B7078]">
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(100%-70px)] overflow-y-auto p-3">
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <article
                      key={`b-${conversation.name}`}
                      className={`p-3 transition ${
                        conversation.active
                          ? "rounded-xl border border-[#C7AAA0] bg-[#F3ECE7] shadow-[0_8px_18px_rgba(48,55,68,0.07)]"
                          : "border-b border-[#E4DFD8] hover:bg-[#F5F2ED]"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          label={conversation.avatar}
                          image={conversation.image}
                          active={conversation.active || conversation.unread}
                          accent={conversation.active ? "#C98F65" : "#CFC5B9"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-[#20242B]">
                              {conversation.name}
                            </p>
                            <time className="shrink-0 text-[11px] font-medium text-[#6B7078]">
                              {conversation.time}
                            </time>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {conversation.unread && <span className="h-2 w-2 rounded-full bg-[#C98F65]" />}
                            <span className="inline-flex shrink-0 items-center rounded-full bg-[#ECE7DF] px-2 py-0.5 text-[10px] font-medium leading-4 text-[#60646C]">
                              {conversation.status}
                            </span>
                          </div>
                          <p
                            className={`mt-2 truncate text-body-sm ${
                              conversation.unread ? "font-semibold text-[#20242B]" : "text-[#555B64]"
                            }`}
                          >
                            {conversation.preview}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-[#FDFCF9]">
              <header className="flex min-h-[70px] items-center justify-between border-b border-[#D9D3CB] px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar label="A" active accent="#C98F65" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#C98F65]" />
                      <p className="truncate text-body font-semibold text-[#20242B]">Driverio pamokos</p>
                      <span className="rounded-full bg-[#ECE7DF] px-2 py-0.5 text-micro font-medium text-[#60646C]">
                        Tiesioginė
                      </span>
                    </div>
                    <p className="mt-0.5 text-caption text-[#6B7078]">Prisijungęs neseniai</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#D9D3CB] bg-white text-[#6B7078]">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#D9D3CB] bg-white text-[#6B7078]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-[#E4DFD8] px-5 py-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-[#DED8CF] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(48,55,68,0.06)]">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-[#20242B]">
                      Užsakymas: Tiesioginė užklausa
                    </p>
                    <p className="mt-1 text-caption font-medium text-[#6B7078]">
                      Statusas: Tiesioginė užklausa
                    </p>
                  </div>
                  <button className="min-h-10 rounded-lg border border-[#D4CEC6] bg-[#F0ECE6] px-4 text-body-sm font-semibold text-[#30343B] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    Peržiūrėti
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <button className="mx-auto mb-6 flex min-h-9 items-center gap-2 rounded-full border border-[#D9D3CB] bg-white px-4 text-caption font-semibold text-[#60646C] shadow-[0_4px_14px_rgba(48,55,68,0.06)]">
                  Įkelti ankstesnes
                </button>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[70%] space-y-2">
                      {ownMessages.map(([text, time]) => (
                        <div key={`b-own-${text}-${time}`} className="flex flex-col items-end gap-1">
                          <div className="rounded-2xl rounded-tr-md border border-[#9C8D92] bg-[#95868D] px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_1px_2px_rgba(48,55,68,0.12)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#6B7078]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-2.5">
                    <Avatar label="A" active accent="#C98F65" />
                    <div className="max-w-[70%] space-y-2">
                      {otherMessages.map(([text, time]) => (
                        <div key={`b-other-${text}-${time}`} className="flex flex-col items-start gap-1">
                          <div className="rounded-2xl rounded-tl-md border border-[#E4DFD8] bg-[#F1EFEC] px-5 py-3 text-[15px] leading-relaxed text-[#20242B] shadow-[0_1px_2px_rgba(48,55,68,0.06)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#6B7078]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="p-5">
                <div className="rounded-2xl border border-[#DED8CF] bg-[#F2EEE8] p-3 shadow-[0_16px_34px_rgba(48,55,68,0.08)]">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto">
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#6B7078]">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {quickReplies.map((reply) => (
                      <button
                        key={`b-${reply}`}
                        className="min-h-9 shrink-0 rounded-xl border border-[#D9D3CB] bg-white px-4 py-2 text-sm font-medium text-[#30343B]"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 gap-1 text-[#6B7078]">
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-[52px] rounded-2xl border border-[#D9D3CB] bg-white py-3 pl-[5.5rem] pr-14 text-body-sm text-[#7B8088] shadow-[inset_0_1px_2px_rgba(48,55,68,0.04)]">
                      Rašyti žinutę...
                    </div>
                    <button className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-[#E5DED6] text-[#60646C]">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </footer>
            </section>
          </div>
        </section>

        <div className="mb-3 mt-10 inline-flex rounded-full border border-[#BFDAD8] bg-[#F3FBFA] px-3 py-1 text-caption font-semibold text-[#17615E]">
          Variant C · bold teal / clean SaaS
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#BFDAD8] bg-[#F8FCFC] shadow-[0_20px_54px_rgba(10,68,75,0.12)]">
          <div className="grid h-[780px] min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-[#D8E7E6] bg-[#FBFEFE]">
              <div className="flex min-h-[70px] items-center justify-between border-b border-[#D8E7E6] px-5">
                <div>
                  <p className="text-body font-semibold text-[#0F172A]">Visos žinutės</p>
                  <p className="text-caption text-[#64748B]">← Valdymo panelė</p>
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-full border border-[#C9DDDC] bg-white text-[#17615E] shadow-sm">
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(100%-70px)] overflow-y-auto p-3">
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <article
                      key={`c-${conversation.name}`}
                      className={`p-3 transition ${
                        conversation.active
                          ? "rounded-xl border border-[#67B7B0] bg-[#E8F7F5] shadow-[0_10px_22px_rgba(10,68,75,0.10)]"
                          : "border-b border-[#E3EEEE] hover:bg-[#F0FAF9]"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          label={conversation.avatar}
                          image={conversation.image}
                          active={conversation.active || conversation.unread}
                          accent={conversation.active ? "#0F766E" : "#8FB4B1"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-[#0F172A]">
                              {conversation.name}
                            </p>
                            <time className="shrink-0 text-[11px] font-medium text-[#64748B]">
                              {conversation.time}
                            </time>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {conversation.unread && <span className="h-2 w-2 rounded-full bg-[#0F766E]" />}
                            <span className="inline-flex shrink-0 items-center rounded-full bg-[#DFF4F2] px-2 py-0.5 text-[10px] font-medium leading-4 text-[#17615E]">
                              {conversation.status}
                            </span>
                          </div>
                          <p
                            className={`mt-2 truncate text-body-sm ${
                              conversation.unread ? "font-semibold text-[#0F172A]" : "text-[#475569]"
                            }`}
                          >
                            {conversation.preview}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-[#F8FCFC]">
              <header className="flex min-h-[70px] items-center justify-between border-b border-[#D8E7E6] px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar label="A" active accent="#0F766E" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#14B8A6]" />
                      <p className="truncate text-body font-semibold text-[#0F172A]">Driverio pamokos</p>
                      <span className="rounded-full bg-[#DFF4F2] px-2 py-0.5 text-micro font-medium text-[#17615E]">
                        Tiesioginė
                      </span>
                    </div>
                    <p className="mt-0.5 text-caption text-[#64748B]">Prisijungęs neseniai</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#C9DDDC] bg-white text-[#17615E] shadow-sm">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#C9DDDC] bg-white text-[#17615E] shadow-sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-[#E3EEEE] px-5 py-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-[#CFE4E2] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(10,68,75,0.07)]">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-[#0F172A]">
                      Užsakymas: Tiesioginė užklausa
                    </p>
                    <p className="mt-1 text-caption font-medium text-[#64748B]">
                      Statusas: Tiesioginė užklausa
                    </p>
                  </div>
                  <button className="min-h-10 rounded-lg bg-[#0F766E] px-4 text-body-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,118,110,0.24)]">
                    Peržiūrėti
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <button className="mx-auto mb-6 flex min-h-9 items-center gap-2 rounded-full border border-[#C9DDDC] bg-white px-4 text-caption font-semibold text-[#17615E] shadow-[0_4px_14px_rgba(10,68,75,0.07)]">
                  Įkelti ankstesnes
                </button>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[70%] space-y-2">
                      {ownMessages.map(([text, time]) => (
                        <div key={`c-own-${text}-${time}`} className="flex flex-col items-end gap-1">
                          <div className="rounded-2xl rounded-tr-md border border-[#0B5F59] bg-[#0F766E] px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_2px_4px_rgba(10,68,75,0.18)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#64748B]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-2.5">
                    <Avatar label="A" active accent="#0F766E" />
                    <div className="max-w-[70%] space-y-2">
                      {otherMessages.map(([text, time]) => (
                        <div key={`c-other-${text}-${time}`} className="flex flex-col items-start gap-1">
                          <div className="rounded-2xl rounded-tl-md border border-[#D8E7E6] bg-white px-5 py-3 text-[15px] leading-relaxed text-[#0F172A] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#64748B]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="p-5">
                <div className="rounded-2xl border border-[#CFE4E2] bg-[#EAF7F6] p-3 shadow-[0_18px_38px_rgba(10,68,75,0.10)]">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto">
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#17615E]">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {quickReplies.map((reply) => (
                      <button
                        key={`c-${reply}`}
                        className="min-h-9 shrink-0 rounded-xl border border-[#C9DDDC] bg-white px-4 py-2 text-sm font-medium text-[#0F172A]"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 gap-1 text-[#17615E]">
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-[52px] rounded-2xl border border-[#C9DDDC] bg-white py-3 pl-[5.5rem] pr-14 text-body-sm text-[#64748B] shadow-[inset_0_1px_2px_rgba(10,68,75,0.04)]">
                      Rašyti žinutę...
                    </div>
                    <button className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-[#0F766E] text-white shadow-[0_8px_16px_rgba(15,118,110,0.22)]">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </footer>
            </section>
          </div>
        </section>

        <div className="mb-3 mt-10 inline-flex rounded-full border border-[#D3D8E0] bg-[#F8FAFC] px-3 py-1 text-caption font-semibold text-[#475569]">
          Variant D · clean metallic
        </div>

        <section className="overflow-hidden rounded-2xl border border-[#D3D8E0] bg-[#F8FAFC] shadow-[0_22px_60px_rgba(15,23,42,0.10)]">
          <div className="grid h-[780px] min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-[#D8DEE7] bg-[#FBFCFE]">
              <div className="flex min-h-[70px] items-center justify-between border-b border-[#D8DEE7] bg-gradient-to-b from-white to-[#F7F9FC] px-5">
                <div>
                  <p className="text-body font-semibold text-[#111827]">Visos žinutės</p>
                  <p className="text-caption text-[#64748B]">← Valdymo panelė</p>
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-full border border-[#D5DAE3] bg-gradient-to-b from-white to-[#EFF3F8] text-[#475569] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)]">
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(100%-70px)] overflow-y-auto p-3">
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <article
                      key={`d-${conversation.name}`}
                      className={`p-3 transition ${
                        conversation.active
                          ? "rounded-xl border border-[#AEB7C4] bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F7] shadow-[0_10px_24px_rgba(15,23,42,0.09)]"
                          : "border-b border-[#E1E6EE] hover:bg-[#F5F7FA]"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <Avatar
                          label={conversation.avatar}
                          image={conversation.image}
                          active={conversation.active || conversation.unread}
                          accent={conversation.active ? "#64748B" : "#A8B0BC"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-[#111827]">
                              {conversation.name}
                            </p>
                            <time className="shrink-0 text-[11px] font-medium text-[#64748B]">
                              {conversation.time}
                            </time>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {conversation.unread && <span className="h-2 w-2 rounded-full bg-[#64748B]" />}
                            <span className="inline-flex shrink-0 items-center rounded-full border border-[#D8DEE7] bg-[#F2F5F9] px-2 py-0.5 text-[10px] font-medium leading-4 text-[#475569]">
                              {conversation.status}
                            </span>
                          </div>
                          <p
                            className={`mt-2 truncate text-body-sm ${
                              conversation.unread ? "font-semibold text-[#111827]" : "text-[#475569]"
                            }`}
                          >
                            {conversation.preview}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-col bg-[#F8FAFC]">
              <header className="flex min-h-[70px] items-center justify-between border-b border-[#D8DEE7] bg-gradient-to-b from-white to-[#F7F9FC] px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar label="A" active accent="#64748B" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />
                      <p className="truncate text-body font-semibold text-[#111827]">Driverio pamokos</p>
                      <span className="rounded-full border border-[#D8DEE7] bg-[#F2F5F9] px-2 py-0.5 text-micro font-medium text-[#475569]">
                        Tiesioginė
                      </span>
                    </div>
                    <p className="mt-0.5 text-caption text-[#64748B]">Prisijungęs neseniai</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#D5DAE3] bg-gradient-to-b from-white to-[#EFF3F8] text-[#475569] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)]">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="grid h-10 w-10 place-items-center rounded-xl border border-[#D5DAE3] bg-gradient-to-b from-white to-[#EFF3F8] text-[#475569] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(15,23,42,0.06)]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-[#E1E6EE] px-5 py-4">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-[#D8DEE7] bg-gradient-to-b from-white to-[#F5F7FA] px-4 py-3 shadow-[0_10px_28px_rgba(15,23,42,0.07)]">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-[#111827]">
                      Užsakymas: Tiesioginė užklausa
                    </p>
                    <p className="mt-1 text-caption font-medium text-[#64748B]">
                      Statusas: Tiesioginė užklausa
                    </p>
                  </div>
                  <button className="min-h-10 rounded-lg border border-[#AEB7C4] bg-gradient-to-b from-[#FDFEFF] to-[#E6EBF2] px-4 text-body-sm font-semibold text-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_18px_rgba(15,23,42,0.08)]">
                    Peržiūrėti
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <button className="mx-auto mb-6 flex min-h-9 items-center gap-2 rounded-full border border-[#D5DAE3] bg-gradient-to-b from-white to-[#F2F5F9] px-4 text-caption font-semibold text-[#475569] shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                  Įkelti ankstesnes
                </button>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[70%] space-y-2">
                      {ownMessages.map(([text, time]) => (
                        <div key={`d-own-${text}-${time}`} className="flex flex-col items-end gap-1">
                          <div className="rounded-2xl rounded-tr-md border border-[#334155] bg-gradient-to-b from-[#475569] to-[#334155] px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_2px_4px_rgba(15,23,42,0.20)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#64748B]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-2.5">
                    <Avatar label="A" active accent="#64748B" />
                    <div className="max-w-[70%] space-y-2">
                      {otherMessages.map(([text, time]) => (
                        <div key={`d-other-${text}-${time}`} className="flex flex-col items-start gap-1">
                          <div className="rounded-2xl rounded-tl-md border border-[#D8DEE7] bg-gradient-to-b from-white to-[#F3F6FA] px-5 py-3 text-[15px] leading-relaxed text-[#111827] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#64748B]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="p-5">
                <div className="rounded-2xl border border-[#D3D8E0] bg-gradient-to-b from-[#FDFEFF] to-[#E8EDF4] p-3 shadow-[0_18px_38px_rgba(15,23,42,0.10)]">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto">
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#475569]">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {quickReplies.map((reply) => (
                      <button
                        key={`d-${reply}`}
                        className="min-h-9 shrink-0 rounded-xl border border-[#D5DAE3] bg-gradient-to-b from-white to-[#F3F6FA] px-4 py-2 text-sm font-medium text-[#111827] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 gap-1 text-[#475569]">
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button className="grid h-9 w-9 place-items-center rounded-xl">
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-[52px] rounded-2xl border border-[#D5DAE3] bg-white py-3 pl-[5.5rem] pr-14 text-body-sm text-[#64748B] shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)]">
                      Rašyti žinutę...
                    </div>
                    <button className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl border border-[#AEB7C4] bg-gradient-to-b from-[#FDFEFF] to-[#DDE3EC] text-[#334155] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_8px_16px_rgba(15,23,42,0.10)]">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </footer>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
