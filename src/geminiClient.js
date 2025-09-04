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
        const maxRetries = 3;
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Processing questions (attempt ${attempt}/${maxRetries})...`);
                const prompt = this.buildPrompt(questionsText);
                const result = await this.model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
            
            console.log('Raw Gemini response:', text.substring(0, 500) + '...');
            
            // Try multiple JSON extraction methods
            let jsonData = null;
            
            // Method 1: Look for JSON code blocks
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    jsonData = JSON.parse(jsonMatch[1].trim());
                } catch (e) {
                    console.log('Failed to parse JSON from code block, trying other methods...');
                }
            }
            
            // Method 2: Look for array pattern in the text
            if (!jsonData) {
                const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (arrayMatch) {
                    try {
                        jsonData = JSON.parse(arrayMatch[0]);
                    } catch (e) {
                        console.log('Failed to parse JSON array pattern, trying other methods...');
                    }
                }
            }
            
            // Method 3: Try to parse the entire response as JSON
            if (!jsonData) {
                try {
                    jsonData = JSON.parse(text.trim());
                } catch (e) {
                    console.log('Failed to parse entire response as JSON, trying cleanup...');
                }
            }
            
            // Method 4: Clean up common issues and try again
            if (!jsonData) {
                let cleanedText = text
                    .replace(/```json/g, '')
                    .replace(/```/g, '')
                    .replace(/^\s*[\w\s]*?(\[)/m, '$1') // Remove text before array
                    .replace(/(\])\s*[\w\s]*?$/m, '$1') // Remove text after array
                    .trim();
                
                try {
                    jsonData = JSON.parse(cleanedText);
                } catch (e) {
                    console.log('All JSON parsing methods failed');
                }
            }
            
            if (!jsonData) {
                console.error('Failed to parse JSON response. Raw response:', text);
                throw new Error('Invalid JSON response from Gemini API. Please check the API response format.');
            }
            
            // Validate that we got an array
            if (!Array.isArray(jsonData)) {
                console.error('Response is not an array:', jsonData);
                throw new Error('Expected JSON array of questions from Gemini API');
            }
            
            return jsonData;
            
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            lastError = error;
            
            if (attempt < maxRetries) {
                console.log(`Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        }
        
        console.error('All attempts failed. Last error:', lastError);
        throw lastError;
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
Respond only with the JSON object, wrapped in \`\`\`json code blocks.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            // Try multiple JSON extraction methods
            let jsonData = null;
            
            // Method 1: Look for JSON code blocks
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    jsonData = JSON.parse(jsonMatch[1].trim());
                } catch (e) {
                    console.log('Failed to parse title/description JSON from code block');
                }
            }
            
            // Method 2: Look for object pattern in the text
            if (!jsonData) {
                const objectMatch = text.match(/\{\s*"title"[\s\S]*?\}/);
                if (objectMatch) {
                    try {
                        jsonData = JSON.parse(objectMatch[0]);
                    } catch (e) {
                        console.log('Failed to parse title/description object pattern');
                    }
                }
            }
            
            // Method 3: Try to parse the entire response as JSON
            if (!jsonData) {
                try {
                    jsonData = JSON.parse(text.trim());
                } catch (e) {
                    console.log('Failed to parse entire title/description response as JSON');
                }
            }
            
            // Validate the response has required fields
            if (jsonData && jsonData.title && jsonData.description) {
                return jsonData;
            }
            
            // Fallback title and description
            console.log('Using fallback title and description');
            return {
                title: "Knowledge Quiz",
                description: "Test your knowledge with these carefully crafted questions"
            };
            
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
