// Global variable to store exam configurations loaded from API
let availableExamConfigs = {};

// DOM elements
const examTypeSelect = document.getElementById('examType');
const examInfo = document.getElementById('examInfo');
const outputPath = document.getElementById('outputPath');
const questionCount = document.getElementById('questionCount');
const topics = document.getElementById('topics');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const resultContainer = document.getElementById('resultContainer');
const resultContent = document.getElementById('resultContent');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const progressLogs = document.getElementById('progressLogs');



// Event listeners
examTypeSelect.addEventListener('change', handleExamTypeChange);
document.getElementById('questionForm').addEventListener('submit', handleFormSubmit);
clearBtn.addEventListener('click', handleClearForm);

// Handle exam type change
function handleExamTypeChange() {
    const selectedExam = examTypeSelect.value;
    
    if (selectedExam && availableExamConfigs[selectedExam]) {
        const config = availableExamConfigs[selectedExam];
        
        // Safely access properties with fallbacks
        const name = config.name || selectedExam.toUpperCase();
        const difficulty = config.difficulty || 'Standard Level';
        const description = config.description || 'Comprehensive exam questions';
        const points = config.points || 'Variable points per question';
        const timePerQuestion = config.timePerQuestion || 'Variable time per question';
        
        examInfo.innerHTML = `
            <h4>${name}</h4>
            <p><strong>Difficulty:</strong> ${difficulty}</p>
            <p><strong>Focus:</strong> ${description}</p>
            <p><strong>Marking:</strong> ${points} | <strong>Time:</strong> ${timePerQuestion}</p>
        `;
        examInfo.classList.add('show');
        
        // Update output path suggestion
        if (!outputPath.value || outputPath.value === 'output/questions.json') {
            outputPath.value = `output/${selectedExam}-questions.json`;
        }
        
        // Update topics placeholder based on exam type
        updateTopicsPlaceholder(selectedExam);
    } else if (selectedExam) {
        // Show basic info if config not loaded yet
        examInfo.innerHTML = `
            <h4>${selectedExam.toUpperCase()}</h4>
            <p><strong>Status:</strong> Loading configuration...</p>
        `;
        examInfo.classList.add('show');
        
        // Update output path suggestion
        if (!outputPath.value || outputPath.value === 'output/questions.json') {
            outputPath.value = `output/${selectedExam}-questions.json`;
        }
        
        // Update topics placeholder based on exam type
        updateTopicsPlaceholder(selectedExam);
    } else {
        examInfo.classList.remove('show');
    }
}

// Update topics placeholder based on exam type
function updateTopicsPlaceholder(examType) {
    const placeholders = {
        jkpsc: `Enter topics for JKPSC exam, one per line:

Advanced Organic Chemistry
Quantum Mechanics
Molecular Biology
Statistical Methods

# You can add comments with #
# Subject-specific topics
Research Methodology
Academic Writing`,
        jkpscJuniorAssistant: `Enter topics for JKPSC Junior Assistant exam, one per line:

General Knowledge
Basic Mathematics
English Grammar
Computer Awareness
Indian History
Geography
Current Affairs
Reasoning

# Medium level topics
# General competition level`,
        jkpsc_political_science: `Enter Political Science topics, one per line:

Political Theory
Comparative Politics
International Relations
Indian Government and Politics
Public Administration
Political Thought
Constitutional Law

# Advanced Political Science topics
# Postgraduate level`,
        jkpsc_chemistry: `Enter Chemistry topics, one per line:

Physical Chemistry
Organic Chemistry
Inorganic Chemistry
Analytical Chemistry
Thermodynamics
Chemical Kinetics
Coordination Compounds

# Advanced Chemistry topics
# Postgraduate level`,
        neet: `Enter NEET topics, one per line:

Cell Structure and Function
Biomolecules
Genetics
Human Physiology
Mechanics
Thermodynamics
Atomic Structure
Chemical Bonding

# NCERT Class 11-12 topics
# Biology, Physics, Chemistry`,
        jee: `Enter JEE topics, one per line:

Calculus
Coordinate Geometry
Mechanics
Electromagnetism
Organic Chemistry
Physical Chemistry

# Advanced level topics
# Mathematics, Physics, Chemistry`,
        upsc: `Enter UPSC topics, one per line:

Indian Polity
Indian Economy
Geography of India
Modern History
Current Affairs
International Relations

# General Studies topics
# Include current affairs integration`
    };
    
    topics.placeholder = placeholders[examType] || `Enter topics for ${examType} exam, one per line:

Topic 1
Topic 2
Topic 3

# You can add comments with #
# Subject-specific topics`;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        examType: examTypeSelect.value,
        outputPath: outputPath.value.trim(),
        questionCount: parseInt(questionCount.value),
        topics: topics.value.trim()
    };
    
    // Validate form
    if (!validateForm(formData)) {
        return;
    }
    
    // Show progress and hide results
    showProgress();
    hideResults();
    
    // Disable form
    setFormDisabled(true);
    
    try {
        await generateQuestions(formData);
    } catch (error) {
        showError('Generation failed: ' + error.message);
    } finally {
        setFormDisabled(false);
    }
}

