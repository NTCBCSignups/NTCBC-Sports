import { getScheduleData, getFormResponses } from "@/lib/schedule-utils";
import { sportsConfig } from "@/lib/sports-config";
import SportPage from "@/components/sport-page";

export const dynamic = "force-dynamic";

const config = sportsConfig.basketball;

export default async function BasketballPage() {
  const { scheduleData, isFormOpen } = await getScheduleData(config.id);

  const formResponses =
    isFormOpen &&
    scheduleData?.response_sheet_id &&
    config.responseTable
      ? await getFormResponses(
          scheduleData.response_sheet_id,
          config.responseTable.sheetTab,
          config.responseTable.columns
        )
      : [];

  return (
    <SportPage
      config={config}
      scheduleData={scheduleData}
      isFormOpen={isFormOpen}
      formResponses={formResponses}
    />
  );
}
