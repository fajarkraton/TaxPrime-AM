// scripts/seed-mock-users.js
const admin = require('firebase-admin');

// IMPORTANT: Requires GOOGLE_APPLICATION_CREDENTIALS environment variable
// pointing to your Firebase Admin SDK service account key JSON file.
// Usage: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json" && node scripts/seed-mock-users.js

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

const mockUsers = [
    {
        email: 'admin@taxprime.net',
        password: 'Password123!',
        displayName: 'Super Admin',
        role: 'super_admin',
        department: 'IT'
    },
    {
        email: 'manager_hr@taxprime.net',
        password: 'Password123!',
        displayName: 'HR Manager',
        role: 'manager',
        department: 'HR'
    },
    {
        email: 'staff_it@taxprime.net',
        password: 'Password123!',
        displayName: 'IT Support Team',
        role: 'it_staff',
        department: 'IT'
    },
    {
        email: 'employee@taxprime.net',
        password: 'Password123!',
        displayName: 'Standard Employee',
        role: 'employee',
        department: 'Finance'
    }
];

async function seedUsers() {
    console.log('🚀 Starting Mock UAT Users Injection...');

    for (const mock of mockUsers) {
        try {
            // Check if user already exists
            const userRecord = await admin.auth().getUserByEmail(mock.email).catch(() => null);

            let uid = '';

            if (userRecord) {
                console.log(`⚠️ User ${mock.email} already exists. Updating password and claims...`);
                await admin.auth().updateUser(userRecord.uid, {
                    password: mock.password,
                    displayName: mock.displayName
                });
                uid = userRecord.uid;
            } else {
                console.log(`✅ Creating new user: ${mock.email}`);
                const newUser = await admin.auth().createUser({
                    email: mock.email,
                    password: mock.password,
                    displayName: mock.displayName,
                    emailVerified: true
                });
                uid = newUser.uid;
            }

            // Set Custom Claims for RBAC
            await admin.auth().setCustomUserClaims(uid, {
                role: mock.role,
                department: mock.department
            });
            console.log(`   -> Set Custom Claims { role: '${mock.role}', department: '${mock.department}' }`);

            // Sync to Firestore 'users' collection for the UI lists
            await admin.firestore().collection('users').doc(uid).set({
                email: mock.email,
                name: mock.displayName,
                role: mock.role,
                department: mock.department,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: null
            }, { merge: true });
            console.log(`   -> Synced to Firestore /users/${uid}`);

        } catch (error) {
            console.error(`❌ Error processing ${mock.email}:`, error);
        }
    }

    console.log('🎉 Mock Roles successfully injected for UAT!');
    process.exit(0);
}

seedUsers();
