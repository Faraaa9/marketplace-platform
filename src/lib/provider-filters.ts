import { LITHUANIAN_CITIES } from "@/lib/constants";

export function buildProviderLocationFilter(location: string) {
  if (!location) {
    return undefined;
  }

  if (location === "Visa Lietuva") {
    return {
      OR: [
        { location: "Visa Lietuva" },
        { location: { in: LITHUANIAN_CITIES.filter((city) => city !== "Visa Lietuva") } },
      ],
    };
  }

  return {
    OR: [
      { location },
      { location: "Visa Lietuva" },
    ],
  };
}
