import { google } from 'googleapis';

/**
 * Google Workspace Auth — Service Account with Domain-Wide Delegation
 * 
 * Required env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — service account email
 *   GOOGLE_SERVICE_ACCOUNT_KEY    — private key (PEM, with \n line breaks)
 *   GOOGLE_DELEGATED_USER         — admin user to impersonate (e.g. it-asset@taxprime.net)
 */

function getAuth(scopes: string[]) {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n');
    const delegatedUser = process.env.GOOGLE_DELEGATED_USER;

    if (!email || !key) {
        throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY');
    }

    return new google.auth.JWT({
        email,
        key,
        scopes,
        subject: delegatedUser,
    });
}

// Gmail
export function getGmailClient() {
    const auth = getAuth(['https://www.googleapis.com/auth/gmail.send']);
    return google.gmail({ version: 'v1', auth });
}

// Calendar
export function getCalendarClient() {
    const auth = getAuth([
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
    ]);
    return google.calendar({ version: 'v3', auth });
}

// Drive
export function getDriveClient() {
    const auth = getAuth([
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
    ]);
    return google.drive({ version: 'v3', auth });
}

// Sheets
export function getSheetsClient() {
    const auth = getAuth([
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
    ]);
    return { sheets: google.sheets({ version: 'v4', auth }), drive: google.drive({ version: 'v3', auth }) };
}
