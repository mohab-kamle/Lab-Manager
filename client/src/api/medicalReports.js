import api from '../utils/api';

/**
 * Hybrid OCR Pipeline: Image (Bedrock) -> LLM Structured Extraction (Logic)
 * 
 * @param {File} imageFile - The medical report image file.
 * @param {Array<string>} expectedKeys - Optional list of keys to help guide the AI.
 * @returns {Promise<Object>} - The structured data extracted by the AI.
 */
export const extractFromImage = async (imageFile, expectedKeys = []) => {
  if (!imageFile) {
    throw new Error('Image file is required for extraction.');
  }

  const formData = new FormData();
  formData.append('image', imageFile);
  if (expectedKeys && expectedKeys.length > 0) {
    formData.append('expectedKeys', JSON.stringify(expectedKeys));
  }

  try {
    const response = await api.post('/medical-reports/extract-ocr-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.error || 'Failed to extract data from image.');
    }
  } catch (error) {
    console.error('Image Extraction API Error:', error);
    const message = error.response?.data?.error || error.message || 'An error occurred during image extraction.';
    throw new Error(message);
  }
};
