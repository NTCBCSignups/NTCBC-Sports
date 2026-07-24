"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react";
import { colors, statusColors, feedback } from "@/lib/styles";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  applyCcsaGameSync,
  cancelStaleCcsaGames,
  syncCcsaGameNotes,
} from "@/lib/softball/ccsa-sync";
import { getCcsaGamesPreview } from "@/lib/softball/ccsa-preview";
import type { GamesPreview } from "@/lib/softball/ccsa-preview";

interface CcsaGamesTabProps {
  gamesPreview: GamesPreview | null;
  setGamesPreview: (v: GamesPreview | null) => void;
  sessionTabs: { value: string; label: string }[];
  defaultSessionType: string;
  pending: boolean;
  setPending: (v: boolean) => void;
  onRefresh: () => Promise<void>;
}

export default function CcsaGamesTab({
  gamesPreview,
  setGamesPreview,
  sessionTabs,
  defaultSessionType,
  pending,
  setPending,
  onRefresh,
}: CcsaGamesTabProps) {
  const [sessionType, setSessionType] = useState(defaultSessionType);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesResult, setGamesResult] = useState<string | null>(null);
  const [selectedStale, setSelectedStale] = useState<Set<string>>(new Set());
  const [confirmedUpdates, setConfirmedUpdates] = useState<Set<string>>(new Set());

  const hasGameChanges = gamesPreview?.games.some(
    (g) => g.status === "new" || g.status === "update" || g.status === "recreate",
  );
  const hasNoteSync = gamesPreview?.games.some((g) => g.needsNoteSync);

  const handleApply = async () => {
    if (!gamesPreview) return;
    setPending(true);
    setGamesError(null);
    setGamesResult(null);

    const toApply = gamesPreview.games.filter((g) => {
      if (g.status === "new" || g.status === "recreate") return true;
      if (g.status === "update") {
        return !g.needsConfirmation || confirmedUpdates.has(g.gamecode);
      }
      return false;
    });

    const result = await applyCcsaGameSync(sessionType, toApply);
    if (result.errors.length > 0) setGamesError(result.errors.join("; "));
    const parts: string[] = [];
    if (result.created > 0) parts.push(`${result.created} created`);
    if (result.updated > 0) parts.push(`${result.updated} updated`);
    if (parts.length > 0) setGamesResult(parts.join(", "));
    await onRefresh();
    setPending(false);
  };

  const handleSyncNotes = async () => {
    if (!gamesPreview) return;
    setPending(true);
    setGamesError(null);
    setGamesResult(null);
    const result = await syncCcsaGameNotes(gamesPreview.games);
    setGamesResult(`Synced notes for ${result.count} game(s)`);
    await onRefresh();
    setPending(false);
  };

  const handleCancelStale = async () => {
    if (selectedStale.size === 0) return;
    setPending(true);
    setGamesError(null);
    const result = await cancelStaleCcsaGames(sessionType, Array.from(selectedStale));
    if (result.error) {
      setGamesError(result.error);
    } else {
      setGamesResult(`Cancelled ${result.count} stale game(s)`);
      if (gamesPreview) {
        setGamesPreview({
          ...gamesPreview,
          games: gamesPreview.games.filter(
            (g) => g.status !== "stale" || !selectedStale.has(g.staleSessionId!),
          ),
        });
      }
      setSelectedStale(new Set());
    }
    setPending(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {sessionTabs.length > 1 && (
          <>
            <span className="text-xs text-muted-foreground">Sync to:</span>
            <Select
              value={sessionType}
              onValueChange={async (val) => {
                setSessionType(val);
                setGamesPreview(null);
                setGamesError(null);
                setGamesResult(null);
                setPending(true);
                const gResult = await getCcsaGamesPreview(val);
                if ("error" in gResult) {
                  setGamesError(gResult.error);
                } else {
                  setGamesPreview(gResult);
                  setSelectedStale(new Set());
                  setConfirmedUpdates(new Set());
                }
                setPending(false);
              }}
            >
              <SelectTrigger className="h-7 w-auto text-base md:text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sessionTabs.map((tab) => (
                  <SelectItem key={tab.value} value={tab.value}>
                    {tab.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        {hasGameChanges && (
          <Button
            size="sm"
            onClick={handleApply}
            disabled={pending}
            className="rounded-full ml-auto"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {pending ? "Applying..." : "Apply"}
          </Button>
        )}
        {!hasGameChanges && hasNoteSync && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncNotes}
            disabled={pending}
            className="rounded-full ml-auto"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {pending ? "Syncing..." : "Sync Notes"}
          </Button>
        )}
      </div>

      {(gamesResult || gamesError) && (
        <div className="flex flex-wrap items-center gap-2">
          {gamesResult && <p className={feedback.success}>{gamesResult}</p>}
          {gamesError && <p className={feedback.error}>{gamesError}</p>}
        </div>
      )}

      {gamesPreview && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {gamesPreview.teamName} · Schedule updated: {gamesPreview.lastupdate} ·{" "}
            {gamesPreview.games.length} games
          </p>

          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2">Game</th>
                  <th className="px-4 py-2">Date & Time</th>
                  <th className="px-4 py-2 hidden md:table-cell">Location</th>
                  <th className="sticky right-0 bg-muted px-4 py-2 border-l">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gamesPreview.games.map((row) => (
                  <tr
                    key={row.gamecode}
                    className={
                      row.status === "past" ||
                      row.status === "not_found" ||
                      row.status === "cancelled"
                        ? "opacity-50"
                        : undefined
                    }
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {row.status === "stale" && row.staleSessionId && (
                          <input
                            type="checkbox"
                            checked={selectedStale.has(row.staleSessionId)}
                            onChange={(e) => {
                              const sid = row.staleSessionId!;
                              setSelectedStale((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(sid);
                                else next.delete(sid);
                                return next;
                              });
                            }}
                            className="rounded"
                          />
                        )}
                        {row.status === "update" && row.needsConfirmation && (
                          <input
                            type="checkbox"
                            checked={confirmedUpdates.has(row.gamecode)}
                            onChange={(e) => {
                              setConfirmedUpdates((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(row.gamecode);
                                else next.delete(row.gamecode);
                                return next;
                              });
                            }}
                            className="rounded"
                          />
                        )}
                        {row.title}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {row.status === "update" && row.oldDate ? (
                        <>
                          <div className="text-muted-foreground line-through text-xs">
                            {row.oldDate} {row.oldTime}
                          </div>
                          <div className={`text-xs ${colors.success}`}>
                            {row.date} {row.time}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">
                          {row.date} {row.time}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
                      {row.status === "update" && row.oldLocation ? (
                        <>
                          <div className="line-through text-xs">{row.oldLocation}</div>
                          <div className={`text-xs ${colors.success}`}>{row.location}</div>
                        </>
                      ) : (
                        row.location || "—"
                      )}
                    </td>
                    <td className="sticky right-0 bg-card border-l px-4 py-2">
                      {row.status === "synced" && (
                        <span className={`inline-flex items-center gap-1 ${colors.success}`}>
                          <Check className="h-3.5 w-3.5" />
                          <span className="text-xs">Synced</span>
                        </span>
                      )}
                      {row.status === "new" && (
                        <Badge
                          className={`${statusColors.green.bg} ${statusColors.green.text} ${statusColors.green.border}`}
                        >
                          New
                        </Badge>
                      )}
                      {row.status === "update" && (
                        <Badge
                          className={`${statusColors.amber.bg} ${statusColors.amber.text} ${statusColors.amber.border}`}
                        >
                          {row.needsConfirmation ? "Confirm?" : "Rescheduled"}
                        </Badge>
                      )}
                      {row.status === "recreate" && (
                        <Badge
                          className={`${statusColors.info.bg} ${statusColors.info.text} ${statusColors.info.border}`}
                        >
                          Recreate
                        </Badge>
                      )}
                      {row.status === "stale" && <Badge variant="destructive">Stale</Badge>}
                      {row.status === "past" && (
                        <span className="text-xs text-muted-foreground">Played</span>
                      )}
                      {row.status === "cancelled" && (
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          Cancelled
                        </Badge>
                      )}
                      {row.status === "not_found" && (
                        <span className="text-xs text-muted-foreground">Not synced</span>
                      )}
                      {row.status === "mismatch" && (
                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                          Mismatch
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {gamesPreview.games.some((g) => g.status === "stale") && selectedStale.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleCancelStale}
              disabled={pending}
              className="rounded-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel {selectedStale.size} Stale Game{selectedStale.size > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}

      {!gamesPreview && !gamesError && pending && (
        <p className="text-xs text-muted-foreground">Syncing game schedule...</p>
      )}
    </div>
  );
}
