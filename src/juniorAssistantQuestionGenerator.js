const fs = require('fs-extra');
const path = require('path');
const GeminiClient = require('./geminiClient');

class JKSSBJuniorAssistantQuestionGenerator { // Renamed class
    constructor() {
        this.geminiClient = new GeminiClient();
        this.maxRetries = 2; // Define max retries for JSON parsing
    }

    /**
     * Generate JKSSB Junior Assistant-level MCQs from topics file
     * @param {string} topicsFilePath - Path to file containing topics
     * @param {number} questionsPerTopic - Number of questions per topic (default: 5)
     * @param {string} outputDir - Directory to save output files (default: 'output')
     * @returns {Promise<Object>} - Generated questions with metadata
     */
    async generateFromTopics(topicsFilePath, questionsPerTopic = 5, outputDir = 'output') {
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
            const titleAndDescription = await this.generateJKSSBTitleAndDescription(topics); // Updated method call

            // Create a sanitized topic string for filenames
            // Take the first 3 topics and join them, then sanitize
            const topicPrefix = topics.slice(0, 3)
                                      .map(t => t.replace(/[^a-zA-Z0-9]/g, '')) // Remove special chars
                                      .join('_')
                                      .substring(0, 50); // Limit length
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            // Use the topicPrefix in the filenames
            const questionsFileName = `${topicPrefix}_JKSSB_JA_questions_${timestamp}.json`; // Updated filename prefix
            const testInfoFileName = `${topicPrefix}_JKSSB_JA_test-info_${timestamp}.json`; // Updated filename prefix


            const questionsData = {
                questions: allQuestions,
                metadata: {
                    totalQuestions: allQuestions.length,
                    topics: topics,
                    questionsPerTopic: questionsPerTopic,
                    examType: 'JKSSB Junior Assistant Exam', // Updated exam type
                    difficulty: 'Undergraduate Level', // Updated difficulty
                    processedAt: new Date().toISOString()
                }
            };

            const testInfo = {
                title: titleAndDescription.title,
                description: titleAndDescription.description,
                totalQuestions: allQuestions.length,
                topics: topics,
                examType: 'JKSSB Junior Assistant Exam', // Updated exam type
                difficulty: 'Undergraduate Level', // Updated difficulty
                createdAt: new Date().toISOString(),
                questionTypes: this.getQuestionTypesSummary(allQuestions)
            };

            // Create output directory if it doesn't exist
            await fs.ensureDir(outputDir);

            // Save files
            await fs.writeFile(path.join(outputDir, questionsFileName), JSON.stringify(questionsData, null, 2));
            await fs.writeFile(path.join(outputDir, testInfoFileName), JSON.stringify(testInfo, null, 2));

            console.log(`\nGeneration complete!`);
            console.log(`Questions saved to: ${outputDir}/${questionsFileName}`);
            console.log(`Test info saved to: ${outputDir}/${testInfoFileName}`);
            console.log(`Total questions generated: ${allQuestions.length}`);

            return {
                success: true,
                questionsFile: path.join(outputDir, questionsFileName),
                testInfoFile: path.join(outputDir, testInfoFileName),
                totalQuestions: allQuestions.length,
                topics: topics
            };
        } catch (error) {
            console.error('Error generating JKSSB Junior Assistant questions:', error); // Updated log message
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
     * Generate JKSSB Junior Assistant-level questions for a specific topic
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions to generate
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<Array>} - Array of questions
     */
    async generateQuestionsForTopic(topic, count, retryCount = 0) {
        let prompt = this.buildJKSSBPrompt(topic, count); // Updated method call
        try {
            const result = await this.geminiClient.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            let jsonData = this.parseJSONResponse(text);

            if (!jsonData || !Array.isArray(jsonData)) {
                console.error(`Attempt ${retryCount + 1}: Invalid response format for topic: ${topic}. Expected JSON array.`);
                console.error(`Raw API response that failed parsing:\n`, text);

                if (retryCount < this.maxRetries) {
                    console.warn(`Retrying for topic "${topic}" with corrected JSON prompt...`);
                    // Craft a new prompt asking the LLM to correct the JSON
                    const correctionPrompt = `The previous response for topic "${topic}" was not in the correct JSON array format.
Original (incorrect) response:
\`\`\`
${text}
\`\`\`
Please provide the ${count} Multiple Choice Questions again, strictly adhering to the specified JSON array format. Ensure it's enclosed in \`\`\`json\`\`\` code blocks as requested.`;
                    // Pass the correction prompt for the retry
                    return this.generateQuestionsForTopicWithCorrection(topic, count, correctionPrompt, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for topic "${topic}". Skipping.`);
                    // Fallback after max retries
                    return [];
                }
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
     * Internal helper for retrying question generation with a specific correction prompt.
     * This avoids rebuilding the main prompt and keeps track of retries.
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions to generate
     * @param {string} correctionPrompt - The prompt specifically asking for JSON correction
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Array>} - Array of questions
     */
    async generateQuestionsForTopicWithCorrection(topic, count, correctionPrompt, retryCount) {
        try {
            const result = await this.geminiClient.model.generateContent(correctionPrompt);
            const response = await result.response;
            const text = response.text();

            let jsonData = this.parseJSONResponse(text);

            if (!jsonData || !Array.isArray(jsonData)) {
                console.error(`Retry attempt ${retryCount}: Still invalid response format for topic: ${topic}.`);
                console.error(`Raw API response that failed parsing (retry):\n`, text);

                if (retryCount < this.maxRetries) {
                    // Another retry, using the same correction prompt
                    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before next retry
                    return this.generateQuestionsForTopicWithCorrection(topic, count, correctionPrompt, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for topic "${topic}" after correction attempts. Skipping.`);
                    return [];
                }
            }

            const validQuestions = jsonData.filter(q => this.validateQuestion(q));
            if (validQuestions.length === 0) {
                 // Even if JSON is valid, if no valid questions are in it
                 if (retryCount < this.maxRetries) {
                     console.warn(`Retry attempt ${retryCount}: JSON was valid, but no valid questions found. Retrying for topic "${topic}"...`);
                     const refinedCorrectionPrompt = `The JSON response for topic "${topic}" was syntactically correct, but contained no valid questions according to the specified structure.
Original (partially correct) response:
\`\`\`
${text}
\`\`\`
Please generate the ${count} Multiple Choice Questions again, ensuring each question adheres to the format and validation rules. Strictly adhere to the specified JSON array format, enclosed in \`\`\`json\`\`\` code blocks.`;
                     await new Promise(resolve => setTimeout(resolve, 500));
                     return this.generateQuestionsForTopicWithCorrection(topic, count, refinedCorrectionPrompt, retryCount + 1);
                 } else {
                     console.error(`Max retries (${this.maxRetries}) exceeded for topic "${topic}" after valid JSON with no valid questions. Skipping.`);
                     return [];
                 }
            }

            console.log(`Successfully generated and parsed questions for topic "${topic}" after ${retryCount} retries.`);
            return validQuestions;

        } catch (error) {
            console.error(`Error during retry for topic "${topic}":`, error);
            return [];
        }
    }


