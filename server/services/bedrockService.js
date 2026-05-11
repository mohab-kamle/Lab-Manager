const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

/**
 * Service for interacting with AWS Bedrock for multimodal OCR (text extraction).
 */

const client = new BedrockRuntimeClient({ 
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  }
});

/**
 * Extracts raw text from an image using AWS Bedrock (amazon.nova-lite-v1:0).
 * 
 * @param {string} base64Image - The base64 encoded image data.
 * @param {string} mimeType - The MIME type of the image (e.g., 'image/jpeg', 'image/png').
 * @param {Array<string>} hints - Optional list of keys/tests to look for.
 * @returns {Promise<string>} - The raw extracted text.
 */
async function extractRawTextFromImage(base64Image, mimeType, hints = []) {
  const modelId = "amazon.nova-lite-v1:0";

<<<<<<< HEAD
  let prompt = "Extract all text from this image exactly as you see it. Do not format it. Do not add markdown. Do not answer questions. Just output the raw text.";

  if (hints && hints.length > 0) {
    prompt += `\n\nNote: The image may contain results for these tests: ${hints.join(", ")}.`;
=======
  let prompt = "OCR Task: Extract all legible text from this image exactly as you see it. Do not format it. Do not add markdown. Do not answer questions. Just output the raw text. If no text is found, output an empty string. Do not hallucinate or guess any text.";

  if (hints && hints.length > 0) {
    prompt += `\n\nNote: The image may contain results for these tests: ${hints.join(", ")}. Use these as context for recognition, but do not invent values for them if they are not visible.`;
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
  }

  const payload = {
    inferenceConfig: {
      max_new_tokens: 4096,
    },
    messages: [
      {
        role: "user",
        content: [
          {
            image: {
              format: mimeType.split('/')[1] || "png",
              source: {
                bytes: base64Image,
              },
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Nova response structure: responseBody.output.message.content[0].text
    return responseBody.output?.message?.content?.[0]?.text || 
           responseBody.content?.[0]?.text || 
           "";
  } catch (error) {
    console.error("Error in Bedrock extractRawTextFromImage:", error);
    throw new Error(`Bedrock Extraction Failed: ${error.message}`);
  }
}

module.exports = {
  extractRawTextFromImage,
};
