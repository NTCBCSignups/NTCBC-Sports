import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Lock, MapPin } from "lucide-react";
import { getScheduleData } from "./schedule-utils";
import CountdownTimer from "./countdown-timer";

export default async function HomePage() {
  // Fetch schedule data on the server
  const { scheduleData, isFormOpen } = await getScheduleData();

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NTCBC Volleyball Drop-In Sessions
        </h1>
        <div className="flex gap-6 text-sm text-gray-500 mb-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Sign-ups open from Monday 10 PM - Tuesday 5 PM</span>
          </div>
        </div>

        {/* Client-side countdown timer (only shows when form is closed) */}
        {scheduleData && (
          <CountdownTimer
            openTime={scheduleData.form_open}
            isFormOpen={isFormOpen}
          />
        )}
      </div>

      {/* Button - rendered with correct state immediately */}
      {isFormOpen && scheduleData?.link ? (
        <Button asChild className="w-full">
          <a href={scheduleData.link} target="_blank" rel="noopener noreferrer">
            Sign up
          </a>
        </Button>
      ) : (
        <Button disabled className="w-full">
          <Lock className="w-4 h-4" />
          Registration Closed
        </Button>
      )}

      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="font-semibold text-gray-900 mb-4">About our sign-ups</h2>
        <div className="text-left space-y-4">
          <div className="text-sm text-gray-700 space-y-4">
            <div className="flex gap-6 text-sm mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <div className="flex flex-col">
                  <span>North Toronto Chinese Baptist Church</span>
                  <span>88 Finch Ave W, North York</span>
                </div>
              </div>
            </div>

            <div className="flex gap-6 text-sm mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Wednesday Nights</span>
              </div>
            </div>

            <div>
              <p className="font-medium text-gray-800 mb-2">
                We have two sessions. You may sign up to one or both:
              </p>
              <ul className="space-y-1.5 ml-4">
                <li className="flex items-center text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                  <span>
                    <span className="font-medium">6:00 PM - 8:15 PM</span> -
                    Casual
                  </span>
                </li>
                <li className="flex items-center text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                  <span>
                    <span className="font-medium">8:15 PM - 10:30 PM</span> -
                    Intermediate+ (Must know 5-1)
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 mb-2">
                Important Notes:
              </h4>
              <ul className="space-y-2.5 ml-4">
                <li className="flex items-start text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span>
                    By filling out the form, you are signing up to attend this
                    session. If you can no longer attend please notify the group
                    chat or DM the organizers (Jonathan Wong, Jonathan Leung,
                    Christa Ng).
                  </span>
                </li>
                <li className="flex items-start text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span>
                    If this is your first time coming, please fill out this{" "}
                    <a
                      className="text-blue-500"
                      href="https://docs.google.com/forms/d/e/1FAIpQLSdNYPEtVxNSR2XQ_tAT0UpCRr2FnuG9MAEGPkUFk1noRxSx_w/viewform"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      waiver
                    </a>
                    .
                  </span>
                </li>
                <li className="flex items-start text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span>
                    This volleyball session is part of our church ministry. It's
                    a great time for us to connect not only through the game but
                    also with each other and the message of the gospel.
                    Everyone, regardless of your faith background, is welcome to
                    join.
                  </span>
                </li>
                <li className="flex items-start text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span>
                    Don't play volleyball in the basement foyer as you may break
                    the lights.
                  </span>
                </li>
                <li className="flex items-start text-sm">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                  <span>
                    Don't cross the centre line, as this can cause serious
                    injuries.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
