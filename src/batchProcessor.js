const fs = require('fs-extra');
const path = require('path');
const pdfParse = require('pdf-parse');
const QuestionProcessor = require('./questionProcessor');

class BatchProcessor {
    constructor() {
        this.questionProcessor = new QuestionProcessor();
        this.supportedFormats = ['.txt', '.md', '.json', '.pdf'];
    }

    /**
     * Process all supported files in a folder
     * @param {string} inputFolder - Path to the folder containing files
     * @param {string} outputFolder - Path to the folder where JSON files will be saved
     * @returns {Promise<Object>} - Processing results
     */
    async processFolder(inputFolder, outputFolder) {
        try {
            // Validate input folder exists
            if (!await fs.pathExists(inputFolder)) {
                throw new Error(`Input folder does not exist: ${inputFolder}`);
            }

            // Ensure output folder exists
            await fs.ensureDir(outputFolder);

            // Get all supported files from the input folder
            const files = await this.getSupportedFiles(inputFolder);
            
            if (files.length === 0) {
                return {
                    success: false,
                    error: `No supported files found in ${inputFolder}. Supported formats: ${this.supportedFormats.join(', ')}`
                };
            }

            console.log(`Found ${files.length} supported files to process`);

            const results = {
                success: true,
                totalFiles: files.length,
                processedFiles: [],
                failedFiles: [],
                summary: {
                    successful: 0,
                    failed: 0,
                    totalQuestions: 0
                }
            };

            // Process each file
            for (const filePath of files) {
                try {
                    console.log(`Processing: ${path.basename(filePath)}`);
                    
                    const result = await this.processSingleFile(filePath, outputFolder);
                    
                    if (result.success) {
                        results.processedFiles.push({
                            inputFile: filePath,
                            outputFiles: result.outputFiles,
                            questionsCount: result.questionsCount
                        });
                        results.summary.successful++;
                        results.summary.totalQuestions += result.questionsCount;
                    } else {
                        results.failedFiles.push({
                            inputFile: filePath,
                            error: result.error
                        });
                        results.summary.failed++;
                    }
                } catch (error) {
                    console.error(`Error processing ${filePath}:`, error);
                    results.failedFiles.push({
                        inputFile: filePath,
                        error: error.message
                    });
                    results.summary.failed++;
                }
            }

            return results;

        } catch (error) {
            console.error('Error in batch processing:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process a single file and save JSON output
     * @param {string} filePath - Path to the input file
     * @param {string} outputFolder - Path to the output folder
     * @returns {Promise<Object>} - Processing result
     */
    async processSingleFile(filePath, outputFolder) {
        try {
            const fileExtension = path.extname(filePath).toLowerCase();
            const baseName = path.basename(filePath, fileExtension);
            
            let fileContent;
            
            // Handle PDF files differently
            if (fileExtension === '.pdf') {
                fileContent = await this.extractTextFromPDF(filePath);
            } else {
                // For other supported formats, use the existing processor
                const result = await this.questionProcessor.processFile(filePath);
                
                if (!result.success) {
                    return {
                        success: false,
                        error: result.error
                    };
                }

                // Save the JSON files
                const outputFiles = await this.saveJSONFiles(baseName, result.data, outputFolder);
                
                return {
                    success: true,
                    outputFiles: outputFiles,
                    questionsCount: result.data.questions.length
                };
            }

            // For PDF files, process the extracted text
            if (fileExtension === '.pdf') {
                // Create a temporary text file to process
                const tempTextFile = path.join(outputFolder, `${baseName}_temp.txt`);
                await fs.writeFile(tempTextFile, fileContent);
                
                try {
                    const result = await this.questionProcessor.processFile(tempTextFile);
                    
                    // Clean up temp file
                    await fs.remove(tempTextFile);
                    
                    if (!result.success) {
                        return {
                            success: false,
                            error: result.error
                        };
                    }

                    // Save the JSON files
                    const outputFiles = await this.saveJSONFiles(baseName, result.data, outputFolder);
                    
                    return {
                        success: true,
                        outputFiles: outputFiles,
                        questionsCount: result.data.questions.length
                    };
                } catch (error) {
                    // Clean up temp file in case of error
                    await fs.remove(tempTextFile).catch(() => {});
                    throw error;
                }
            }

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
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

    /**
     * Save JSON files with consistent naming
     * @param {string} baseName - Base name for the output files
     * @param {Object} data - Processed data to save
     * @param {string} outputFolder - Output folder path
     * @returns {Promise<Object>} - Paths to saved files
     */
    async saveJSONFiles(baseName, data, outputFolder) {
        const questionsPath = path.join(outputFolder, `${baseName}_questions.json`);
        const testInfoPath = path.join(outputFolder, `${baseName}_test_info.json`);

        await fs.writeJSON(questionsPath, data.questions, { spaces: 2 });
        await fs.writeJSON(testInfoPath, data.testInfo, { spaces: 2 });

        return {
            questionsFile: questionsPath,
            testInfoFile: testInfoPath
        };
    }

    /**
     * Get all supported files from a folder
     * @param {string} folderPath - Path to the folder
     * @returns {Promise<Array>} - Array of file paths
     */
    async getSupportedFiles(folderPath) {
        const files = [];
        const items = await fs.readdir(folderPath);

        for (const item of items) {
            const itemPath = path.join(folderPath, item);
            const stat = await fs.stat(itemPath);

            if (stat.isFile()) {
                const extension = path.extname(item).toLowerCase();
                if (this.supportedFormats.includes(extension)) {
                    files.push(itemPath);
                }
            }
        }

        return files.sort(); // Sort files alphabetically
    }
}

module.exports = BatchProcessor;
