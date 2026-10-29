export function getRoleHomePath(role?: string) {
  if (role === "PROVIDER") return "/tiekejas";
  if (role === "ADMIN") return "/admin";
  return "/";
}

export interface UserMenuLink {
  href: string;
  label: string;
}

export function getUserMenuLinks(role?: string): UserMenuLink[] {
  if (role === "ADMIN") {
    return [
      { href: "/paskyra/profilis", label: "Profilis" },
      { href: "/admin", label: "Admin panelė" },
    ];
  }
  if (role === "PROVIDER") {
    return [
      { href: "/tiekejas", label: "Meistro paskyra" },
      { href: "/tiekejas/zinutes", label: "Žinutės" },
      { href: "/tiekejas/planai", label: "Kreditai ir sąskaitos" },
      { href: "/paskyra", label: "Kliento paskyra" },
    ];
  }
  return [
    { href: "/paskyra", label: "Mano paskyra" },
    { href: "/paskyra/uzklausos", label: "Mano užklausos" },
    { href: "/paskyra/zinutes", label: "Žinutės" },
    { href: "/paskyra/profilis", label: "Mano duomenys" },
    { href: "/tapti-tiekeju", label: "Tapti meistru" },
  ];
}
