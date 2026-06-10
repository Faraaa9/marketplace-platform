import Image from "next/image";
import {
  ArrowRight,
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
    accent: "#73804B",
  },
  {
    name: "Ramūnas Bruožis",
    avatar: "R",
    time: "Prieš 8 val.",
    status: "Tiesioginė",
    preview: "Jūs: Kada atvyksite?",
    unread: true,
    accent: "#A65336",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80",
  },
  {
    name: "Justas",
    avatar: "J",
    time: "Prieš 6 val.",
    status: "Užsakyta",
    preview: "Jūs: Galite paskambinti?",
    unread: false,
    accent: "#B48645",
  },
  {
    name: "Balkono remontas su pakėlimu",
    avatar: "B",
    time: "Prieš 7 val.",
    status: "Atidaryta",
    preview: "Jūs: Ačiū!",
    unread: false,
    accent: "#B48645",
  },
  {
    name: "Baseino kasimas kieme",
    avatar: "B",
    time: "Prieš 18 val.",
    status: "Vykdoma",
    preview: "Jūs: Kokia kaina?",
    unread: false,
    accent: "#73804B",
  },
  {
    name: "Anne Castillo",
    avatar: "A",
    time: "Prieš 2 d.",
    status: "Tiesioginė",
    preview: "Jūs: Kokia kaina?",
    unread: false,
    accent: "#B48645",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80",
  },
];

const ownMessages = [
  ["Galite paskambinti?", "18:27"],
  ["Kokia kaina?", "18:27"],
  ["Galite paskambinti?", "18:28"],
  ["Ačiū!", "18:28"],
];

const otherMessages = [
  ["Kokia kaina?", "18:31"],
  ["Kokia kaina?", "18:31"],
  ["Galite paskambinti?", "18:32"],
];

const quickReplies = ["Kada atvyksite?", "Kokia kaina?", "Ačiū!", "Galite paskambinti?"];

