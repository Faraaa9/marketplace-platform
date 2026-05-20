const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Gemini 2.5 Flash transcribes Lithuanian speech well and accepts audio input.
const MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 45_000;

const SYSTEM_PROMPT = `Tau pateikiamas garso įrašas, kuriame žmogus lietuvių kalba diktuoja, kokios paslaugos jam reikia (platforma „paslaugurinka.lt").

Tavo vienintelė užduotis — tiksliai užrašyti, ką žmogus pasakė:
- Rašyk taisyklinga lietuvių kalba su skyrybos ženklais ir didžiosiomis raidėmis.
- Užrašyk TIK tai, kas pasakyta. Nieko nepridėk, neperfrazuok, nekomentuok.
- Negrąžink pavadinimų, antraščių, kabučių ar paaiškinimų — tik patį tekstą.
- Jei įraše nieko nesigirdi arba kalbos suprasti neįmanoma, grąžink tuščią eilutę.`;

export class AiTranscribeError extends Error {}

/**
 * Transcribes a base64-encoded WAV recording to Lithuanian text via OpenRouter.
 */
export async function transcribeAudio(audioBase64Wav: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiTranscribeError("AI_NOT_CONFIGURED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "paslaugurinka.lt",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        max_tokens: 2000,
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Transkribuok šį garso įrašą." },
              {
                type: "input_audio",
                input_audio: { data: audioBase64Wav, format: "wav" },
              },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenRouter transkripcijos klaida:", res.status, detail);
      throw new AiTranscribeError("AI_REQUEST_FAILED");
    }

    const data = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") {
      throw new AiTranscribeError("AI_EMPTY_RESPONSE");
    }
    return raw.trim();
  } catch (err) {
    if (err instanceof AiTranscribeError) throw err;
    const name = (err as { name?: string } | null)?.name;
    throw new AiTranscribeError(
      name === "AbortError" ? "AI_TIMEOUT" : "AI_REQUEST_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }
}
