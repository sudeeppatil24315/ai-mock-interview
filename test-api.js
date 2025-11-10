// Test script to verify the interview generation API works
// Run with: node test-api.js

const testInterviewGeneration = async () => {
  console.log('Testing interview generation API...\n');
  
  // Replace with your actual user ID from Firebase
  const userId = 'YOUR_USER_ID_HERE';
  
  const testData = {
    type: 'technical',
    role: 'Frontend Developer',
    level: 'Mid-level',
    techstack: 'React,TypeScript,Next.js',
    amount: 5,
    userid: userId
  };
  
  console.log('Sending request with data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/vapi/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Interview generated and saved to Firebase.');
      console.log('Check your dashboard at http://localhost:3000');
    } else {
      console.log('\n❌ FAILED! Check the error above.');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nMake sure:');
    console.log('1. The app is running (npm run dev)');
    console.log('2. You replaced YOUR_USER_ID_HERE with your actual user ID');
    console.log('3. All environment variables are set in .env.local');
  }
};

// Run the test
testInterviewGeneration();
