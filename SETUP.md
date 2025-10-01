# Multi-Exam Question Generator - Setup Guide

## Prerequisites

- **Node.js** >= 16.0.0
- **npm** >= 8.0.0
- **Gemini API Key** from Google AI Studio

## Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd text_to_json
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
MAX_FILE_SIZE=10485760
```

### 4. Verify Installation
```bash
npm test
```

## Running the Application

### Web Interface (Recommended)
```bash
npm start
```
Then open http://localhost:3000 in your browser.

### Development Mode
```bash
npm run dev
```
Uses nodemon for auto-restart on file changes.

### Command Line Interface
```bash
# Generate questions using CLI
npm run generate -- --exam neet --topics neet-topics.txt --count 10

# Process existing question files
npm run cli

# Batch processing
npm run batch
```

## Project Structure

```
├── src/
│   ├── app.js                 # Main Express server
│   ├── examPrompts.js         # Exam-specific prompt configurations
│   ├── genericQuestionGenerator.js  # Multi-exam question generator
│   ├── geminiClient.js        # Gemini API client
│   ├── questionProcessor.js   # Question file processor
│   └── routes/
│       └── questionRoutes.js  # API routes
├── public/
│   ├── index.html            # Question generator UI
│   ├── landing.html          # Landing page
│   ├── processor.html        # File processor UI
│   ├── script.js             # Frontend JavaScript
│   └── styles.css            # Styling
├── generate-questions.js     # CLI question generator
├── topics/                   # Sample topic files
├── output/                   # Generated question files
└── uploads/                  # Temporary file uploads
```

## Available Exam Types

- **jkpsc** - JKPSC 10+2 Lecturer Recruitment (Advanced/Postgraduate)
- **jkpscJuniorAssistant** - JKPSC Junior Assistant (Medium/Undergraduate)
- **jkpsc_political_science** - JKPSC Political Science (Advanced/Postgraduate)
- **jkpsc_chemistry** - JKPSC Chemistry (Advanced/Postgraduate)
- **neet** - Medical Entrance (Intermediate/Pre-Medical)
- **jee** - Engineering Entrance (Advanced/Engineering)
- **upsc** - Civil Services (Advanced/Administrative)

## Usage Examples

### Web Interface
1. Visit http://localhost:3000
2. Choose "Launch Generator"
3. Select exam type from dropdown
4. Enter topics and configure settings
5. Generate questions with real-time progress

### Command Line
```bash
# NEET Biology questions
node generate-questions.js --exam neet --topics neet-topics.txt --count 8

# JEE Physics questions
node generate-questions.js --exam jee --topics physics-topics.txt --count 15

# UPSC questions with custom output
node generate-questions.js --exam upsc --topics upsc-topics.txt --output upsc-2024
```

## Adding New Exam Types

1. Edit `src/examPrompts.js`
2. Add new exam configuration with:
   - `name`: Full exam name
   - `difficulty`: Difficulty level
   - `description`: Brief description
   - `points`: Points per question
   - `timePerQuestion`: Time requirement
   - `buildPrompt`: Function to generate prompts
   - `titleDescriptionPrompt`: Function for titles
   - `fallbackTitle` & `fallbackDescription`: Fallback values

3. Restart the server - new exam type will appear in dropdown automatically

## Troubleshooting

### Common Issues

1. **"Invalid exam type" error**
   - Ensure exam type exists in `src/examPrompts.js`
   - Check case sensitivity

2. **"Gemini API error"**
   - Verify GEMINI_API_KEY in .env file
   - Check API quota and billing

3. **"Module not found" errors**
   - Run `npm install` to install dependencies
   - Check Node.js version compatibility

4. **Port already in use**
   - Change PORT in .env file
   - Kill existing processes: `pkill -f "node src/app.js"`

### Getting Help

1. Check console logs for detailed error messages
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check file permissions for uploads/ and output/ directories

## Development

### Adding Features
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

### Testing
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Code Style
- Use ESLint configuration
- Follow existing patterns
- Add JSDoc comments for functions
- Test new features

## License

MIT License - see LICENSE file for details.