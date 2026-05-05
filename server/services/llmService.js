const OpenAI = require("openai");

/**
 * Service for interacting with LLMs for OCR data extraction.
 * Supports Groq by default and can be configured for self-hosted LLMs via environment variables.
 */

// Initialize OpenAI client lazily to prevent crash if API key is missing during startup
let openai;
function getOpenAIClient() {
  if (openai) return openai;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GROQ_API_KEY is not defined. AI extraction features will be unavailable.");
    // We don't throw here to prevent server crash, but we will throw when the service is actually used
    return null;
  }

  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.LLM_BASE_URL || "https://api.groq.com/openai/v1",
  });
  return openai;
}


const getSystemPrompt = (expectedKeys = []) => {
  let prompt = `You are an expert clinical data extraction agent. Extract test results from OCR text and output them strictly as a JSON object.
STRICT RULES:
1. ONLY include keys that have a CLEARLY found numerical or categorical value in the text.
2. NEVER invent, guess, or hallucinate numerical values. If a value is not explicitly present, skip that key.
3. If a general category (e.g., 'Lipid Profile', 'Complete Blood Count') is mentioned with a single value but no sub-test values, DO NOT distribute that value across specific components (e.g., Cholesterol, HDL) unless they are also explicitly present.
4. DO NOT include any key with a null, zero, or N/A value unless that '0' is explicitly written as the result.
5. If a test name is mentioned with a clear value (e.g., 'Glucose 110'), extract it.
6. Map tests to the provided HINTS list if they match. Use the hint name as the JSON key.
7. If no valid results are found, return an empty object {}.
8. Your response must be valid JSON without any commentary.`;

  if (expectedKeys && expectedKeys.length > 0) {
    prompt += `\n\nHINTS (Expected Tests): ${expectedKeys.join(", ")}. 
Search for these tests. If you find a clear result, use the name from this HINTS list as the key. If you don't find a result for a hint, DO NOT include it in the JSON.`;
  }

  return prompt;
};

/**
 * Extracts medical data from raw OCR text using an LLM.
 * 
 * @param {string} rawOcrText - The raw text extracted from a medical report via OCR.
 * @param {Array<string>} expectedKeys - Optional list of keys to help guide the AI.
 * @returns {Promise<Object>} - Parsed JSON object containing extracted data.
 */
async function extractMedicalData(rawOcrText, expectedKeys = []) {
  if (!rawOcrText) {
    throw new Error("OCR text is required for extraction");
  }

  const client = getOpenAIClient();
  if (!client) {
    throw new Error("AI Extraction service is not configured (Missing API Key)");
  }

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Upgraded for better instruction following and reliability
      temperature: 0.0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: getSystemPrompt(expectedKeys),
        },
        {
          role: "user",
          content: rawOcrText,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from LLM service");
    }

    try {
      return JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse LLM response as JSON:", content);
      throw new Error("LLM returned invalid JSON format");
    }
  } catch (error) {
    console.error("Error in extractMedicalData service:", error.message);
    throw new Error(`AI Extraction Failed: ${error.message}`);
  }
}

module.exports = {
  extractMedicalData,
};
