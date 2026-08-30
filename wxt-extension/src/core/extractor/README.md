# Extractor Subsystem

## 📌 Architectural Overview
The Extractor Subsystem parses raw conversational text or system prompts into structured V4 7-dimension persona profiles.

### Modules:
- `prompt-builder.ts`: Constructs extraction prompts with strict instruction vs metadata boundaries.
- `resilient-parser.ts`: Repairs, cleans, and extracts valid JSON payloads across OpenAI, Gemini, Claude, and DeepSeek outputs.
