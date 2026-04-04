import { useCallback, useRef, useState } from "react";

type RecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

export function useVoiceTranscript() {
  const [listening, setListening] = useState(false);
  const ref = useRef<InstanceType<RecognitionCtor> | null>(null);

  const getCtor = useCallback((): RecognitionCtor | null => {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
  }, []);

  const listen = useCallback(
    (onText: (text: string) => void) => {
      const Ctor = getCtor();
      if (!Ctor) {
        return;
      }
      try {
        if (ref.current) {
          ref.current.stop();
          ref.current = null;
        }
        const r = new Ctor();
        ref.current = r;
        r.continuous = false;
        r.interimResults = false;
        r.lang = "en-US";
        r.onresult = (e) => {
          const t = e.results[0]?.[0]?.transcript?.trim();
          if (t) onText(t);
        };
        r.onerror = () => setListening(false);
        r.onend = () => setListening(false);
        setListening(true);
        r.start();
      } catch {
        setListening(false);
      }
    },
    [getCtor],
  );

  return { listen, listening };
}
