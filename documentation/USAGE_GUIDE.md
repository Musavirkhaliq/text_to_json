# Question Processor Tool - Usage Guide

## Overview

This tool uses Pocket Flow interface and Google's Gemini AI to process questions from files and convert them into structured JSON format suitable for quizzes, assessments, and educational content.

## Features

- **AI-Powered Processing**: Uses Gemini AI to understand and structure questions
- **Multiple Question Types**: Supports multiple choice, true/false, short answer, and essay questions
- **Smart Type Detection**: Automatically determines the most appropriate question type
- **Validation**: Built-in validation to ensure question quality
- **Catchy Titles**: Generates engaging titles and descriptions for question sets
- **Multiple File Formats**: Supports .txt, .md, and .json files

## Quick Start

### 1. Setup

```bash
# Install dependencies
npm install

# Run setup (will prompt for Gemini API key)
node setup.js

# Or manually create .env file with:
# GEMINI_API_KEY=your_api_key_here
```

### 2. Start the Application

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

### 3. Access the Tool

Open your browser and navigate to `http://localhost:3000`

## How to Use

### Step 1: Prepare Your Questions File

Create a file with your questions in one of these formats:

**Plain Text (.txt)**
```
1. What is the capital of France?
2. True or False: The Earth is flat.
3. Explain the process of photosynthesis.
4. Which planet is known as the Red Planet?
```

**Markdown (.md)**
```markdown
# Geography Questions

1. What is the capital of France?
2. Which ocean is the largest?

# Science Questions

1. What is the chemical symbol for gold?
2. True or False: Water boils at 100°C at sea level.
```

**JSON (.json)**
```json
{
  "questions": [
    {"text": "What is the capital of France?"},
    {"question": "Which planet is known as the Red Planet?"}
  ]
}
```

### Step 2: Upload and Process

1. Click the upload area or drag and drop your file
2. Click "Process Questions"
3. Wait for the AI to analyze and structure your questions
4. Review the generated JSON output

### Step 3: Download or Copy Results

- Use the "Copy JSON" button to copy to clipboard
- Use the "Download" button to save as a .json file

## Output Format

The tool generates JSON in this structure:

```json
[
  {
    "text": "What is the capital of France?",
    "type": "multiple_choice",
    "options": [
      {"text": "London", "isCorrect": false},
      {"text": "Paris", "isCorrect": true},
      {"text": "Berlin", "isCorrect": false},
      {"text": "Madrid", "isCorrect": false}
    ],
    "points": 1,
    "explanation": "Paris is the capital and largest city of France.",
    "title": "European Geography Quiz",
    "description": "Test your knowledge of European capitals and major cities"
  }
]
```

## Question Types

### Multiple Choice
- 3-4 answer options
- Exactly one correct answer
- Best for factual questions with clear answers

### True/False
- Two options: True and False
- Good for statements that can be definitively verified

### Short Answer
- No predefined options
- Requires brief written response
- Suitable for definitions, calculations, or simple explanations

### Essay
- No predefined options
- Requires detailed written response
- Best for complex topics requiring analysis or discussion

## Tips for Best Results

### Question Writing
- Write clear, unambiguous questions
- Avoid double negatives
- Use proper grammar and spelling
- Be specific in your wording

### File Preparation
- Number your questions for better organization
- Group related questions together
- Keep questions focused on a single topic per file
- Avoid overly complex or compound questions

### API Usage
- Ensure stable internet connection
- Be patient during processing (AI analysis takes time)
- Check validation results for any issues

## Troubleshooting

### Common Issues

**"No questions found in the file"**
- Check that your file contains actual questions
- Ensure questions are properly formatted
- Try adding numbers or bullet points

**"Unsupported file format"**
- Only .txt, .md, and .json files are supported
- Check file extension is correct

**"File too large"**
- Maximum file size is 10MB
- Split large files into smaller chunks

**"Invalid JSON response"**
- Check your internet connection
- Verify your Gemini API key is correct
- Try with simpler questions first

### API Key Issues

If you're having API issues:
1. Verify your Gemini API key is correct
2. Check that the API key has proper permissions
3. Ensure you have sufficient API quota

## Advanced Usage

### Custom Processing

You can modify the processing logic in `src/questionProcessor.js` to:
- Add support for additional file formats
- Customize question extraction patterns
- Implement custom validation rules

### Integration

The tool provides REST API endpoints:
- `POST /api/process-questions` - Process uploaded file
- `GET /api/health` - Health check

## Support

For issues or questions:
1. Check the validation results for specific error messages
2. Review the console logs for detailed error information
3. Ensure all dependencies are properly installed
4. Verify your Gemini API key is working

## License

MIT License - Feel free to modify and distribute as needed.
