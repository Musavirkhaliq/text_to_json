const fs = require('fs-extra');
const path = require('path');
const BatchProcessor = require('./src/batchProcessor');

// Create test files for demonstration
async function createTestFiles() {
    const testDir = './test_input';
    await fs.ensureDir(testDir);

    // Create a sample text file
    const sampleQuestions = `
1. What is the capital of France?
   a) London
   b) Berlin
   c) Paris
   d) Madrid

2. Which planet is known as the Red Planet?
   a) Venus
   b) Mars
   c) Jupiter
   d) Saturn

3. What is 2 + 2?
   a) 3
   b) 4
   c) 5
   d) 6

4. Who wrote "Romeo and Juliet"?
   a) Charles Dickens
   b) William Shakespeare
   c) Jane Austen
   d) Mark Twain

5. What is the largest ocean on Earth?
   a) Atlantic Ocean
   b) Indian Ocean
   c) Arctic Ocean
   d) Pacific Ocean
`;

    await fs.writeFile(path.join(testDir, 'sample_quiz.txt'), sampleQuestions);

    // Create a markdown file
    const markdownQuestions = `
# Science Quiz

## Question 1
What is the chemical symbol for water?
- A) H2O
- B) CO2
- C) NaCl
- D) O2

## Question 2
What force keeps planets in orbit around the sun?
- A) Magnetic force
- B) Gravitational force
- C) Electric force
- D) Nuclear force

## Question 3
At what temperature does water boil at sea level?
- A) 90°C
- B) 100°C
- C) 110°C
- D) 120°C
`;

    await fs.writeFile(path.join(testDir, 'science_quiz.md'), markdownQuestions);

    console.log('✅ Test files created in ./test_input/');
    console.log('   - sample_quiz.txt');
    console.log('   - science_quiz.md');
}

async function testBatchProcessor() {
    try {
        console.log('🧪 Testing Batch Processor...\n');

        // Create test files
        await createTestFiles();

        // Test the batch processor
        const processor = new BatchProcessor();
        const result = await processor.processFolder('./test_input', './test_output');

        console.log('\n📊 Test Results:');
        console.log('================');
        console.log(`Success: ${result.success}`);
        
        if (result.success) {
            console.log(`Total files: ${result.totalFiles}`);
            console.log(`Successful: ${result.summary.successful}`);
            console.log(`Failed: ${result.summary.failed}`);
            console.log(`Total questions: ${result.summary.totalQuestions}`);

            if (result.processedFiles.length > 0) {
                console.log('\n✅ Processed files:');
                result.processedFiles.forEach(file => {
                    console.log(`   - ${path.basename(file.inputFile)} (${file.questionsCount} questions)`);
                });
            }

            if (result.failedFiles.length > 0) {
                console.log('\n❌ Failed files:');
                result.failedFiles.forEach(file => {
                    console.log(`   - ${path.basename(file.inputFile)}: ${file.error}`);
                });
            }
        } else {
            console.log(`Error: ${result.error}`);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    // Check if API key is configured
    require('dotenv').config();
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        console.log('⚠️  GEMINI_API_KEY not configured. This test will fail at the API call stage.');
        console.log('   Configure your API key in .env file to run the full test.');
        console.log('   For now, we\'ll just test file creation...\n');
        
        createTestFiles().then(() => {
            console.log('\n✅ File creation test completed successfully!');
            console.log('   Configure your API key and run: npm run batch ./test_input ./test_output');
        });
    } else {
        testBatchProcessor();
    }
}

module.exports = { createTestFiles, testBatchProcessor };
