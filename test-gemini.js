// Quick test to see what Gemini models are available
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "AIzaSyAxOvlkotAZthltBDreGk-nfx3zEoiV4L8";
const genAI = new GoogleGenerativeAI(apiKey);

async function testModels() {
  console.log("Testing Gemini API...\n");
  
  const modelsToTry = [
    "gemini-pro",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "models/gemini-pro",
    "models/gemini-1.5-pro",
    "models/gemini-1.5-flash"
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Trying: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say hello");
      const response = await result.response;
      const text = response.text();
      console.log(`✅ SUCCESS with ${modelName}`);
      console.log(`Response: ${text}\n`);
      break; // Stop after first success
    } catch (error) {
      console.log(`❌ Failed with ${modelName}: ${error.message}\n`);
    }
  }
}

testModels();
