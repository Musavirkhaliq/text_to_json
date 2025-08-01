#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function setup() {
    console.log('🚀 Question Processor Tool Setup\n');
    
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    const envExists = await fs.pathExists(envPath);
    
    if (!envExists) {
        console.log('Setting up environment variables...\n');
        
        const apiKey = await new Promise((resolve) => {
            rl.question('Enter your Gemini API key: ', (answer) => {
                resolve(answer.trim());
            });
        });
        
        if (!apiKey) {
            console.log('❌ API key is required. Please run setup again.');
            process.exit(1);
        }
        
        const envContent = `# Gemini API Configuration
GEMINI_API_KEY=${apiKey}

# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads`;
        
        await fs.writeFile(envPath, envContent);
        console.log('✅ Environment file created successfully!\n');
    } else {
        console.log('✅ Environment file already exists.\n');
    }
    
    // Ensure directories exist
    const directories = ['uploads', 'public', 'src', 'test'];
    for (const dir of directories) {
        await fs.ensureDir(path.join(__dirname, dir));
    }
    console.log('✅ Required directories created.\n');
    
    console.log('🎉 Setup complete! You can now run:');
    console.log('   npm start     - Start the application');
    console.log('   npm run dev   - Start in development mode');
    console.log('   npm test      - Run tests\n');
    
    console.log('📖 Open http://localhost:3000 in your browser to use the tool.');
    
    rl.close();
}

setup().catch(console.error);
