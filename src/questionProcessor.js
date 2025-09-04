const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const GeminiClient = require('./geminiClient');

class QuestionProcessor {
    constructor() {
        this.geminiClient = new GeminiClient();
        this.supportedFormats = ['.txt', '.md', '.json', '.pdf'];
    }

    /**
     * Process questions from a file
     * @param {string} filePath - Path to the file containing questions
     * @returns {Promise<Object>} - Processed questions with title and description
     */
    async processFile(filePath) {
        try {
            // Validate file format
            const fileExtension = path.extname(filePath).toLowerCase();
            if (!this.supportedFormats.includes(fileExtension)) {
                throw new Error(`Unsupported file format: ${fileExtension}. Supported formats: ${this.supportedFormats.join(', ')}`);
            }

            // Read file content based on file type
            let fileContent;
            if (fileExtension === '.pdf') {
                fileContent = await this.extractTextFromPDF(filePath);
            } else {
                fileContent = await fs.readFile(filePath, 'utf8');
            }

            // Extract questions from content
            const questionsText = this.extractQuestions(fileContent, fileExtension);

            if (!questionsText.trim()) {
                throw new Error('No questions found in the file');
            }

            // Process questions with Gemini API
            console.log('Sending questions to Gemini API...');
            const processedQuestions = await this.geminiClient.processQuestions(questionsText);

            if (!processedQuestions || !Array.isArray(processedQuestions) || processedQuestions.length === 0) {
                throw new Error('No valid questions were processed by Gemini API');
            }

            console.log(`Successfully processed ${processedQuestions.length} questions`);

            // Generate title and description
            console.log('Generating title and description...');
            const titleAndDescription = await this.geminiClient.generateTitleAndDescription(processedQuestions);

            // Keep questions clean without title/description in each question
            const cleanQuestions = processedQuestions;

            return {
                success: true,
                data: {
                    questions: cleanQuestions,
                    metadata: {
                        totalQuestions: cleanQuestions.length,
                        title: titleAndDescription.title,
                        description: titleAndDescription.description,
                        processedAt: new Date().toISOString()
                    },
                    testInfo: {
                        title: titleAndDescription.title,
                        description: titleAndDescription.description,
                        totalQuestions: cleanQuestions.length,
                        createdAt: new Date().toISOString(),
                        questionTypes: this.getQuestionTypesSummary(cleanQuestions)
                    }
                }
            };

        } catch (error) {
            console.error('Error processing file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getQuestionTypesSummary(questions) {
        const typeCounts = {};
        questions.forEach(question => {
            typeCounts[question.type] = (typeCounts[question.type] || 0) + 1;
        });
        return typeCounts;
    }

    /**
     * Extract questions from file content based on format
     * @param {string} content - File content
     * @param {string} extension - File extension
     * @returns {string} - Extracted questions text
     */
    extractQuestions(content, extension) {
        switch (extension) {
            case '.txt':
            case '.md':
                return this.extractFromText(content);
            case '.json':
                return this.extractFromJSON(content);
            case '.pdf':
                return this.extractFromText(content); // PDF text is already extracted
            default:
                return content;
        }
    }

    /**
     * Extract questions from plain text or markdown
     * @param {string} content - Text content
     * @returns {string} - Cleaned questions text
     */
    extractFromText(content) {
        // Remove excessive whitespace and normalize line breaks
        let cleaned = content
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        // Try to identify question patterns
        const questionPatterns = [
            /^\d+\.\s+/gm,  // Numbered questions (1. Question)
            /^Q\d+[\.:]\s+/gm,  // Q1: Question format
            /^\?\s+/gm,     // Questions starting with ?
            /^-\s+/gm       // Bullet point questions
        ];

        // If we find structured questions, return as is
        for (const pattern of questionPatterns) {
            if (pattern.test(cleaned)) {
                return cleaned;
            }
        }

        // If no clear structure, assume each line/paragraph is a potential question
        return cleaned;
    }

    /**
     * Extract questions from JSON format
     * @param {string} content - JSON content
     * @returns {string} - Questions as text
     */
    extractFromJSON(content) {
        try {
            const data = JSON.parse(content);

            if (Array.isArray(data)) {
                // Array of questions
                return data.map((item, index) => {
                    if (typeof item === 'string') {
                        return `${index + 1}. ${item}`;
                    } else if (item.question || item.text) {
                        return `${index + 1}. ${item.question || item.text}`;
                    }
                    return `${index + 1}. ${JSON.stringify(item)}`;
                }).join('\n\n');
            } else if (data.questions && Array.isArray(data.questions)) {
                // Object with questions array
                return data.questions.map((item, index) => {
                    if (typeof item === 'string') {
                        return `${index + 1}. ${item}`;
                    } else if (item.question || item.text) {
                        return `${index + 1}. ${item.question || item.text}`;
                    }
                    return `${index + 1}. ${JSON.stringify(item)}`;
                }).join('\n\n');
            } else {
                // Single question object or other format
                return JSON.stringify(data, null, 2);
            }
        } catch (error) {
            console.error('Error parsing JSON:', error);
            // If JSON parsing fails, treat as plain text
            return content;
        }
    }

    /**
     * Validate processed questions
     * @param {Array} questions - Array of processed questions
     * @returns {Object} - Validation result
     */
    validateQuestions(questions) {
        const errors = [];
        const warnings = [];

        if (!Array.isArray(questions)) {
            errors.push('Questions must be an array');
            return { isValid: false, errors, warnings };
        }

        questions.forEach((question, index) => {
            const questionNum = index + 1;

            // Required fields
            if (!question.text || typeof question.text !== 'string') {
                errors.push(`Question ${questionNum}: Missing or invalid 'text' field`);
            }

            if (!question.type || !['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(question.type)) {
                errors.push(`Question ${questionNum}: Invalid or missing 'type' field`);
            }

            if (typeof question.points !== 'number' || question.points < 1 || question.points > 5) {
                warnings.push(`Question ${questionNum}: Points should be between 1-5`);
            }

            // Type-specific validation
            if (question.type === 'multiple_choice') {
                if (!Array.isArray(question.options) || question.options.length < 2) {
                    errors.push(`Question ${questionNum}: Multiple choice questions need at least 2 options`);
                } else {
                    const correctAnswers = question.options.filter(opt => opt.isCorrect);
                    if (correctAnswers.length !== 1) {
                        errors.push(`Question ${questionNum}: Multiple choice questions must have exactly one correct answer`);
                    }
                }
            }

            if (question.type === 'true_false') {
                if (!Array.isArray(question.options) || question.options.length !== 2) {
                    errors.push(`Question ${questionNum}: True/false questions must have exactly 2 options`);
                }
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Extract text from PDF file
     * @param {string} pdfPath - Path to the PDF file
     * @returns {Promise<string>} - Extracted text content
     */
    async extractTextFromPDF(pdfPath) {
        try {
            const dataBuffer = await fs.readFile(pdfPath);
            const data = await pdfParse(dataBuffer);
            return data.text;
        } catch (error) {
            throw new Error(`Failed to extract text from PDF: ${error.message}`);
        }
    }
}

module.exports = QuestionProcessor;