function StatusPill({ label }: { label: string }) {
  const dot =
    label === "Vykdoma" ? "bg-[#73804B]" : label === "Atidaryta" ? "bg-[#A65336]" : "bg-[#B48645]";

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#DED1AD] bg-[#F1E7CE] px-2 py-0.5 text-[10px] font-medium leading-4 text-[#625A4B]">
      {label !== "Tiesioginė" && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}

function Avatar({
  label,
  image,
  active,
  accent = "#73804B",
}: {
  label: string;
  image?: string;
  active?: boolean;
  accent?: string;
}) {
  return (
    <div className="relative h-11 w-11 shrink-0">
      {image ? (
        <Image
          src={image}
          alt=""
          width={44}
          height={44}
          sizes="44px"
          className="h-full w-full rounded-full object-cover ring-1 ring-[#D6C9A9]"
        />
      ) : (
        <div
          className="grid h-full w-full place-items-center rounded-full text-body font-semibold text-white ring-1 ring-[#D6C9A9]"
          style={{ backgroundColor: accent }}
        >
          {label}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FBFAF6] ${
          active ? "bg-[#73804B]" : "bg-[#BDAF91]"
        }`}
      />
    </div>
  );
}

function SerratedEdge({ position }: { position: "top" | "bottom" }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute left-0 h-3 w-full bg-[linear-gradient(135deg,transparent_33%,#FBFAF6_34%_66%,transparent_67%),linear-gradient(225deg,transparent_33%,#FBFAF6_34%_66%,transparent_67%)] bg-[length:18px_12px] ${
        position === "top" ? "-top-3 rotate-180" : "-bottom-3"
      }`}
    />
  );
}

export default function ChatPreviewPage() {
  return (
    <main className="min-h-screen bg-[#ECE9E2] bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:56px_56px] p-4 text-[#24211D] md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5">
          <p className="text-micro font-semibold uppercase tracking-wide text-[#786F5D]">Chat UI Preview</p>
          <h1 className="mt-1 text-heading-2 font-semibold">Ticket Paper Messaging Direction</h1>
          <p className="mt-2 max-w-2xl text-body-sm text-[#625A4B]">
            Izoliuotas dizaino preview pagal screenshot paletę: kreminis popierius, ramūs auksiniai
            separatoriai, alyvuogių ir vario akcentai.
          </p>
        </div>

        <section className="relative overflow-visible border border-[#D8D1BF] bg-[#FBFAF6] shadow-[0_18px_42px_rgba(72,65,52,0.16)]">
          <SerratedEdge position="top" />
          <div className="grid h-[780px] min-h-[620px] lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="min-h-0 border-r border-[#D8D1BF] bg-[#F7F4ED]">
              <div className="flex min-h-[72px] items-center justify-between border-b border-[#D8C79A] px-5">
                <div>
                  <p className="text-body font-semibold">Visos žinutės</p>
                  <p className="text-caption text-[#6C6558]">← Valdymo panelė</p>
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-md border border-[#D8C79A] bg-[#FBFAF6] text-[#6C6558] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <Search className="h-5 w-5" />
                </button>
              </div>

              <div className="h-[calc(100%-72px)] overflow-y-auto p-3">
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <article
                      key={conversation.name}
                      className={`p-3 transition ${
                        conversation.active
                          ? "border border-[#C7B77E] bg-[#EFE5CC] shadow-[0_8px_18px_rgba(72,65,52,0.10)]"
                          : "border-b border-[#DDD4BF] hover:bg-[#F1EAD9]"
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
                            <time className="shrink-0 text-[11px] font-medium text-[#6C6558]">
                              {conversation.time}
                            </time>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            {conversation.unread && <span className="h-2 w-2 rounded-full bg-[#A65336]" />}
                            <StatusPill label={conversation.status} />
                          </div>
                          <p
                            className={`mt-2 truncate text-body-sm ${
                              conversation.unread ? "font-semibold text-[#24211D]" : "text-[#5A544A]"
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

            <section className="flex min-h-0 flex-col bg-[#FBFAF6]">
              <header className="flex min-h-[72px] items-center justify-between border-b border-[#D8C79A] px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar label="A" active accent="#73804B" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#73804B]" />
                      <p className="truncate text-body font-semibold">Driverio pamokos</p>
                      <StatusPill label="Tiesioginė" />
                    </div>
                    <p className="mt-0.5 text-caption text-[#6C6558]">Prisijungęs neseniai</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-11 w-11 place-items-center rounded-md border border-[#D8C79A] bg-[#FBFAF6] text-[#6C6558]">
                    <Settings className="h-4 w-4" />
                  </button>
                  <button className="grid h-11 w-11 place-items-center rounded-md border border-[#D8C79A] bg-[#FBFAF6] text-[#6C6558]">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-[#D8C79A] px-5 py-4">
                <div className="flex items-center justify-between gap-4 border border-[#D8C79A] bg-[#F7F0DF] px-4 py-3 shadow-[0_8px_18px_rgba(72,65,52,0.08)]">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold">Užsakymas: Tiesioginė užklausa</p>
                    <p className="mt-1 text-caption font-medium text-[#6C6558]">Statusas: Tiesioginė užklausa</p>
                  </div>
                  <button className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md bg-[#73804B] px-4 text-body-sm font-semibold text-white shadow-[0_3px_0_rgba(63,73,38,0.18)]">
                    Peržiūrėti
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
                <button className="mx-auto mb-6 flex min-h-11 items-center gap-2 rounded-md border border-[#D8C79A] bg-[#FBFAF6] px-4 text-caption font-semibold text-[#6C6558] shadow-[0_4px_12px_rgba(72,65,52,0.08)]">
                  Įkelti ankstesnes
                </button>

                <div className="space-y-4">
                  <div className="flex justify-end">
                    <div className="max-w-[76%] space-y-2">
                      {ownMessages.map(([text, time]) => (
                        <div key={`${text}-${time}`} className="flex flex-col items-end gap-1">
                          <div className="rounded-xl rounded-tr-sm border border-[#6A7544] bg-[#73804B] px-5 py-3 text-[15px] leading-relaxed text-white shadow-[0_2px_4px_rgba(72,65,52,0.16)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#6C6558]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-end gap-2.5">
                    <Avatar label="A" active accent="#A65336" />
                    <div className="max-w-[76%] space-y-2">
                      {otherMessages.map(([text, time]) => (
                        <div key={`${text}-${time}`} className="flex flex-col items-start gap-1">
                          <div className="rounded-xl rounded-tl-sm border border-[#DED1AD] bg-[#F1E7CE] px-5 py-3 text-[15px] leading-relaxed text-[#24211D] shadow-[0_1px_2px_rgba(72,65,52,0.08)]">
                            {text}
                          </div>
                          <time className="px-1 text-[11px] font-medium leading-none text-[#6C6558]">{time}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <footer className="border-t border-[#D8C79A] bg-[#F7F4ED] p-4 md:p-5">
                <div className="border border-[#D8C79A] bg-[#EFE5CC] p-3 shadow-[0_12px_26px_rgba(72,65,52,0.12)]">
                  <div className="mb-3 flex items-center gap-2 overflow-x-auto">
                    <button className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[#6C6558]">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        className="min-h-11 shrink-0 rounded-md border border-[#D8C79A] bg-[#FBFAF6] px-4 py-2 text-sm font-medium text-[#3E382F]"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 gap-1 text-[#6C6558]">
                      <button className="grid h-11 w-11 place-items-center rounded-md">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <button className="grid h-11 w-11 place-items-center rounded-md">
                        <Smile className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="min-h-[56px] border border-[#D8C79A] bg-[#FBFAF6] py-4 pl-[6.25rem] pr-16 text-body-sm text-[#766E60] shadow-[inset_0_1px_2px_rgba(72,65,52,0.05)]">
                      Rašyti žinutę...
                    </div>
                    <button className="absolute right-1.5 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-md bg-[#A65336] text-white shadow-[0_3px_0_rgba(111,58,38,0.22)]">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </footer>
            </section>
          </div>
          <SerratedEdge position="bottom" />
        </section>

        <section className="mt-6 grid gap-3 text-body-sm text-[#4D463B] md:grid-cols-3">
          <div className="border border-[#D8C79A] bg-[#FBFAF6] p-4">
            <p className="font-semibold">Paletė</p>
            <p className="mt-1 text-[#6C6558]">Kreminis popierius, aukso linijos, alyvuogių ir vario akcentai.</p>
          </div>
          <div className="border border-[#D8C79A] bg-[#FBFAF6] p-4">
            <p className="font-semibold">Forma</p>
            <p className="mt-1 text-[#6C6558]">Mažiau apvalių kortelių, daugiau ticket/paper jausmo kaip screenshot’e.</p>
          </div>
          <div className="border border-[#D8C79A] bg-[#FBFAF6] p-4">
            <p className="font-semibold">Sprendimas</p>
            <p className="mt-1 text-[#6C6558]">Preview izoliuotas, todėl realus chat dar nepakeistas.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
