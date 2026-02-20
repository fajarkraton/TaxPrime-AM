/**
 * Script untuk import seed data ke Firebase Emulator
 * Jalankan: npx tsx data/seed-emulator.ts
 */
import * as admin from 'firebase-admin';
import users from './sample-users.json';
import assets from './sample-assets.json';
import tickets from './sample-tickets.json';
import subscriptions from './sample-subscriptions.json';
import specs from './sample-hardware-specs.json';

// Connect ke emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
admin.initializeApp({ projectId: 'taxprime-itams-dev' });
const db = admin.firestore();

async function seed() {
    console.log('Seeding users...');
    for (const user of users) {
        await db.collection('users').doc(user.uid).set(user);
    }

    console.log('Seeding assets...');
    for (const asset of assets) {
        await db.collection('assets').doc(asset.id).set(asset);
    }

    console.log('Seeding hardware specs...');
    for (const spec of specs) {
        const { assetId, ...specData } = spec;
        await db.collection('assets').doc(assetId)
            .collection('hardwareSpecs').doc('specs').set(specData);
    }

    console.log('Seeding tickets...');
    for (const ticket of tickets) {
        await db.collection('serviceTickets').doc(ticket.id).set(ticket);
    }

    console.log('Seeding subscriptions...');
    for (const sub of subscriptions) {
        await db.collection('subscriptions').doc(sub.id).set(sub);
    }

    console.log('Seeding counters...');
    await db.collection('counters').doc('asset_laptop_2026').set({ currentValue: 10, prefix: 'TPR-LPT-2026' });
    await db.collection('counters').doc('ticket_2026').set({ currentValue: 3, prefix: 'TKT-2026' });

    console.log('Seed data berhasil di-import!');
}

seed().catch(console.error);
