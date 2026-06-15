export const BRAND_COLOR_VALUES = ["brick", "green", "gold"] as const;

export type BrandColor = (typeof BRAND_COLOR_VALUES)[number];

export type BrandPalette = {
  value: BrandColor;
  label: string;
  main: string;
  hover: string;
  shadow: string;
  vars: Record<string, string>;
};

export const BRAND_PALETTES: Record<BrandColor, BrandPalette> = {
  brick: {
    value: "brick",
    label: "Plytinė",
    main: "#A94E2F",
    hover: "#8A3F26",
    shadow: "#793821",
    vars: {
      "50": "250 238 231",
      "100": "243 220 205",
      "200": "231 191 167",
      "300": "216 158 121",
      "400": "203 125 83",
      "500": "194 94 58",
      "600": "169 78 47",
      "700": "138 63 38",
      "800": "110 50 32",
      "900": "90 42 28",
      "950": "50 21 11",
    },
  },
  green: {
    value: "green",
    label: "Žalia",
    main: "#6F7F4B",
    hover: "#59673C",
    shadow: "#4A5430",
    vars: {
      "50": "242 245 234",
      "100": "229 234 213",
      "200": "207 217 180",
      "300": "178 194 139",
      "400": "145 162 99",
      "500": "111 127 75",
      "600": "89 103 60",
      "700": "74 84 48",
      "800": "59 68 41",
      "900": "50 58 37",
      "950": "27 32 19",
    },
  },
  gold: {
    value: "gold",
    label: "Auksinė",
    main: "#A77B3F",
    hover: "#8C6936",
    shadow: "#6B5028",
    vars: {
      "50": "249 244 234",
      "100": "240 230 206",
      "200": "224 203 161",
      "300": "204 169 110",
      "400": "184 137 68",
      "500": "167 123 63",
      "600": "140 105 54",
      "700": "111 83 43",
      "800": "89 68 38",
      "900": "75 58 35",
      "950": "42 30 17",
    },
  },
};

export function normalizeBrandColor(value?: string | null): BrandColor {
  return BRAND_COLOR_VALUES.includes(value as BrandColor) ? (value as BrandColor) : "green";
}

export function getBrandPalette(value?: string | null): BrandPalette {
  return BRAND_PALETTES[normalizeBrandColor(value)];
}
