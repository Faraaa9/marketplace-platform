"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Web Speech API is not part of the standard TypeScript DOM lib — these
// minimal typings cover only what this hook touches.
interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag passed to the recognizer. Defaults to Lithuanian. */
  lang?: string;
  /** Receives existing text + dictated speech on every update. */
  onTranscript: (text: string) => void;
}

type MicErrorReason = "denied" | "unavailable";

interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isRecording: boolean;
  /** Set when the microphone could not be used; cleared on a successful start. */
  micError: MicErrorReason | null;
  /** Starts dictation appending to `currentText`, or stops it if running. */
  toggle: (currentText: string) => void;
}

export function useSpeechRecognition({
  lang = "lt-LT",
  onTranscript,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionResult {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micError, setMicError] = useState<MicErrorReason | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recordingRef = useRef(false);
  const baseTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognizer =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognizer) return;

    const recognition = new Recognizer();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      // Rebuild the full transcript every event: interim results mutate in
      // place and become final, so recomputing from zero stays correct.
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (transcript) parts.push(transcript);
      }
      onTranscriptRef.current(baseTextRef.current + parts.join(" "));
    };

    recognition.onerror = (event) => {
      recordingRef.current = false;
      setIsRecording(false);
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed" ||
        event.error === "audio-capture"
      ) {
        console.error("[Diktavimas] Mikrofono klaida:", event.error);
        setMicError(event.error === "audio-capture" ? "unavailable" : "denied");
      }
    };

    recognition.onend = () => {
      recordingRef.current = false;
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const toggle = useCallback((currentText: string) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (recordingRef.current) {
      recognition.stop();
      return;
    }

    const trimmed = currentText.replace(/\s+$/, "");
    baseTextRef.current = trimmed ? `${trimmed} ` : "";
    setMicError(null);

    // SpeechRecognition.start() requests microphone access itself; the
    // browser shows its permission prompt when the site is not yet decided.
    try {
      recognition.start();
      recordingRef.current = true;
      setIsRecording(true);
    } catch {
      // start() throws if the recognizer is still stopping — ignore.
    }
  }, []);

  return { isSupported, isRecording, micError, toggle };
}
