/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: "class", // matches `html.dark` toggle in ThemeContext
  theme: {
    extend: {
      // ── Map CSS variables → Tailwind utilities ──────────────
      // Usage: bg-page, bg-card, text-primary, border-default, etc.
      colors: {
        page:      "var(--bg-page)",
        card:      "var(--bg-card)",
        input:     "var(--bg-input)",
        nav:       "var(--bg-nav)",
        glass:     "var(--bg-glass)",
        primary:   "var(--color-primary)",
        accent:    "var(--color-accent)",
        secondary: "var(--color-secondary)",
        teal:      "var(--clr-teal)",
        lavender:  "var(--clr-lavender)",
        mauve:     "var(--clr-mauve)",
      },
      textColor: {
        primary:   "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted:     "var(--text-muted)",
        "on-nav":  "var(--text-on-nav)",
        "on-accent":"var(--text-on-accent)",
      },
      borderColor: {
        default: "var(--border-default)",
        input:   "var(--border-input)",
        glass:   "var(--border-glass)",
      },
      boxShadow: {
        card:   "var(--shadow-card)",
        nav:    "var(--shadow-nav)",
        accent: "var(--glow-accent)",
      },
      fontFamily: {
        body: "var(--font-body)",
      },
      borderRadius: {
        card:  "var(--radius-card)",
        btn:   "var(--radius-btn)",
        input: "var(--radius-input)",
      },
      backdropBlur: {
        glass: "var(--glass-blur)",
      },
    },
  },
  plugins: [],
};