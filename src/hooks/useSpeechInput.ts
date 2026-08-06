"use client";

// Reusable browser speech-to-text (dictation) hook, built on the Web Speech API
// (SpeechRecognition / webkitSpeechRecognition — Chrome/Edge supported). It is
// feature-detected: callers read `supported` and fall back to plain typed input
// where the API is unavailable. Shared by the "Cue Winslow" widget and the
// /start topic input so both dictate through one implementation.
//
// The Web Speech API types are not in the standard TS DOM lib, so we declare the
// minimal shapes we use locally and reach the constructor off `window`.

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionAlternative = { transcript: string };
type SpeechRecognitionResult = {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
};
type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};
type SpeechRecognitionErrorEventLike = { error: string };

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseSpeechInputOptions = {
  lang?: string;
  continuous?: boolean;
  /** Called with each FINALISED chunk of transcript (append it to your field). */
  onFinal?: (text: string) => void;
  /** Called when recognition errors (e.g. "not-allowed" for a denied mic). */
  onError?: (error: string) => void;
};

export type UseSpeechInput = {
  /** True when the Web Speech API exists in this browser. */
  supported: boolean;
  /** True while actively listening. */
  listening: boolean;
  /** The current, not-yet-finalised transcript (live preview). */
  interim: string;
  /** Last error code from the API, if any. */
  error: string | null;
  start: () => void;
  stop: () => void;
  toggle: () => void;
};

export function useSpeechInput(options: UseSpeechInputOptions = {}): UseSpeechInput {
  const { lang = "en-US", continuous = true, onFinal, onError } = options;

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Keep the latest callbacks without re-creating the recognition instance.
  const onFinalRef = useRef(onFinal);
  const onErrorRef = useRef(onError);
  onFinalRef.current = onFinal;
  onErrorRef.current = onError;

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const chunk = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const finalText = chunk.trim();
          if (finalText) onFinalRef.current?.(finalText);
        } else {
          live += chunk;
        }
      }
      setInterim(live);
    };

    rec.onerror = (e: SpeechRecognitionErrorEventLike) => {
      setError(e.error);
      onErrorRef.current?.(e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setListening(false);
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = rec;

    return () => {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [lang, continuous]);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec || listening) return;
    setError(null);
    setInterim("");
    try {
      rec.start();
      setListening(true);
    } catch {
      // start() throws if called while already started — treat as listening.
      setListening(true);
    }
  }, [listening]);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
    setInterim("");
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, interim, error, start, stop, toggle };
}
