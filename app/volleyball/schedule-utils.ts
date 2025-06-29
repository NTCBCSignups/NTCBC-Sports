interface ScheduleData {
  form_open: string;
  form_close: string;
  link: string;
}

export async function getScheduleData(): Promise<{
  scheduleData: ScheduleData | null;
  isFormOpen: boolean;
}> {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const RANGE = 'Sheet1!A2:C300';
    
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
      
      const openTime = new Date(row[0]);
      const closeTime = new Date(row[1]);
      
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
        
        const openTime = new Date(row[0]);
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
          link: ''
        },
        isFormOpen: false
      };
    }
    
    const scheduleData = {
      form_open: selectedRow[0],
      form_close: selectedRow[1], 
      link: selectedRow[2] || ''
    };
    
    const isFormOpen = checkFormStatus(scheduleData);
    
    return { scheduleData, isFormOpen };
    
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return { scheduleData: null, isFormOpen: false };
  }
}

function checkFormStatus(data: ScheduleData): boolean {
  const now = new Date();
  const openTime = new Date(data.form_open);
  const closeTime = new Date(data.form_close);

  return now >= openTime && now <= closeTime;
} 