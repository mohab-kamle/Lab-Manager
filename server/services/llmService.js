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
<<<<<<< HEAD
1. ONLY include keys that have a CLEARLY found value in the text.
2. DO NOT include any key with a null, zero, or N/A value unless that '0' is explicitly written as the result.
3. If a test name is mentioned with a value (e.g., 'CBC is 450'), extract that value even if the test is usually a panel.
4. Test names might be split across lines or joined by bridge words like 'is', 'at', '->'.
5. Map tests to the provided HINTS list if they match.
6. If no valid results are found, return an empty object {}.
7. Your response must be valid JSON without any commentary.`;

  if (expectedKeys && expectedKeys.length > 0) {
    prompt += `\n\nHINTS (Expected Tests): ${expectedKeys.join(", ")}. 
Search for these tests. If you find a result, use the name from this HINTS list as the key. If you don't find a result for a hint, DO NOT include it in the JSON.`;
=======
1. ONLY include keys that have a CLEARLY found numerical or categorical value in the text.
2. NEVER invent, guess, or hallucinate numerical values. If a value is not explicitly present, skip that key.
3. NO CROSS-MAPPING: Only map a value to a HINT if the name in the text is a clear match, acronym, or synonym. If the text mentions a test NOT in the HINTS list, IGNORE it. DO NOT map unrelated tests to existing HINTS just because a number is available.
4. OCR CLARITY: OCR sometimes misreads characters. Be smart:
   - If you see 'S' where a number is expected (e.g., 'Lipid: S'), it is likely '5'.
   - If you see 'O' where a number is expected, it is likely '0'.
   - If you see 'I' or 'l', it might be '1'.
5. If a general category is mentioned with a single value but no sub-test values, DO NOT distribute that value across specific components unless they are also explicitly present.
6. DO NOT include any key with a null, zero, or N/A value unless that '0' is explicitly written as the result.
7. Map tests to the provided HINTS list if they match. You MUST use the EXACT hint name as the JSON key.
8. If no valid results are found, return an empty object {}.
9. Your response must be valid JSON without any commentary.

EXAMPLES:
- HINTS: ["Lipid", "Glucose"]
- Text: "Creatinine: 1.2, Lipid is 200"
- Output: {"Lipid": 200} (Creatinine ignored)

- HINTS: ["Hemoglobin"]
- Text: "The value is 14"
- Output: {"Hemoglobin": 14} (Context matches hint)

- HINTS: ["Cholesterol"]
- Text: "Lipid: 5"
- Output: {} (Lipid is not Cholesterol)`;

  if (expectedKeys && expectedKeys.length > 0) {
    prompt += `\n\nHINTS (Expected Tests): ${expectedKeys.join(", ")}. 
Search for these tests. If you find a clear result, you MUST use the EXACT name from this HINTS list as the JSON key. If you don't find a result for a hint, DO NOT include it in the JSON.`;
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
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
<<<<<<< HEAD
      model: "llama-3.1-8b-instant", // Keep Groq model for now
=======
      model: "llama-3.3-70b-versatile", // Upgraded for better instruction following and reliability
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
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
