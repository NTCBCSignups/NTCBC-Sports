import { fromZonedTime } from 'date-fns-tz';

interface ScheduleData {
  form_open: string;
  form_close: string;
  link: string;
  verse_ref: string;
  verse_text: string;
}

export async function getScheduleData(): Promise<{
  scheduleData: ScheduleData | null;
  isFormOpen: boolean;
}> {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    
    // Use different sheet tabs based on environment
    // VERCEL_ENV: 'production' | 'preview' | 'development'
    const environment = process.env.VERCEL_ENV || 'development';
    const isProd = environment === 'production';
    const SHEET_TAB = isProd ? 'prod' : 'dev';
    const RANGE = `${SHEET_TAB}!A2:G`;
    
    console.log(`Environment: ${environment}, Using ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} sheet: ${SHEET_TAB}`);
    
    if (!SHEET_ID || !API_KEY) {
      console.error('Missing Google Sheets configuration');
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
    
    // First, look for currently active form
    for (const row of data.values) {
      if (row.length < 3) continue;
      
      const openTime = parseInEasternTime(row[1]);
      const closeTime = parseInEasternTime(row[2]);

      if (isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
        continue;
      }
      
      // If form is currently open, use it
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
        if (row.length < 3) continue;
        
        const openTime = parseInEasternTime(row[1]);
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
          form_open: '2099-12-31T23:59:59',
          form_close: '2099-12-31T23:59:59',
          link: '',
          verse_ref: '',
          verse_text: ''
        },
        isFormOpen: false
      };
    }
    
    const isFormOpen = checkFormStatus(now, selectedRow[1], selectedRow[2]);
    
    // Convert dates to UTC ISO strings for consistent client-side parsing
    const openTimeUTC = parseInEasternTime(selectedRow[1]).toISOString();
    const closeTimeUTC = parseInEasternTime(selectedRow[2]).toISOString();
    
    const scheduleData = {
      form_open: openTimeUTC,
      form_close: closeTimeUTC, 
      link: isFormOpen ? (selectedRow[5] || '') : '',
      verse_ref: selectedRow[3],
      verse_text: selectedRow[4]
    };
    
    return { scheduleData, isFormOpen };
    
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return { scheduleData: null, isFormOpen: false };
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