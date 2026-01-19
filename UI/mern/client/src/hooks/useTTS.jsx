// client/src/hooks/useTTS.js
import { useEffect, useRef, useState, useCallback } from "react";

export function useTTS(defaultOptions = {}) {
  const [voices, setVoices] = useState([]);
  const [ready, setReady] = useState(false);

  const utterRef = useRef(null);

  // Load voices (Chromium loads asynchronously)
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      console.warn("speechSynthesis is not supported in this browser.");
      return;
    }

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices() || [];
      setVoices(v);
      setReady(v.length > 0);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const cancel = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    utterRef.current = null;
  }, []);

  const pause = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
  }, []);

  const resume = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
  }, []);

  const pickVoice = (opts) => {
    const lang = opts.lang || defaultOptions.lang || "en-GB";

    // Prefer exact lang match
    let v = voices.find((x) => x.lang === lang);

    // Fallback: startsWith "en" etc.
    if (!v) v = voices.find((x) => x.lang?.startsWith(lang.split("-")[0]));

    // Fallback: any voice
    if (!v) v = voices[0];

    return v || null;
  };

  const speak = useCallback(
    (text, options = {}) => {
      if (!("speechSynthesis" in window)) return null;
      if (!text) return null;

      const opts = { ...defaultOptions, ...options };

      // stop current speech
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);

      utter.lang = opts.lang || "en-GB";
      utter.rate = opts.rate ?? 1.0;
      utter.pitch = opts.pitch ?? 1.0;
      utter.volume = opts.volume ?? 1.0;

      const voice = pickVoice(opts);
      if (voice) utter.voice = voice;

      if (opts.onStart) utter.onstart = opts.onStart;
      if (opts.onEnd) utter.onend = opts.onEnd;
      if (opts.onError) utter.onerror = opts.onError;

      utterRef.current = utter;
      window.speechSynthesis.speak(utter);

      return utter;
    },
    [voices, defaultOptions]
  );

  // Promise version: await speech finish (nice for navigation flows)
  const speakAsync = useCallback(
    (text, options = {}) => {
      return new Promise((resolve, reject) => {
        const utter = speak(text, {
          ...options,
          onEnd: (e) => {
            options.onEnd?.(e);
            resolve(true);
          },
          onError: (e) => {
            options.onError?.(e);
            reject(e);
          },
        });

        if (!utter) resolve(false);
      });
    },
    [speak]
  );

  return {
    ready,       // voices loaded
    voices,      // list of available voices
    speak,
    speakAsync,  // awaitable speech
    cancel,
    pause,
    resume,
  };
}
