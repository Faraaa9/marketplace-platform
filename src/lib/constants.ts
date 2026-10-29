export const APP_NAME = "Paslaugų rinka";
// ponytail: send.* is the Resend sending subdomain and may not receive mail;
// swap in a real inbox here once the founder names one.
export const CONTACT_EMAIL = "info@send.paslaugurinka.lt";

export const BUDGET_OPTIONS = [
  { value: "iki-100", label: "Iki €100" },
  { value: "100-500", label: "€100 – €500" },
  { value: "500-1000", label: "€500 – €1,000" },
  { value: "1000-5000", label: "€1,000 – €5,000" },
  { value: "virs-5000", label: "Virš €5,000" },
  { value: "derinama", label: "Kaina derinama" },
] as const;

export const LITHUANIAN_CITIES = [
  "Vilnius",
  "Kaunas",
  "Klaipėda",
  "Šiauliai",
  "Panevėžys",
  "Alytus",
  "Marijampolė",
  "Mažeikiai",
  "Jonava",
  "Utena",
  "Kėdainiai",
  "Telšiai",
  "Tauragė",
  "Ukmergė",
  "Visaginas",
  "Plungė",
  "Kretinga",
  "Palanga",
  "Druskininkai",
  "Visa Lietuva",
] as const;

/**
 * Lithuanian locative (vietininkas) of each filterable city — for headings and
 * SEO prose ("... Klaipėdoje", not the naive nominative+"e" → "Klaipėdae").
 */
export const LT_CITY_LOCATIVE: Record<string, string> = {
  Vilnius: "Vilniuje",
  Kaunas: "Kaune",
  Klaipėda: "Klaipėdoje",
  Šiauliai: "Šiauliuose",
  Panevėžys: "Panevėžyje",
  Alytus: "Alytuje",
  Marijampolė: "Marijampolėje",
  Mažeikiai: "Mažeikiuose",
  Jonava: "Jonavoje",
  Utena: "Utenoje",
  Kėdainiai: "Kėdainiuose",
  Telšiai: "Telšiuose",
  Tauragė: "Tauragėje",
  Ukmergė: "Ukmergėje",
  Visaginas: "Visagine",
  Plungė: "Plungėje",
  Kretinga: "Kretingoje",
  Palanga: "Palangoje",
  Druskininkai: "Druskininkuose",
  "Visa Lietuva": "visoje Lietuvoje",
};

/** City in locative case; falls back to nominative for unknown cities. */
export function cityLocative(city: string): string {
  return LT_CITY_LOCATIVE[city] ?? city;
}
