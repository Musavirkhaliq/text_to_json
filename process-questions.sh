#!/bin/bash

# Question Processor CLI Wrapper Script
# Usage: ./process-questions.sh <input-file> [output-directory]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    printf "${1}${2}${NC}\n"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_color $RED "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_color $RED "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the script directory
cd "$SCRIPT_DIR"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_color $RED "❌ Error: package.json not found. Make sure you're running this script from the project directory."
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    print_color $YELLOW "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        print_color $RED "❌ Error: Failed to install dependencies."
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_color $RED "❌ Error: .env file not found. Please create a .env file with your GEMINI_API_KEY."
    exit 1
fi

# Run the CLI with the provided arguments
npm run cli "$@"
