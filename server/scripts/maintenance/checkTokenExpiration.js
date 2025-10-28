const jwt = require('jsonwebtoken');

// The token from the user
const tokenPayload = {
  "id": 2,
  "role": "chemist",
  "iat": 1752105514,
  "exp": 1752116314
};

console.log('🔍 Checking JWT Token Expiration...\n');

// Convert timestamps to dates
const issuedAt = new Date(tokenPayload.iat * 1000);
const expiresAt = new Date(tokenPayload.exp * 1000);
const now = new Date();

console.log('Token Details:');
console.log('  - Issued at:', issuedAt.toISOString());
console.log('  - Expires at:', expiresAt.toISOString());
console.log('  - Current time:', now.toISOString());
console.log('  - Is expired:', now > expiresAt);
console.log('  - Time until expiry:', Math.floor((expiresAt - now) / 1000), 'seconds');

// Check if the timestamps are in the future (which would be unusual)
const isInFuture = issuedAt > now;
console.log('  - Is issued in future:', isInFuture);

if (now > expiresAt) {
  console.log('\n❌ Token is EXPIRED!');
  console.log('This explains why access is being denied.');
} else if (isInFuture) {
  console.log('\n⚠️  Token timestamps are in the future!');
  console.log('This might indicate a clock synchronization issue.');
} else {
  console.log('\n✅ Token is valid and not expired.');
} 