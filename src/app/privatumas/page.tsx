import { APP_NAME } from "@/lib/constants";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Privatumo politika</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-body text-surface-700 dark:text-surface-300">
        <p>Ši privatumo politika aprašo, kaip {APP_NAME} renka, naudoja ir saugo jūsų asmeninę informaciją.</p>

        <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white">Kokius duomenis renkame?</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Vardą ir el. pašto adresą (registracijos metu)</li>
          <li>Kontaktinę informaciją, kurią pateikiate užklausose</li>
          <li>Paslaugų tiekėjų profilio informaciją</li>
          <li>Mokėjimo informaciją (apdoroja Stripe)</li>
        </ul>

        <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white">Kaip naudojame duomenis?</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Užklausų ir atsakymų valdymui</li>
          <li>Pranešimų siuntimui el. paštu</li>
          <li>Platformos tobulinimui</li>
        </ul>

        <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white">Duomenų saugojimas</h2>
        <p>Jūsų duomenys saugomi saugiuose serveriuose. Mokėjimo duomenis apdoroja Stripe pagal PCI DSS standartus.</p>

        <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white">Jūsų teisės</h2>
        <p>Turite teisę prašyti prieigos prie savo duomenų, juos ištaisyti arba ištrinti. Kreipkitės el. paštu info@paslaugurinka.lt.</p>

        <p className="text-body-sm text-surface-400">Paskutinį kartą atnaujinta: 2026-04-07</p>
      </div>
    </div>
  );
}
