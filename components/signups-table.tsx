import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FormResponseColumn } from "@/lib/schedule-utils";

interface SignupsTableProps {
  responses: Record<string, string>[];
  columns: FormResponseColumn[];
  playerCap: number;
  filterColumn?: { header: string; value: string };
}

function formatTimestamp(raw: string): string {
  if (!raw) return "";
  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function SignupsTable({
  responses,
  columns,
  playerCap,
  filterColumn,
}: SignupsTableProps) {
  const filtered = filterColumn
    ? responses.filter((r) => r[filterColumn.header] === filterColumn.value)
    : responses;

  const hiddenHeaders = new Set(["Timestamp"]);
  if (filterColumn) hiddenHeaders.add(filterColumn.header);

  const displayColumns = columns.filter(
    (col) => !hiddenHeaders.has(col.header),
  );
  const hasTimestamp = columns.some((col) => col.header === "Timestamp");

  if (filtered.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Sign-ups</h2>
        </div>
        <div className="rounded-lg border bg-white">
          <div className="p-6 text-center text-sm text-muted-foreground">
            No sign-ups yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">
          Responses ({filtered.length})
        </h2>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              {hasTimestamp && <TableHead>Timestamp</TableHead>}
              {displayColumns.map((col) => (
                <TableHead key={col.header}>{col.header}</TableHead>
              ))}
              <TableHead className="sticky right-0 bg-muted/50 text-right">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((response, index) => {
              const isConfirmed = index < playerCap;
              return (
                <TableRow
                  key={index}
                  className={
                    isConfirmed
                      ? "bg-green-100 hover:bg-green-200"
                      : "bg-amber-100 hover:bg-amber-200"
                  }
                >
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
                  {isConfirmed ? (
                    <TableCell className="sticky right-0 text-right bg-green-100">
                      <p className="text-green-800">Confirmed</p>
                    </TableCell>
                  ) : (
                    <TableCell className="sticky right-0 text-right bg-amber-100">
                      <p className="text-amber-800">Waitlist</p>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
