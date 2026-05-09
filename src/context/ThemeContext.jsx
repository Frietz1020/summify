import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [darkMode,     setDarkMode]     = useState(() => JSON.parse(localStorage.getItem("summify_dark")     ?? "false"));
  const [dyslexicFont, setDyslexicFont] = useState(() => JSON.parse(localStorage.getItem("summify_dyslexic") ?? "false"));

  // Persist + apply dark mode class on <html>
  useEffect(() => {
    localStorage.setItem("summify_dark", JSON.stringify(darkMode));
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // Persist + apply dyslexic font class on <html>
  useEffect(() => {
    localStorage.setItem("summify_dyslexic", JSON.stringify(dyslexicFont));
    document.documentElement.classList.toggle("dyslexic", dyslexicFont);
  }, [dyslexicFont]);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, dyslexicFont, setDyslexicFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
