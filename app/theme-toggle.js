"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icons";

/* Theme toggle. Explicit choice persists and beats the system preference;
   the pre-paint script in app/layout.js applies it before first render.
   Lifted out of app/page.js so the login and legal surfaces ship the same
   control rather than a second copy that drifts. */
export function ThemeToggle() {
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") || "light");
  }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("thewinningloop-theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button
      className="theme-toggle"
      onClick={flip}
      aria-label={
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      }
      title={theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {theme === "dark" ? <Icon.sun /> : <Icon.moon />}
    </button>
  );
}
