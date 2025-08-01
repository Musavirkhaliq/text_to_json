const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiClient {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required in environment variables');
        }
        
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    /**
     * Process questions and convert them to structured JSON format
     * @param {string} questionsText - Raw text containing questions
     * @returns {Promise<Array>} - Array of processed questions in JSON format
     */
    async processQuestions(questionsText) {
        try {
            const prompt = this.buildPrompt(questionsText);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse the JSON response
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            
            // Fallback: try to parse the entire response as JSON
            try {
                return JSON.parse(text);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', text);
                throw new Error('Invalid JSON response from Gemini API');
            }
        } catch (error) {
            console.error('Error processing questions with Gemini:', error);
            throw error;
        }
    }

    /**
     * Generate a catchy title and description for a set of questions
     * @param {Array} questions - Array of processed questions
     * @returns {Promise<Object>} - Object with title and description
     */
    async generateTitleAndDescription(questions) {
        try {
            const questionsText = questions.map(q => q.text).join('\n');
            const prompt = `
Based on these questions, generate a catchy title and engaging description:

Questions:
${questionsText}

Please respond with a JSON object containing:
{
    "title": "A catchy, engaging title for this quiz/question set",
    "description": "A brief, compelling description that explains what this quiz covers"
}

Make the title creative and the description informative but concise.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Parse the JSON response
            const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            
            try {
                return JSON.parse(text);
            } catch (parseError) {
                // Fallback title and description
                return {
                    title: "Knowledge Quiz",
                    description: "Test your knowledge with these carefully crafted questions"
                };
            }
        } catch (error) {
            console.error('Error generating title and description:', error);
            return {
                title: "Knowledge Quiz",
                description: "Test your knowledge with these carefully crafted questions"
            };
        }
    }

    /**
     * Build the prompt for processing questions
     * @param {string} questionsText - Raw questions text
     * @returns {string} - Formatted prompt
     */
    buildPrompt(questionsText) {
        return `
You are an expert question processor. Your task is to analyze the given questions and convert them into a structured JSON format.

For each question, you need to:
1. Rephrase the question clearly and concisely if needed
2. Determine the question type (multiple_choice, true_false, short_answer, or essay)
3. Generate appropriate options for multiple choice and true/false questions
4. Assign appropriate points (1-5 based on difficulty)
5. Provide a clear explanation for the correct answer

Input Questions:
${questionsText}

Please respond with a JSON array in this exact format:
[
  {
    "text": "Clear, well-phrased question",
    "type": "multiple_choice|true_false|short_answer|essay",
    "options": [
      {"text": "Option 1", "isCorrect": false},
      {"text": "Option 2", "isCorrect": true},
      {"text": "Option 3", "isCorrect": false}
    ],
    "points": 1,
    "explanation": "Clear explanation of why the answer is correct"
  }
]

Important guidelines:
- For multiple_choice: Include 3-4 options with exactly one correct answer
- For true_false: Include exactly 2 options (True/False)
- For short_answer and essay: Set options to an empty array []
- Points should be 1-5 based on question difficulty
- Explanations should be educational and informative
- Ensure all questions are clear and grammatically correct

Respond only with the JSON array, wrapped in \`\`\`json code blocks.
`;
    }
}

module.exports = GeminiClient;
