const fs = require('fs-extra');
const path = require('path');
const GeminiClient = require('./geminiClient');

class BatchJKPSCGenerator {
    constructor() {
        this.geminiClient = new GeminiClient();
        this.supportedExtensions = ['.txt', '.md'];
    }

    /**
     * Process all topic files in a folder and generate JKPSC questions
     * @param {string} inputFolder - Folder containing topic files
     * @param {string} outputFolder - Folder to save generated questions
     * @param {number} questionsPerTopic - Number of questions per topic (default: 15)
     * @returns {Promise<Object>} - Processing results
     */
    async processFolderBatch(inputFolder, outputFolder, questionsPerTopic = 15) {
        try {
            console.log(`🔍 Scanning folder: ${inputFolder}`);
            
            // Ensure input folder exists
            if (!await fs.pathExists(inputFolder)) {
                throw new Error(`Input folder does not exist: ${inputFolder}`);
            }

            // Get all topic files from the folder
            const topicFiles = await this.getTopicFiles(inputFolder);
            
            if (topicFiles.length === 0) {
                throw new Error(`No valid topic files found in: ${inputFolder}`);
            }

            console.log(`📚 Found ${topicFiles.length} topic files`);
            console.log(`📝 Generating ${questionsPerTopic} questions per topic`);
            console.log(`📁 Output folder: ${outputFolder}`);
            console.log('');

            // Ensure output folder exists
            await fs.ensureDir(outputFolder);

            const results = {
                totalFiles: topicFiles.length,
                processedFiles: 0,
                totalQuestions: 0,
                totalTopics: 0,
                fileResults: [],
                errors: []
            };

            // Process each file
            for (let i = 0; i < topicFiles.length; i++) {
                const filePath = topicFiles[i];
                const fileName = path.basename(filePath, path.extname(filePath));
                
                console.log(`\n📖 Processing file ${i + 1}/${topicFiles.length}: ${path.basename(filePath)}`);
                
                try {
                    const fileResult = await this.processTopicFile(
                        filePath, 
                        outputFolder, 
                        fileName, 
                        questionsPerTopic
                    );
                    
                    results.fileResults.push(fileResult);
                    results.processedFiles++;
                    results.totalQuestions += fileResult.totalQuestions;
                    results.totalTopics += fileResult.totalTopics;
                    
                    console.log(`✅ Generated ${fileResult.totalQuestions} questions for ${fileResult.totalTopics} topics`);
                    
                } catch (error) {
                    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message);
                    results.errors.push({
                        file: path.basename(filePath),
                        error: error.message
                    });
                }

                // Add delay between files to avoid rate limiting
                if (i < topicFiles.length - 1) {
                    console.log('⏳ Waiting 2 seconds before next file...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Generate summary report
            await this.generateSummaryReport(results, outputFolder);

            console.log('\n🎉 Batch processing complete!');
            console.log(`📊 Summary:`);
            console.log(`   Files processed: ${results.processedFiles}/${results.totalFiles}`);
            console.log(`   Total questions: ${results.totalQuestions}`);
            console.log(`   Total topics: ${results.totalTopics}`);
            console.log(`   Errors: ${results.errors.length}`);
            console.log(`   Output folder: ${outputFolder}`);

            return {
                success: true,
                results: results
            };

        } catch (error) {
            console.error('❌ Batch processing failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all valid topic files from a folder
     * @param {string} folderPath - Path to the folder
     * @returns {Promise<Array<string>>} - Array of file paths
     */
    async getTopicFiles(folderPath) {
        const files = await fs.readdir(folderPath);
        const topicFiles = [];

        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stat = await fs.stat(filePath);
            
            if (stat.isFile()) {
                const ext = path.extname(file).toLowerCase();
                if (this.supportedExtensions.includes(ext)) {
                    topicFiles.push(filePath);
                }
            }
        }

        return topicFiles.sort(); // Sort alphabetically
    }

    /**
     * Process a single topic file
     * @param {string} filePath - Path to the topic file
     * @param {string} outputFolder - Output folder
     * @param {string} fileName - Base file name (without extension)
     * @param {number} questionsPerTopic - Questions per topic
     * @returns {Promise<Object>} - File processing result
     */
    async processTopicFile(filePath, outputFolder, fileName, questionsPerTopic) {
        // Read and parse topics from file
        const fileContent = await fs.readFile(filePath, 'utf8');
        const topics = this.parseTopics(fileContent);

        if (topics.length === 0) {
            throw new Error(`No topics found in file: ${path.basename(filePath)}`);
        }

        console.log(`   📋 Found ${topics.length} topics in file`);

        // Generate questions for each topic
        const allQuestions = [];
        for (let i = 0; i < topics.length; i++) {
            const topic = topics[i];
            console.log(`   🔄 Processing topic ${i + 1}/${topics.length}: ${topic.substring(0, 50)}...`);
            
            try {
                const topicQuestions = await this.generateQuestionsForTopic(topic, questionsPerTopic);
                allQuestions.push(...topicQuestions);
                
                // Small delay between topics
                if (i < topics.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (error) {
                console.error(`   ⚠️  Error generating questions for topic: ${topic.substring(0, 30)}...`);
                console.error(`      ${error.message}`);
            }
        }

        if (allQuestions.length === 0) {
            throw new Error(`No questions generated for any topics in: ${path.basename(filePath)}`);
        }

        // Generate title and description
        const titleAndDescription = await this.generateFileSpecificTitle(fileName, topics, allQuestions.length);

        // Create timestamps
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Prepare file names
        const questionsFileName = `${fileName}-questions-${timestamp}.json`;
        const testInfoFileName = `${fileName}-test-info-${timestamp}.json`;

        // Prepare data structures
        const questionsData = allQuestions;

        const testInfo = {
            sourceFile: path.basename(filePath),
            title: titleAndDescription.title,
            description: titleAndDescription.description,
            totalQuestions: allQuestions.length,
            totalTopics: topics.length,
            questionsPerTopic: questionsPerTopic,
            topics: topics,
            examType: 'JKPSC 10+2 Lecturer Recruitment',
            difficulty: 'Advanced/Postgraduate Level',
            createdAt: new Date().toISOString(),
            questionTypes: this.getQuestionTypesSummary(allQuestions)
        };

        // Save files
        const questionsFilePath = path.join(outputFolder, questionsFileName);
        const testInfoFilePath = path.join(outputFolder, testInfoFileName);

        await fs.writeFile(questionsFilePath, JSON.stringify(questionsData, null, 2));
        await fs.writeFile(testInfoFilePath, JSON.stringify(testInfo, null, 2));

        return {
            sourceFile: path.basename(filePath),
            questionsFile: questionsFileName,
            testInfoFile: testInfoFileName,
            totalQuestions: allQuestions.length,
            totalTopics: topics.length,
            topics: topics
        };
    }

    /**
     * Parse topics from file content
     * @param {string} content - File content
     * @returns {Array<string>} - Array of topics
     */
    parseTopics(content) {
        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'))
            .map(line => line.replace(/^\d+\.\s*/, '')); // Remove numbering if present
    }

    /**
     * Generate JKPSC-level questions for a specific topic
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions to generate
     * @returns {Promise<Array>} - Array of questions
     */
    async generateQuestionsForTopic(topic, count) {
        const prompt = this.buildJKPSCPrompt(topic, count);
        
        try {
            const result = await this.geminiClient.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            let jsonData = this.parseJSONResponse(text);
            
            if (!jsonData || !Array.isArray(jsonData)) {
                throw new Error(`Invalid response format for topic: ${topic}`);
            }

            // Validate and clean questions
            const validQuestions = jsonData.filter(q => this.validateQuestion(q));
            
            if (validQuestions.length === 0) {
                throw new Error(`No valid questions generated for topic: ${topic}`);
            }

            return validQuestions;

        } catch (error) {
            console.error(`Error generating questions for topic "${topic}":`, error);
            return []; // Return empty array to continue processing
        }
    }

    /**
     * Build JKPSC-specific prompt for question generation
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions
     * @returns {string} - Formatted prompt
     */
    buildJKPSCPrompt(topic, count) {
        return `
You are an expert in creating questions for the JKPSC (Jammu & Kashmir Public Service Commission) 10+2 Lecturer Recruitment Exam. 

Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at POSTGRADUATE/MASTERS level difficulty
2. Focus on CONCEPTUAL UNDERSTANDING, APPLICATION, and REASONING - not just factual recall
3. Questions should test DEEP UNDERSTANDING of the subject
4. Avoid simple definition-based questions
5. Include questions that require ANALYSIS, SYNTHESIS, and EVALUATION
6. Each question should have 4 options with exactly ONE correct answer
7. Provide clear, educational explanations for correct answers

QUESTION TYPES TO INCLUDE:
- Application of concepts to new situations
- Analysis of experimental data or scenarios
- Comparison and contrast of related concepts
- Problem-solving using theoretical knowledge
- Integration of multiple concepts
- Critical evaluation of statements or hypotheses

FORMAT: Respond with a JSON array in this exact format:
[
  {
    "text": "Advanced conceptual question that requires deep understanding",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 3,
    "explanation": "Detailed explanation of why this answer is correct, including relevant concepts and reasoning"
  }
]

DIFFICULTY GUIDELINES:
- Points: 2-4 (reflecting advanced difficulty)
- Questions should require 2-3 minutes of thinking time
- Avoid questions that can be answered by simple memorization
- Include interdisciplinary connections where relevant

Topic: ${topic}

Generate ${count} high-quality JKPSC-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json code blocks.
`;
    }

    /**
     * Parse JSON response from Gemini API
     * @param {string} text - Raw response text
     * @returns {Array|null} - Parsed JSON array or null
     */
    parseJSONResponse(text) {
        // Try multiple JSON extraction methods
        let jsonData = null;
        
        // Method 1: Look for JSON code blocks
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                jsonData = JSON.parse(jsonMatch[1].trim());
            } catch (e) {
                console.log('Failed to parse JSON from code block');
            }
        }
        
        // Method 2: Look for array pattern
        if (!jsonData) {
            const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (arrayMatch) {
                try {
                    jsonData = JSON.parse(arrayMatch[0]);
                } catch (e) {
                    console.log('Failed to parse JSON array pattern');
                }
            }
        }
        
        // Method 3: Try to parse entire response
        if (!jsonData) {
            try {
                jsonData = JSON.parse(text.trim());
            } catch (e) {
                console.log('Failed to parse entire response as JSON');
            }
        }
        
        return jsonData;
    }

    /**
     * Validate individual question structure
     * @param {Object} question - Question object
     * @returns {boolean} - Whether question is valid
     */
    validateQuestion(question) {
        if (!question.text || typeof question.text !== 'string') return false;
        if (question.type !== 'multiple_choice') return false;
        if (!Array.isArray(question.options) || question.options.length !== 4) return false;
        
        const correctAnswers = question.options.filter(opt => opt.isCorrect);
        if (correctAnswers.length !== 1) return false;
        
        if (!question.explanation || typeof question.explanation !== 'string') return false;
        if (typeof question.points !== 'number' || question.points < 2 || question.points > 4) return false;
        
        return true;
    }

    /**
     * Generate file-specific title and description
     * @param {string} fileName - Base file name
     * @param {Array<string>} topics - Array of topics
     * @param {number} totalQuestions - Total number of questions
     * @returns {Promise<Object>} - Title and description
     */
    async generateFileSpecificTitle(fileName, topics, totalQuestions) {
        const prompt = `
Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment Exam practice test.

File name: ${fileName}
Topics covered: ${topics.slice(0, 5).join(', ')}${topics.length > 5 ? ` and ${topics.length - 5} more topics` : ''}
Total questions: ${totalQuestions}

The test should reflect:
- Advanced postgraduate level difficulty
- JKPSC examination standards
- Conceptual and analytical questions
- Professional academic assessment

Respond with JSON:
{
    "title": "Professional, exam-focused title that includes the subject area",
    "description": "Comprehensive description highlighting the advanced nature, JKPSC relevance, and specific topics covered"
}

Respond only with the JSON object wrapped in \`\`\`json code blocks.
`;

        try {
            const result = await this.geminiClient.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            const jsonData = this.parseJSONResponse(text);
            
            if (jsonData && jsonData.title && jsonData.description) {
                return jsonData;
            }
        } catch (error) {
            console.error('Error generating title and description:', error);
        }
        
        // Fallback
        return {
            title: `JKPSC 10+2 Lecturer - ${fileName.charAt(0).toUpperCase() + fileName.slice(1)} Practice Test`,
            description: `Advanced practice test for JKPSC 10+2 Lecturer Recruitment covering ${topics.length} topics from ${fileName}. Features ${totalQuestions} postgraduate-level MCQs designed to test conceptual understanding and analytical thinking as per JKPSC examination standards.`
        };
    }

    /**
     * Generate summary report for batch processing
     * @param {Object} results - Processing results
     * @param {string} outputFolder - Output folder path
     */
    async generateSummaryReport(results, outputFolder) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFileName = `batch-summary-${timestamp}.json`;
        
        const report = {
            batchProcessingSummary: {
                processedAt: new Date().toISOString(),
                totalFiles: results.totalFiles,
                processedFiles: results.processedFiles,
                totalQuestions: results.totalQuestions,
                totalTopics: results.totalTopics,
                successRate: `${((results.processedFiles / results.totalFiles) * 100).toFixed(1)}%`,
                errors: results.errors
            },
            fileDetails: results.fileResults,
            examInfo: {
                examType: 'JKPSC 10+2 Lecturer Recruitment',
                difficulty: 'Advanced/Postgraduate Level',
                questionFormat: 'Multiple Choice Questions (MCQs)',
                pointsRange: '2-4 points per question'
            }
        };

        const reportPath = path.join(outputFolder, reportFileName);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`📋 Summary report saved: ${reportFileName}`);
    }

    /**
     * Get summary of question types
     * @param {Array} questions - Array of questions
     * @returns {Object} - Question type counts
     */
    getQuestionTypesSummary(questions) {
        const typeCounts = {};
        questions.forEach(question => {
            typeCounts[question.type] = (typeCounts[question.type] || 0) + 1;
        });
        return typeCounts;
    }
}

module.exports = BatchJKPSCGenerator;