import { getScheduleData } from "@/lib/schedule-utils";
import { sportsConfig } from "@/lib/sports-config";
import SportPage from "@/components/sport-page";

export const dynamic = "force-dynamic";

const config = sportsConfig.volleyball;

export default async function VolleyballPage() {
  const { scheduleData, isFormOpen } = await getScheduleData(config.id);

  return (
    <SportPage
      config={config}
      scheduleData={scheduleData}
      isFormOpen={isFormOpen}
    />
  );
}
