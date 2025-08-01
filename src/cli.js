#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const QuestionProcessor = require('./questionProcessor');
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
${colorize('Question Processor CLI', 'cyan')}
${colorize('===================', 'cyan')}

${colorize('Usage:', 'bright')}
  npm run cli <input-file> [output-directory]

${colorize('Arguments:', 'bright')}
  input-file        Path to the file containing questions (.txt, .md, or .json)
  output-directory  Directory to save the output files (default: ./output)

${colorize('Examples:', 'bright')}
  npm run cli sample-questions.txt
  npm run cli sample-questions.txt ./my-output
  npm run cli questions.md /home/user/quiz-files

${colorize('Output:', 'bright')}
  The tool will generate two files:
  - questions-[timestamp].json    (Contains the processed questions)
  - test-info-[timestamp].json    (Contains title, description, and metadata)

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

    const inputFile = args[0];
    const outputDir = args[1] || './output';

    // Validate input file
    if (!fs.existsSync(inputFile)) {
        console.error(colorize(`❌ Error: Input file '${inputFile}' does not exist`, 'red'));
        process.exit(1);
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.error(colorize('❌ Error: GEMINI_API_KEY not configured in .env file', 'red'));
        process.exit(1);
    }

    // Ensure output directory exists
    try {
        await fs.ensureDir(outputDir);
    } catch (error) {
        console.error(colorize(`❌ Error: Cannot create output directory '${outputDir}': ${error.message}`, 'red'));
        process.exit(1);
    }

    console.log(colorize('🚀 Question Processor CLI', 'cyan'));
    console.log(colorize('========================', 'cyan'));
    console.log(`📁 Input file: ${colorize(inputFile, 'yellow')}`);
    console.log(`📂 Output directory: ${colorize(outputDir, 'yellow')}`);
    console.log('');

    try {
        console.log(colorize('⏳ Processing questions...', 'blue'));
        
        const questionProcessor = new QuestionProcessor();
        const result = await questionProcessor.processFile(inputFile);

        if (!result.success) {
            console.error(colorize(`❌ Processing failed: ${result.error}`, 'red'));
            process.exit(1);
        }

        // Validate the processed questions
        console.log(colorize('🔍 Validating questions...', 'blue'));
        const validation = questionProcessor.validateQuestions(result.data.questions);

        // Generate timestamps for filenames
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const questionsFilename = `questions-${timestamp}.json`;
        const testInfoFilename = `test-info-${timestamp}.json`;

        // Save questions file
        const questionsPath = path.join(outputDir, questionsFilename);
        await fs.writeJSON(questionsPath, result.data.questions, { spaces: 2 });

        // Save test info file
        const testInfoPath = path.join(outputDir, testInfoFilename);
        await fs.writeJSON(testInfoPath, result.data.testInfo, { spaces: 2 });

        console.log('');
        console.log(colorize('✅ Processing completed successfully!', 'green'));
        console.log('');
        console.log(colorize('📊 Summary:', 'bright'));
        console.log(`   Questions processed: ${colorize(result.data.questions.length, 'yellow')}`);
        console.log(`   Title: ${colorize(result.data.testInfo.title, 'yellow')}`);
        console.log(`   Description: ${colorize(result.data.testInfo.description, 'yellow')}`);
        console.log('');
        console.log(colorize('📁 Generated files:', 'bright'));
        console.log(`   Questions: ${colorize(questionsPath, 'green')}`);
        console.log(`   Test Info: ${colorize(testInfoPath, 'green')}`);
        console.log('');

        // Show question types breakdown
        if (result.data.testInfo.questionTypes) {
            console.log(colorize('📈 Question Types:', 'bright'));
            Object.entries(result.data.testInfo.questionTypes).forEach(([type, count]) => {
                console.log(`   ${type.replace('_', ' ')}: ${colorize(count, 'yellow')}`);
            });
            console.log('');
        }

        // Show validation results
        if (validation && (!validation.isValid || validation.warnings.length > 0)) {
            console.log(colorize('⚠️  Validation Results:', 'yellow'));
            
            if (validation.errors.length > 0) {
                console.log(colorize('   Errors:', 'red'));
                validation.errors.forEach(error => {
                    console.log(`   - ${error}`);
                });
            }
            
            if (validation.warnings.length > 0) {
                console.log(colorize('   Warnings:', 'yellow'));
                validation.warnings.forEach(warning => {
                    console.log(`   - ${warning}`);
                });
            }
            console.log('');
        }

        console.log(colorize('🎉 Done! Your files are ready to use.', 'green'));

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
