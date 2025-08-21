#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🔧 Google OAuth Setup for Elreem Store\n');
console.log('Follow these steps to set up Google OAuth:\n');

console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/');
console.log('2. Create a new project or select existing one');
console.log('3. Enable the Google+ API');
console.log('4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"');
console.log('5. Configure OAuth consent screen if prompted');
console.log('6. Choose "Web application" as application type');
console.log('7. Add authorized redirect URI: http://localhost:8080/auth/google/callback');
console.log('8. Copy the Client ID and Client Secret\n');

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function setupGoogleOAuth() {
    try {
        const clientId = await askQuestion('Enter your Google Client ID: ');
        const clientSecret = await askQuestion('Enter your Google Client Secret: ');

        if (!clientId || !clientSecret) {
            console.log('\n❌ Both Client ID and Client Secret are required!');
            process.exit(1);
        }

        // Read current .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');

        // Update the Google OAuth credentials
        envContent = envContent.replace(
            /GOOGLE_CLIENT_ID=.*/,
            `GOOGLE_CLIENT_ID=${clientId}`
        );
        envContent = envContent.replace(
            /GOOGLE_CLIENT_SECRET=.*/,
            `GOOGLE_CLIENT_SECRET=${clientSecret}`
        );

        // Write back to .env file
        fs.writeFileSync(envPath, envContent);

        console.log('\n✅ Google OAuth credentials updated successfully!');
        console.log('\n🚀 You can now restart your server and test Google OAuth login.');
        console.log('\nTo test:');
        console.log('1. Restart your server: npm start');
        console.log('2. Go to http://localhost:8080/login');
        console.log('3. Click "Continue with Google" button');

    } catch (error) {
        console.error('\n❌ Error setting up Google OAuth:', error.message);
    } finally {
        rl.close();
    }
}

setupGoogleOAuth();
