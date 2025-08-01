const QuestionProcessor = require('../src/questionProcessor');
const fs = require('fs-extra');
const path = require('path');

// Mock Gemini client for testing
jest.mock('../src/geminiClient', () => {
    return jest.fn().mockImplementation(() => {
        return {
            processQuestions: jest.fn().mockResolvedValue([
                {
                    text: "What is the capital of France?",
                    type: "multiple_choice",
                    options: [
                        {"text": "London", "isCorrect": false},
                        {"text": "Paris", "isCorrect": true},
                        {"text": "Berlin", "isCorrect": false}
                    ],
                    points: 1,
                    explanation: "Paris is the capital and largest city of France."
                }
            ]),
            generateTitleAndDescription: jest.fn().mockResolvedValue({
                title: "Geography Quiz",
                description: "Test your knowledge of world geography"
            })
        };
    });
});

describe('QuestionProcessor', () => {
    let processor;
    let testFilePath;

    beforeEach(() => {
        processor = new QuestionProcessor();
        testFilePath = path.join(__dirname, 'temp-test-file.txt');
    });

    afterEach(async () => {
        // Clean up test files
        try {
            await fs.remove(testFilePath);
        } catch (error) {
            // Ignore cleanup errors
        }
    });

    describe('processFile', () => {
        test('should process a valid text file', async () => {
            const testContent = '1. What is the capital of France?\n2. What is 2 + 2?';
            await fs.writeFile(testFilePath, testContent);

            const result = await processor.processFile(testFilePath);

            expect(result.success).toBe(true);
            expect(result.data.questions).toHaveLength(1);
            expect(result.data.questions[0].text).toBe("What is the capital of France?");
            expect(result.data.metadata.title).toBe("Geography Quiz");
        });

        test('should reject unsupported file formats', async () => {
            const invalidPath = path.join(__dirname, 'test.pdf');
            await fs.writeFile(invalidPath, 'test content');

            const result = await processor.processFile(invalidPath);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported file format');

            await fs.remove(invalidPath);
        });

        test('should handle empty files', async () => {
            await fs.writeFile(testFilePath, '');

            const result = await processor.processFile(testFilePath);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No questions found');
        });
    });

    describe('extractQuestions', () => {
        test('should extract questions from plain text', () => {
            const content = '1. Question one?\n2. Question two?';
            const result = processor.extractFromText(content);
            
            expect(result).toContain('Question one');
            expect(result).toContain('Question two');
        });

        test('should extract questions from JSON format', () => {
            const jsonContent = JSON.stringify({
                questions: [
                    { text: "What is AI?" },
                    { question: "How does ML work?" }
                ]
            });
            
            const result = processor.extractFromJSON(jsonContent);
            
            expect(result).toContain('What is AI?');
            expect(result).toContain('How does ML work?');
        });
    });

    describe('validateQuestions', () => {
        test('should validate correct question format', () => {
            const questions = [
                {
                    text: "What is the capital of France?",
                    type: "multiple_choice",
                    options: [
                        {"text": "London", "isCorrect": false},
                        {"text": "Paris", "isCorrect": true}
                    ],
                    points: 1,
                    explanation: "Paris is the capital."
                }
            ];

            const validation = processor.validateQuestions(questions);
            
            expect(validation.isValid).toBe(true);
            expect(validation.errors).toHaveLength(0);
        });

        test('should detect missing required fields', () => {
            const questions = [
                {
                    // Missing text field
                    type: "multiple_choice",
                    options: [],
                    points: 1
                }
            ];

            const validation = processor.validateQuestions(questions);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.errors[0]).toContain('Missing or invalid \'text\' field');
        });

        test('should validate multiple choice questions', () => {
            const questions = [
                {
                    text: "Test question?",
                    type: "multiple_choice",
                    options: [
                        {"text": "Option 1", "isCorrect": true},
                        {"text": "Option 2", "isCorrect": true} // Invalid: two correct answers
                    ],
                    points: 1,
                    explanation: "Test explanation"
                }
            ];

            const validation = processor.validateQuestions(questions);
            
            expect(validation.isValid).toBe(false);
            expect(validation.errors.some(error => 
                error.includes('must have exactly one correct answer')
            )).toBe(true);
        });
    });
});

module.exports = {};
