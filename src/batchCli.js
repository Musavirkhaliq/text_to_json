#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const BatchProcessor = require('./batchProcessor');
require('dotenv').config();

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function showUsage() {
    console.log(`
${colorize('Batch Question Processor CLI', 'cyan')}
${colorize('============================', 'cyan')}

${colorize('Usage:', 'bright')}
  npm run batch <input-folder> <output-folder>

${colorize('Arguments:', 'bright')}
  input-folder    Path to folder containing files to process
  output-folder   Path to folder where JSON files will be saved

${colorize('Supported file formats:', 'bright')}
  • .txt  - Plain text files
  • .md   - Markdown files  
  • .json - JSON files
  • .pdf  - PDF files

${colorize('Examples:', 'bright')}
  npm run batch ./pdfs ./json_output
  npm run batch "/path/to/questions" "/path/to/results"

${colorize('Output:', 'bright')}
  For each input file, two JSON files will be created:
  • filename_questions.json - Contains the processed questions
  • filename_test_info.json - Contains test metadata and summary

${colorize('Environment:', 'bright')}
  Make sure GEMINI_API_KEY is set in your .env file
`);
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showUsage();
        process.exit(0);
    }

    if (args.length < 2) {
        console.error(colorize('❌ Error: Both input folder and output folder are required', 'red'));
        showUsage();
        process.exit(1);
    }

    const inputFolder = path.resolve(args[0]);
    const outputFolder = path.resolve(args[1]);

    // Validate input folder
    if (!await fs.pathExists(inputFolder)) {
        console.error(colorize(`❌ Error: Input folder '${inputFolder}' does not exist`, 'red'));
        process.exit(1);
    }

    const stat = await fs.stat(inputFolder);
    if (!stat.isDirectory()) {
        console.error(colorize(`❌ Error: '${inputFolder}' is not a directory`, 'red'));
        process.exit(1);
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.error(colorize('❌ Error: GEMINI_API_KEY not configured in .env file', 'red'));
        process.exit(1);
    }

    console.log(colorize('🚀 Batch Question Processor CLI', 'cyan'));
    console.log(colorize('===============================', 'cyan'));
    console.log(`📁 Input folder: ${colorize(inputFolder, 'yellow')}`);
    console.log(`📂 Output folder: ${colorize(outputFolder, 'yellow')}`);
    console.log('');

    try {
        console.log(colorize('🔍 Scanning for supported files...', 'blue'));
        
        const batchProcessor = new BatchProcessor();
        const result = await batchProcessor.processFolder(inputFolder, outputFolder);

        if (!result.success) {
            console.error(colorize(`❌ Batch processing failed: ${result.error}`, 'red'));
            process.exit(1);
        }

        // Display results
        console.log('');
        console.log(colorize('📊 Processing Results:', 'cyan'));
        console.log(colorize('====================', 'cyan'));
        console.log(`📄 Total files found: ${colorize(result.totalFiles, 'bright')}`);
        console.log(`✅ Successfully processed: ${colorize(result.summary.successful, 'green')}`);
        console.log(`❌ Failed to process: ${colorize(result.summary.failed, 'red')}`);
        console.log(`❓ Total questions extracted: ${colorize(result.summary.totalQuestions, 'bright')}`);
        console.log('');

        // Show successful files
        if (result.processedFiles.length > 0) {
            console.log(colorize('✅ Successfully Processed Files:', 'green'));
            result.processedFiles.forEach(file => {
                const inputName = path.basename(file.inputFile);
                const questionsName = path.basename(file.outputFiles.questionsFile);
                const testInfoName = path.basename(file.outputFiles.testInfoFile);
                
                console.log(`   📄 ${inputName} (${file.questionsCount} questions)`);
                console.log(`      → ${questionsName}`);
                console.log(`      → ${testInfoName}`);
            });
            console.log('');
        }

        // Show failed files
        if (result.failedFiles.length > 0) {
            console.log(colorize('❌ Failed Files:', 'red'));
            result.failedFiles.forEach(file => {
                const inputName = path.basename(file.inputFile);
                console.log(`   📄 ${inputName}: ${file.error}`);
            });
            console.log('');
        }

        if (result.summary.successful > 0) {
            console.log(colorize('🎉 Batch processing completed successfully!', 'green'));
            console.log(colorize(`📂 Check your output folder: ${outputFolder}`, 'cyan'));
        } else {
            console.log(colorize('⚠️  No files were successfully processed.', 'yellow'));
        }

    } catch (error) {
        console.error(colorize(`❌ Unexpected error: ${error.message}`, 'red'));
        console.error(error.stack);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error(colorize('❌ Unhandled Rejection at:', 'red'), promise, colorize('reason:', 'red'), reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error(colorize('❌ Uncaught Exception:', 'red'), error);
    process.exit(1);
});

if (require.main === module) {
    main();
}

module.exports = main;
