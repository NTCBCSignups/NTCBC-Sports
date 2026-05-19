import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/sports/badges";
import { FormResponseColumn } from "@/lib/schedule-utils";
import { formatTimestamp } from "@/lib/format";
import { colors } from "@/lib/styles";

interface SignupsTableProps {
  label: string;
  responses: Record<string, string>[];
  columns: FormResponseColumn[];
  playerCap: number;
  filterColumn?: { header: string; value: string };
  hiddenColumns?: string[];
  description?: string;
}

export default function SignupsTable({
  label,
  responses,
  columns,
  playerCap,
  filterColumn,
  hiddenColumns = [],
  description,
}: SignupsTableProps) {
  const filtered = filterColumn
    ? responses.filter((r) => r[filterColumn.header] === filterColumn.value)
    : responses;

  const sorted = [...filtered].sort((a, b) => {
    const tsA = a["Timestamp"] ? new Date(a["Timestamp"]).getTime() : 0;
    const tsB = b["Timestamp"] ? new Date(b["Timestamp"]).getTime() : 0;
    return tsA - tsB;
  });

  const hiddenHeaders = new Set(["Timestamp", ...hiddenColumns]);
  if (filterColumn) hiddenHeaders.add(filterColumn.header);

  const displayColumns = columns.filter(
    (col) => !hiddenHeaders.has(col.header),
  );
  const hasTimestamp = columns.some((col) => col.header === "Timestamp");

  const isOverCap = sorted.length > playerCap;

  const infoTiles = (
    <div className="flex border-b">
      <div className="flex-1 px-4 py-3 border-r">
        <p className="text-xs text-muted-foreground mb-0.5">Capacity</p>
        <p
          className={`text-sm font-semibold ${isOverCap ? colors.warning : "text-foreground"}`}
        >
          {sorted.length} / {playerCap}
        </p>
      </div>
      {description && (
        <div className="flex-1 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">Skill Level</p>
          <p className="text-sm font-semibold text-foreground">{description}</p>
        </div>
      )}
    </div>
  );

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">{label}</h2>
        </div>
        <div className="overflow-hidden rounded-lg border bg-card">
          {infoTiles}
          <div className="p-6 text-center text-sm text-muted-foreground">
            No sign-ups yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border bg-card">
        {infoTiles}
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              {hasTimestamp && <TableHead>Timestamp</TableHead>}
              {displayColumns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
              <TableHead className="sticky right-0 bg-muted/50 border-l">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((response, index) => {
              const isConfirmed = index < playerCap;
              return (
                <TableRow key={index}>
                  <TableCell className="font-mono text-xs">
                    {index + 1}
                  </TableCell>
                  {hasTimestamp && (
                    <TableCell className="text-xs">
                      {formatTimestamp(response["Timestamp"])}
                    </TableCell>
                  )}
                  {displayColumns.map((col) => (
                    <TableCell key={col.header}>
                      {response[col.header]}
                    </TableCell>
                  ))}
                  <TableCell className="sticky right-0 bg-card border-l">
                    <StatusBadge status={isConfirmed ? "confirmed" : "waitlisted"} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
