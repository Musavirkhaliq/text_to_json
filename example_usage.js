#!/usr/bin/env node

/**
 * Example Usage Script for Batch Question Processor
 * 
 * This script demonstrates how to use the batch processing functionality
 * to convert multiple files (including PDFs) into JSON format.
 */

const fs = require('fs-extra');
const path = require('path');
const BatchProcessor = require('./src/batchProcessor');
require('dotenv').config();

async function createExampleFiles() {
    console.log('📁 Creating example files...');
    
    const exampleDir = './example_input';
    await fs.ensureDir(exampleDir);

    // Example 1: Biology Quiz (Text file)
    const biologyQuiz = `
Biology Quiz - Chapter 3: Cell Structure

1. What is the powerhouse of the cell?
   a) Nucleus
   b) Mitochondria
   c) Ribosome
   d) Endoplasmic reticulum

2. Which organelle is responsible for protein synthesis?
   a) Golgi apparatus
   b) Lysosome
   c) Ribosome
   d) Vacuole

3. What is the function of the cell membrane?
   a) Energy production
   b) Protein synthesis
   c) Controlling what enters and exits the cell
   d) DNA storage

4. True or False: Plant cells have cell walls but animal cells do not.

5. What is the gel-like substance that fills the cell called?
   a) Cytoplasm
   b) Nucleoplasm
   c) Protoplasm
   d) Endoplasm
`;

    await fs.writeFile(path.join(exampleDir, 'biology_quiz.txt'), biologyQuiz);

    // Example 2: Math Problems (Markdown file)
    const mathProblems = `
# Mathematics Quiz - Algebra Basics

## Problem 1
Solve for x: 2x + 5 = 15
- A) x = 5
- B) x = 10
- C) x = 7.5
- D) x = 2.5

## Problem 2
What is the slope of the line y = 3x + 2?
- A) 2
- B) 3
- C) 5
- D) -3

## Problem 3
If f(x) = x² + 3x - 4, what is f(2)?
- A) 6
- B) 8
- C) 10
- D) 12

## Problem 4
True or False: The equation y = mx + b represents a linear function.

## Problem 5
Simplify: (x + 3)(x - 2)
- A) x² + x - 6
- B) x² - x + 6
- C) x² + x + 6
- D) x² - x - 6
`;

    await fs.writeFile(path.join(exampleDir, 'math_problems.md'), mathProblems);

    // Example 3: History Questions (Text file)
    const historyQuestions = `
World History Quiz

Q1. In which year did World War II end?
a) 1944
b) 1945
c) 1946
d) 1947

Q2. Who was the first President of the United States?
a) Thomas Jefferson
b) John Adams
c) George Washington
d) Benjamin Franklin

Q3. The Renaissance period began in which country?
a) France
b) England
c) Germany
d) Italy

Q4. What was the main cause of the American Civil War?
a) Economic differences
b) Slavery
c) States' rights
d) All of the above

Q5. Which empire was ruled by Julius Caesar?
a) Greek Empire
b) Roman Empire
c) Byzantine Empire
d) Ottoman Empire
`;

    await fs.writeFile(path.join(exampleDir, 'history_quiz.txt'), historyQuestions);

    console.log('✅ Example files created:');
    console.log('   - biology_quiz.txt');
    console.log('   - math_problems.md');
    console.log('   - history_quiz.txt');
    console.log('');
}

async function runBatchProcessingExample() {
    try {
        console.log('🚀 Batch Processing Example');
        console.log('===========================\n');

        // Check API key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
            console.log('⚠️  GEMINI_API_KEY not configured in .env file');
            console.log('   Please add your Gemini API key to run the full example.\n');
            
            // Still create example files for demonstration
            await createExampleFiles();
            console.log('📝 Example files created. Configure your API key and run:');
            console.log('   npm run batch ./example_input ./example_output\n');
            return;
        }

        // Create example files
        await createExampleFiles();

        // Run batch processing
        console.log('🔄 Processing files...');
        const processor = new BatchProcessor();
        const result = await processor.processFolder('./example_input', './example_output');

        // Display results
        console.log('\n📊 Processing Results:');
        console.log('======================');
        
        if (result.success) {
            console.log(`✅ Success: ${result.summary.successful}/${result.totalFiles} files processed`);
            console.log(`❓ Total questions extracted: ${result.summary.totalQuestions}`);
            
            if (result.processedFiles.length > 0) {
                console.log('\n📄 Generated Files:');
                result.processedFiles.forEach(file => {
                    const inputName = path.basename(file.inputFile);
                    const questionsFile = path.basename(file.outputFiles.questionsFile);
                    const testInfoFile = path.basename(file.outputFiles.testInfoFile);
                    
                    console.log(`   ${inputName} (${file.questionsCount} questions)`);
                    console.log(`   ├── ${questionsFile}`);
                    console.log(`   └── ${testInfoFile}`);
                });
            }

            if (result.failedFiles.length > 0) {
                console.log('\n❌ Failed Files:');
                result.failedFiles.forEach(file => {
                    console.log(`   ${path.basename(file.inputFile)}: ${file.error}`);
                });
            }

            console.log('\n🎉 Batch processing completed successfully!');
            console.log('📂 Check the ./example_output folder for your JSON files.');
            
        } else {
            console.log(`❌ Batch processing failed: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ Error running example:', error.message);
    }
}

async function showUsageExamples() {
    console.log(`
📚 Usage Examples:

1. Basic batch processing:
   npm run batch ./my_files ./json_output

2. Process PDF files:
   npm run batch ./pdf_folder ./converted_json

3. Mixed file types:
   npm run batch ./questions ./results

4. Using absolute paths:
   npm run batch "/path/to/files" "/path/to/output"

5. Single file processing (original CLI):
   npm run cli ./single_file.txt ./output

6. Web interface:
   npm start
   # Then open http://localhost:3000

📁 Supported file formats:
   • .pdf - PDF documents
   • .txt - Plain text files
   • .md  - Markdown files
   • .json - JSON files

🔧 Output format:
   For each input file "example.pdf", you get:
   • example_questions.json - The processed questions
   • example_test_info.json - Metadata and test information
`);
}

// Main execution
if (require.main === module) {
    const command = process.argv[2];
    
    switch (command) {
        case 'demo':
        case 'example':
            runBatchProcessingExample();
            break;
        case 'usage':
        case 'help':
            showUsageExamples();
            break;
        case 'create-files':
            createExampleFiles();
            break;
        default:
            console.log('🔧 Question Processor - Example Usage\n');
            console.log('Available commands:');
            console.log('  node example_usage.js demo        - Run full demo with example files');
            console.log('  node example_usage.js usage       - Show usage examples');
            console.log('  node example_usage.js create-files - Create example files only');
            console.log('');
            console.log('Or use the batch processor directly:');
            console.log('  npm run batch <input-folder> <output-folder>');
    }
}

module.exports = {
    createExampleFiles,
    runBatchProcessingExample,
    showUsageExamples
};
