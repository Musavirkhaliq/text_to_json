const fs = require('fs-extra');
const path = require('path');
const GeminiClient = require('./geminiClient');
const { getExamConfig, isValidExamType, getAvailableExams } = require('./examPrompts');

class GenericQuestionGenerator {
    constructor(examType = 'jkpsc') {
        this.geminiClient = new GeminiClient();
        this.maxRetries = 2;
        this.setExamType(examType);
    }

    /**
     * Set the exam type and load corresponding configuration
     * @param {string} examType - Type of exam (jkpsc, neet, jee, upsc)
     */
    setExamType(examType) {
        if (!isValidExamType(examType)) {
            console.warn(`Invalid exam type: ${examType}. Available types: ${getAvailableExams().join(', ')}`);
            console.warn('Falling back to JKPSC configuration.');
            examType = 'jkpsc';
        }
        
        this.examType = examType;
        this.examConfig = getExamConfig(this.examType);
        console.log(`Configured for ${this.examConfig.name} (${this.examConfig.difficulty})`);
    }

    /**
     * Generate questions from topics file using the configured exam type
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

            console.log(`Found ${topics.length} topics. Generating ${questionsPerTopic} questions per topic for ${this.examConfig.name}...`);

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
            const titleAndDescription = await this.generateTitleAndDescription(topics);

            // Create filename with exam type prefix
            const topicPrefix = topics.slice(0, 3)
                                      .map(t => t.replace(/[^a-zA-Z0-9]/g, ''))
                                      .join('_')
                                      .substring(0, 50);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const examPrefix = this.examType.toUpperCase();

            const questionsFileName = `${examPrefix}_${topicPrefix}_questions_${timestamp}.json`;
            const testInfoFileName = `${examPrefix}_${topicPrefix}_test-info_${timestamp}.json`;

            const questionsData = {
                questions: allQuestions,
                metadata: {
                    totalQuestions: allQuestions.length,
                    topics: topics,
                    questionsPerTopic: questionsPerTopic,
                    examType: this.examConfig.name,
                    difficulty: this.examConfig.difficulty,
                    processedAt: new Date().toISOString()
                }
            };

            const testInfo = {
                title: titleAndDescription.title,
                description: titleAndDescription.description,
                totalQuestions: allQuestions.length,
                topics: topics,
                examType: this.examConfig.name,
                difficulty: this.examConfig.difficulty,
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
                topics: topics,
                examType: this.examConfig.name
            };
        } catch (error) {
            console.error(`Error generating ${this.examConfig.name} questions:`, error);
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
     * Generate questions for a specific topic using exam-specific prompt
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions to generate
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<Array>} - Array of questions
     */
    async generateQuestionsForTopic(topic, count, retryCount = 0) {
        const prompt = this.examConfig.buildPrompt(topic, count);
        
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
                    const correctionPrompt = `The previous response for topic "${topic}" was not in the correct JSON array format.
Original (incorrect) response:
\`\`\`
${text}
\`\`\`
Please provide the ${count} Multiple Choice Questions again, strictly adhering to the specified JSON array format. Ensure it's enclosed in \`\`\`json\`\`\` code blocks as requested.`;
                    return this.generateQuestionsForTopicWithCorrection(topic, count, correctionPrompt, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for topic "${topic}". Skipping.`);
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
            return [];
        }
    }

    /**
     * Internal helper for retrying question generation with correction prompt
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
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return this.generateQuestionsForTopicWithCorrection(topic, count, correctionPrompt, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for topic "${topic}" after correction attempts. Skipping.`);
                    return [];
                }
            }

            const validQuestions = jsonData.filter(q => this.validateQuestion(q));
            if (validQuestions.length === 0) {
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
     * Parse JSON response from Gemini API
     * @param {string} text - Raw response text
     * @returns {Array|Object|null} - Parsed JSON array/object or null
     */
    parseJSONResponse(text) {
        let jsonData = null;
        const normalizedText = text.trim();

        // Method 1: Look for JSON code blocks (case-insensitive for 'json')
        const jsonCodeBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
        const jsonMatch = normalizedText.match(jsonCodeBlockRegex);

        if (jsonMatch) {
            try {
                jsonData = JSON.parse(jsonMatch[1].trim());
                console.log('Successfully parsed JSON from code block.');
                return jsonData;
            } catch (e) {
                console.warn('Failed to parse JSON from code block content:', e.message);
            }
        }

        // Method 2: Look for array pattern
        if (normalizedText.startsWith('[') && normalizedText.endsWith(']')) {
             try {
                jsonData = JSON.parse(normalizedText);
                console.log('Successfully parsed entire response as JSON array.');
                return jsonData;
            } catch (e) {
                console.warn('Failed to parse entire response as JSON array:', e.message);
            }
        }

        // Method 3: Look for object pattern
        if (normalizedText.startsWith('{') && normalizedText.endsWith('}')) {
            try {
                jsonData = JSON.parse(normalizedText);
                console.log('Successfully parsed entire response as JSON object.');
                return jsonData;
            } catch (e) {
                console.warn('Failed to parse entire response as JSON object:', e.message);
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
        if (typeof question.points !== 'number' || question.points < 1 || question.points > 5) return false;

        return true;
    }

    /**
     * Generate exam-specific title and description
     * @param {Array<string>} topics - Array of topics
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<Object>} - Title and description
     */
    async generateTitleAndDescription(topics, retryCount = 0) {
        const prompt = this.examConfig.titleDescriptionPrompt(topics);

        try {
            const result = await this.geminiClient.model.generateContent(prompt);
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
                    await new Promise(resolve => setTimeout(resolve, 500));
                    return this.generateTitleAndDescription(topics, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for title/description generation. Falling back.`);
                }
            }
        } catch (error) {
            console.error(`Error generating title and description (attempt ${retryCount + 1}):`, error);
            if (retryCount < this.maxRetries) {
                console.warn(`Retrying title/description generation due to API error...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.generateTitleAndDescription(topics, retryCount + 1);
            } else {
                console.error(`Max retries (${this.maxRetries}) exceeded for title/description generation after API errors. Falling back.`);
            }
        }

        // Fallback using exam-specific fallback
        return {
            title: this.examConfig.fallbackTitle,
            description: this.examConfig.fallbackDescription(topics)
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

    /**
     * Get available exam types
     * @returns {Array<string>} - Array of available exam types
     */
    static getAvailableExamTypes() {
        return getAvailableExams();
    }
}

module.exports = GenericQuestionGenerator;