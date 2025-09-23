#!/usr/bin/env node

const JKPSCQuestionGenerator = require('./src/jkpscQuestionGenerator');
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
        } else if (args[i] === '--output' || args[i] === '-o') { // New argument for output directory
            outputDir = args[i + 1];
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            return;
        }
    }
    
    console.log('🎓 JKPSC 10+2 Lecturer Question Generator');
    console.log('========================================');
    console.log(`Topics file: ${topicsFile}`);
    console.log(`Questions per topic: ${questionsPerTopic}`);
    console.log(`Output directory: ${outputDir}`); // Log the output directory
    console.log('');
    
    const generator = new JKPSCQuestionGenerator();
    
    try {
        const result = await generator.generateFromTopics(topicsFile, questionsPerTopic, outputDir); // Pass outputDir
        
        if (result.success) {
            console.log('✅ Success!');
            console.log(`📝 Generated ${result.totalQuestions} questions`);
            console.log(`📚 Topics covered: ${result.topics.length}`);
            console.log(`📁 Files saved in ${outputDir}/ directory`); // Update log message
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
    console.log(`
🎓 JKPSC 10+2 Lecturer Question Generator

Usage: node generate-jkpsc-questions.js [options]

Options:
  -t, --topics <file>     Topics file path (default: topics.txt)
  -c, --count <number>    Questions per topic (default: 5)
  -o, --output <directory> Output directory for generated files (default: output)
  -h, --help             Show this help message

Examples:
  node generate-jkpsc-questions.js
  node generate-jkpsc-questions.js --topics biology-topics.txt --count 8
  node generate-jkpsc-questions.js -t physics-topics.txt -c 10 -o my_custom_output
  node generate-jkpsc-questions.js --output results/chemistry

Topics File Format:
  - One topic per line
  - Lines starting with # are ignored (comments)
  - Empty lines are ignored
  - Numbering is automatically removed

Example topics.txt:
  Photosynthesis and Cellular Respiration
  Cell Division and Genetics
  Ecology and Environmental Biology
  # This is a comment
  Plant Physiology and Anatomy

Generated Files:
  - <output_directory>/questions-[timestamp].json  (Questions array)
  - <output_directory>/test-info-[timestamp].json  (Test metadata)

Note: Requires GEMINI_API_KEY in .env file
`);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };