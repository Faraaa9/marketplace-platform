import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { getServerSession } from "next-auth";

export const metadata: Metadata = {
  title: "Kontaktai",
  description: "Susisiekite su PaslaugųRinka komanda. Atsakome per 24 valandas.",
};
import { authOptions } from "@/lib/auth";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";

export default async function ContactPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = Boolean(session?.user);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Kontaktai</h1>
        <p className="mt-2 text-body text-surface-500 dark:text-surface-400">Susisiekite su mumis bet kuriuo klausimu</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
            <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="text-body font-semibold text-surface-900 dark:text-white">El. paštas</h3>
          <p className="text-body-sm text-surface-500 mt-1">info@send.paslaugurinka.lt</p>
        </Card>
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
            <Phone className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="text-body font-semibold text-surface-900 dark:text-white">Telefonas</h3>
          <p className="text-body-sm text-surface-500 mt-1">+370 671 88547</p>
        </Card>
        <Card className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950">
            <MapPin className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <h3 className="text-body font-semibold text-surface-900 dark:text-white">Adresas</h3>
          <p className="text-body-sm text-surface-500 mt-1">Vilnius, Lietuva</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white mb-6">Parašykite mums</h2>
        <form className="space-y-5">
          {!isLoggedIn && (
            <>
              <Input id="contact-name" label="Vardas" placeholder="Jūsų vardas" />
              <Input id="contact-email" label="El. paštas" type="email" placeholder="jusu@pastas.lt" />
            </>
          )}
          <Textarea id="contact-message" label="Žinutė" placeholder="Jūsų žinutė..." />
          <Button type="submit">Siųsti</Button>
        </form>
      </Card>
    </div>
  );
}
