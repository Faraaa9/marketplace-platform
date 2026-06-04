# Realtime Chat Plan

Tikslas: pokalbiai turi veikti kaip modernus messengeris. Naujausia veikla
visada pakelia pokalbi virsun, neperskaitytos zinutes matomos aiskiai, o
aktyvus pokalbis gauna zinutes beveik gyvai.

## 1. Canonical Message Source

Busena: igyvendinta.

- Visi siuntimo endpointai turi transaction'u sukurti `message`.
- Tas pats transaction turi atnaujinti thread `lastMessageAt`.
- Siuntejo `lastReadAt` turi buti atnaujintas, gavejo `lastReadAt` nelieciamas.
- Visi notification ir UI linkai turi vesti i canonical zinuciu view.

## 2. Realtime Active Chat

Busena: igyvendinta.

- Aktyvus `ThreadChat` turi klausytis Supabase `messages` INSERT ivykiu.
- Nauja zinute is karto idedama i chat stream.
- Jei nauja zinute yra nuo kito dalyvio ir thread atidarytas, kvieciamas read endpointas.
- Jei Supabase neveikia, serverio hydration ir polling turi likti fallback.

## 3. Realtime Inbox List

Busena: igyvendinta.

- Provider inbox turi klausytis `direct_inquiries` ir `responses` UPDATE ivykiu.
- Kai pasikeicia `lastMessageAt`, sarasas turi persirikiuoti pagal naujausia veikla.
- Jei gavejas dar nera perskaites, eilute turi buti unread ir vizualiai bold.
- Polling lieka kaip safety net, bet realtime turi buti pagrindinis kelias.

## 4. Optimistic Sending

Busena: igyvendinta.

- Siunciama zinute iskart atsiranda UI su `sending`.
- Serveriui patvirtinus, ji tampa `sent`.
- Klaidos atveju ji tampa `failed` ir gali buti persiusta.
- Inbox preview ir `lastMessageAt` turi atsinaujinti iskart po optimistinio siuntimo.

## 5. Presence

Busena: igyvendinta.

- Naudoti Supabase Presence online busenai aktyviuose chat kanaluose.
- Rodyti `Prisijunges dabar`, kai kitas dalyvis yra tame presence kanale.
- Fallback: `lastSeenAt` is DB, kai realtime presence nera.

## 6. Typing Indicator

Busena: igyvendinta.

- Naudoti Supabase Broadcast, ne DB.
- Siusti `typing:start` ir `typing:stop` i thread kanala.
- Debounce/throttle, kad nebutu triuksmo.
- UI rodo trumpa indikatoriu, kai kitas dalyvis raso.

## 7. Read Receipts

Busena: igyvendinta.

- Atidarius thread ir gavus kito dalyvio zinute, kvieciamas `/api/realtime/read`.
- Inbox eilute turi iskart prarasti unread busena.
- Realtime update turi sinchronizuoti `providerLastReadAt` / `clientLastReadAt`.

## 8. Fallback

Busena: igyvendinta.

- Jei realtime nepavyksta, inbox polling lieka aktyvus.
- Focus/visibility refetch turi atstatyti busena po miego ar prarasto websocket.
- UI neturi prarasti jau matomu zinuciu, jei realtime laikinai neveikia.
