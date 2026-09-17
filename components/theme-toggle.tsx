"use client";

/**
 * Theme toggle dropdown — positioned fixed top-right in layout.tsx.
 *
 * Two independent axes:
 *   Mode    — Light / Dark / System, owned by next-themes (`light`/`dark` class).
 *   Palette — Standard / Sakura, owned by PaletteProvider (`sakura` class).
 *
 * Both persist to localStorage, so Sakura keeps following the user's mode choice.
 */

import { useState, useEffect } from "react";
import { Contrast, Moon, Sun, Monitor, Flower2, Circle } from "lucide-react";
import { useTheme } from "next-themes";

import { usePalette } from "@/components/palette-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MODES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const PALETTE_OPTIONS = [
  { value: "default", label: "Standard", Icon: Circle },
  { value: "sakura", label: "Sakura", Icon: Flower2 },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { palette, setPalette } = usePalette();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-transparent">
          <Contrast className="h-4 w-4 fill-current [&_circle]:fill-none" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex gap-1 p-2">
        <div className="flex flex-col min-w-28">
          <div className="px-2 py-1.5 text-sm font-medium">Palette</div>
          {PALETTE_OPTIONS.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onSelect={(e) => e.preventDefault()}
              onClick={() => setPalette(value)}
              className={palette === value ? "bg-status-info" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator
          className="mx-0 my-0 h-auto w-px self-stretch"
          aria-orientation="vertical"
        />
        <div className="flex flex-col min-w-28">
          <div className="px-2 py-1.5 text-sm font-medium">Mode</div>
          {MODES.map(({ value, label, Icon }) => (
            <DropdownMenuItem
              key={value}
              onSelect={(e) => e.preventDefault()}
              onClick={() => setTheme(value)}
              className={theme === value ? "bg-status-info" : ""}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
