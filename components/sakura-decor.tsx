"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const PETAL_COUNT = 12;
const PETALS = ["🌸", "✿", "❀", "💮"];

interface Petal {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function SakuraDecor() {
  const { resolvedTheme } = useTheme();
  const [petals, setPetals] = useState<Petal[]>([]);

  const isSakura = resolvedTheme === "sakura";

  useEffect(() => {
    if (!isSakura) {
      setPetals([]);
      return;
    }
    const generated: Petal[] = Array.from({ length: PETAL_COUNT }, (_, i) => ({
      id: i,
      emoji: PETALS[i % PETALS.length]!,
      // Cluster on left (0-12%) and right (88-100%) sides
      left: i < PETAL_COUNT / 2 ? Math.random() * 12 : 88 + Math.random() * 12,
      delay: Math.random() * 8,
      duration: 10 + Math.random() * 8,
      size: 0.7 + Math.random() * 0.6,
    }));
    setPetals(generated);
  }, [isSakura]);

  if (!isSakura || petals.length === 0) return null;

  return (
    <>
      {/* Side glitter strips */}
      <div
        className="sakura-glitter fixed left-0 top-0 h-full w-3 pointer-events-none z-0"
        style={{ opacity: 0.18 }}
      />
      <div
        className="sakura-glitter fixed right-0 top-0 h-full w-3 pointer-events-none z-0"
        style={{ opacity: 0.18 }}
      />
      {/* Floating petals */}
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}rem`,
            opacity: 0,
          }}
          aria-hidden="true"
        >
          {p.emoji}
        </span>
      ))}
    </>
  );
}
