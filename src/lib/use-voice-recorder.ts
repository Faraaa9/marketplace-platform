"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceRecorderStatus = "idle" | "recording" | "transcribing";
type VoiceRecorderError = "denied" | "unavailable" | "failed";

interface UseVoiceRecorderOptions {
  /** Receives the transcribed text once a recording is processed. */
  onTranscript: (text: string) => void;
}

interface UseVoiceRecorderResult {
  isSupported: boolean;
  status: VoiceRecorderStatus;
  error: VoiceRecorderError | null;
  /** Starts recording, or stops-and-transcribes if already recording. */
  toggle: () => void;
}

// 60s keeps the uploaded WAV well under the serverless request size limit.
const MAX_RECORDING_MS = 60_000;
// 16 kHz mono is plenty for speech and keeps the payload small.
const TARGET_SAMPLE_RATE = 16_000;
const LOG = "[Diktavimas]";

function getAudioContextCtor(): typeof AudioContext | undefined {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function detectSupport(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    !!getAudioContextCtor()
  );
}

/** Downmixes an AudioBuffer to mono and resamples to targetRate (pure JS). */
function downmixAndResample(
  buffer: AudioBuffer,
  targetRate: number,
): Float32Array {
  const { numberOfChannels, length, sampleRate } = buffer;
  const mono = new Float32Array(length);
  for (let c = 0; c < numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i] / numberOfChannels;
  }
  if (sampleRate === targetRate) return mono;

  const ratio = sampleRate / targetRate;
  const outLength = Math.max(1, Math.floor(length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, length - 1);
    const frac = pos - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return out;
}

/** Encodes mono Float32 PCM samples as a base64 16-bit WAV string. */
function encodeWavBase64(samples: Float32Array, sampleRate: number): string {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Decodes a recording and returns it as a base64 16 kHz mono WAV. */
async function recordingToWavBase64(blob: Blob): Promise<string | null> {
  const AudioCtx = getAudioContextCtor();
  if (!AudioCtx) return null;

  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    void ctx.close();
  }
  if (decoded.length === 0) return null;

  const pcm = downmixAndResample(decoded, TARGET_SAMPLE_RATE);
  return encodeWavBase64(pcm, TARGET_SAMPLE_RATE);
}

export function useVoiceRecorder({
  onTranscript,
}: UseVoiceRecorderOptions): UseVoiceRecorderResult {
  const [isSupported, setIsSupported] = useState(false);
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle");
  const [error, setError] = useState<VoiceRecorderError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<VoiceRecorderStatus>("idle");
  const startingRef = useRef(false);
  const unmountedRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const setPhase = useCallback((next: VoiceRecorderStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    // React Strict Mode in dev runs setup → cleanup → setup again on mount.
    // The cleanup below flips `unmountedRef` to true; without an explicit
    // reset here, the second setup leaves it stuck at true, which causes
    // `startRecording` to immediately stop the mic stream it just acquired
    // and `MediaRecorder.start()` is never called — i.e. the mic appears
    // dead even when permission is granted. Reset on every setup pass.
    unmountedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(detectSupport());
    return () => {
      unmountedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
      }
    };
  }, []);

  const transcribe = useCallback(
    async (mimeType: string) => {
      if (unmountedRef.current) return;
      setPhase("transcribing");
      const chunks = chunksRef.current;
      chunksRef.current = [];
      try {
        const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
        console.info(`${LOG} įrašas: ${blob.size} baitų, tipas "${blob.type}"`);
        if (blob.size < 1200) {
          console.warn(`${LOG} įrašas per trumpas — praleidžiu`);
          setPhase("idle");
          return;
        }
        const audio = await recordingToWavBase64(blob);
        if (!audio) {
          console.error(`${LOG} nepavyko konvertuoti įrašo į WAV`);
          setError("failed");
          setPhase("idle");
          return;
        }
        console.info(`${LOG} WAV paruoštas (${audio.length} base64 simbolių), siunčiu`);
        const res = await fetch("/api/requests/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio }),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; data?: { text?: string } }
          | null;
        const text = data?.data?.text;
        if (!res.ok || data?.success !== true || typeof text !== "string") {
          console.error(
            `${LOG} serverio klaida: HTTP ${res.status} —`,
            data?.error ?? "(be detalių)",
          );
          setError("failed");
          setPhase("idle");
          return;
        }
        const trimmed = text.trim();
        console.info(`${LOG} transkribuota: "${trimmed}"`);
        if (trimmed) onTranscriptRef.current(trimmed);
        setPhase("idle");
      } catch (err) {
        console.error(`${LOG} transkripcijos klaida:`, err);
        setError("failed");
        setPhase("idle");
      }
    },
    [setPhase],
  );

  const startRecording = useCallback(async () => {
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : String(err);
      console.error(`${LOG} mikrofono prieiga nepavyko:`, name);
      setError(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : "unavailable",
      );
      return;
    }

    if (unmountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType;
        releaseStream();
        void transcribe(mimeType);
      };

      recorder.start();
      setPhase("recording");

      timerRef.current = setTimeout(() => {
        const active = recorderRef.current;
        if (active && active.state !== "inactive") active.stop();
      }, MAX_RECORDING_MS);
    } catch (err) {
      console.error(`${LOG} MediaRecorder nepavyko paleisti:`, err);
      releaseStream();
      setError("unavailable");
    }
  }, [releaseStream, transcribe, setPhase]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (startingRef.current) return;
    const phase = statusRef.current;
    if (phase === "recording") {
      stopRecording();
    } else if (phase === "idle") {
      startingRef.current = true;
      void startRecording().finally(() => {
        startingRef.current = false;
      });
    }
  }, [startRecording, stopRecording]);

  return { isSupported, status, error, toggle };
}
