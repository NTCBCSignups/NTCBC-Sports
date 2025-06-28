import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Replace these with your actual Google Sheets details
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const RANGE = 'Sheet1!A2:C300'; // Adjust range as needed
    
    if (!SHEET_ID || !API_KEY) {
      throw new Error('Missing Google Sheets configuration');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }
    
    const data = await response.json();

    const now = new Date();
    const row = data.values.filter(
        (row: (string)[]) => 
            (
                (now >= new Date(row[0]) && now <= new Date(row[1])) || 
                (now <= new Date(row[0]))
            )
    )[0];
    console.log(row)
    
    if (!row || row.length < 3) {
      throw new Error('Invalid data format from Google Sheets');
    }
    
    const scheduleData = {
      form_open: row[0],
      form_close: row[1], 
      link: row[2]
    };
    
    return NextResponse.json(scheduleData);
    
  } catch (error) {
    console.error('Error fetching schedule:', error);
    
    // Return fallback data (form closed) on error
    return NextResponse.json(
      {
        form_open: '2099-01-01 00:00:00',
        form_close: '2099-01-01 00:00:01',
        link: 'https://ntcbc-sports.vercel.app/volleyball'
      },
      { status: 500 }
    );
  }
} 