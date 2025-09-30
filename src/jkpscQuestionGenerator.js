const fs = require('fs-extra');
const path = require('path');
const GeminiClient = require('./geminiClient');

class JKPSCQuestionGenerator {
    constructor() {
        this.geminiClient = new GeminiClient();
        this.maxRetries = 3; // Increased max retries for better resilience
    }

    /**
     * Generate JKPSC-level MCQs from topics file
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
            const titleAndDescription = await this.generateJKPSCTitleAndDescription(topics);

            // Create a sanitized topic string for filenames
            const topicPrefix = topics.slice(0, 3)
                                      .map(t => t.replace(/[^a-zA-Z0-9]/g, ''))
                                      .join('_')
                                      .substring(0, 50);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            const questionsFileName = `${topicPrefix}_questions_${timestamp}.json`;
            const testInfoFileName = `${topicPrefix}_test-info_${timestamp}.json`;

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
            .map(line => line.replace(/^\d+\.\s*/, ''));
    }

    /**
     * Generate JKPSC-level questions for a specific topic
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions to generate
     * @returns {Promise<Array>} - Array of questions
     */
    async generateQuestionsForTopic(topic, count) {
        let retryCount = 0;
        let lastRawResponse = null;
        let lastError = null;

        while (retryCount <= this.maxRetries) {
            try {
                let prompt;
                
                if (retryCount === 0) {
                    // Initial attempt with standard prompt
                    prompt = this.buildJKPSCPrompt(topic, count);
                } else {
                    // Retry with correction prompt including the failed response
                    prompt = this.buildCorrectionPrompt(topic, count, lastRawResponse, lastError, retryCount);
                    console.log(`\n🔄 Retry attempt ${retryCount}/${this.maxRetries} for topic "${topic}"`);
                }

                const result = await this.geminiClient.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                lastRawResponse = text;

                // Parse JSON response
                const parseResult = this.parseJSONResponse(text);
                
                if (!parseResult.success) {
                    lastError = parseResult.error;
                    console.error(`❌ Parsing failed (attempt ${retryCount + 1}): ${parseResult.error}`);
                    
                    if (retryCount < this.maxRetries) {
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                        continue;
                    } else {
                        console.error(`⚠️  Max retries exceeded for topic "${topic}". Skipping.`);
                        return [];
                    }
                }

                const jsonData = parseResult.data;

                // Validate that we have an array
                if (!Array.isArray(jsonData)) {
                    lastError = 'Response is not an array';
                    console.error(`❌ Invalid format (attempt ${retryCount + 1}): Expected array, got ${typeof jsonData}`);
                    
                    if (retryCount < this.maxRetries) {
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    } else {
                        console.error(`⚠️  Max retries exceeded for topic "${topic}". Skipping.`);
                        return [];
                    }
                }

                // Validate and clean questions
                const validQuestions = jsonData.filter(q => this.validateQuestion(q));
                const invalidCount = jsonData.length - validQuestions.length;

                if (invalidCount > 0) {
                    console.warn(`⚠️  ${invalidCount} invalid questions filtered out from topic "${topic}"`);
                }

                if (validQuestions.length === 0) {
                    lastError = 'No valid questions in response';
                    console.error(`❌ No valid questions (attempt ${retryCount + 1})`);
                    
                    if (retryCount < this.maxRetries) {
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    } else {
                        console.error(`⚠️  Max retries exceeded for topic "${topic}". Skipping.`);
                        return [];
                    }
                }

                // Success!
                if (retryCount > 0) {
                    console.log(`✅ Successfully generated ${validQuestions.length} questions after ${retryCount} retries`);
                } else {
                    console.log(`✅ Successfully generated ${validQuestions.length} questions`);
                }
                
                return validQuestions;

            } catch (error) {
                lastError = error.message;
                console.error(`❌ Error (attempt ${retryCount + 1}):`, error.message);
                
                if (retryCount < this.maxRetries) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    continue;
                } else {
                    console.error(`⚠️  Max retries exceeded for topic "${topic}". Skipping.`);
                    return [];
                }
            }
        }

        return [];
    }

    /**
     * Build correction prompt when JSON parsing fails
     * @param {string} topic - Topic name
     * @param {number} count - Number of questions
     * @param {string} failedResponse - The response that failed to parse
     * @param {string} error - The error message
     * @param {number} attemptNumber - Current retry attempt number
     * @returns {string} - Correction prompt
     */
    buildCorrectionPrompt(topic, count, failedResponse, error, attemptNumber) {
        // Truncate failed response if too long
        const truncatedResponse = failedResponse && failedResponse.length > 2000 
            ? failedResponse.substring(0, 2000) + '\n... (truncated)'
            : failedResponse;

        return `⚠️ CRITICAL: The previous response had a JSON formatting error and could not be parsed.

ERROR DETAILS:
${error}

FAILED RESPONSE (Attempt ${attemptNumber}):
\`\`\`
${truncatedResponse || 'No response received'}
\`\`\`

YOUR TASK:
Generate ${count} Multiple Choice Questions for the topic: "${topic}"

‼️ CRITICAL FORMATTING REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY:
1. Your ENTIRE response must ONLY be a JSON array wrapped in \`\`\`json code blocks
2. Start your response with: \`\`\`json
3. Then immediately provide the JSON array starting with [
4. End with ] followed by \`\`\`
5. DO NOT include ANY text before or after the code block
6. DO NOT include explanatory text, apologies, or comments
7. Ensure all strings are properly escaped with double quotes
8. Ensure all commas are correctly placed
9. Do not use trailing commas

EXACT FORMAT REQUIRED:
\`\`\`json
[
  {
    "text": "Question text here",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 3,
    "explanation": "Detailed explanation here"
  }
]
\`\`\`

VALIDATION CHECKLIST:
✓ Each question has "text", "type", "options", "points", "explanation"
✓ "type" is exactly "multiple_choice"
✓ "options" is an array with exactly 4 items
✓ Exactly ONE option has "isCorrect": true
✓ "points" is a number between 2 and 4
✓ All strings use double quotes, not single quotes
✓ No trailing commas in arrays or objects

CONTENT REQUIREMENTS:
- POSTGRADUATE/MASTERS level difficulty
- Focus on CONCEPTUAL UNDERSTANDING and APPLICATION
- Avoid simple factual recall questions
- Provide clear, educational explanations

Generate the ${count} questions NOW. Respond ONLY with the JSON code block, nothing else.`;
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

CRITICAL: Your response must ONLY contain the JSON code block. Do not include any text before or after it.

DIFFICULTY GUIDELINES:
- Points: 2-4 (reflecting advanced difficulty)
- Questions should require 2-3 minutes of thinking time
- Avoid questions that can be answered by simple memorization
- Include interdisciplinary connections where relevant

Topic: ${topic}
Generate ${count} high-quality JKPSC-level MCQs now. Respond ONLY with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`;
    }

    /**
     * Parse JSON response from Gemini API with enhanced error handling
     * @param {string} text - Raw response text
     * @returns {Object} - {success: boolean, data: any, error: string}
     */
    parseJSONResponse(text) {
        const normalizedText = text.trim();

        // Method 1: Look for JSON code blocks (case-insensitive)
        const jsonCodeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
        const jsonMatch = normalizedText.match(jsonCodeBlockRegex);

        if (jsonMatch) {
            const jsonContent = jsonMatch[1].trim();
            try {
                const parsed = JSON.parse(jsonContent);
                console.log('✓ Successfully parsed JSON from code block');
                return { success: true, data: parsed, error: null };
            } catch (e) {
                console.warn('✗ Failed to parse JSON from code block:', e.message);
                return { 
                    success: false, 
                    data: null, 
                    error: `JSON syntax error in code block: ${e.message}` 
                };
            }
        }

        // Method 2: Look for array pattern
        if (normalizedText.startsWith('[')) {
            // Find the matching closing bracket
            let bracketCount = 0;
            let endIndex = -1;
            
            for (let i = 0; i < normalizedText.length; i++) {
                if (normalizedText[i] === '[') bracketCount++;
                if (normalizedText[i] === ']') {
                    bracketCount--;
                    if (bracketCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }

            if (endIndex !== -1) {
                const jsonContent = normalizedText.substring(0, endIndex + 1);
                try {
                    const parsed = JSON.parse(jsonContent);
                    console.log('✓ Successfully parsed JSON array from raw text');
                    return { success: true, data: parsed, error: null };
                } catch (e) {
                    console.warn('✗ Failed to parse JSON array:', e.message);
                    return { 
                        success: false, 
                        data: null, 
                        error: `JSON syntax error in array: ${e.message}` 
                    };
                }
            }
        }

        // Method 3: Look for object pattern
        if (normalizedText.startsWith('{')) {
            // Find the matching closing brace
            let braceCount = 0;
            let endIndex = -1;
            
            for (let i = 0; i < normalizedText.length; i++) {
                if (normalizedText[i] === '{') braceCount++;
                if (normalizedText[i] === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        endIndex = i;
                        break;
                    }
                }
            }

            if (endIndex !== -1) {
                const jsonContent = normalizedText.substring(0, endIndex + 1);
                try {
                    const parsed = JSON.parse(jsonContent);
                    console.log('✓ Successfully parsed JSON object from raw text');
                    return { success: true, data: parsed, error: null };
                } catch (e) {
                    console.warn('✗ Failed to parse JSON object:', e.message);
                    return { 
                        success: false, 
                        data: null, 
                        error: `JSON syntax error in object: ${e.message}` 
                    };
                }
            }
        }

        console.warn('✗ No valid JSON structure found in response');
        return { 
            success: false, 
            data: null, 
            error: 'No JSON code block or valid JSON structure found in response' 
        };
    }

    /**
     * Validate individual question structure
     * @param {Object} question - Question object
     * @returns {boolean} - Whether question is valid
     */
    validateQuestion(question) {
        if (!question.text || typeof question.text !== 'string') {
            console.warn('Invalid question: missing or invalid text field');
            return false;
        }
        if (question.type !== 'multiple_choice') {
            console.warn('Invalid question: type must be "multiple_choice"');
            return false;
        }
        if (!Array.isArray(question.options) || question.options.length !== 4) {
            console.warn('Invalid question: must have exactly 4 options');
            return false;
        }

        const correctAnswers = question.options.filter(opt => opt.isCorrect);
        if (correctAnswers.length !== 1) {
            console.warn('Invalid question: must have exactly 1 correct answer');
            return false;
        }

        if (!question.explanation || typeof question.explanation !== 'string') {
            console.warn('Invalid question: missing or invalid explanation');
            return false;
        }
        if (typeof question.points !== 'number' || question.points < 2 || question.points > 4) {
            console.warn('Invalid question: points must be a number between 2 and 4');
            return false;
        }

        return true;
    }

    /**
     * Generate JKPSC-specific title and description
     * @param {Array<string>} topics - Array of topics
     * @returns {Promise<Object>} - Title and description
     */
    async generateJKPSCTitleAndDescription(topics) {
        let retryCount = 0;
        let lastRawResponse = null;
        let lastError = null;

        while (retryCount <= this.maxRetries) {
            try {
                let prompt;
                
                if (retryCount === 0) {
                    prompt = this.buildTitleDescriptionPrompt(topics);
                } else {
                    prompt = this.buildTitleDescriptionCorrectionPrompt(topics, lastRawResponse, lastError);
                    console.log(`\n🔄 Retry attempt ${retryCount}/${this.maxRetries} for title/description`);
                }

                const result = await this.geminiClient.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                lastRawResponse = text;

                const parseResult = this.parseJSONResponse(text);
                
                if (!parseResult.success) {
                    lastError = parseResult.error;
                    console.error(`❌ Title/description parsing failed (attempt ${retryCount + 1}): ${parseResult.error}`);
                    
                    if (retryCount < this.maxRetries) {
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    } else {
                        console.error(`⚠️  Using fallback title/description`);
                        break;
                    }
                }

                const jsonData = parseResult.data;

                if (jsonData && jsonData.title && jsonData.description) {
                    console.log('✅ Successfully generated title and description');
                    return jsonData;
                } else {
                    lastError = 'Missing title or description fields';
                    console.warn(`❌ Invalid title/description structure (attempt ${retryCount + 1})`);
                    
                    if (retryCount < this.maxRetries) {
                        retryCount++;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    } else {
                        console.error(`⚠️  Using fallback title/description`);
                        break;
                    }
                }
            } catch (error) {
                lastError = error.message;
                console.error(`❌ Error generating title/description (attempt ${retryCount + 1}):`, error.message);
                
                if (retryCount < this.maxRetries) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                } else {
                    console.error(`⚠️  Using fallback title/description`);
                    break;
                }
            }
        }

        // Fallback
        return {
            title: "JKPSC 10+2 Lecturer Recruitment - Advanced Practice Test",
            description: `Comprehensive practice test for JKPSC 10+2 Lecturer Recruitment covering ${topics.length} key topics. Features postgraduate-level MCQs designed to test conceptual understanding, analytical thinking, and application of knowledge as per JKPSC examination standards.`
        };
    }

    /**
     * Build prompt for title and description generation
     * @param {Array<string>} topics - Array of topics
     * @returns {string} - Formatted prompt
     */
    buildTitleDescriptionPrompt(topics) {
        return `Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment Exam practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- Advanced postgraduate level difficulty
- JKPSC examination standards
- Conceptual and analytical questions
- Professional academic assessment

Respond with JSON in this exact format:
\`\`\`json
{
  "title": "Professional, exam-focused title",
  "description": "Comprehensive description highlighting the advanced nature and JKPSC relevance"
}
\`\`\`

CRITICAL: Your response must ONLY contain the JSON code block. Do not include any text before or after it.`;
    }

    /**
     * Build correction prompt for title/description
     * @param {Array<string>} topics - Array of topics
     * @param {string} failedResponse - Failed response
     * @param {string} error - Error message
     * @returns {string} - Correction prompt
     */
    buildTitleDescriptionCorrectionPrompt(topics, failedResponse, error) {
        const truncatedResponse = failedResponse && failedResponse.length > 1000 
            ? failedResponse.substring(0, 1000) + '... (truncated)'
            : failedResponse;

        return `⚠️ The previous response had a JSON formatting error: ${error}

FAILED RESPONSE:
\`\`\`
${truncatedResponse || 'No response received'}
\`\`\`

Generate a title and description for a JKPSC test covering: ${topics.join(', ')}

Respond ONLY with this exact format:
\`\`\`json
{
  "title": "Your title here",
  "description": "Your description here"
}
\`\`\`

No additional text. Only the JSON code block.`;
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