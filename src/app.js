const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const QuestionProcessor = require('./questionProcessor');
const questionRoutes = require('./routes/questionRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Ensure upload and temp directories exist
const uploadDir = path.join(__dirname, '../uploads');
const tempDir = path.join(__dirname, '../temp');
fs.ensureDirSync(uploadDir);
fs.ensureDirSync(tempDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.txt', '.md', '.json'];
        const fileExtension = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${fileExtension}. Allowed types: ${allowedTypes.join(', ')}`));
        }
    }
});

// Initialize question processor
const questionProcessor = new QuestionProcessor();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/landing.html'));
});

app.get('/generator', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/processor', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/processor.html'));
});

// API routes for question generation
app.use('/api', questionRoutes);

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve generated files for download
app.get('/downloads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);

    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.sendFile(filePath);
});

app.post('/api/process-questions', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        console.log(`Processing file: ${req.file.originalname}`);
        
        // Process the uploaded file
        const result = await questionProcessor.processFile(req.file.path);
        
        // Clean up uploaded file
        try {
            await fs.remove(req.file.path);
        } catch (cleanupError) {
            console.warn('Failed to clean up uploaded file:', cleanupError);
        }

        if (result.success) {
            // Validate the processed questions
            const validation = questionProcessor.validateQuestions(result.data.questions);

            // Generate unique filename for the test info and questions
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const testInfoFilename = `test-info-${timestamp}.json`;
            const questionsFilename = `questions-${timestamp}.json`;

            // Save test info (title, description, metadata) to separate file
            const testInfoPath = path.join(uploadDir, testInfoFilename);
            await fs.writeJSON(testInfoPath, result.data.testInfo, { spaces: 2 });

            // Save questions to separate file
            const questionsPath = path.join(uploadDir, questionsFilename);
            await fs.writeJSON(questionsPath, result.data.questions, { spaces: 2 });

            res.json({
                ...result,
                validation,
                files: {
                    testInfo: testInfoFilename,
                    questions: questionsFilename,
                    testInfoPath: `/downloads/${testInfoFilename}`,
                    questionsPath: `/downloads/${questionsFilename}`
                }
            });
        } else {
            res.status(400).json(result);
        }

    } catch (error) {
        console.error('Error in /api/process-questions:', error);
        
        // Clean up uploaded file in case of error
        if (req.file) {
            try {
                await fs.remove(req.file.path);
            } catch (cleanupError) {
                console.warn('Failed to clean up uploaded file after error:', cleanupError);
            }
        }

        res.status(500).json({
            success: false,
            error: 'Internal server error: ' + error.message
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'File too large. Maximum size is 10MB.'
            });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Question Processor Tool running on http://localhost:${PORT}`);
    console.log(`📁 Upload directory: ${uploadDir}`);
    console.log(`🔑 Gemini API configured: ${!!process.env.GEMINI_API_KEY}`);
});

module.exports = app;
