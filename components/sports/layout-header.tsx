"use client";

import { usePathname } from "next/navigation";

export default function LayoutHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.includes("/admin");

  return (
    <div
      className={`${isAdmin ? "max-w-6xl" : "max-w-4xl"} mx-auto flex items-center justify-between min-h-8 mb-6`}
    >
      {children}
    </div>
  );
}
