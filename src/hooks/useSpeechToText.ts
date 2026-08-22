"use client";

// Speech-to-text (dictation) for a single text field. A thin, purpose-built
// wrapper over the shared `useSpeechInput` recognizer: it captures one utterance
// at a time and hands each finalised transcript to `onTranscript`, which the
// caller appends to whatever the field already holds. Nothing leaves the device —
// recognition runs locally in the browser (Web Speech API).
//
// This is the engine behind the reusable <VoiceInputButton>. Callers that just
// want an orange mic next to an input should use that component instead of wiring
// this hook directly.

import { useSpeechInput } from "@/hooks/useSpeechInput";

export type UseSpeechToTextOptions = {
  /** Called with each finalised chunk of recognised text (append it to your field). */
  onTranscript: (text: string) => void;
  /** BCP-47 language tag; defaults to en-US. */
  lang?: string;
};

export type UseSpeechToText = {
  /** True when the browser exposes the Web Speech API. */
  supported: boolean;
  /** True while actively listening. */
  listening: boolean;
  /** Start listening if idle, stop if already listening. */
  toggle: () => void;
};

export function useSpeechToText({
  onTranscript,
  lang,
}: UseSpeechToTextOptions): UseSpeechToText {
  // continuous:false — capture a single utterance per tap, matching the shipped
  // ServicesPanel/MediaPanel dictation behaviour (tap → talk → text appended).
  const { supported, listening, toggle } = useSpeechInput({
    continuous: false,
    lang,
    onFinal: onTranscript,
  });
  return { supported, listening, toggle };
}
