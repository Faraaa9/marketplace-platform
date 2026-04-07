export function getRoleHomePath(role?: string) {
  if (role === "PROVIDER") return "/tiekejas";
  if (role === "ADMIN") return "/admin";
  if (role === "CLIENT") return "/paskyra/uzklausos";
  return "/";
}
