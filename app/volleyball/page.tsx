"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowBigRight,
  CalendarDays,
  Clock,
  Lock,
  MapPin,
  RefreshCcw,
} from "lucide-react";

interface ScheduleData {
  form_open: string;
  form_close: string;
  link: string;
}

export default function HomePage() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string>("");

  // Function to check if form is currently open
  const checkFormStatus = (data: ScheduleData) => {
    const now = new Date();
    const openTime = new Date(data.form_open);
    const closeTime = new Date(data.form_close);

    return now >= openTime && now <= closeTime;
  };

  // Function to calculate countdown to next opening
  const calculateCountdown = (openTime: string) => {
    const now = new Date().getTime();
    const targetTime = new Date(openTime).getTime();
    const difference = targetTime - now;

    if (difference <= 0) {
      return "Refresh now!";
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Fetch schedule data from Google Sheets
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch("/api/schedule");
        const data = await response.json();
        console.log(data);

        setScheduleData(data);
        setIsFormOpen(checkFormStatus(data));
      } catch (error) {
        console.error("Error fetching schedule:", error);
        // Fallback to closed state if error
        setIsFormOpen(false);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  // Update countdown every second when form is closed
  useEffect(() => {
    if (scheduleData && !isFormOpen) {
      const interval = setInterval(() => {
        setCountdown(calculateCountdown(scheduleData.form_open));
      }, 1000);

      // Initial countdown calculation
      setCountdown(calculateCountdown(scheduleData.form_open));

      return () => clearInterval(interval);
    }
  }, [scheduleData, isFormOpen]);

  return (
    <div className="min-h-screen bg-blue-100">
      <div className="container mx-auto px-4 py-8">
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
            {/* Countdown when form is closed */}
            {!loading && scheduleData && !isFormOpen && (
              <div className="flex gap-6 text-sm text-gray-500 mb-2">
                <div className="flex items-center gap-2">
                  <ArrowBigRight className="h-4 w-4" />
                  <span>Next registration opens in: </span>
                  <span className="font-mono text-blue-500">{countdown}</span>
                </div>
              </div>
            )}
            {!loading && scheduleData && !isFormOpen && (
              <div className="flex gap-6 text-sm text-gray-500 mb-2">
                <div className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4" />
                  <span>Refresh when time's up!</span>
                </div>
              </div>
            )}
          </div>
          {loading ? (
            <Button disabled className="w-full">
              Loading...
            </Button>
          ) : isFormOpen && scheduleData ? (
            <Button asChild className="w-full">
              <a
                href={scheduleData.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Sign up
              </a>
            </Button>
          ) : (
            <Button disabled className="w-full">
              <Lock className="w-4 h-4 mr-2" />
              Registration Closed
            </Button>
          )}
          <div className="max-w-4xl mx-auto mb-8">
            <h2 className=" font-semibold text-gray-900 mb-4 text-left">
              About our sign-ups
            </h2>
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
                        <span className="font-medium">6:00-8:15 PM</span> -
                        Casual
                      </span>
                    </li>
                    <li className="flex items-center text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                      <span>
                        <span className="font-medium">8:15-10:30 PM</span> -
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
                        By filling out the form, you are signing up to attend
                        this session. If you can no longer attend please notify
                        the group chat or DM the organizers (Jonathan Wong,
                        Jonathan Leung, Christa Ng).
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
                        This volleyball session is part of our church ministry.
                        It's a great time for us to connect not only through the
                        game but also with each other and the message of the
                        gospel. Everyone, regardless of your faith background,
                        is welcome to join.
                      </span>
                    </li>
                    <li className="flex items-start text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 flex-shrink-0"></div>
                      <span>
                        Don't play volleyball in the basement foyer as you may
                        break the lights.
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
      </div>
    </div>
  );
}
