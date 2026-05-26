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
      { href: "/tiekejas", label: "Valdymo panelė" },
      { href: "/tiekejas/uzklausos", label: "Užklausos" },
      { href: "/tiekejas/zinutes", label: "Žinutės" },
      { href: "/paskyra/profilis", label: "Profilis" },
    ];
  }
  return [
    { href: "/paskyra/profilis", label: "Profilis" },
    { href: "/paskyra/uzklausos", label: "Mano užklausos" },
    { href: "/paskyra/zinutes", label: "Žinutės" },
    { href: "/tapti-tiekeju", label: "Tapti tiekėju" },
  ];
}
