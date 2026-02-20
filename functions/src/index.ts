import * as admin from 'firebase-admin';

// Inisialisasi Firebase Admin untuk Cloud Functions
admin.initializeApp();

// Triggers
export * from './triggers/on-asset-write';
export * from './triggers/on-user-create';
export * from './triggers/on-image-upload';
export * from './triggers/on-asset-index';
export { onTicketCreate } from './triggers/tickets/on-ticket-create';
export { onAssetAssignment } from './triggers/on-asset-assignment';
export { onSubscriptionExpiryCheck } from './triggers/subscriptions/on-subscription-expiry';
export { onMonthlyReport } from './triggers/reports/on-monthly-report';
export { testMonthlyReport } from './triggers/reports/test-monthly-report';

export { onAssetMaintenanceCalendar } from './triggers/assets/on-asset-maintenance';
export { onSubscriptionCreateCalendar } from './triggers/subscriptions/on-subscription-create-calendar';

// Placeholder untuk exports HTTP nantinya
export const helloWorld = async (request: any, response: any) => {
    response.send("ITAMS Functions Ready");
};
