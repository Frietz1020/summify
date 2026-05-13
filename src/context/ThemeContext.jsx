import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

const FONT_SIZES = {
  small:   "14px",
  medium:  "16px",
  large:   "19px",
  xlarge:  "22px",
};

export function ThemeProvider({ children }) {
  const [darkMode,      setDarkMode]      = useState(() => JSON.parse(localStorage.getItem("summify_dark")         ?? "false"));
  const [dyslexicFont,  setDyslexicFont]  = useState(() => JSON.parse(localStorage.getItem("summify_dyslexic")    ?? "false"));
  const [highContrast,  setHighContrast]  = useState(() => JSON.parse(localStorage.getItem("summify_contrast")    ?? "false"));
  const [reduceMotion,  setReduceMotion]  = useState(() => JSON.parse(localStorage.getItem("summify_motion")      ?? "false"));
  const [fontSize,      setFontSize]      = useState(() => localStorage.getItem("summify_fontsize") ?? "medium");

  // ── Dark mode ──────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("summify_dark", JSON.stringify(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // ── Dyslexic font ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("summify_dyslexic", JSON.stringify(dyslexicFont));
    document.documentElement.classList.toggle("dyslexic", dyslexicFont);
  }, [dyslexicFont]);

  // ── High contrast ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("summify_contrast", JSON.stringify(highContrast));
    document.documentElement.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  // ── Reduce motion ──────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("summify_motion", JSON.stringify(reduceMotion));
    document.documentElement.classList.toggle("reduce-motion", reduceMotion);
  }, [reduceMotion]);

  // ── Font size ──────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("summify_fontsize", fontSize);
    // Set directly as an inline style on <html> — highest specificity,
    // overrides Tailwind base resets and any other font-size declarations.
    document.documentElement.style.fontSize = FONT_SIZES[fontSize] ?? FONT_SIZES.medium;
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{
      darkMode,     setDarkMode,
      dyslexicFont, setDyslexicFont,
      highContrast, setHighContrast,
      reduceMotion, setReduceMotion,
      fontSize,     setFontSize,
      FONT_SIZES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
