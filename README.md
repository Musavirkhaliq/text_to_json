# Question Processor Tool

A powerful tool that uses Pocket Flow and Gemini API to process questions from files and convert them into structured JSON format.

## Features

- 📄 File upload support for various formats
- 🤖 AI-powered question processing using Gemini API
- 🔄 Automatic question type detection (multiple choice, true/false, short answer, essay)
- 📊 JSON output with structured format
- 🎯 Catchy title and description generation
- ✨ Clean and intuitive web interface

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Gemini API key.

4. Start the application:
   ```bash
   npm start
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Upload a file containing questions
3. The tool will process the questions and generate structured JSON output
4. Download or copy the generated JSON

## JSON Output Format

```json
[
  {
    "text": "What is the capital of France?",
    "type": "multiple_choice",
    "options": [
      {"text": "London", "isCorrect": false},
      {"text": "Paris", "isCorrect": true},
      {"text": "Berlin", "isCorrect": false}
    ],
    "points": 1,
    "explanation": "Paris is the capital and largest city of France.",
    "title": "European Geography Quiz",
    "description": "Test your knowledge of European capitals"
  }
]
```

## API Endpoints

- `POST /api/process-questions` - Process questions from uploaded file
- `GET /api/health` - Health check endpoint

## License

MIT
