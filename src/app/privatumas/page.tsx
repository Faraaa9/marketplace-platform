import type { Metadata } from "next";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privatumo politika",
  description: "PaslaugųRinka privatumo politika – kaip renkame, saugome ir naudojame jūsų duomenis.",
};

const CONTACT_EMAIL = "info@send.paslaugurinka.lt";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Privatumo politika</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-body text-surface-700 dark:text-surface-300">
        <p>
          Ši privatumo politika aprašo, kaip {APP_NAME} (toliau – „platforma“, „mes“)
          renka, naudoja, saugo ir perduoda jūsų asmens duomenis, kai naudojatės
          svetaine paslaugurinka.lt. Duomenis tvarkome laikydamiesi Bendrojo duomenų
          apsaugos reglamento (ES) 2016/679 (BDAR) ir Lietuvos Respublikos teisės aktų.
          Dėl visų su asmens duomenimis susijusių klausimų kreipkitės el. paštu{" "}
          {CONTACT_EMAIL}.
        </p>

        <SectionHeading>Kokius duomenis renkame?</SectionHeading>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Paskyros duomenys:</strong> vardas, el. pašto adresas, slaptažodis
            (saugomas tik užšifruota santrauka). Jungiantis per Google ar Telegram –
            tos paskyros identifikatorius ir viešas vardas.
          </li>
          <li>
            <strong>Užklausų duomenys:</strong> paslaugos aprašymas, miestas, biudžetas,
            kontaktinis el. paštas ir telefonas, pridėtos nuotraukos.
          </li>
          <li>
            <strong>Tiekėjo profilio duomenys:</strong> viešai rodomas vardas ar įmonės
            pavadinimas, aprašymas, paslaugos, miestas, telefonas, svetainė, darbų
            nuotraukos. Šie duomenys skelbiami viešai – tai paslaugų teikėjo
            pasirinkimas.
          </li>
          <li>
            <strong>Susirašinėjimas:</strong> žinutės tarp klientų ir tiekėjų platformoje,
            atsiliepimai ir įvertinimai.
          </li>
          <li>
            <strong>Mokėjimų duomenys:</strong> mokėjimus apdoroja Stripe – kortelės
            duomenys mūsų serverių nepasiekia. Mes saugome tik operacijos sumą, datą ir
            būseną.
          </li>
          <li>
            <strong>Techniniai duomenys:</strong> IP adresas, naršyklės tipas, apsilankymo
            laikas, apibendrinti puslapių greičio rodikliai.
          </li>
        </ul>

        <SectionHeading>Kodėl ir kokiu teisiniu pagrindu tvarkome duomenis?</SectionHeading>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Sutarties vykdymas</strong> – paskyros valdymas, užklausų
            perdavimas tiekėjams, susirašinėjimas, mokėjimai.
          </li>
          <li>
            <strong>Teisėtas interesas</strong> – platformos saugumas, sukčiavimo
            prevencija, turinio moderavimas, paslaugos tobulinimas pagal apibendrintą
            statistiką.
          </li>
          <li>
            <strong>Sutikimas</strong> – analitikos slapukai ir rinkodaros pranešimai
            (sutikimą galite bet kada atšaukti).
          </li>
          <li>
            <strong>Teisinė pareiga</strong> – buhalterinės apskaitos ir kiti teisės
            aktų reikalavimai.
          </li>
        </ul>

        <SectionHeading>Kam perduodame duomenis?</SectionHeading>
        <p>
          Duomenų neparduodame. Jie perduodami tik šiems tvarkytojams, be kurių
          paslauga negalėtų veikti:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Vercel</strong> – svetainės talpinimas (ES regionas, Frankfurtas)</li>
          <li><strong>Supabase</strong> – duomenų bazė (ES regionas, Airija)</li>
          <li><strong>Stripe</strong> – mokėjimų apdorojimas (PCI DSS)</li>
          <li><strong>Cloudinary</strong> – nuotraukų talpinimas</li>
          <li><strong>Resend</strong> – el. laiškų siuntimas</li>
          <li><strong>Google Analytics</strong> – apibendrinta lankomumo statistika</li>
        </ul>
        <p>
          Kliento kontaktai (telefonas, el. paštas) atskleidžiami paslaugų teikėjui tik
          tada, kai šis atsako į jūsų užklausą platformoje numatyta tvarka.
        </p>

        <SectionHeading>Kiek laiko saugome duomenis?</SectionHeading>
        <p>
          Paskyros duomenis saugome tol, kol turite paskyrą. Ištrynus paskyrą, asmens
          duomenys pašalinami arba nuasmeninami per 30 dienų, išskyrus duomenis,
          kuriuos privalome saugoti pagal teisės aktus (pvz., mokėjimų įrašai –
          10 metų pagal buhalterinę apskaitą reglamentuojančius teisės aktus).
        </p>

        <SectionHeading>Slapukai</SectionHeading>
        <p>
          Naudojame būtinuosius slapukus (prisijungimo sesija, pasirinkta tema) ir –
          tik su jūsų sutikimu – Google Analytics statistikos slapukus. Būtinieji
          slapukai reikalingi svetainei veikti ir jų išjungti negalima.
        </p>

        <SectionHeading>Jūsų teisės</SectionHeading>
        <ul className="list-disc pl-6 space-y-1">
          <li>susipažinti su savo duomenimis ir gauti jų kopiją;</li>
          <li>reikalauti ištaisyti netikslius duomenis;</li>
          <li>reikalauti ištrinti duomenis („teisė būti pamirštam“);</li>
          <li>apriboti duomenų tvarkymą arba nesutikti su juo;</li>
          <li>gauti duomenis perkeliamu formatu;</li>
          <li>atšaukti duotą sutikimą.</li>
        </ul>
        <p>
          Prašymus pateikite el. paštu {CONTACT_EMAIL} – atsakysime per 30 dienų.
          Jei manote, kad jūsų teisės pažeistos, galite pateikti skundą Valstybinei
          duomenų apsaugos inspekcijai (vdai.lrv.lt).
        </p>

        <SectionHeading>Politikos pakeitimai</SectionHeading>
        <p>
          Atnaujinę šią politiką, naują versiją paskelbsime šiame puslapyje. Apie
          esminius pakeitimus registruotus naudotojus informuosime el. paštu.
        </p>

        <p className="text-body-sm text-surface-400">Paskutinį kartą atnaujinta: 2026-06-11</p>
      </div>
    </div>
  );
}