    /**
     * Build JKSSB Junior Assistant-specific prompt for question generation
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions
     * @returns {string} - Formatted prompt
     */
    buildJKSSBPrompt(topic, count) { // Renamed method
        return `You are an expert in creating questions for the JKSSB (Jammu & Kashmir Services Selection Board) Junior Assistant Exam. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at UNDERGRADUATE/DEGREE level difficulty.
2. Focus on GENERAL KNOWLEDGE, BASIC CONCEPTS, and APPLICATION of everyday principles relevant to a Junior Assistant role.
3. Questions should test understanding of FUNDAMENTAL concepts and facts.
4. Avoid overly complex or theoretical questions.
5. Include questions that require some ANALYSIS and REASONING.
6. Each question should have 4 options with exactly ONE correct answer.
7. Options should be plausible but distinct enough to identify the correct answer without ambiguity.
8. Provide clear, concise, and educational explanations for correct answers.

QUESTION TYPES TO INCLUDE:
- Factual recall (important dates, names, definitions)
- Basic conceptual understanding
- Everyday application of knowledge
- Simple problem-solving
- General awareness and current affairs (if relevant to topic)
- Idioms/Phrases, Statement-based questions (as per examples provided)

FORMAT: Respond with a JSON array in this exact format:
\`\`\`json
[
  {
    "text": "Clear and straightforward question suitable for undergraduate level",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 1, // Points adjusted for Junior Assistant level
    "explanation": "Concise explanation of why this answer is correct, focusing on clarity"
  }
]
\`\`\`

DIFFICULTY GUIDELINES:
- Points: 1-2 (reflecting undergraduate difficulty)
- Questions should require 60-120 seconds of thinking time
- Focus on clarity and directness, avoiding ambiguity.
- Incorporate question styles seen in the provided examples (e.g., statement-based, idiom meaning).

Topic: ${topic}
Generate ${count} high-quality JKSSB Junior Assistant-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`;
    }

