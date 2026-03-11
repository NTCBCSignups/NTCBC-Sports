import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Lock,
  MapPin,
  UserStar,
} from "lucide-react";
import { ScheduleData } from "@/lib/schedule-utils";
import { SportConfig } from "@/lib/sports-config";
import CountdownTimer from "@/components/countdown-timer";
import SignupsTable from "@/components/signups-table";

interface SportPageProps {
  config: SportConfig;
  scheduleData: ScheduleData | null;
  isFormOpen: boolean;
  formResponses?: Record<string, string>[];
}

export default function SportPage({
  config,
  scheduleData,
  isFormOpen,
  formResponses,
}: SportPageProps) {
  function formatDate(dateStr: string): string {
    if (!dateStr) return dateStr;
    // Parse YYYY-MM-DD directly to avoid UTC timezone shifts
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts.map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      }
    }
    return dateStr;
  }

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <Image src="/favicon.ico" alt="NTCBC" width={18} height={18} className="rounded-sm" />
        NTCBC Sports
      </Link>
      {/* Title + info bullets */}
      <div className="space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">
          {config.emoji} {config.name}
        </h1>

        <h2 className="font-semibold text-gray-900">Drop-In Sessions</h2>
        <div className="flex flex-col sm:flex-row sm:gap-12 text-sm">
          {/* Left stack */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Location</span>
                {config.location.mapsLink ? (
                  <a
                    href={config.location.mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
                  >
                    {config.location.name} <br /> {config.location.address}
                  </a>
                ) : (
                  <>
                    <span className="text-gray-700">
                      {config.location.name}
                    </span>
                    <span className="text-gray-700">
                      {config.location.address}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Date</span>
                <span className="text-gray-700">{config.day}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Time</span>
                {config.sessions.map((session) => (
                  <span key={session.time} className="text-gray-700">
                    {session.time}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right stack */}
          <div className="space-y-2 mt-2 sm:mt-0">
            <div className="flex items-start gap-2">
              <UserStar className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Admins</span>
                <span className="text-gray-700">{config.organizers}</span>
              </div>
            </div>
            {scheduleData?.form_open_display &&
              scheduleData?.form_close_display && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      Sign-ups open from
                    </span>
                    <span className="text-gray-700">
                      {scheduleData.form_open_display}
                    </span>
                    <span className="text-gray-700">
                      {scheduleData.form_close_display}
                    </span>
                  </div>
                </div>
              )}
            {scheduleData && (
              <CountdownTimer
                openTime={scheduleData.form_open}
                closeTime={scheduleData.form_close}
                isFormOpen={isFormOpen}
              />
            )}
          </div>
        </div>
      </div>

      {scheduleData?.verse_ref && scheduleData?.verse_text && (
        <div className="text-sm text-gray-700">
          <h1 className="font-semibold">{scheduleData.verse_ref}</h1>
          <p className="text-sm text-gray-500 italic">
            {scheduleData.verse_text}
          </p>
        </div>
      )}

      {isFormOpen && scheduleData?.form_link ? (
        <Button
          asChild
          className="w-full max-sm:w-full sm:w-auto rounded-full px-8 has-[>svg]:px-8"
        >
          <a
            href={scheduleData.form_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sign-up for {formatDate(scheduleData.date)}
            <ExternalLink className="w-4 h-4 shrink-0" />
          </a>
        </Button>
      ) : (
        <Button
          disabled
          className="w-full max-sm:w-full sm:w-auto rounded-full px-8 has-[>svg]:px-8"
        >
          <Lock className="w-4 h-4 shrink-0" />
          Sign-up closed for {formatDate(scheduleData?.date ?? "")}
        </Button>
      )}

      {isFormOpen && config.responseTable && formResponses && (
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-900">Attendance</h2>
          <Tabs
            defaultValue={config.responseTable.tables[0].label}
            className="gap-4"
          >
            <TabsList className="max-sm:w-full rounded-full">
              {config.responseTable.tables.map((table) => (
                <TabsTrigger
                  key={table.label}
                  value={table.label}
                  className="max-sm:flex-1 rounded-full px-5"
                >
                  {table.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {config.responseTable.tables.map((table) => (
              <TabsContent key={table.label} value={table.label}>
                <SignupsTable
                  label={table.label}
                  responses={formResponses}
                  columns={config.responseTable!.columns}
                  playerCap={table.playerCap}
                  filterColumn={table.filterColumn}
                  hiddenColumns={table.hiddenColumns}
                  description={table.description}
                  showLabel={false}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      <div className="mb-8 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">Important Notes</h2>
          <ul className="space-y-2.5 ml-4 text-gray-700">
            {config.waiverLink && (
              <li className="flex items-start text-sm">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
                <span>
                  If this is your first time coming, please fill out this{" "}
                  <a
                    className="text-blue-500 underline"
                    href={config.waiverLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    waiver
                  </a>
                  .
                </span>
              </li>
            )}
            {config.notes.map((note) => (
              <li key={note} className="flex items-start text-sm">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
