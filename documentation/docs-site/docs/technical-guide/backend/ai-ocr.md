---
sidebar_position: 8
title: AI Scan & OCR Pipeline
---

# AI Scan & OCR Pipeline

LabManager features a sophisticated hybrid OCR pipeline that allows receptionists to scan physical medical reports and automatically populate the patient's digital report.

## The Hybrid Pipeline

The extraction process is split into two specialized phases to ensure maximum accuracy and structural integrity.

### Phase 1: Text Extraction (AWS Bedrock)
The system uses **AWS Bedrock** (Anthropic Claude 3.x models) for the primary vision task. 
- **Input**: High-resolution image of the medical report (uploaded via S3).
- **Process**: Bedrock performs OCR and raw text extraction, maintaining the visual layout context.
- **Output**: A raw, unfiltered text block representing all readable characters from the document.

### Phase 2: Logical Structuring (LLM Service)
The raw text is then passed to a secondary LLM service (e.g., Groq/Llama or AWS Bedrock Text) for logical parsing.
- **Context Injection**: The system sends a list of **expected keys** (test names, parameter names) based on the current invoice.
- **Mapping**: The LLM maps raw values to the correct test parameters, handling variations in naming conventions.
- **Data Normalization**: Converts strings like "1.2 g/dL" into structured JSON with numeric values and units.

## Security & Privacy
- **Encrypted Storage**: Original scan images are stored in a private S3 bucket.
- **Temporary Access**: The AI service accesses images via temporary pre-signed URLs or base64 buffers.
- **Data Retention**: Images are automatically purged from temporary buffers after processing is complete.

## Developer Integration
The pipeline is exposed via the `POST /extract-ocr-image` endpoint in `medical_reports.js`.

```javascript
// Example Payload
{
  "imageUrl": "https://s3.bucket/path/to/report.jpg",
  "expectedTests": ["CBC", "Liver Function"],
  "hints": ["Hb", "ALT", "AST"]
}
```

The `llmService.js` manages the prompt engineering and response validation to ensure the extracted JSON matches the frontend schema.

### Frontend Auto-Fill Mapping
When the frontend receives the extracted data payload from the API, it maps the parsed keys strictly against the currently active test components in the UI.
- **Deep Re-rendering**: The state update guarantees that mapped field values correctly propagate deeply into nested React components (such as individual test parameters and result inputs) causing them to re-render seamlessly without requiring manual page refreshes.
- **Form State Integrity**: Extracted values update the frontend state handlers directly, mimicking user input to ensure that form validation and data saving operations capture the AI-extracted data correctly.
