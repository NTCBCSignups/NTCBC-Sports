"use client";

/**
 * Palette axis — orthogonal to next-themes' light/dark/system mode axis.
 *
 * next-themes owns the `light`/`dark` class on <html>; this provider owns an
 * extra `sakura` class. globals.css layers the two:
 *   .sakura      → sakura day tokens
 *   .dark.sakura → sakura night tokens
 *
 * So Sakura isn't a standalone theme — it's a bundle that follows whatever
 * light/dark/system choice the user already made, exactly like the default palette.
 */

import * as React from "react";

export type Palette = "default" | "sakura";

const STORAGE_KEY = "palette";

/** Render-blocking init so the palette is applied before first paint (no flash). */
export const PALETTE_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}")==="sakura")document.documentElement.classList.add("sakura")}catch(e){}`;

interface PaletteContextValue {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const PaletteContext = React.createContext<PaletteContextValue | null>(null);

export function PaletteProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPaletteState] = React.useState<Palette>("default");

  React.useEffect(() => {
    if (document.documentElement.classList.contains("sakura")) setPaletteState("sakura");

    // Mirror next-themes' cross-tab sync so palette follows the mode axis consistently.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next: Palette = e.newValue === "sakura" ? "sakura" : "default";
      setPaletteState(next);
      document.documentElement.classList.toggle("sakura", next === "sakura");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPalette = React.useCallback((next: Palette) => {
    setPaletteState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — palette still applies for this session.
    }
    document.documentElement.classList.toggle("sakura", next === "sakura");
  }, []);

  const value = React.useMemo(() => ({ palette, setPalette }), [palette, setPalette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

export function usePalette(): PaletteContextValue {
  const context = React.useContext(PaletteContext);
  if (!context) throw new Error("usePalette must be used within a PaletteProvider");
  return context;
}
