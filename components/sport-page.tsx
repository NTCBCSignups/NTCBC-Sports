import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Lock, MapPin } from "lucide-react";
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
  const signUpTimeRange =
    scheduleData?.form_open_display && scheduleData?.form_close_display
      ? `${scheduleData.form_open_display} - ${scheduleData.form_close_display} (Eastern Time)`
      : null;

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {config.emoji} NTCBC {config.name} Drop-In Sessions
        </h1>

        {signUpTimeRange && (
          <div className="flex gap-6 text-sm text-gray-500 mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>
                {isFormOpen
                  ? `Sign-ups open from ${signUpTimeRange}`
                  : `Next sign-up opens from ${signUpTimeRange}`}
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

      {scheduleData?.verse_ref && scheduleData?.verse_text && (
        <div className="text-sm text-gray-700">
          <h1 className="font-semibold">{scheduleData.verse_ref}</h1>
          <p className="text-sm text-gray-500 italic">
            {scheduleData.verse_text}
          </p>
        </div>
      )}

      {isFormOpen && scheduleData?.form_link ? (
        <Button asChild className="w-full">
          <a
            href={scheduleData.form_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            Sign up for {scheduleData.date}
          </a>
        </Button>
      ) : (
        <Button disabled className="w-full">
          <Lock className="w-4 h-4 shrink-0" />
          Registration Closed
        </Button>
      )}

      {isFormOpen && config.responseTable && formResponses && (
        <SignupsTable
          responses={formResponses}
          columns={config.responseTable.columns}
          playerCap={config.responseTable.playerCap}
          filterColumn={config.responseTable.filterColumn}
        />
      )}

      <div className="mb-8 space-y-6">
        <div>
          <h2 className="font-semibold text-gray-900 mb-2">
            About our sign-ups
          </h2>
          <div className="flex gap-6 text-sm mb-4 text-gray-700">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span>{config.location.name}</span>
                <span>{config.location.address}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-6 text-sm mb-4 text-gray-700">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>{config.day}</span>
            </div>
          </div>
          <div className="space-y-1">
            {config.sessions.map((session) => (
              <div
                key={session.time}
                className="flex gap-6 text-sm text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{session.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

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
            <li className="flex items-start text-sm">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
              <span>
                This {config.name.toLowerCase()} session is part of our church
                ministry. It&apos;s a great time for us to connect not only
                through the game but also with each other and the message of the
                gospel. Everyone, regardless of your faith background, is
                welcome to join.
              </span>
            </li>
            {config.additionalNotes.map((note) => (
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
