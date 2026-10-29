import type { Metadata } from "next";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privatumo politika",
  description: "Paslaugų rinkos privatumo politika – kaip renkame, saugome ir naudojame jūsų duomenis.",
};

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
            kontaktinis el. paštas ir telefonas, pridėtos nuotraukos ir balso įrašai.
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
          Duomenų neparduodame. Juos perduodame tik paslaugų teikėjams (duomenų
          tvarkytojams), be kurių platforma negalėtų veikti. Kiekvienas gauna tik
          tai, ko reikia jo darbui:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Vercel</strong> – svetainės talpinimas (ES, Frankfurtas). Gauna visas svetainės užklausas, IP adresą ir naršyklės duomenis, apibendrintus puslapių greičio rodiklius.</li>
          <li><strong>Supabase</strong> – duomenų bazė (ES, Paryžius). Saugo visus platformos duomenis.</li>
          <li><strong>Upstash</strong> – piktnaudžiavimo ribojimas. Gauna IP adresą ar paskyros identifikatorių ir užklausų skaičių.</li>
          <li><strong>OpenRouter</strong> ir per jį pasiekiami dirbtinio intelekto modelių teikėjai – užklausų tekstas, balso įrašai ir nuotraukos, kai juos pateikiate; tiekėjo profilio tekstas ir nuoroda, iš kurios kuriamas profilis. Naudojama tekstui sutvarkyti, kategorijai parinkti, balsui paversti tekstu ir turiniui moderuoti.</li>
          <li><strong>TypeSafe</strong> – dirbtinio intelekto užklausų analizė. Gauna užklausos tekstą ir miestą, kad būtų parinkta tinkama kategorija.</li>
          <li><strong>Cloudinary</strong> – nuotraukų talpinimas. Gauna jūsų įkeltas nuotraukas.</li>
          <li><strong>Resend</strong> – el. laiškai. Gauna jūsų el. pašto adresą, laiškų turinį ir atsakymus į juos.</li>
          <li><strong>Telnyx</strong> – SMS žinutės. Gauna telefono numerį ir patvirtinimo kodą.</li>
          <li><strong>Telegram</strong> – jei jungiatės ar kuriate užklausą per Telegram: Telegram paskyros identifikatorius, vardas ir jūsų žinutės botui.</li>
          <li><strong>Google</strong> – prisijungimas su Google (paskyros identifikatorius, vardas, el. paštas) ir, tik su jūsų sutikimu, Google Analytics lankomumo statistika.</li>
          <li><strong>Stripe</strong> – mokėjimai (PCI DSS). Gauna mokėjimo duomenis ir el. pašto adresą.</li>
        </ul>
        <p>
          Dirbtinis intelektas tik padeda sutvarkyti ir priskirti užklausas – jis
          nepriima sprendimų, turinčių jums teisinių pasekmių.
        </p>

        <SectionHeading>Duomenų perdavimas už ES ribų</SectionHeading>
        <p>
          Dalis aukščiau išvardytų tvarkytojų (pvz., OpenRouter ir dirbtinio
          intelekto modelių teikėjai, TypeSafe, Google, Stripe, Cloudinary, Resend,
          Telnyx, Telegram, Upstash) gali tvarkyti duomenis už Europos ekonominės
          erdvės ribų, dažniausiai JAV. Tokiu atveju duomenys perduodami remiantis
          BDAR numatytomis apsaugos priemonėmis – ES ir JAV duomenų apsaugos sistema
          arba Europos Komisijos patvirtintomis standartinėmis sutarčių sąlygomis,
          numatytomis tų paslaugų teikėjų duomenų tvarkymo sutartyse. Daugiau apie
          tai galite paklausti el. paštu {CONTACT_EMAIL}.
        </p>
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

        <p className="text-body-sm text-surface-400">Paskutinį kartą atnaujinta: 2026-10-29</p>
      </div>
    </div>
  );
}
