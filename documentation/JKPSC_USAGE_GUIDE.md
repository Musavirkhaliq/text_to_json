# JKPSC Question Generator Usage Guide

## Overview
This tool generates advanced Multiple Choice Questions (MCQs) suitable for the JKPSC 10+2 Lecturer Recruitment Exam. The questions are designed to test conceptual understanding, analytical thinking, and application of knowledge at the postgraduate level.

## Features
- **Advanced Difficulty**: Questions designed for Masters-level candidates
- **Conceptual Focus**: Tests deep understanding, not just memorization
- **JKPSC Standards**: Aligned with JKPSC examination requirements
- **Flexible Topics**: Read topics from any text file
- **JSON Output**: Structured format for easy integration

## Quick Start

### 1. Setup
Ensure you have your Gemini API key in the `.env` file:
```
GEMINI_API_KEY=your_api_key_here
```

### 2. Prepare Topics File
Create a `topics.txt` file with one topic per line:
```
Photosynthesis: Light and Dark Reactions, C3, C4, and CAM Pathways
Cellular Respiration: Glycolysis, Krebs Cycle, and Electron Transport Chain
Cell Division: Mitosis, Meiosis, and Cell Cycle Regulation
# Comments start with #
Genetics: Mendelian Inheritance, Linkage, and Chromosomal Aberrations
```

### 3. Generate Questions
```bash
# Basic usage (5 questions per topic)
node generate-jkpsc-questions.js

# Custom number of questions per topic
node generate-jkpsc-questions.js --count 8

# Custom topics file
node generate-jkpsc-questions.js --topics biology-topics.txt --count 10
```

## Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--topics` | `-t` | Path to topics file | `topics.txt` |
| `--count` | `-c` | Questions per topic | `5` |
| `--help` | `-h` | Show help message | - |

## Output Files

The generator creates two files in the `output/` directory:

### 1. Questions File (`questions-[timestamp].json`)
Contains an array of question objects:
```json
[
  {
    "text": "In C4 photosynthesis, the primary CO2 acceptor in mesophyll cells is:",
    "type": "multiple_choice",
    "options": [
      {"text": "RuBP (Ribulose-1,5-bisphosphate)", "isCorrect": false},
      {"text": "PEP (Phosphoenolpyruvate)", "isCorrect": true},
      {"text": "3-PGA (3-Phosphoglycerate)", "isCorrect": false},
      {"text": "Oxaloacetate", "isCorrect": false}
    ],
    "points": 3,
    "explanation": "In C4 plants, PEP carboxylase in mesophyll cells catalyzes the fixation of CO2 to PEP, forming oxaloacetate as the first stable product."
  }
]
```

### 2. Test Info File (`test-info-[timestamp].json`)
Contains metadata about the test:
```json
{
  "title": "JKPSC 10+2 Lecturer Biology - Advanced Conceptual Assessment",
  "description": "Comprehensive practice test covering key biology topics...",
  "totalQuestions": 50,
  "topics": ["Photosynthesis", "Cellular Respiration", ...],
  "examType": "JKPSC 10+2 Lecturer Recruitment",
  "difficulty": "Advanced/Postgraduate Level",
  "createdAt": "2025-01-09T...",
  "questionTypes": {"multiple_choice": 50}
}
```

## Question Quality Standards

### Difficulty Level
- **Points**: 2-4 (reflecting advanced difficulty)
- **Thinking Time**: 2-3 minutes per question
- **Level**: Postgraduate/Masters level

### Question Types
- ✅ Application of concepts to new situations
- ✅ Analysis of experimental data or scenarios
- ✅ Comparison and contrast of related concepts
- ✅ Problem-solving using theoretical knowledge
- ✅ Integration of multiple concepts
- ✅ Critical evaluation of statements or hypotheses
- ❌ Simple definition-based questions
- ❌ Direct factual recall

### Answer Options
- Exactly 4 options per question
- One correct answer
- Plausible distractors that test understanding
- Clear, unambiguous wording

## Example Topics for Different Subjects

### Biology
```
Photosynthesis: Light and Dark Reactions, C3, C4, and CAM Pathways
Cellular Respiration: Glycolysis, Krebs Cycle, and Electron Transport Chain
Genetics: Mendelian Inheritance, Linkage, and Chromosomal Aberrations
Molecular Biology: DNA Replication, Transcription, and Translation
Ecology: Population Dynamics, Community Structure, and Ecosystem Function
```

### Chemistry
```
Chemical Bonding: Hybridization, Molecular Orbital Theory, and VSEPR
Thermodynamics: Enthalpy, Entropy, and Gibbs Free Energy
Kinetics: Reaction Mechanisms, Catalysis, and Rate Laws
Organic Chemistry: Reaction Mechanisms and Stereochemistry
Coordination Chemistry: Crystal Field Theory and Ligand Field Theory
```

### Physics
```
Quantum Mechanics: Wave-Particle Duality and Uncertainty Principle
Electromagnetic Theory: Maxwell's Equations and Wave Propagation
Thermodynamics: Laws of Thermodynamics and Statistical Mechanics
Solid State Physics: Crystal Structure and Electronic Properties
Nuclear Physics: Radioactivity, Nuclear Reactions, and Particle Physics
```

## Tips for Best Results

1. **Specific Topics**: Use detailed, specific topic descriptions rather than broad subjects
2. **Balanced Coverage**: Include 8-12 topics for comprehensive coverage
3. **Review Output**: Always review generated questions for accuracy and relevance
4. **Iterative Process**: Generate smaller batches first to test quality
5. **Subject Expertise**: Have subject matter experts review the questions

## Troubleshooting

### Common Issues
- **API Rate Limits**: The script includes delays between API calls
- **Invalid JSON**: The parser tries multiple extraction methods
- **Empty Results**: Check your topics file format and API key

### Error Messages
- `No topics found`: Check topics file exists and has valid content
- `Invalid JSON response`: API response parsing failed, try again
- `GEMINI_API_KEY is required`: Add your API key to the `.env` file

## Integration

The generated JSON files can be easily integrated into:
- Learning Management Systems (LMS)
- Quiz applications
- Assessment platforms
- Educational websites
- Mobile apps

## Support

For issues or questions:
1. Check the topics file format
2. Verify API key is set correctly
3. Review the console output for specific error messages
4. Try with a smaller number of topics first