# Batch Processing Guide

This guide explains how to use the batch processing feature to convert multiple files (including PDFs) from a folder into JSON format.

## Features

- **Multi-format support**: Process `.txt`, `.md`, `.json`, and `.pdf` files
- **Batch processing**: Process entire folders at once
- **Consistent naming**: Output files follow a predictable naming pattern
- **Detailed reporting**: Get comprehensive results about the processing
- **Error handling**: Continue processing even if some files fail

## Quick Start

### 1. Setup
Make sure you have your Gemini API key configured in the `.env` file:
```bash
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Basic Usage
```bash
npm run batch <input-folder> <output-folder>
```

### 3. Example
```bash
npm run batch ./my_pdfs ./json_results
```

## Detailed Usage

### Command Structure
```bash
npm run batch <input-folder> <output-folder>
```

**Parameters:**
- `input-folder`: Path to the folder containing your files to process
- `output-folder`: Path where the JSON files will be saved (created if it doesn't exist)

### Supported File Types

| Format | Extension | Description |
|--------|-----------|-------------|
| PDF | `.pdf` | PDF documents (text will be extracted automatically) |
| Text | `.txt` | Plain text files |
| Markdown | `.md` | Markdown formatted files |
| JSON | `.json` | Existing JSON files (will be reprocessed) |

### Output Files

For each input file, two JSON files are created:

1. **`filename_questions.json`** - Contains the processed questions array
2. **`filename_test_info.json`** - Contains metadata and test information

**Example:**
- Input: `biology_test.pdf`
- Output: 
  - `biology_test_questions.json`
  - `biology_test_test_info.json`

## Examples

### Example 1: Process PDF folder
```bash
# Process all PDFs in the 'exam_papers' folder
npm run batch ./exam_papers ./processed_exams
```

### Example 2: Mixed file types
```bash
# Process a folder with various file types
npm run batch ./question_files ./json_output
```

### Example 3: Absolute paths
```bash
# Using absolute paths
npm run batch "/home/user/Documents/tests" "/home/user/Documents/json_results"
```

## Sample Output

When you run the batch processor, you'll see output like this:

```
🚀 Batch Question Processor CLI
===============================
📁 Input folder: /path/to/input
📂 Output folder: /path/to/output

🔍 Scanning for supported files...
Found 3 supported files to process
Processing: biology_test.pdf
Processing: chemistry_quiz.txt
Processing: physics_exam.md

📊 Processing Results:
====================
📄 Total files found: 3
✅ Successfully processed: 3
❌ Failed to process: 0
❓ Total questions extracted: 45

✅ Successfully Processed Files:
   📄 biology_test.pdf (15 questions)
      → biology_test_questions.json
      → biology_test_test_info.json
   📄 chemistry_quiz.txt (20 questions)
      → chemistry_quiz_questions.json
      → chemistry_quiz_test_info.json
   📄 physics_exam.md (10 questions)
      → physics_exam_questions.json
      → physics_exam_test_info.json

🎉 Batch processing completed successfully!
📂 Check your output folder: /path/to/output
```

## File Structure Example

**Before processing:**
```
my_tests/
├── biology_chapter1.pdf
├── chemistry_basics.txt
├── physics_mechanics.md
└── math_algebra.pdf
```

**After processing:**
```
json_results/
├── biology_chapter1_questions.json
├── biology_chapter1_test_info.json
├── chemistry_basics_questions.json
├── chemistry_basics_test_info.json
├── physics_mechanics_questions.json
├── physics_mechanics_test_info.json
├── math_algebra_questions.json
└── math_algebra_test_info.json
```

## Error Handling

The batch processor is designed to be robust:

- **Individual file failures**: If one file fails, processing continues with the remaining files
- **Detailed error reporting**: Failed files are listed with specific error messages
- **Validation**: Input folders and API keys are validated before processing begins

## Tips for Best Results

### PDF Files
- Ensure PDFs contain selectable text (not just images)
- Scanned PDFs may not work well unless they have OCR text
- Complex layouts may affect text extraction quality

### File Organization
- Keep related files in separate folders for easier management
- Use descriptive filenames as they become part of the output names
- Avoid special characters in filenames

### Performance
- Processing time depends on file size and number of questions
- Large batches may take several minutes to complete
- The Gemini API has rate limits, so very large batches may need to be split

## Troubleshooting

### Common Issues

**"No supported files found"**
- Check that your input folder contains files with supported extensions
- Verify the folder path is correct

**"GEMINI_API_KEY not configured"**
- Make sure your `.env` file exists and contains a valid API key
- Check that the API key is not the placeholder value

**PDF text extraction fails**
- Ensure the PDF contains selectable text
- Try opening the PDF and checking if you can select/copy text
- Some PDFs may be image-only and require OCR preprocessing

**Processing fails for specific files**
- Check the error message in the output
- Verify the file is not corrupted
- Ensure the file contains actual questions/text content

## Advanced Usage

### Integration with Other Tools

You can integrate the batch processor into your workflow:

```bash
# Process files and then do something with results
npm run batch ./input ./output && python analyze_results.py ./output
```

### Programmatic Usage

You can also use the BatchProcessor class directly in your Node.js code:

```javascript
const BatchProcessor = require('./src/batchProcessor');

async function processMyFiles() {
    const processor = new BatchProcessor();
    const result = await processor.processFolder('./input', './output');
    
    if (result.success) {
        console.log(`Processed ${result.summary.successful} files`);
        console.log(`Total questions: ${result.summary.totalQuestions}`);
    }
}
```

## Support

If you encounter issues:

1. Check this guide for common solutions
2. Verify your setup (API key, file formats, etc.)
3. Look at the detailed error messages in the console output
4. Ensure your files contain actual question content

The batch processor provides detailed logging to help diagnose any issues.
