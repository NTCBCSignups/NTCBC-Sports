"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ChangelogEntry } from "@/config/changelog";

const STORAGE_KEY = "changelogSeen";

function getSeenId(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? Number(raw) : 0;
}

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

export function ChangelogWidget({ entries }: { entries: ChangelogEntry[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenId, setSeenId] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | null>(null);

  // Hydrate from localStorage after mount
  useEffect(() => {
    setSeenId(getSeenId());
    setMounted(true);
  }, []);

  // Auto-open when there are unread entries relevant to the current page (once per navigation)
  useEffect(() => {
    if (!mounted || open || autoOpenedFor === pathname) return;
    const hasRelevantUnread = entries.some(
      (e) => e.id > seenId && (!e.routes || e.routes.some((r) => pathname.startsWith(r))),
    );
    if (!hasRelevantUnread) return;

    const timer = setTimeout(() => {
      setOpen(true);
      setAutoOpenedFor(pathname);
    }, 500);
    return () => clearTimeout(timer);
  }, [pathname, mounted, seenId, entries, open, autoOpenedFor]);

  const latestId = entries[0]?.id ?? 0;
  const unreadCount = entries.filter((e) => e.id > seenId).length;

  // Auto-mark as read after popover is open for 1 second
  useEffect(() => {
    if (!open || seenId >= latestId) return;
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, String(latestId));
      setSeenId(latestId);
    }, 1000);
    return () => clearTimeout(timer);
  }, [open, seenId, latestId]);

  const markAllRead = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(latestId));
    setSeenId(latestId);
    setOpen(false);
  }, [latestId]);

  if (!mounted) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-8 w-8 ${open ? "bg-accent text-accent-foreground" : ""}`}
        >
          <Megaphone className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
          )}
          <span className="sr-only">What&apos;s new</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} sideOffset={8} className="w-80 p-0">
        <PopoverArrow width={14} height={7} />
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">What&apos;s New</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:text-primary/80 font-medium cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto overscroll-contain">
          {entries.map((entry) => {
            const isUnread = entry.id > seenId;
            const isRelevant =
              isUnread && (!entry.routes || entry.routes.some((r) => pathname.startsWith(r)));
            return (
              <div
                key={entry.id}
                className={`px-4 py-3 border-b last:border-b-0 ${
                  isRelevant
                    ? "border-l-2 border-l-primary bg-primary/5"
                    : isUnread
                      ? "border-l-2 border-l-primary/40"
                      : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entry.title}</span>
                  {isUnread && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                      New
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                <span className="text-[11px] text-muted-foreground/60 mt-1 block">
                  {formatRelativeDate(entry.date)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="border-t px-4 py-2">
          <Link
            href="/changelog"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all updates →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
