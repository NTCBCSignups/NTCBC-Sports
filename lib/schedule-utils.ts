import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export interface ScheduleData {
  date: string;
  form_open: string;
  form_close: string;
  form_open_display: string;
  form_close_display: string;
  verse_ref: string;
  verse_text: string;
  form_link: string;
  response_sheet_id: string;
}

export type Sport = 'volleyball' | 'basketball' | 'softball';

export interface FormResponseColumn {
  index: number;
  header: string;
}

export async function getScheduleData(sport: Sport): Promise<{
  scheduleData: ScheduleData | null;
  isFormOpen: boolean;
}> {
  try {
    // Each sport has its own Google Sheet, but they share the same API key
    let SHEET_ID: string | undefined;
    switch (sport) {
      case 'volleyball':
        SHEET_ID = process.env.GOOGLE_SHEET_ID_VOLLEYBALL;
        break;
      case 'basketball':
        SHEET_ID = process.env.GOOGLE_SHEET_ID_BASKETBALL;
        break;
      case 'softball':
        SHEET_ID = process.env.GOOGLE_SHEET_ID_SOFTBALL;
        break;
    }

    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

    // Use different sheet tabs based on environment
    const environment = process.env.NODE_ENV || 'development';
    const isProd = environment === 'production';
    const SHEET_TAB = isProd ? 'prod' : 'dev';
    const RANGE = `${SHEET_TAB}!A2:I`;

    console.log(`[${sport}] Environment: ${environment}, Using ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} sheet: ${SHEET_TAB}`);

    if (!SHEET_ID || !API_KEY) {
      console.error(`Missing Google Sheets configuration for ${sport}`);
      return { scheduleData: null, isFormOpen: false };
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;

    const response = await fetch(url, {
      // Important: Don't cache this request
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error('Google Sheets API error:', response.status);
      return { scheduleData: null, isFormOpen: false };
    }

    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      return { scheduleData: null, isFormOpen: false };
    }

    const now = new Date();

    // Find current active form OR next upcoming form
    let selectedRow = null;

    // Column layout: A=date, B=skip_day, C=form_open, D=form_close,
    // E=verse_ref, F=verse_text, G=form_link, H=response_sheet_id

    // First, look for currently active form
    for (const row of data.values) {
      if (row.length < 4) continue;
      if ((row[1] || '').toLowerCase().trim() === 'x') continue;

      const openTime = parseInEasternTime(row[2]);
      const closeTime = parseInEasternTime(row[3]);

      if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
        continue;
      }

      if (now >= openTime && now <= closeTime) {
        selectedRow = row;
        break;
      }
    }

    // If no active form, find the next upcoming one
    if (!selectedRow) {
      let nextForm = null;
      let earliestTime = null;

      for (const row of data.values) {
        if (row.length < 4) continue;
        if ((row[1] || '').toLowerCase().trim() === 'x') continue;

        const openTime = parseInEasternTime(row[2]);
        if (isNaN(openTime.getTime())) continue;

        if (openTime > now) {
          if (!earliestTime || openTime < earliestTime) {
            earliestTime = openTime;
            nextForm = row;
          }
        }
      }

      selectedRow = nextForm;
    }

    if (!selectedRow) {
      // No forms found, return far future date
      return {
        scheduleData: {
          date: '',
          form_open: '2099-12-31T23:59:59',
          form_close: '2099-12-31T23:59:59',
          form_open_display: '',
          form_close_display: '',
          verse_ref: '',
          verse_text: '',
          form_link: '',
          response_sheet_id: ''
        },
        isFormOpen: false
      };
    }

    const isFormOpen = checkFormStatus(now, selectedRow[2], selectedRow[3]);

    // Convert dates to UTC ISO strings for consistent client-side parsing
    const openTimeUTC = parseInEasternTime(selectedRow[2]).toISOString();
    const closeTimeUTC = parseInEasternTime(selectedRow[3]).toISOString();

    const scheduleData = {
      date: selectedRow[0],
      form_open: openTimeUTC,
      form_close: closeTimeUTC,
      form_open_display: formatDateDisplay(openTimeUTC),
      form_close_display: formatDateDisplay(closeTimeUTC),
      verse_ref: selectedRow[4],
      verse_text: selectedRow[5],
      form_link: isFormOpen ? (selectedRow[6] || '') : '',
      response_sheet_id: selectedRow[7] || ''
    };

    return { scheduleData, isFormOpen };

  } catch (error) {
    console.error('Error fetching schedule:', error);
    return { scheduleData: null, isFormOpen: false };
  }
}

export async function getFormResponses(
  responseSheetId: string,
  sheetTab: string,
  columns: FormResponseColumn[]
): Promise<Record<string, string>[]> {
  try {
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

    if (!responseSheetId || !API_KEY) {
      return [];
    }

    const encodedTab = `'${sheetTab.replace(/ /g, '%20')}'`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${responseSheetId}/values/${encodedTab}!A2:Z?key=${API_KEY}`;

    const response = await fetch(url, { cache: 'no-store' });

    if (!response.ok) {
      console.error(`Form responses fetch error: ${response.status} (sheet "${responseSheetId}", tab "${sheetTab}")`);
      return [];
    }

    const data = await response.json();

    if (!data.values || data.values.length === 0) {
      return [];
    }

    return data.values.map((row: string[]) => {
      const entry: Record<string, string> = {};
      for (const col of columns) {
        entry[col.header] = row[col.index] || '';
      }
      return entry;
    });
  } catch (error) {
    console.error('Error fetching form responses:', error);
    return [];
  }
}

function checkFormStatus(now: Date, formOpen: string, formClose: string): boolean {
  const openTime = parseInEasternTime(formOpen);
  const closeTime = parseInEasternTime(formClose);

  return now >= openTime && now <= closeTime;
}

// Force dates to be interpreted in Eastern Time
const parseInEasternTime = (dateString: string) => {
  // Google Sheets dates are in format: "6/30/2025 22:00:00"
  // Parse as if the string represents Eastern Time
  // We'll append timezone info to force the interpretation
  return fromZonedTime(new Date(dateString), 'America/Toronto');
};

// Format a UTC ISO string to a human-readable Eastern Time display like "Monday, Feb 17 at 10:00 PM"
function formatDateDisplay(utcDateString: string): string {
  const date = new Date(utcDateString);
  return formatInTimeZone(date, 'America/Toronto', "EEEE, MMM d 'at' h:mm a");
}

