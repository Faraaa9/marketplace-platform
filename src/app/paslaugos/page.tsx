import type { Metadata } from "next";
import Link from "next/link";
import {
  CITY_LOCATIVE,
  LANDING_CITIES,
  landingsByCity,
} from "@/lib/seo-landings";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt";

// Hub for the /paslaugos/* keyword landings. Exists primarily so every
// landing has an internal link (they were orphaned: reachable only via
// sitemap.xml, which costs crawl priority and passes no PageRank).
export const metadata: Metadata = {
  title: "Paslaugos pagal miestą – meistrai visoje Lietuvoje",
  description:
    "Raskite patikrintus meistrus pagal miestą: elektrikai, santechnikai, stogdengiai, apdailininkai Kaune, Vilniuje, Klaipėdoje. Gaukite pasiūlymus nemokamai.",
  alternates: { canonical: `${BASE_URL}/paslaugos` },
};

export default function PaslaugosHubPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
        Paslaugos pagal miestą
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-surface-500 dark:text-surface-400">
        Pasirinkite paslaugą savo mieste — aprašykite darbą ir nemokamai
        gaukite pasiūlymus iš patikrintų meistrų.
      </p>

      <div className="mt-10 space-y-10">
        {LANDING_CITIES.map((city) => {
          const landings = landingsByCity(city);
          if (landings.length === 0) return null;
          return (
            <section key={city} aria-labelledby={`city-${city}`}>
              <h2
                id={`city-${city}`}
                className="text-lg font-semibold text-surface-900 dark:text-surface-100"
              >
                {CITY_LOCATIVE[city]}
              </h2>
              <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {landings.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/paslaugos/${l.slug}`}
                      className="text-sm text-surface-500 transition-colors duration-200 hover:text-brand-500 dark:text-surface-400 dark:hover:text-brand-400"
                    >
                      {l.label} {CITY_LOCATIVE[city]}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-14 border-t border-surface-100 pt-8 dark:border-surface-800">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Neradote savo paslaugos ar miesto?{" "}
          <Link
            href="/uzklausos/nauja"
            className="font-medium text-brand-500 hover:underline dark:text-brand-400"
          >
            Pateikite užklausą
          </Link>{" "}
          — meistrai atsilieps patys.
        </p>
      </div>
    </div>
  );
}
