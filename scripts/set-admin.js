const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

// Extract the GOOGLE_SERVICE_ACCOUNT_KEY value
const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY='(.+)'/s);
if (!match) {
    console.error('❌ Cannot find GOOGLE_SERVICE_ACCOUNT_KEY in .env.local');
    process.exit(1);
}

const raw = match[1];
const serviceAccount = JSON.parse(raw);

// Fix double-escaped newlines
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function setRole() {
    const email = process.argv[2] || 'fajar@taxprime.net';
    const role = process.argv[3] || 'super_admin';
    const dept = process.argv[4] || 'IT';

    try {
        const user = await admin.auth().getUserByEmail(email);
        console.log('Found user:', user.uid, user.displayName);

        await admin.auth().setCustomUserClaims(user.uid, { role, department: dept });
        console.log('✅ Custom claims set: role=' + role + ', department=' + dept);

        await admin.firestore().collection('users').doc(user.uid).set({
            email: email,
            name: user.displayName || email.split('@')[0],
            role: role,
            department: dept,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log('✅ Firestore /users/' + user.uid + ' updated');
        console.log('\n🎉 ' + email + ' is now ' + role + '!');
        console.log('⚠️  User needs to LOGOUT and LOGIN again to refresh token claims.');
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
    process.exit(0);
}

setRole();
