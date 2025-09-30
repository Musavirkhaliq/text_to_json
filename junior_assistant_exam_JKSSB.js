#!/usr/bin/env node

const JKSSBJuniorAssistantQuestionGenerator = require('./src/juniorAssistantQuestionGenerator'); // Updated require path and class name
const path = require('path');

async function main() {
    const args = process.argv.slice(2);

    // Default values
    let topicsFile = 'topics.txt';
    let questionsPerTopic = 5;
    let outputDir = 'output'; // Default output directory

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--topics' || args[i] === '-t') {
            topicsFile = args[i + 1];
            i++;
        } else if (args[i] === '--count' || args[i] === '-c') {
            questionsPerTopic = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--output' || args[i] === '-o') {
            outputDir = args[i + 1];
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            return;
        }
    }

    // Updated console log message and emoji for JKSSB Junior Assistant
    console.log('📝 JKSSB Junior Assistant Question Generator');
    console.log('===========================================');
    console.log(`Topics file: ${topicsFile}`);
    console.log(`Questions per topic: ${questionsPerTopic}`);
    console.log(`Output directory: ${outputDir}`);
    console.log('');

    const generator = new JKSSBJuniorAssistantQuestionGenerator(); // Instantiated the new class

    try {
        const result = await generator.generateFromTopics(topicsFile, questionsPerTopic, outputDir);

        if (result.success) {
            console.log('✅ Success!');
            console.log(`📝 Generated ${result.totalQuestions} questions`);
            console.log(`📚 Topics covered: ${result.topics.length}`);
            console.log(`📁 Files saved in ${outputDir}/ directory`);
        } else {
            console.error('❌ Error:', result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

function showHelp() {
    // Updated help message for JKSSB Junior Assistant
    console.log(`
📝 JKSSB Junior Assistant Question Generator

Usage: node generate-jkssb-questions.js [options]

Options:
  -t, --topics <file>     Topics file path (default: topics.txt)
  -c, --count <number>    Questions per topic (default: 5)
  -o, --output <directory> Output directory for generated files (default: output)
  -h, --help             Show this help message

Examples:
  node generate-jkssb-questions.js
  node generate-jkssb-questions.js --topics general-awareness.txt --count 8
  node generate-jkssb-questions.js -t computer-fundamentals.txt -c 10 -o my_junior_assistant_tests
  node generate-jkssb-questions.js --output results/current_affairs

Topics File Format:
  - One topic per line
  - Lines starting with # are ignored (comments)
  - Empty lines are ignored
  - Numbering is automatically removed

Example topics.txt:
  Indian History
  General Science
  Basic Computer Knowledge
  # This is a comment
  Current Affairs 2023

Generated Files:
  - <output_directory>/<topic_prefix>_JKSSB_JA_questions-[timestamp].json  (Questions array)
  - <output_directory>/<topic_prefix>_JKSSB_JA_test-info-[timestamp].json  (Test metadata)

Note: Requires GEMINI_API_KEY in .env file
`);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };