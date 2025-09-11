const fs = require('fs-extra');
const path = require('path');
const GeminiClient = require('./geminiClient');

class JKPSCQuestionGenerator {
    constructor() {
        this.geminiClient = new GeminiClient();
    }

    /**
     * Generate JKPSC-level MCQs from topics file
     * @param {string} topicsFilePath - Path to file containing topics
     * @param {number} questionsPerTopic - Number of questions per topic (default: 5)
     * @returns {Promise<Object>} - Generated questions with metadata
     */
    async generateFromTopics(topicsFilePath, questionsPerTopic = 5) {
        try {
            // Read topics from file
            const topicsContent = await fs.readFile(topicsFilePath, 'utf8');
            const topics = this.parseTopics(topicsContent);

            if (topics.length === 0) {
                throw new Error('No topics found in the file');
            }

            console.log(`Found ${topics.length} topics. Generating ${questionsPerTopic} questions per topic...`);

            // Generate questions for each topic
            const allQuestions = [];
            for (let i = 0; i < topics.length; i++) {
                const topic = topics[i];
                console.log(`Generating questions for topic ${i + 1}/${topics.length}: ${topic}`);
                
                const topicQuestions = await this.generateQuestionsForTopic(topic, questionsPerTopic);
                allQuestions.push(...topicQuestions);
                
                // Add delay between API calls to avoid rate limiting
                if (i < topics.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Generate title and description
            const titleAndDescription = await this.generateJKPSCTitleAndDescription(topics);

            // Save questions and test info
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const questionsFileName = `questions-${timestamp}.json`;
            const testInfoFileName = `test-info-${timestamp}.json`;

            const questionsData = {
                questions: allQuestions,
                metadata: {
                    totalQuestions: allQuestions.length,
                    topics: topics,
                    questionsPerTopic: questionsPerTopic,
                    examType: 'JKPSC 10+2 Lecturer Recruitment',
                    difficulty: 'Advanced/Postgraduate Level',
                    processedAt: new Date().toISOString()
                }
            };

            const testInfo = {
                title: titleAndDescription.title,
                description: titleAndDescription.description,
                totalQuestions: allQuestions.length,
                topics: topics,
                examType: 'JKPSC 10+2 Lecturer Recruitment',
                difficulty: 'Advanced/Postgraduate Level',
                createdAt: new Date().toISOString(),
                questionTypes: this.getQuestionTypesSummary(allQuestions)
            };

            // Create output directory if it doesn't exist
            await fs.ensureDir('AutoAamir');

            // Save files
            await fs.writeFile(path.join('output', questionsFileName), JSON.stringify(allQuestions, null, 2));
            await fs.writeFile(path.join('output', testInfoFileName), JSON.stringify(testInfo, null, 2));

            console.log(`\nGeneration complete!`);
            console.log(`Questions saved to: output/${questionsFileName}`);
            console.log(`Test info saved to: output/${testInfoFileName}`);
            console.log(`Total questions generated: ${allQuestions.length}`);

            return {
                success: true,
                questionsFile: path.join('output', questionsFileName),
                testInfoFile: path.join('output', testInfoFileName),
                totalQuestions: allQuestions.length,
                topics: topics
            };

        } catch (error) {
            console.error('Error generating JKPSC questions:', error);
            return {
                success: false,
                error: error.message
            };
        }
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
            // Return empty array to continue with other topics
            return [];
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
     * Generate JKPSC-specific title and description
     * @param {Array<string>} topics - Array of topics
     * @returns {Promise<Object>} - Title and description
     */
    async generateJKPSCTitleAndDescription(topics) {
        const prompt = `
Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment Exam practice test covering these topics:

Topics: ${topics.join(', ')}

The test should reflect:
- Advanced postgraduate level difficulty
- JKPSC examination standards
- Conceptual and analytical questions
- Professional academic assessment

Respond with JSON:
{
    "title": "Professional, exam-focused title",
    "description": "Comprehensive description highlighting the advanced nature and JKPSC relevance"
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
            title: "JKPSC 10+2 Lecturer Recruitment - Advanced Practice Test",
            description: `Comprehensive practice test for JKPSC 10+2 Lecturer Recruitment covering ${topics.length} key topics. Features postgraduate-level MCQs designed to test conceptual understanding, analytical thinking, and application of knowledge as per JKPSC examination standards.`
        };
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

module.exports = JKPSCQuestionGenerator;