// Validate form data
function validateForm(data) {
    if (!data.examType) {
        alert('Please select an exam type');
        return false;
    }
    
    // Check if exam configurations are loaded
    if (Object.keys(availableExamConfigs).length === 0) {
        alert('Exam configurations are still loading. Please wait a moment and try again.');
        return false;
    }
    
    // Check if selected exam type is valid
    if (!availableExamConfigs[data.examType]) {
        alert('Selected exam type is not valid. Please select a different exam type.');
        return false;
    }
    
    if (!data.outputPath) {
        alert('Please specify an output file path');
        return false;
    }
    
    if (!data.topics) {
        alert('Please enter at least one topic');
        return false;
    }
    
    if (data.questionCount < 1 || data.questionCount > 50) {
        alert('Question count must be between 1 and 50');
        return false;
    }
    
    return true;
}

// Generate questions
async function generateQuestions(formData) {
    try {
        updateProgress(10, 'Preparing topics...');
        addLog('Starting question generation...', 'info');
        addLog(`Exam Type: ${availableExamConfigs[formData.examType]?.name || formData.examType.toUpperCase()}`, 'info');
        addLog(`Questions per topic: ${formData.questionCount}`, 'info');
        
        // Parse topics
        const topicList = parseTopics(formData.topics);
        addLog(`Found ${topicList.length} topics`, 'success');
        
        updateProgress(20, 'Sending request to server...');
        
        const response = await fetch('/api/generate-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                examType: formData.examType,
                outputPath: formData.outputPath,
                questionCount: formData.questionCount,
                topics: topicList
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer
            
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const data = JSON.parse(line);
                        handleProgressUpdate(data);
                    } catch (e) {
                        // Ignore malformed JSON
                    }
                }
            }
        }
        
        // Process any remaining buffer
        if (buffer.trim()) {
            try {
                const data = JSON.parse(buffer);
                handleProgressUpdate(data);
            } catch (e) {
                // Ignore malformed JSON
            }
        }
        
    } catch (error) {
        addLog(`Error: ${error.message}`, 'error');
        showError(error.message);
    }
}

// Handle progress updates from server
function handleProgressUpdate(data) {
    if (data.type === 'progress') {
        updateProgress(data.progress, data.message);
        if (data.log) {
            addLog(data.log, data.logType || 'info');
        }
    } else if (data.type === 'complete') {
        updateProgress(100, 'Generation complete!');
        addLog('All questions generated successfully!', 'success');
        showResults(data.result);
        hideProgress();
    } else if (data.type === 'error') {
        addLog(`Error: ${data.message}`, 'error');
        showError(data.message);
        hideProgress();
    }
}

// Parse topics from textarea
function parseTopics(topicsText) {
    return topicsText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.startsWith('#'))
        .map(line => line.replace(/^\d+\.\s*/, '')); // Remove numbering
}

// UI Helper functions
function showProgress() {
    progressContainer.style.display = 'block';
    progressLogs.innerHTML = '';
    updateProgress(0, 'Initializing...');
}

