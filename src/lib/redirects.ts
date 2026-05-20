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
    return [{ href: "/admin", label: "Admin panelė" }];
  }
  if (role === "PROVIDER") {
    return [
      { href: "/tiekejas", label: "Tiekėjo panelė" },
      { href: "/paskyra/uzklausos", label: "Mano užklausos" },
    ];
  }
  return [
    { href: "/paskyra/uzklausos", label: "Mano užklausos" },
    { href: "/tapti-tiekeju", label: "Tapti tiekėju" },
  ];
}
