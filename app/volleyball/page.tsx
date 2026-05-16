import { notFound } from "next/navigation";
import { getScheduleData, getFormResponses } from "@/lib/schedule-utils";
import { resolvedSportsConfig } from "@/config/config-resolver";
import { getUser } from "@/lib/supabase/user";
import SportPage from "@/components/sports/sport-page";

export const dynamic = "force-dynamic";

const sport = "volleyball";

export default async function VolleyballPage() {
  const config = resolvedSportsConfig[sport];

  if (!config) notFound();

  const { scheduleData, isFormOpen } = await getScheduleData(config.id);

  const formResponses =
    isFormOpen && scheduleData?.response_sheet_id && config.responseTable
      ? await getFormResponses(
        scheduleData.response_sheet_id,
        config.responseTable.sheetTab,
        config.responseTable.columns,
      )
      : [];

  // Middleware validates the JWT and forwards the user via request header.
  const user = config.authEnabled ? await getUser() : null;

  return (
    <SportPage
      config={config}
      scheduleData={scheduleData}
      isFormOpen={isFormOpen}
      formResponses={formResponses}
      user={user}
    />
  );
}
