import { notFound } from "next/navigation";
import { getScheduleData, getFormResponses } from "@/lib/schedule-utils";
import { sportsConfig } from "@/lib/sports-config";
import { createClient } from "@/lib/supabase/server";
import SportPage from "@/components/sport-page";

export const dynamic = "force-dynamic";

export default async function SportRoute({
  params,
}: {
  params: Promise<{ sport: string }>;
}) {
  const { sport } = await params;
  const config = sportsConfig[sport];

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

  let user = null;
  if (config.authEnabled) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

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
