// Quick verification script to check your Google OAuth setup
// Run this in browser console after the app loads

console.log('=== Google OAuth Setup Verification ===\n');

// Check environment variables
const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;

console.log('1. Environment Variables:');
console.log('   CLIENT_ID:', clientId ? `✓ Set (${clientId.substring(0, 30)}...)` : '✗ MISSING');
console.log('   API_KEY:', apiKey ? '✓ Set' : '✗ MISSING');
console.log('   Current Origin:', window.location.origin);

console.log('\n2. Google API Status:');
if (window.gapi) {
  console.log('   gapi loaded: ✓');
  if (window.gapi.auth2) {
    console.log('   auth2 loaded: ✓');
    try {
      const authInstance = window.gapi.auth2.getAuthInstance();
      console.log('   Auth instance: ✓');
      console.log('   Signed in:', authInstance.isSignedIn.get() ? 'Yes' : 'No');
    } catch (e) {
      console.log('   Auth instance: ✗ Not initialized');
      console.log('   Error:', e.message);
    }
  } else {
    console.log('   auth2 loaded: ✗');
  }
} else {
  console.log('   gapi loaded: ✗');
}

console.log('\n3. Next Steps:');
console.log('   If CLIENT_ID is missing: Check .env file and restart dev server');
console.log('   If origin check fails: Add this EXACT origin to Google Cloud Console:');
console.log('   →', window.location.origin);
console.log('\n   In Google Cloud Console:');
console.log('   1. APIs & Services → Credentials');
console.log('   2. Find your OAuth 2.0 Client ID');
console.log('   3. Click Edit');
console.log('   4. Add to "Authorized JavaScript origins":', window.location.origin);
console.log('   5. Save and wait 2-3 minutes');

