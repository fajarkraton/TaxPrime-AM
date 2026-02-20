const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read service account from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const match = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY='(.+)'/s);
if (!match) {
    console.error('❌ Cannot find GOOGLE_SERVICE_ACCOUNT_KEY');
    process.exit(1);
}
const serviceAccount = JSON.parse(match[1]);
if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

// Read Firestore rules
const rulesPath = path.join(__dirname, '..', 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

// Use Google Auth to get access token  
const { GoogleAuth } = require('google-auth-library');

async function deployRules() {
    const projectId = serviceAccount.project_id;
    console.log('📋 Project:', projectId);
    console.log('📄 Rules file length:', rulesContent.length, 'chars');

    const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase']
    });
    const client = await auth.getClient();
    const accessToken = (await client.getAccessToken()).token;

    // Step 1: Create a release source (upload rules)
    const createUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
    const createRes = await fetch(createUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            source: {
                files: [{
                    name: 'firestore.rules',
                    content: rulesContent
                }]
            }
        })
    });

    if (!createRes.ok) {
        const err = await createRes.text();
        console.error('❌ Failed to create ruleset:', err);
        process.exit(1);
    }

    const ruleset = await createRes.json();
    console.log('✅ Ruleset created:', ruleset.name);

    // Step 2: Release the ruleset
    const releaseUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
    const releaseName = `projects/${projectId}/releases/cloud.firestore`;

    // Try update first, then create
    const updateUrl = `https://firebaserules.googleapis.com/v1/${releaseName}`;
    const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            release: {
                name: releaseName,
                rulesetName: ruleset.name
            }
        })
    });

    if (updateRes.ok) {
        console.log('✅ Firestore rules deployed successfully!');
    } else {
        // Try create
        const createRelRes = await fetch(releaseUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: releaseName,
                rulesetName: ruleset.name
            })
        });
        if (createRelRes.ok) {
            console.log('✅ Firestore rules deployed successfully (new release)!');
        } else {
            const err = await createRelRes.text();
            console.error('❌ Failed to release ruleset:', err);
        }
    }

    process.exit(0);
}

deployRules();
