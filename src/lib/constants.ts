export const APP_NAME = "PaslaugųRinka";

export const SERVICE_CATEGORIES = [
  { value: "statyba", label: "Statyba ir remontas", icon: "Hammer" },
  { value: "santechnika", label: "Santechnika", icon: "Droplets" },
  { value: "elektra", label: "Elektros darbai", icon: "Zap" },
  { value: "valymas", label: "Valymo paslaugos", icon: "Sparkles" },
  { value: "transportas", label: "Transportas ir perkraustymas", icon: "Truck" },
  { value: "sodas", label: "Sodo ir aplinkos tvarkymas", icon: "Trees" },
  { value: "it", label: "IT paslaugos", icon: "Monitor" },
  { value: "dizainas", label: "Dizainas ir interjeras", icon: "Palette" },
  { value: "teise", label: "Teisinės paslaugos", icon: "Scale" },
  { value: "buhalterija", label: "Buhalterija", icon: "Calculator" },
  { value: "svietimas", label: "Švietimas ir korepetitoriai", icon: "GraduationCap" },
  { value: "kita", label: "Kita", icon: "MoreHorizontal" },
] as const;

export const BUDGET_OPTIONS = [
  { value: "iki-100", label: "Iki €100" },
  { value: "100-500", label: "€100 – €500" },
  { value: "500-1000", label: "€500 – €1,000" },
  { value: "1000-5000", label: "€1,000 – €5,000" },
  { value: "virs-5000", label: "Virš €5,000" },
  { value: "derinama", label: "Kaina derinama" },
] as const;

export const PLAN_LIMITS = {
  FREE: {
    responsesPerMonth: 3,
    canSeePhone: false,
    canSeeEmail: true,
    priorityListing: false,
    badge: null,
    price: 0,
  },
  BASIC: {
    responsesPerMonth: 30,
    canSeePhone: true,
    canSeeEmail: true,
    priorityListing: false,
    badge: "Patikimas",
    price: 29,
  },
  PRO: {
    responsesPerMonth: -1, // unlimited
    canSeePhone: true,
    canSeeEmail: true,
    priorityListing: true,
    badge: "PRO",
    price: 59,
  },
} as const;

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
