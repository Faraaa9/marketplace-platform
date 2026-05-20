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

function getAudioContextCtor(): typeof AudioContext | undefined {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function getOfflineAudioContextCtor(): typeof OfflineAudioContext | undefined {
  const w = window as unknown as {
    OfflineAudioContext?: typeof OfflineAudioContext;
    webkitOfflineAudioContext?: typeof OfflineAudioContext;
  };
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
}

function detectSupport(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    !!getAudioContextCtor() &&
    !!getOfflineAudioContextCtor()
  );
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
  view.setUint32(16, 16, true); // fmt chunk size
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

/** Decodes a recording, downmixes to 16 kHz mono, returns it as base64 WAV. */
async function recordingToWavBase64(blob: Blob): Promise<string | null> {
  const AudioCtx = getAudioContextCtor();
  const OfflineCtx = getOfflineAudioContextCtor();
  if (!AudioCtx || !OfflineCtx) return null;

  const arrayBuffer = await blob.arrayBuffer();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    void decodeCtx.close();
  }
  if (decoded.length === 0) return null;

  const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineCtx(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return encodeWavBase64(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
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
        if (blob.size < 1200) {
          // Too short to hold speech — quietly return to idle.
          setPhase("idle");
          return;
        }
        const audio = await recordingToWavBase64(blob);
        if (!audio) {
          setError("failed");
          setPhase("idle");
          return;
        }
        const res = await fetch("/api/requests/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio }),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: { text?: string } }
          | null;
        const text = data?.data?.text;
        if (!res.ok || data?.success !== true || typeof text !== "string") {
          setError("failed");
          setPhase("idle");
          return;
        }
        const trimmed = text.trim();
        if (trimmed) onTranscriptRef.current(trimmed);
        setPhase("idle");
      } catch {
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
      const name = err instanceof DOMException ? err.name : "";
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
    } catch {
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
