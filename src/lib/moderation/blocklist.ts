import { normalize } from "./normalize";

/**
 * Sąmoningai mažas, aukšto tikslumo keiksmų / įžeidimų ŠAKNŲ sąrašas
 * (lietuviški + rusiški + angliški). Įtraukiamos tik nedviprasmiškos šaknys —
 * tokios, kurių nepradeda joks įprastas lietuviškas žodis (kitaip atsirastų
 * klaidingų pažymėjimų). Kontekstinius ir ribinius atvejus gaudo AI sluoksnis.
 *
 * Atitikmuo ieškomas su žodžio riba ir bet kokia galūne (\b<šaknis>[a-z0-9]*\b),
 * todėl viena šaknis padengia visą lietuvišką linksniavimą.
 */
const RAW_STEMS: string[] = [
  // lietuviški / slaviški vulgarizmai
  "kurv",
  "pizd",
  "isgam",
  "padl",
  // įžeidimai
  "debil",
  "idiot",
  "kretin",
  "imbecil",
  // rusiški
  "blyat",
  "bliad",
  "blet",
  "nahui",
  "nahuj",
  "nahuy",
  "naxui",
  "naxuj",
  "naxuy",
  "xuj",
  "xui",
  "pidor",
  "pider",
  "mudak",
  "gandon",
  "gondon",
  "huyn",
  "jebal",
  "jebat",
  "eban",
  // angliški
  "fuck",
  "shit",
  "bitch",
  "cunt",
  "asshole",
  "faggot",
  "nigger",
  "nigga",
  "retard",
  "whore",
  "slut",
  "dickhead",
];

const PATTERNS: ReadonlyArray<{ stem: string; re: RegExp }> = RAW_STEMS.map((raw) => {
  const stem = normalize(raw);
  return { stem, re: new RegExp(`\\b${stem}[a-z0-9]*\\b`) };
});

/**
 * Grąžina šaknis, kurios pataikė į (jau normalizuotą) tekstą.
 * Tuščias masyvas = blocklist švarus.
 */
export function checkBlocklist(normalizedText: string): string[] {
  const hits: string[] = [];
  for (const { stem, re } of PATTERNS) {
    if (re.test(normalizedText)) hits.push(stem);
  }
  return hits;
}
