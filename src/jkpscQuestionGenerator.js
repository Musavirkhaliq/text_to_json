const fs = require('fs-extra');
const path = require('path');
const GeminiClient = require('./geminiClient');

class JKPSCQuestionGenerator {
    constructor() {
        this.geminiClient = new GeminiClient();
        this.maxRetries = 2; // Define max retries for JSON parsing
    }

    /**
     * Generate JKPSC-level MCQs from topics file
     * @param {string} topicsFilePath - Path to file containing topics
     * @param {number} questionsPerTopic - Number of questions per topic (default: 5)
     * @param {string} outputDir - Directory to save output files (default: 'output')
     * @returns {Promise<Object>} - Generated questions with metadata
     */
    async generateFromTopics(topicsFilePath, questionsPerTopic = 5, outputDir = 'output') { // Added outputDir parameter
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

            // --- MODIFICATION START ---
            // Create a sanitized topic string for filenames
            // Take the first 3 topics and join them, then sanitize
            const topicPrefix = topics.slice(0, 3)
                                      .map(t => t.replace(/[^a-zA-Z0-9]/g, '')) // Remove special chars
                                      .join('_')
                                      .substring(0, 50); // Limit length
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            // Use the topicPrefix in the filenames
            const questionsFileName = `${topicPrefix}_questions_${timestamp}.json`;
            const testInfoFileName = `${topicPrefix}_test-info_${timestamp}.json`;
            // --- MODIFICATION END ---


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
            await fs.ensureDir(outputDir); // Use outputDir here

            // Save files
            await fs.writeFile(path.join(outputDir, questionsFileName), JSON.stringify(questionsData, null, 2)); // Use outputDir here
            await fs.writeFile(path.join(outputDir, testInfoFileName), JSON.stringify(testInfo, null, 2)); // Use outputDir here

            console.log(`\nGeneration complete!`);
            console.log(`Questions saved to: ${outputDir}/${questionsFileName}`); // Use outputDir in log
            console.log(`Test info saved to: ${outputDir}/${testInfoFileName}`); // Use outputDir in log
            console.log(`Total questions generated: ${allQuestions.length}`);

            return {
                success: true,
                questionsFile: path.join(outputDir, questionsFileName),
                testInfoFile: path.join(outputDir, testInfoFileName),
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
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<Array>} - Array of questions
     */
    async generateQuestionsForTopic(topic, count, retryCount = 0) {
        let prompt = this.buildJKPSCPrompt(topic, count);
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
     * Build JKPSC-specific prompt for question generation
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions
     * @returns {string} - Formatted prompt
     */
    buildJKPSCPrompt(topic, count) {
        return `You are an expert in creating questions for the JKPSC (Jammu & Kashmir Public Service Commission) 10+2 Lecturer Recruitment Exam. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at POSTGRADUATE/MASTERS level difficulty
2. Focus on CONCEPTUAL UNDERSTANDING, APPLICATION, and REASONING - not just factual recall
3. Questions should test DEEP UNDERSTANDING of the subject
4. Avoid simple definition-based questions
5. Include questions that require ANALYSIS, SYNTHESIS, and EVALUATION
6. Each question should have 4 options with exactly ONE correct answer
7. Options should be plausible to avoid guesswork and obvious right answers
8. Provide clear, educational explanations for correct answers

QUESTION TYPES TO INCLUDE:
- Application of concepts to new situations
- Numerical problems requiring multi-step calculations
- Analysis of experimental data or scenarios
- Comparison and contrast of related concepts
- Problem-solving using theoretical knowledge
- Integration of multiple concepts
- Critical evaluation of statements or hypotheses

FORMAT: Respond with a JSON array in this exact format:
\`\`\`json
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
\`\`\`

DIFFICULTY GUIDELINES:
- Points: 2-4 (reflecting advanced difficulty)
- Questions should require 2-3 minutes of thinking time
- Avoid questions that can be answered by simple memorization
- Include interdisciplinary connections where relevant

Topic: ${topic}
Generate ${count} high-quality JKPSC-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`;
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
        if (typeof question.points !== 'number' || question.points < 2 || question.points > 4) return false;

        return true;
    }

    /**
     * Generate JKPSC-specific title and description
     * @param {Array<string>} topics - Array of topics
     * @param {number} retryCount - Current retry attempt (internal use)
     * @returns {Promise<Object>} - Title and description
     */
    async generateJKPSCTitleAndDescription(topics, retryCount = 0) {
        const initialPrompt = `Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment Exam practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- Advanced postgraduate level difficulty
- JKPSC examination standards
- Conceptual and analytical questions
- Professional academic assessment

Respond with JSON:
\`\`\`json
{
  "title": "Professional, exam-focused title",
  "description": "Comprehensive description highlighting the advanced nature and JKPSC relevance"
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
                    return this.generateJKPSCTitleAndDescription(topics, retryCount + 1);
                } else {
                    console.error(`Max retries (${this.maxRetries}) exceeded for title/description generation. Falling back.`);
                }
            }
        } catch (error) {
            console.error(`Error generating title and description (attempt ${retryCount + 1}):`, error);
            if (retryCount < this.maxRetries) {
                console.warn(`Retrying title/description generation due to API error...`);
                await new Promise(resolve => setTimeout(resolve, 500));
                return this.generateJKPSCTitleAndDescription(topics, retryCount + 1);
            } else {
                console.error(`Max retries (${this.maxRetries}) exceeded for title/description generation after API errors. Falling back.`);
            }
        }

        // Fallback after max retries or initial failure
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