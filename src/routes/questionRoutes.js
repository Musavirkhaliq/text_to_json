const express = require('express');
const router = express.Router();
const GenericQuestionGenerator = require('../genericQuestionGenerator');
const path = require('path');
const fs = require('fs-extra');

/**
 * POST /api/generate-questions
 * Generate questions with streaming progress updates
 */
router.post('/generate-questions', async (req, res) => {
    try {
        const { examType, outputPath, questionCount, topics } = req.body;

        // Validate request
        if (!examType || !outputPath || !questionCount || !topics || !Array.isArray(topics)) {
            return res.status(400).json({
                type: 'error',
                message: 'Missing required fields: examType, outputPath, questionCount, topics'
            });
        }

        if (topics.length === 0) {
            return res.status(400).json({
                type: 'error',
                message: 'At least one topic is required'
            });
        }

        // Set up streaming response
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Helper function to send progress updates
        const sendProgress = (progress, message, log = null, logType = 'info') => {
            const data = {
                type: 'progress',
                progress,
                message,
                log,
                logType
            };
            res.write(JSON.stringify(data) + '\n');
        };

        // Helper function to send completion
        const sendComplete = (result) => {
            const data = {
                type: 'complete',
                result
            };
            res.write(JSON.stringify(data) + '\n');
            res.end();
        };

        // Helper function to send error
        const sendError = (message) => {
            const data = {
                type: 'error',
                message
            };
            res.write(JSON.stringify(data) + '\n');
            res.end();
        };

        try {
            // Initialize generator
            sendProgress(5, 'Initializing question generator...', `Setting up ${examType.toUpperCase()} question generator`);
            const generator = new GenericQuestionGenerator(examType);

            sendProgress(10, 'Validating topics...', `Processing ${topics.length} topics`);

            // Create temporary topics file
            const tempTopicsFile = path.join(__dirname, '../../temp', `topics-${Date.now()}.txt`);
            await fs.ensureDir(path.dirname(tempTopicsFile));
            await fs.writeFile(tempTopicsFile, topics.join('\n'));

            sendProgress(15, 'Starting question generation...', 'Topics file created, beginning generation');

            // Override console.log to capture generator logs
            const originalConsoleLog = console.log;
            const originalConsoleError = console.error;
            const originalConsoleWarn = console.warn;

            let currentTopicIndex = 0;
            const totalTopics = topics.length;

            console.log = (...args) => {
                const message = args.join(' ');
                
                // Track topic progress
                if (message.includes('Generating questions for topic')) {
                    currentTopicIndex++;
                    const topicProgress = 15 + (currentTopicIndex / totalTopics) * 70;
                    sendProgress(
                        Math.round(topicProgress), 
                        `Processing topic ${currentTopicIndex}/${totalTopics}...`,
                        message,
                        'info'
                    );
                } else if (message.includes('Successfully generated and parsed questions')) {
                    sendProgress(
                        Math.round(15 + (currentTopicIndex / totalTopics) * 70),
                        `Completed topic ${currentTopicIndex}/${totalTopics}`,
                        message,
                        'success'
                    );
                } else if (message.includes('Generation complete')) {
                    sendProgress(90, 'Finalizing output files...', message, 'success');
                } else {
                    // Send other logs
                    sendProgress(
                        null, 
                        null, 
                        message, 
                        'info'
                    );
                }
                
                originalConsoleLog(...args);
            };

            console.error = (...args) => {
                const message = args.join(' ');
                sendProgress(null, null, `ERROR: ${message}`, 'error');
                originalConsoleError(...args);
            };

            console.warn = (...args) => {
                const message = args.join(' ');
                sendProgress(null, null, `WARNING: ${message}`, 'warning');
                originalConsoleWarn(...args);
            };

            // Determine output directory and filename
            const outputDir = path.dirname(outputPath);
            const outputFilename = path.basename(outputPath, '.json');

            // Generate questions
            const result = await generator.generateFromTopics(
                tempTopicsFile,
                questionCount,
                outputDir
            );

            // Restore console functions
            console.log = originalConsoleLog;
            console.error = originalConsoleError;
            console.warn = originalConsoleWarn;

            // Clean up temp file
            await fs.remove(tempTopicsFile);

            if (result.success) {
                sendProgress(95, 'Saving files...', `Questions saved to ${result.questionsFile}`);
                
                // Rename files to match user's specified path if needed
                if (outputFilename !== 'questions') {
                    const newQuestionsFile = path.join(outputDir, `${outputFilename}.json`);
                    const newTestInfoFile = path.join(outputDir, `${outputFilename}-test-info.json`);
                    
                    await fs.move(result.questionsFile, newQuestionsFile);
                    await fs.move(result.testInfoFile, newTestInfoFile);
                    
                    result.questionsFile = newQuestionsFile;
                    result.testInfoFile = newTestInfoFile;
                }

                sendComplete(result);
            } else {
                sendError(result.error || 'Unknown error occurred during generation');
            }

        } catch (error) {
            console.error('Generation error:', error);
            sendError(error.message);
        }

    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({
            type: 'error',
            message: error.message
        });
    }
});

/**
 * GET /api/exam-types
 * Get available exam types with their configurations
 */
router.get('/exam-types', (req, res) => {
    try {
        const { examPrompts, getAvailableExams } = require('../examPrompts');
        const examTypes = getAvailableExams();
        
        // Create a simplified config object for the frontend
        const examConfigs = {};
        examTypes.forEach(examType => {
            const config = examPrompts[examType];
            if (config) {
                examConfigs[examType] = {
                    name: config.name || examType.toUpperCase(),
                    difficulty: config.difficulty || 'Standard Level',
                    description: config.description || `Questions for ${config.name || examType}`,
                    points: config.points || "Variable points per question",
                    timePerQuestion: config.timePerQuestion || "Variable time per question"
                };
            }
        });
        
        res.json({
            success: true,
            examTypes,
            examConfigs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/validate-topics
 * Validate topics format
 */
router.post('/validate-topics', (req, res) => {
    try {
        const { topics } = req.body;
        
        if (!topics || typeof topics !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Topics must be provided as a string'
            });
        }

        // Parse topics using the same logic as the generator
        const parsedTopics = topics
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.startsWith('#'))
            .map(line => line.replace(/^\d+\.\s*/, ''));

        res.json({
            success: true,
            topicCount: parsedTopics.length,
            topics: parsedTopics,
            message: `Found ${parsedTopics.length} valid topics`
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;