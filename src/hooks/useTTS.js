import { useState, useEffect, useRef, useCallback } from "react";

/**
 * useTTS — Text-to-Speech using the browser's Web Speech API.
 *
 * Fixes applied:
 *   1. 50ms delay after cancel() before speak() — required for Microsoft voices
 *      (Mark, Zira) which silently fail when speak() is called synchronously
 *      after cancel() in Chromium-based browsers.
 *   2. Keep-alive interval — Chrome cuts off speech after ~15 seconds. We
 *      pause/resume every 10 s to prevent the silent drop-out.
 *   3. onerror ignores 'interrupted' events triggered by our own cancel() call.
 */
export function useTTS() {
  const [supported,  setSupported]  = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [paused,     setPaused]     = useState(false);
  const [voices,     setVoices]     = useState([]);
  const [voice,      setVoice]      = useState(null);
  const [rate,       setRate]       = useState(() => parseFloat(localStorage.getItem("tts_rate")  ?? "1"));
  const [pitch,      setPitch]      = useState(() => parseFloat(localStorage.getItem("tts_pitch") ?? "1"));

  const utteranceRef  = useRef(null);
  const keepAliveRef  = useRef(null);
  const speakTimerRef = useRef(null);

  // ── Detect support + load voices ──────────────────────────
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setSupported(true);

    function loadVoices() {
      const available = window.speechSynthesis.getVoices();
      if (available.length === 0) return;
      setVoices(available);
      const preferred =
        available.find((v) => v.lang.startsWith("en") && v.default) ||
        available.find((v) => v.lang.startsWith("en")) ||
        available[0];
      setVoice((prev) => (prev ? prev : preferred ?? null));
    }

    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // ── Persist rate/pitch ─────────────────────────────────────
  useEffect(() => { localStorage.setItem("tts_rate",  String(rate));  }, [rate]);
  useEffect(() => { localStorage.setItem("tts_pitch", String(pitch)); }, [pitch]);

  // ── Cleanup on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      clearInterval(keepAliveRef.current);
      clearTimeout(speakTimerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  /* ── speak ─────────────────────────────────────────────── */
  const speak = useCallback((text) => {
    if (!supported || !text?.trim()) return;

    // Clear any pending speak or keep-alive
    clearTimeout(speakTimerRef.current);
    clearInterval(keepAliveRef.current);
    window.speechSynthesis.cancel();

    // Microsoft voices (Mark, Zira) require a short delay after cancel()
    speakTimerRef.current = setTimeout(() => {
      const utter    = new SpeechSynthesisUtterance(text.trim());
      utter.rate     = rate;
      utter.pitch    = pitch;

      // Re-lookup the voice by name — voice objects can become stale after cancel()
      if (voice) {
        const fresh = window.speechSynthesis.getVoices().find((v) => v.name === voice.name);
        utter.voice = fresh ?? voice;
      }

      utter.onstart  = () => { setSpeaking(true);  setPaused(false); };
      utter.onend    = () => {
        setSpeaking(false);
        setPaused(false);
        clearInterval(keepAliveRef.current);
      };
      utter.onerror  = (e) => {
        // 'interrupted' fires from our own cancel() — not a real error
        if (e.error === "interrupted") return;
        setSpeaking(false);
        setPaused(false);
        clearInterval(keepAliveRef.current);
      };
      utter.onpause  = () => { setPaused(true);  };
      utter.onresume = () => { setPaused(false); };

      utteranceRef.current = utter;
      window.speechSynthesis.speak(utter);

      // Keep-alive: Chrome silently drops speech after ~15 s
      keepAliveRef.current = setInterval(() => {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10_000);
    }, 50); // 50ms — enough for Microsoft voices, imperceptible to users
  }, [supported, rate, pitch, voice]);

  /* ── stop ──────────────────────────────────────────────── */
  const stop = useCallback(() => {
    clearTimeout(speakTimerRef.current);
    clearInterval(keepAliveRef.current);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  }, []);

  /* ── pause / resume ────────────────────────────────────── */
  const pause  = useCallback(() => { window.speechSynthesis?.pause();  setPaused(true);  }, []);
  const resume = useCallback(() => { window.speechSynthesis?.resume(); setPaused(false); }, []);

  return {
    supported,
    speaking,
    paused,
    voices,
    voice,      setVoice,
    rate,       setRate,
    pitch,      setPitch,
    speak,
    stop,
    pause,
    resume,
  };
}
