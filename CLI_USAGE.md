# Question Processor CLI Usage Guide

## Overview

The Question Processor CLI allows you to process question files directly from the command line without using the web interface. It generates two separate JSON files: one containing the processed questions and another containing the test information (title, description, and metadata).

## Prerequisites

1. **Node.js and npm** installed on your system
2. **Gemini API Key** configured in the `.env` file
3. **Dependencies installed** (run `npm install` if needed)

## Usage Methods

### Method 1: Using npm run (Recommended)

```bash
npm run cli <input-file> [output-directory]
```

**Examples:**
```bash
# Process questions and save to default ./output directory
npm run cli sample-questions.txt

# Process questions and save to custom directory
npm run cli sample-questions.txt ./my-quiz-files

# Process markdown file
npm run cli questions.md ./quiz-output

# Process JSON file with absolute path
npm run cli /path/to/questions.json /home/user/quiz-files
```

### Method 2: Using the bash script wrapper

```bash
./process-questions.sh <input-file> [output-directory]
```

**Examples:**
```bash
# Process questions using bash script
./process-questions.sh sample-questions.txt

# With custom output directory
./process-questions.sh questions.md ./my-output
```

## Arguments

- **input-file** (required): Path to the file containing questions
  - Supported formats: `.txt`, `.md`, `.json`
  - Can be relative or absolute path
  
- **output-directory** (optional): Directory to save the generated files
  - Default: `./output`
  - Will be created if it doesn't exist

## Output Files

The CLI generates two JSON files with timestamps:

### 1. Questions File (`questions-[timestamp].json`)
Contains the processed questions array:
```json
[
  {
    "text": "What is the capital of France?",
    "type": "multiple_choice",
    "options": [
      {"text": "London", "isCorrect": false},
      {"text": "Paris", "isCorrect": true}
    ],
    "points": 1,
    "explanation": "Paris is the capital city of France..."
  }
]
```

### 2. Test Info File (`test-info-[timestamp].json`)
Contains metadata and test information:
```json
{
  "title": "Geography Quiz Challenge",
  "description": "Test your knowledge of world capitals and geography facts!",
  "totalQuestions": 5,
  "createdAt": "2025-07-31T06:22:21.111Z",
  "questionTypes": {
    "multiple_choice": 3,
    "true_false": 1,
    "essay": 1
  }
}
```

## Input File Formats

### Text Files (.txt)
```
1. What is the capital of France?
   a) London
   b) Paris
   c) Berlin

2. True or False: The Earth is round.

3. Explain photosynthesis.
```

### Markdown Files (.md)
```markdown
## Question 1
What is the capital of France?
- a) London
- b) Paris
- c) Berlin

## Question 2
**True or False:** The Earth is round.
```

### JSON Files (.json)
```json
{
  "questions": [
    {
      "text": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin"]
    }
  ]
}
```

## CLI Output Example

```
🚀 Question Processor CLI
========================
📁 Input file: sample-questions.txt
📂 Output directory: ./output

⏳ Processing questions...
🔍 Validating questions...

✅ Processing completed successfully!

📊 Summary:
   Questions processed: 4
   Title: Brain Boost: Test Your Knowledge!
   Description: A comprehensive quiz covering various topics...

📁 Generated files:
   Questions: output/questions-2025-07-31T06-22-21-112Z.json
   Test Info: output/test-info-2025-07-31T06-22-21-112Z.json

📈 Question Types:
   multiple choice: 2
   true false: 1
   essay: 1

🎉 Done! Your files are ready to use.
```

## Error Handling

The CLI provides clear error messages for common issues:

- **File not found**: `❌ Error: Input file 'filename.txt' does not exist`
- **Missing API key**: `❌ Error: GEMINI_API_KEY not configured in .env file`
- **Invalid directory**: `❌ Error: Cannot create output directory`
- **Processing errors**: Detailed error messages from the Gemini API

## Tips

1. **Use absolute paths** if you're running the command from a different directory
2. **Check your .env file** to ensure the Gemini API key is properly configured
3. **Create output directories** beforehand if you want specific folder structures
4. **Use the bash script** for simpler command syntax (no need for `npm run`)

## Troubleshooting

### Command not found
Make sure you're in the project directory and have run `npm install`.

### API errors
Check your internet connection and Gemini API key validity.

### Permission errors
Ensure the output directory is writable and you have proper file permissions.
