"use client";

/**
 * Theme switching system:
 *
 * 1. This provider (wraps the app in layout.tsx) adds/removes the "dark" class
 *    on <html> based on the user's preference (stored in localStorage).
 *
 * 2. Color values for light/dark are defined as CSS variables in app/globals.css
 *    under :root (light) and .dark (dark).
 *
 * 3. Those variables are registered in @theme inline (same file) so Tailwind
 *    generates utility classes like text-foreground, bg-card, text-success, etc.
 *
 * 4. Composed class tokens live in lib/styles.ts — components import from there.
 *
 * To add a new semantic color: define it in globals.css (:root + .dark),
 * register in @theme inline, then use the utility class anywhere.
 */

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