function hideProgress() {
    setTimeout(() => {
        progressContainer.style.display = 'none';
    }, 2000);
}

function updateProgress(percent, message) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = message;
}

function addLog(message, type = 'info') {
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    progressLogs.appendChild(logEntry);
    progressLogs.scrollTop = progressLogs.scrollHeight;
}

function showResults(result) {
    resultContent.innerHTML = `
        <div class="success">
            <h4>✅ Questions Generated Successfully!</h4>
            <p><strong>Total Questions:</strong> ${result.totalQuestions}</p>
            <p><strong>Exam Type:</strong> ${result.examType}</p>
            <p><strong>Questions File:</strong> ${result.questionsFile}</p>
            <p><strong>Test Info File:</strong> ${result.testInfoFile}</p>
            <p><strong>Topics Processed:</strong> ${result.topics.length}</p>
        </div>
    `;
    resultContainer.style.display = 'block';
}

function hideResults() {
    resultContainer.style.display = 'none';
}

function showError(message) {
    resultContent.innerHTML = `
        <div class="error">
            <h4>❌ Generation Failed</h4>
            <p>${message}</p>
        </div>
    `;
    resultContainer.style.display = 'block';
}

function setFormDisabled(disabled) {
    const formElements = document.querySelectorAll('#questionForm input, #questionForm select, #questionForm textarea, #questionForm button');
    formElements.forEach(element => {
        element.disabled = disabled;
    });
    
    if (disabled) {
        generateBtn.querySelector('.btn-text').style.display = 'none';
        generateBtn.querySelector('.btn-loading').style.display = 'inline-flex';
    } else {
        generateBtn.querySelector('.btn-text').style.display = 'inline';
        generateBtn.querySelector('.btn-loading').style.display = 'none';
    }
}

// Handle clear form
function handleClearForm() {
    if (confirm('Are you sure you want to clear all form data?')) {
        document.getElementById('questionForm').reset();
        examInfo.classList.remove('show');
        hideResults();
        hideProgress();
    }
}

// Load available exam types from API
async function loadExamTypes() {
    try {
        const response = await fetch('/api/exam-types');
        const data = await response.json();
        
        if (data.success && data.examTypes && data.examConfigs) {
            // Store the exam configurations globally
            availableExamConfigs = data.examConfigs;
            
            // Clear existing options except the default
            examTypeSelect.innerHTML = '<option value="">Select Exam Type</option>';
            
            // Add options for each exam type
            for (const examType of data.examTypes) {
                const option = document.createElement('option');
                option.value = examType;
                
                // Get display name from API response
                const config = data.examConfigs[examType];
                const displayName = config ? 
                    `${examType.toUpperCase()} - ${config.name}` :
                    examType.toUpperCase();
                
                option.textContent = displayName;
                examTypeSelect.appendChild(option);
            }
            
            console.log('Loaded exam types:', data.examTypes);
            console.log('Loaded exam configs:', data.examConfigs);
        } else {
            console.error('Failed to load exam types:', data);
            // Fallback to hardcoded options if API fails
            loadFallbackExamTypes();
        }
    } catch (error) {
        console.error('Error loading exam types:', error);
        // Fallback to hardcoded options if API fails
        loadFallbackExamTypes();
    }
}

// Fallback function when API fails
function loadFallbackExamTypes() {
    examTypeSelect.innerHTML = '<option value="">Select Exam Type</option>';
    
    // Add a generic option to indicate API failure
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Unable to load exam types - please refresh the page';
    option.disabled = true;
    examTypeSelect.appendChild(option);
    
    console.error('Failed to load exam types from API');
}

// Initialize form
document.addEventListener('DOMContentLoaded', async function() {
    // Set default output path
    outputPath.value = 'output/questions.json';
    
    // Show loading state
    examTypeSelect.innerHTML = '<option value="">Loading exam types...</option>';
    examTypeSelect.disabled = true;
    
    // Load exam types from API
    await loadExamTypes();
    
    // Enable the select after loading
    examTypeSelect.disabled = false;
});