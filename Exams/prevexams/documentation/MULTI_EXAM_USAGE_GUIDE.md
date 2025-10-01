# Multi-Exam Question Generator Usage Guide

## Overview

The Multi-Exam Question Generator is a flexible system that can generate questions for different types of competitive exams. Each exam type has its own specialized prompts and difficulty levels.

## Supported Exam Types

| Exam Type | Full Name | Difficulty Level | Target Audience |
|-----------|-----------|------------------|-----------------|
| `jkpsc` | JKPSC 10+2 Lecturer Recruitment | Advanced/Postgraduate | Teaching positions |
| `neet` | National Eligibility cum Entrance Test | Intermediate/Pre-Medical | Medical entrance |
| `jee` | Joint Entrance Examination | Advanced/Engineering | Engineering entrance |
| `upsc` | UPSC Civil Services Examination | Advanced/Administrative | Civil services |

## Quick Start

### Basic Usage
```bash
# Generate JKPSC questions (default)
node generate-questions.js

# Generate NEET questions
node generate-questions.js --exam neet --topics neet-topics.txt

# Generate JEE questions with 10 questions per topic
node generate-questions.js --exam jee --topics jee-topics.txt --count 10

# Generate UPSC questions with custom output directory
node generate-questions.js --exam upsc --topics upsc-topics.txt --output upsc-output
```

### Command Line Options

```bash
node generate-questions.js [options]

Options:
  --exam <type>           Exam type (jkpsc, neet, jee, upsc) [default: jkpsc]
  --topics <file>         Path to topics file [default: topics.txt]
  --count <number>        Questions per topic [default: 5]
  --output <directory>    Output directory [default: output]
  --help                  Show help message
```

## Exam-Specific Features

### JKPSC (Default)
- **Focus**: Postgraduate-level conceptual understanding
- **Question Types**: Analysis, synthesis, evaluation, multi-step problems
- **Points**: 2-4 per question
- **Time**: 2-3 minutes per question

### NEET
- **Focus**: NCERT-based fundamental concepts
- **Question Types**: Direct application, numerical problems, conceptual clarity
- **Points**: 4 per question (standard NEET marking)
- **Time**: 1-2 minutes per question

### JEE
- **Focus**: Advanced problem-solving and mathematical rigor
- **Question Types**: Complex numerical problems, multi-concept integration
- **Points**: 4 per question (standard JEE marking)
- **Time**: 2-4 minutes per question

### UPSC
- **Focus**: Analytical thinking and current affairs integration
- **Question Types**: Policy analysis, governance questions, current affairs
- **Points**: 2 per question (standard UPSC marking)
- **Time**: Analytical thinking required

## Topic File Format

Create a text file with topics, one per line:

```text
# Comments start with #
Topic 1
Topic 2
Topic 3

# You can group topics with comments
# Physics Topics
Mechanics
Thermodynamics
Electromagnetism
```

## Examples

### Example 1: Generate NEET Biology Questions
```bash
# Create topics file
echo "Cell Structure
Biomolecules
Genetics
Ecology" > biology-topics.txt

# Generate questions
node generate-questions.js --exam neet --topics biology-topics.txt --count 8 --output neet-biology
```

### Example 2: Generate JEE Physics Questions
```bash
# Use existing topics file
node generate-questions.js --exam jee --topics jee-topics.txt --count 15 --output jee-physics-2024
```

### Example 3: Generate UPSC Current Affairs Questions
```bash
# Create current affairs topics
echo "Digital India Initiative
Climate Change Policy
Economic Reforms
International Relations" > current-affairs.txt

# Generate questions
node generate-questions.js --exam upsc --topics current-affairs.txt --count 6
```

## Output Files

The generator creates two files for each run:

1. **Questions File**: `{EXAM}_{topics}_questions_{timestamp}.json`
   - Contains all generated questions with metadata
   - Includes question text, options, correct answers, explanations

2. **Test Info File**: `{EXAM}_{topics}_test-info_{timestamp}.json`
   - Contains test metadata and summary
   - Includes title, description, topic list, question counts

### Example Output Structure
```
output/
├── NEET_Cell_Biomolecules_questions_2025-01-10T12-30-45-123Z.json
├── NEET_Cell_Biomolecules_test-info_2025-01-10T12-30-45-123Z.json
├── JEE_Mechanics_Thermodynamics_questions_2025-01-10T13-15-22-456Z.json
└── JEE_Mechanics_Thermodynamics_test-info_2025-01-10T13-15-22-456Z.json
```

## Advanced Usage

### Batch Processing for Multiple Exams
```bash
# Generate questions for all exam types
for exam in jkpsc neet jee upsc; do
    node generate-questions.js --exam $exam --topics ${exam}-topics.txt --output ${exam}-output
done
```

### Custom Topic Files for Different Subjects
```bash
# Physics for different exams
node generate-questions.js --exam neet --topics physics-neet.txt --output neet-physics
node generate-questions.js --exam jee --topics physics-jee.txt --output jee-physics

# Different difficulty levels
node generate-questions.js --exam neet --count 5    # Moderate difficulty
node generate-questions.js --exam jee --count 10    # High difficulty
```

## Tips and Best Practices

### Topic Selection
- **NEET**: Focus on NCERT syllabus topics (Class 11-12)
- **JEE**: Include advanced mathematics and physics concepts
- **UPSC**: Include current affairs and governance topics
- **JKPSC**: Focus on subject-specific postgraduate concepts

### Question Count Recommendations
- **Practice Tests**: 5-10 questions per topic
- **Mock Exams**: 15-20 questions per topic
- **Quick Review**: 3-5 questions per topic

### Output Organization
```bash
# Organize by exam type
mkdir -p exams/{neet,jee,upsc,jkpsc}
node generate-questions.js --exam neet --output exams/neet
node generate-questions.js --exam jee --output exams/jee
```

## Troubleshooting

### Common Issues

1. **Invalid Exam Type**
   ```bash
   Error: Invalid exam type "xyz"
   Available exam types: jkpsc, neet, jee, upsc
   ```
   **Solution**: Use one of the supported exam types

2. **Topics File Not Found**
   ```bash
   Error: ENOENT: no such file or directory, open 'topics.txt'
   ```
   **Solution**: Create the topics file or specify correct path with `--topics`

3. **Invalid Question Count**
   ```bash
   Error: --count must be a positive number
   ```
   **Solution**: Use a positive integer for question count

### Getting Help
```bash
# Show usage information
node generate-questions.js --help

# Check available exam types
node -e "console.log(require('./src/examPrompts').getAvailableExams())"
```

## Integration with Existing Scripts

The new system is compatible with existing workflows:

```bash
# Use with existing batch processing
node generate-questions.js --exam neet --topics topics.txt --output my-quiz-files

# Use with existing CLI tools
node src/cli.js  # Still works for JKPSC
node generate-questions.js --exam jkpsc  # New flexible approach
```

## Customization

To add new exam types, edit `src/examPrompts.js` and add your exam configuration with:
- `name`: Full exam name
- `difficulty`: Difficulty level description
- `buildPrompt`: Function to build question generation prompt
- `titleDescriptionPrompt`: Function to build title/description prompt
- `fallbackTitle` and `fallbackDescription`: Fallback values

This system provides maximum flexibility while maintaining the quality and specificity needed for different competitive exams.