/**
 * Deterministic category-page content builder.
 *
 * Both `generateMetadata` (to measure wordCount for the index gate) and the
 * page render call this with the SAME inputs derived from the same cached data,
 * so the wordCount the gate sees is exactly the content the page ships. This is
 * what lets a category page flip from noindex → index by construction: the gate
 * cannot pass unless the real on-page prose clears the threshold.
 *
 * The prose is templated but genuinely differentiated — it weaves in the
 * category name, real provider count, served cities, subcategories and a few
 * top provider names, so two categories never produce the same text.
 */

export interface CategoryContentInput {
  categoryName: string;
  /** Single city when this is a category×city page, else null. */
  city: string | null;
  providerCount: number;
  /** Names of child/related services under this category (may be empty). */
  subcategoryNames: string[];
  /** A handful of provider display names actually listed (may be empty). */
  topProviderNames: string[];
  /** Distinct cities these providers serve (for the base, non-city page). */
  cities: string[];
}

export interface CategoryContent {
  /** The single on-page H1. */
  heading: string;
  /** Ordered prose blocks rendered as <p> elements. */
  paragraphs: string[];
  /** Total word count across all paragraphs — the gate input. */
  wordCount: number;
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Joins a list into Lithuanian prose: "a, b ir c". */
function joinLt(items: string[]): string {
  const clean = items.filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} ir ${clean[clean.length - 1]}`;
}

function pluralProviders(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "tiekėjas";
  if (n % 10 === 0 || (n % 100 >= 11 && n % 100 <= 19)) return "tiekėjų";
  return "tiekėjai";
}

export function buildCategoryContent(input: CategoryContentInput): CategoryContent {
  const { categoryName, city, providerCount, subcategoryNames, topProviderNames, cities } = input;
  const cat = categoryName;
  const catLower = lower(cat);
  const where = city ? ` ${city}e` : " Lietuvoje";

  const paragraphs: string[] = [];

  // 1) Intro — what this page is, with the real inventory figure.
  paragraphs.push(
    `Ieškote ${catLower} specialisto${where}? Platformoje paslaugurinka.lt rasite ${providerCount} ${pluralProviders(providerCount)}, ` +
      `kurie teikia ${catLower} paslaugas${where}. Kiekvienas tiekėjas turi viešą profilį su darbų pavyzdžiais, klientų atsiliepimais, ` +
      `kainų orientyrais ir kontaktais — galite palyginti kelis variantus ir susisiekti tiesiogiai, be tarpininkų ir paslėptų mokesčių. ` +
      `Visa informacija matoma iš karto, todėl sprendimą priimsite greičiau ir užtikrinčiau.`,
  );

  // 2) How to choose — trust signals specific to the marketplace.
  paragraphs.push(
    `Rinkdamiesi, kas atliks ${catLower} darbus, atkreipkite dėmesį į tiekėjo įvertinimą, atsiliepimų skaičių ir atsakymo greitį. ` +
      `Patikrinti profiliai pažymėti atskirai, o realių klientų atsiliepimai padeda įvertinti darbo kokybę ir patikimumą prieš susitariant. ` +
      `Rekomenduojame trumpai aprašyti, ko reikia, ir paprašyti kelių tiekėjų įvertinimo — taip pamatysite kainų ribas ir pasirinksite geriausią pasiūlymą. ` +
      `Daugumą ${catLower} užsakymų${where} galima suderinti tą pačią ar kitą dieną.`,
  );

  // 3) Pricing & process — genuinely useful guidance, always present.
  paragraphs.push(
    `${cat} kaina priklauso nuo darbo apimties, medžiagų ir skubumo, todėl tikslią sumą verta derėtis su konkrečiu tiekėju. ` +
      `Profilyje nurodyti kainų orientyrai padeda susidaryti pradinį vaizdą, o galutinį pasiūlymą gausite aptarę detales. ` +
      `Procesas paprastas: peržiūrite profilius, parašote pasirinktam meistrui arba paskelbiate užklausą, gaunate pasiūlymus ir pasirenkate jums tinkamiausią — visa tai platformoje nemokama. ` +
      `Prieš pradedant darbą rekomenduojame aiškiai susitarti dėl apimties, terminų ir kainos, o po darbų — palikti atsiliepimą, kuris padės kitiems klientams rinktis.`,
  );

  // 4) Related services / subcategories — differentiating, only when present.
  if (subcategoryNames.length > 0) {
    paragraphs.push(
      `Kategorija „${cat}" apima įvairias paslaugas: ${joinLt(subcategoryNames.slice(0, 8))}. ` +
        `Nesvarbu, ar reikia nedidelio remonto, ar didesnio projekto — tinkamą ${catLower} meistrą rasite pagal savo poreikį ir biudžetą. ` +
        `Daugelis specialistų atlieka kelias susijusias paslaugas, todėl vienas tiekėjas dažnai gali pasirūpinti visu darbu.`,
    );
  }

  // 5) Coverage — named providers and/or served cities make the text concrete.
  const coverageBits: string[] = [];
  if (topProviderNames.length > 0) {
    coverageBits.push(
      `Tarp ${catLower} tiekėjų${where} — ${joinLt(topProviderNames.slice(0, 5))}.`,
    );
  }
  if (!city && cities.length > 0) {
    coverageBits.push(
      `${cat} specialistų rasite visoje Lietuvoje, įskaitant tokius miestus kaip ${joinLt(cities.slice(0, 6))}.`,
    );
  }
  coverageBits.push(
    `Jei tinkamo specialisto nerandate arba norite gauti kelis pasiūlymus iš karto, paskelbkite nemokamą užklausą — ` +
      `${catLower} tiekėjai patys susisieks ir pateiks savo pasiūlymus, o jūs ramiai palyginsite kainas bei sąlygas.`,
  );
  paragraphs.push(coverageBits.join(" "));

  const wordCount = paragraphs.reduce(
    (sum, p) => sum + p.split(/\s+/).filter(Boolean).length,
    0,
  );

  const heading = city
    ? `${cat} ${city}e`
    : `${cat} — meistrai ir paslaugų teikėjai`;

  return { heading, paragraphs, wordCount };
}
