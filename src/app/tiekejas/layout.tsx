import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function TiekejasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/prisijungti?callbackUrl=/tiekejas");
  }

  const role = session.user.role;
  if (role !== "PROVIDER" && role !== "ADMIN") {
    redirect("/tapti-tiekeju");
  }

  return <>{children}</>;
}
