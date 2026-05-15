const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001'; // Change to your local backend port if different

async function testOtpFlow() {
  console.log('🧪 Testing OTP Flow...');
  
  rl.question('Enter an email address to send the OTP to: ', async (email) => {
    if (!email) {
      console.log('❌ Email is required.');
      rl.close();
      return;
    }

    try {
      console.log(`\n⏳ Sending OTP to ${email}...`);
      const sendResponse = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        console.error('❌ Failed to send OTP:', sendData);
        rl.close();
        return;
      }

      console.log('✅ OTP Sent Successfully!');
      console.log('Response:', sendData);

      rl.question('\n✉️ Check your email and enter the OTP here: ', async (otp) => {
        try {
          console.log(`⏳ Verifying OTP ${otp} for ${email}...`);
          const verifyResponse = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
          });

          const verifyData = await verifyResponse.json();

          if (!verifyResponse.ok) {
            console.error('❌ Failed to verify OTP:', verifyData);
          } else {
            console.log('✅ OTP Verified Successfully!');
            console.log('Response:', verifyData);
          }
        } catch (err) {
          console.error('❌ Error during verification:', err.message);
        } finally {
          rl.close();
        }
      });
    } catch (err) {
      console.error('❌ Error during send:', err.message);
      rl.close();
    }
  });
}

testOtpFlow();