    /**
     * Parse JSON response from Gemini API
     * @param {string} text - Raw response text
     * @returns {Array|Object|null} - Parsed JSON array/object or null
     */
    parseJSONResponse(text) {
        let jsonData = null;
        const normalizedText = text.trim();

        // Method 1: Look for JSON code blocks (case-insensitive for 'json')
        const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/i; // Added 'i' for case-insensitive
        const jsonMatch = normalizedText.match(jsonCodeBlockRegex);

        if (jsonMatch) {
            try {
                jsonData = JSON.parse(jsonMatch[1].trim());
                console.log('Successfully parsed JSON from code block.');
                return jsonData;
            } catch (e) {
                console.warn('Failed to parse JSON from code block content:', e.message);
                // Continue to next parsing method
            }
        }

        // Method 2: Look for array pattern (if expecting an array)
        if (normalizedText.startsWith('[') && normalizedText.endsWith(']')) {
             try {
                jsonData = JSON.parse(normalizedText);
                console.log('Successfully parsed entire response as JSON array.');
                return jsonData;
            } catch (e) {
                console.warn('Failed to parse entire response as JSON array:', e.message);
                // Continue to next parsing method
            }
        }

        // Method 3: Look for object pattern (if expecting an object, like title/description)
        if (normalizedText.startsWith('{') && normalizedText.endsWith('}')) {
            try {
                jsonData = JSON.parse(normalizedText);
                console.log('Successfully parsed entire response as JSON object.');
                return jsonData;
            } catch (e) {
                console.warn('Failed to parse entire response as JSON object:', e.message);
                // Continue to next parsing method
            }
        }

        console.warn('All JSON parsing methods failed.');
        return null;
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
        if (typeof question.points !== 'number' || question.points < 1 || question.points > 2) return false; // Adjusted points range

        return true;
    }

    /**
     * Generate JKSSB Junior Assistant-specific title and description
     * @param {Array<string>} topics - Array of topics
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<Object>} - Title and description
     */
    async generateJKSSBTitleAndDescription(topics, retryCount = 0) { // Renamed method
        const initialPrompt = `Generate a professional title and description for a JKSSB Junior Assistant Exam practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- Undergraduate level difficulty
- JKSSB examination standards for Junior Assistant
- Questions focused on general knowledge, basic concepts, and practical application
- Professional assessment for clerical/administrative roles

Respond with JSON:
\`\`\`json
{
  "title": "Professional, exam-focused title",
  "description": "Comprehensive description highlighting the undergraduate nature and JKSSB Junior Assistant relevance"
}
\`\`\`
Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`;

        let promptToUse = initialPrompt;

        try {
            const result = await this.geminiClient.model.generateContent(promptToUse);
            const response = await result.response;
            const text = response.text();
            let jsonData = this.parseJSONResponse(text);

            if (jsonData && jsonData.title && jsonData.description) {
                return jsonData;
            } else {
                console.warn(`Attempt ${retryCount + 1}: Generated title/description JSON was invalid or incomplete:`, text);

                if (retryCount < this.maxRetries) {
                    console.warn(`Retrying title/description generation with corrected JSON prompt...`);
                    const correctionPrompt = `The previous response for the title and description was not in the correct JSON object format.
Original (incorrect) response:
\`\`\`
${text}
\`\`\`
Please provide the title and description again, strictly adhering to the specified JSON object format. Ensure it's enclosed in \`\`\`json\`\`\` code blocks as requested.`;
                    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before retry
                    return this.generateJKSSBTitleAndDescription(topics, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for title/description generation. Falling back.`);
                }
            }
        } catch (error) {
            console.error(`Error generating title and description (attempt ${retryCount + 1}):`, error);
            if (retryCount < this.maxRetries) {
                console.warn(`Retrying title/description generation due to API error...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.generateJKSSBTitleAndDescription(topics, retryCount + 1);
            } else {
                console.error(`Max retries (${this.maxRetries}) exceeded for title/description generation after API errors. Falling back.`);
            }
        }

        // Fallback after max retries or initial failure
        return {
            title: "JKSSB Junior Assistant - Undergraduate Practice Test", // Updated fallback title
            description: `Comprehensive practice test for JKSSB Junior Assistant Exam covering ${topics.length} key topics. Features undergraduate-level MCQs designed to test general knowledge, basic conceptual understanding, and practical application as per JKSSB examination standards.` // Updated fallback description
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

module.exports = JKSSBJuniorAssistantQuestionGenerator; // Export the new class name