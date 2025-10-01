#!/usr/bin/env node

const GenericQuestionGenerator = require('./src/genericQuestionGenerator');
const { getAvailableExams } = require('./src/examPrompts');

/**
 * Display usage information
 */
function showUsage() {
    console.log(`
Usage: node generate-questions.js [options]

Options:
  --exam <type>           Exam type (${getAvailableExams().join(', ')}) [default: jkpsc]
  --topics <file>         Path to topics file [default: topics.txt]
  --count <number>        Questions per topic [default: 5]
  --output <directory>    Output directory [default: output]
  --help                  Show this help message

Examples:
  node generate-questions.js --exam neet --topics neet-topics.txt --count 10
  node generate-questions.js --exam jee --topics physics-topics.txt --output jee-output
  node generate-questions.js --exam upsc --topics governance-topics.txt
  node generate-questions.js --exam jkpsc --topics topics.txt --count 5

Available Exam Types:
  jkpsc  - JKPSC 10+2 Lecturer Recruitment (Advanced/Postgraduate Level)
  neet   - NEET Medical Entrance (Intermediate/Pre-Medical Level)
  jee    - JEE Engineering Entrance (Advanced/Engineering Level)
  upsc   - UPSC Civil Services (Advanced/Administrative Level)
`);
}

/**
 * Parse command line arguments
 */
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        exam: 'jkpsc',
        topics: 'topics.txt',
        count: 5,
        output: 'output'
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--exam':
                if (i + 1 < args.length) {
                    options.exam = args[++i];
                } else {
                    console.error('Error: --exam requires a value');
                    process.exit(1);
                }
                break;
            case '--topics':
                if (i + 1 < args.length) {
                    options.topics = args[++i];
                } else {
                    console.error('Error: --topics requires a value');
                    process.exit(1);
                }
                break;
            case '--count':
                if (i + 1 < args.length) {
                    const count = parseInt(args[++i]);
                    if (isNaN(count) || count < 1) {
                        console.error('Error: --count must be a positive number');
                        process.exit(1);
                    }
                    options.count = count;
                } else {
                    console.error('Error: --count requires a value');
                    process.exit(1);
                }
                break;
            case '--output':
                if (i + 1 < args.length) {
                    options.output = args[++i];
                } else {
                    console.error('Error: --output requires a value');
                    process.exit(1);
                }
                break;
            case '--help':
                showUsage();
                process.exit(0);
                break;
            default:
                console.error(`Error: Unknown option ${args[i]}`);
                showUsage();
                process.exit(1);
        }
    }

    return options;
}

/**
 * Main function
 */
async function main() {
    try {
        const options = parseArguments();

        // Validate exam type
        const availableExams = getAvailableExams();
        if (!availableExams.includes(options.exam.toLowerCase())) {
            console.error(`Error: Invalid exam type "${options.exam}"`);
            console.error(`Available exam types: ${availableExams.join(', ')}`);
            process.exit(1);
        }

        console.log('='.repeat(60));
        console.log('🎯 Multi-Exam Question Generator');
        console.log('='.repeat(60));
        console.log(`Exam Type: ${options.exam.toUpperCase()}`);
        console.log(`Topics File: ${options.topics}`);
        console.log(`Questions per Topic: ${options.count}`);
        console.log(`Output Directory: ${options.output}`);
        console.log('='.repeat(60));

        // Create generator with specified exam type
        const generator = new GenericQuestionGenerator(options.exam);

        // Generate questions
        const result = await generator.generateFromTopics(
            options.topics,
            options.count,
            options.output
        );

        if (result.success) {
            console.log('\n✅ Generation completed successfully!');
            console.log(`📁 Questions file: ${result.questionsFile}`);
            console.log(`📋 Test info file: ${result.testInfoFile}`);
            console.log(`📊 Total questions: ${result.totalQuestions}`);
            console.log(`🎓 Exam type: ${result.examType}`);
        } else {
            console.error('\n❌ Generation failed:', result.error);
            process.exit(1);
        }

    } catch (error) {
        console.error('\n💥 Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}