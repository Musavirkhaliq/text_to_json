#!/usr/bin/env node

const BatchJKPSCGenerator = require('./src/batchJKPSCGenerator');
const path = require('path');

async function main() {
    const args = process.argv.slice(2);
    
    // Default values
    let inputFolder = null;
    let outputFolder = 'batch-output';
    let questionsPerTopic = 15;
    
    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input' || args[i] === '-i') {
            inputFolder = args[i + 1];
            i++;
        } else if (args[i] === '--output' || args[i] === '-o') {
            outputFolder = args[i + 1];
            i++;
        } else if (args[i] === '--count' || args[i] === '-c') {
            questionsPerTopic = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            return;
        }
    }
    
    // Validate required arguments
    if (!inputFolder) {
        console.error('❌ Error: Input folder is required');
        console.log('Use --help for usage information');
        process.exit(1);
    }
    
    if (isNaN(questionsPerTopic) || questionsPerTopic < 1 || questionsPerTopic > 50) {
        console.error('❌ Error: Questions per topic must be between 1 and 50');
        process.exit(1);
    }
    
    console.log('🎓 JKPSC Batch Question Generator');
    console.log('=================================');
    console.log(`📂 Input folder: ${inputFolder}`);
    console.log(`📁 Output folder: ${outputFolder}`);
    console.log(`📝 Questions per topic: ${questionsPerTopic}`);
    console.log('');
    
    const generator = new BatchJKPSCGenerator();
    
    try {
        const result = await generator.processFolderBatch(inputFolder, outputFolder, questionsPerTopic);
        
        if (result.success) {
            console.log('\n🎉 Batch processing completed successfully!');
            console.log(`📊 Final Statistics:`);
            console.log(`   📁 Files processed: ${result.results.processedFiles}/${result.results.totalFiles}`);
            console.log(`   📝 Total questions: ${result.results.totalQuestions}`);
            console.log(`   📚 Total topics: ${result.results.totalTopics}`);
            console.log(`   ⚠️  Errors: ${result.results.errors.length}`);
            
            if (result.results.errors.length > 0) {
                console.log('\n❌ Files with errors:');
                result.results.errors.forEach(error => {
                    console.log(`   • ${error.file}: ${error.error}`);
                });
            }
            
            console.log(`\n📋 Check the summary report in: ${outputFolder}/batch-summary-*.json`);
        } else {
            console.error('❌ Batch processing failed:', result.error);
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
🎓 JKPSC Batch Question Generator

Processes multiple topic files from a folder and generates JKPSC-level MCQs for each file.

Usage: node batch-generate-jkpsc.js [options]

Required Options:
  -i, --input <folder>    Input folder containing topic files (.txt, .md)

Optional Options:
  -o, --output <folder>   Output folder for generated questions (default: batch-output)
  -c, --count <number>    Questions per topic (default: 15, max: 50)
  -h, --help             Show this help message

Examples:
  node batch-generate-jkpsc.js --input ./topic-files
  node batch-generate-jkpsc.js -i ./subjects -o ./exam-questions -c 20
  node batch-generate-jkpsc.js --input ./biology-topics --output ./bio-questions --count 12

Input Folder Structure:
  topic-files/
  ├── biology.txt          # Biology topics
  ├── chemistry.txt        # Chemistry topics
  ├── physics.txt          # Physics topics
  └── mathematics.md       # Math topics

Topic File Format:
  - One topic per line
  - Lines starting with # are ignored (comments)
  - Empty lines are ignored
  - Supports .txt and .md files

Example topic file (biology.txt):
  # Biology Topics for JKPSC
  Photosynthesis: Light and Dark Reactions, C3, C4, and CAM Pathways
  Cellular Respiration: Glycolysis, Krebs Cycle, and Electron Transport Chain
  Cell Division: Mitosis, Meiosis, and Cell Cycle Regulation
  Genetics: Mendelian Inheritance, Linkage, and Chromosomal Aberrations

Output Structure:
  batch-output/
  ├── biology-questions-[timestamp].json      # Questions from biology.txt
  ├── biology-test-info-[timestamp].json     # Test metadata for biology
  ├── chemistry-questions-[timestamp].json   # Questions from chemistry.txt
  ├── chemistry-test-info-[timestamp].json   # Test metadata for chemistry
  └── batch-summary-[timestamp].json         # Overall processing summary

Generated Files per Topic File:
  • [filename]-questions-[timestamp].json  - Array of MCQs
  • [filename]-test-info-[timestamp].json  - Test metadata and info
  • batch-summary-[timestamp].json         - Processing summary report

Features:
  ✅ Advanced JKPSC-level MCQs (postgraduate difficulty)
  ✅ Conceptual and analytical questions
  ✅ 4 options per question with detailed explanations
  ✅ JSON format for easy integration
  ✅ Batch processing with error handling
  ✅ Comprehensive summary reports
  ✅ Rate limiting to avoid API issues

Requirements:
  • GEMINI_API_KEY in .env file
  • Node.js with required dependencies
  • Input folder with .txt or .md topic files

Note: Processing time depends on the number of files and topics.
      Large batches may take several minutes to complete.
`);
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };