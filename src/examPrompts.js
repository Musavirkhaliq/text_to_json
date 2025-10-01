/**
 * Exam-specific prompt configurations
 * Each exam type has its own prompt template and metadata
 */

const examPrompts = {
    jkpscJuniorAssistant: {
    name: "JKPSC Junior Assistant Recruitment",
    difficulty: "Medium/Undergraduate Level",
    description: "Questions focus on general knowledge, reasoning, basic mathematics, English, and computer awareness at undergraduate level.",
    points: "1-2 points per question",
    timePerQuestion: "1-2 minutes",
    buildPrompt: (topic, count) => `You are an expert in creating exam questions for the JKPSC (Jammu & Kashmir Public Service Commission) Junior Assistant Recruitment Exam. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

    IMPORTANT REQUIREMENTS:
    1. Questions must be at UNDERGRADUATE / GENERAL COMPETITION level difficulty
    2. Focus on CONCEPTUAL UNDERSTANDING and PRACTICAL APPLICATION rather than rote memorization
    3. Avoid overly advanced (postgraduate) material
    4. Each question must have 4 different options with exactly ONE correct answer
    5. Options should be plausible and not make the correct answer too obvious
    6. Provide clear, simple explanations for the correct answer
    7. Keep the language straightforward and exam-appropriate

    QUESTION TYPES TO INCLUDE:
    - General knowledge and reasoning
    - Give 
    - Basic mathematics & arithmetic applications
    - English grammar and comprehension
    - Computer awareness (MS Office, basics of IT)
    - General awareness (Indian polity, history, geography, economy)
    - Everyday problem-solving and logic

    FORMAT: Respond with a JSON array in this exact format:
    \`\`\`json
    [
    {
        "text": "Medium-level conceptual or practical question",
        "type": "multiple_choice",
        "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
        ],
        "points": 2,
        "explanation": "Clear explanation of why this answer is correct, with simple reasoning"
    }
    ]
    \`\`\`

    DIFFICULTY GUIDELINES:
    - Points: 1-2 (reflecting medium difficulty)
    - Questions should take 1-2 minutes of thinking time
    - Avoid tricky wordplay or advanced postgraduate content
    - Balance questions between factual recall, reasoning, and basic application

    Topic: ${topic}
    Generate ${count} medium-level JKPSC Junior Assistant MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,
            
        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a JKPSC Junior Assistant Recruitment Exam practice test covering these topics:
    Topics: ${topics.join(', ')}

    The test should reflect:
    - Undergraduate/medium level difficulty
    - JKPSC Junior Assistant examination standards
    - Mix of reasoning, general knowledge, math, English, and computer awareness
    - Balanced and exam-oriented

    Respond with JSON:
    \`\`\`json
    {
    "title": "Professional, exam-focused title",
    "description": "Comprehensive description highlighting medium-level difficulty and JKPSC Junior Assistant exam relevance"
    }
    \`\`\`
    Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "JKPSC Junior Assistant Recruitment - Medium Level Practice Test",
        fallbackDescription: (topics) => `Comprehensive practice test for JKPSC Junior Assistant Recruitment covering ${topics.length} important topics. Features medium-level MCQs designed to test reasoning, English, mathematics, computer awareness, and general knowledge in line with JKPSC standards.`
    },
    jkpsc_political_science: {
    name: "JKPSC 10+2 Lecturer Recruitment – Political Science",
    difficulty: "Advanced/Postgraduate Level",
    description: "Advanced Political Science questions focusing on theories, institutions, processes, and critical analysis at postgraduate level.",
    points: "2-4 points per question",
    timePerQuestion: "2-3 minutes",
    buildPrompt: (topic, count) => `You are an expert in creating questions for the JKPSC (Jammu & Kashmir Public Service Commission) 10+2 Lecturer Recruitment Exam in Political Science. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

    IMPORTANT REQUIREMENTS:
    1. Questions must be at POSTGRADUATE/MASTERS level difficulty in Political Science
    2. Focus on CONCEPTUAL UNDERSTANDING, APPLICATION, and CRITICAL THINKING – not mere factual recall
    3. Questions should test DEEP UNDERSTANDING of political theories, institutions, processes, and ideologies
    4. Avoid simple definition-based or direct recall questions
    5. Include questions that require ANALYSIS, COMPARISON, SYNTHESIS, and EVALUATION of political concepts
    6. Each question should have 4 options with exactly ONE correct answer
    7. Options must be plausible to avoid guesswork and obvious answers
    8. Provide clear, academic explanations for correct answers with references to key thinkers, theories, or case studies where appropriate

    QUESTION TYPES TO INCLUDE:
    - Application of political theories to contemporary/global contexts
    - Critical evaluation of statements, arguments, or hypotheses
    - Comparison and contrast of related concepts
    - Interpretation of political philosophies and their practical implications
    - historic dates And Scholar's Views.
    - Integration of multiple concepts across topics
    - Problem-solving using theoretical knowledge
    - Application of concepts to new situations
    - Numerical problems requiring multi-step calculations
    

    FORMAT: Respond with a JSON array in this exact format:
    \`\`\`json
    [
    {
        "text": "Advanced conceptual question in Political Science that requires deep understanding",
        "type": "multiple_choice",
        "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
        ],
        "points": 3,
        "explanation": "Detailed explanation of why this answer is correct, including relevant political theories, thinkers, and reasoning"
    }
    ]
    \`\`\`

    DIFFICULTY GUIDELINES:
    - Points: 2-4 (reflecting postgraduate-level difficulty)
    - Each question should require 2-3 minutes of reasoning and conceptual application
    - Avoid straightforward memorization-based questions
    - Where relevant, include interdisciplinary connections (e.g., sociology, economics, law, history)

    Topic: ${topic}
    Generate ${count} high-quality JKPSC-level MCQs in Political Science now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,

        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment Exam practice test in Political Science covering these topics:
    Topics: ${topics.join(', ')}

    The test should reflect:
    - Advanced postgraduate-level difficulty
    - JKPSC examination standards for Political Science
    - Emphasis on conceptual and analytical Political Science questions
    - Professional academic assessment

    Respond with JSON:
    \`\`\`json
    {
    "title": "Professional, exam-focused title for Political Science",
    "description": "Comprehensive description highlighting the advanced Political Science focus and JKPSC relevance"
    }
    \`\`\`
    Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "JKPSC 10+2 Lecturer Recruitment – Political Science Advanced Practice Test",
        fallbackDescription: (topics) => `Comprehensive practice test for JKPSC 10+2 Lecturer Recruitment in Political Science covering ${topics.length} key areas. Features postgraduate-level MCQs designed to test conceptual understanding, critical analysis, and application of political knowledge as per JKPSC examination standards.`
    },
    jkpsc_chemistry: {
    name: "JKPSC 10+2 Lecturer Recruitment (Chemistry)",
    difficulty: "Advanced/Postgraduate Level",
    description: "Advanced Chemistry questions covering physical, organic, inorganic, and analytical chemistry at postgraduate level.",
    points: "2-4 points per question",
    timePerQuestion: "2-3 minutes",
    buildPrompt: (topic, count) => `You are an expert in creating Chemistry questions for the JKPSC (Jammu & Kashmir Public Service Commission) 10+2 Lecturer Recruitment Exam. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

    IMPORTANT REQUIREMENTS:
    1. Questions must be at POSTGRADUATE/MASTERS level difficulty in Chemistry
    2. Focus on CONCEPTUAL UNDERSTANDING, APPLICATION, and REASONING — not just factual recall
    3. Questions should test DEEP UNDERSTANDING of physical, organic, inorganic, and analytical chemistry concepts based on topics given
    4. Avoid simple definition-based questions 
    5. Include problems that require ANALYSIS of data, SYNTHESIS of ideas, and CRITICAL EVALUATION
    6. Each question should have 4 options with exactly ONE correct answer
    7. Options should be plausible to avoid guesswork and obvious right answers
    8. Provide clear, educational explanations for correct answers

    QUESTION TYPES TO INCLUDE:
    - Application of concepts to novel situations
    - Numerical problems requiring multi-step calculations 
    - Analysis of experimental/graphical data 
    - Comparison and contrast of related concepts 
    - Problem-solving using theoretical chemistry 
    - Integration of multiple concepts 
    - Critical evaluation of chemical statements or reaction hypotheses


    FORMAT: Respond with a JSON array in this exact format:
    \`\`\`json
    [
    {
        "text": "Advanced conceptual Chemistry question that requires deep understanding",
        "type": "multiple_choice",
        "options": [
        {"text": "Option A", "isCorrect": false},
        {"text": "Option B", "isCorrect": true},
        {"text": "Option C", "isCorrect": false},
        {"text": "Option D", "isCorrect": false}
        ],
        "points": 3,
        "explanation": "Detailed explanation of why this answer is correct, including relevant chemical principles, reasoning, and where necessary numerical solution steps"
    }
    ]
    \`\`\`

    DIFFICULTY GUIDELINES:
    - Points: 2–4 (reflecting advanced difficulty)
    - Questions should require 2–3 minutes of thinking and multi-step reasoning
    - Avoid questions solvable by rote memorization
    - Include interdisciplinary connections (chemistry with physics, biology, material science) where relevant

    Topic: ${topic}
    Generate ${count} high-quality Chemistry MCQs at JKPSC level now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,

        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment (Chemistry) Exam practice test covering these topics:
    Topics: ${topics.join(', ')}

    The test should reflect:
    - Advanced postgraduate Chemistry difficulty
    - JKPSC examination standards
    - Conceptual, numerical, and analytical Chemistry questions
    - Professional academic assessment

    Respond with JSON:
    \`\`\`json
    {
    "title": "Professional, Chemistry-focused exam title",
    "description": "Comprehensive description highlighting the advanced Chemistry nature and JKPSC relevance"
    }
    \`\`\`
    Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "JKPSC 10+2 Lecturer Recruitment (Chemistry) - Advanced Practice Test",
        fallbackDescription: (topics) => `Comprehensive Chemistry practice test for JKPSC 10+2 Lecturer Recruitment covering ${topics.length} key topics. Features postgraduate-level Chemistry MCQs designed to test conceptual understanding, problem-solving, and analytical reasoning as per JKPSC standards.`
    },
    jkpsc: {
        name: "JKPSC 10+2 Lecturer Recruitment",
        difficulty: "Advanced/Postgraduate Level",
        description: "Questions focus on conceptual understanding, analysis, and evaluation at postgraduate level.",
        points: "2-4 points per question",
        timePerQuestion: "2-3 minutes",
        buildPrompt: (topic, count) => `You are an expert in creating questions for the JKPSC (Jammu & Kashmir Public Service Commission) 10+2 Lecturer Recruitment Exam. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at POSTGRADUATE/MASTERS level difficulty
2. Focus on CONCEPTUAL UNDERSTANDING, APPLICATION, and REASONING - not just factual recall
3. Questions should test DEEP UNDERSTANDING of the subject
4. Avoid simple definition-based questions
5. Include questions that require ANALYSIS, SYNTHESIS, and EVALUATION
6. Each question should have 4 options with exactly ONE correct answer
7. Options should be plausible to avoid guesswork and obvious right answers
8. Provide clear, educational explanations for correct answers

QUESTION TYPES TO INCLUDE:
- Application of concepts to new situations
- Numerical problems requiring multi-step calculations
- Analysis of experimental data or scenarios
- Comparison and contrast of related concepts
- Problem-solving using theoretical knowledge
- Integration of multiple concepts
- Critical evaluation of statements or hypotheses

FORMAT: Respond with a JSON array in this exact format:
\`\`\`json
[
  {
    "text": "Advanced conceptual question that requires deep understanding",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 3,
    "explanation": "Detailed explanation of why this answer is correct, including relevant concepts and reasoning"
  }
]
\`\`\`

DIFFICULTY GUIDELINES:
- Points: 2-4 (reflecting advanced difficulty)
- Questions should require 2-3 minutes of thinking time
- Avoid questions that can be answered by simple memorization
- Include interdisciplinary connections where relevant

Topic: ${topic}
Generate ${count} high-quality JKPSC-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,
        
        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a JKPSC 10+2 Lecturer Recruitment Exam practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- Advanced postgraduate level difficulty
- JKPSC examination standards
- Conceptual and analytical questions
- Professional academic assessment

Respond with JSON:
\`\`\`json
{
  "title": "Professional, exam-focused title",
  "description": "Comprehensive description highlighting the advanced nature and JKPSC relevance"
}
\`\`\`
Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "JKPSC 10+2 Lecturer Recruitment - Advanced Practice Test",
        fallbackDescription: (topics) => `Comprehensive practice test for JKPSC 10+2 Lecturer Recruitment covering ${topics.length} key topics. Features postgraduate-level MCQs designed to test conceptual understanding, analytical thinking, and application of knowledge as per JKPSC examination standards.`
    },

    neet: {
        name: "NEET (National Eligibility cum Entrance Test)",
        difficulty: "Intermediate/Pre-Medical Level",
        description: "NCERT-based questions testing fundamental concepts for medical entrance.",
        points: "4 points per question",
        timePerQuestion: "1-2 minutes",
        buildPrompt: (topic, count) => `You are an expert in creating questions for the NEET (National Eligibility cum Entrance Test) for medical entrance. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at NEET level difficulty (Class 11-12 standard)
2. Focus on CONCEPTUAL CLARITY and APPLICATION of basic principles
3. Questions should test understanding of fundamental concepts
4. Include numerical problems and application-based questions
5. Each question should have 4 options with exactly ONE correct answer
6. Options should be carefully crafted to test understanding
7. Provide clear explanations linking to NCERT concepts

QUESTION TYPES TO INCLUDE:
- Direct application of formulas and concepts
- Numerical calculations with moderate complexity
- Conceptual questions testing understanding
- Diagram-based or scenario-based questions
- Comparison of related phenomena
- Cause and effect relationships

FORMAT: Respond with a JSON array in this exact format:
\`\`\`json
[
  {
    "text": "Clear, NEET-level question testing fundamental concepts",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 4,
    "explanation": "Clear explanation connecting to NCERT concepts and fundamental principles"
  }
]
\`\`\`

DIFFICULTY GUIDELINES:
- Points: 4 (standard NEET marking)
- Questions should be solvable in 1-2 minutes
- Based on NCERT syllabus (Class 11-12)
- Include both theoretical and numerical questions

Topic: ${topic}
Generate ${count} high-quality NEET-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,

        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a NEET (National Eligibility cum Entrance Test) practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- NEET examination standards
- Class 11-12 NCERT level difficulty
- Medical entrance preparation focus
- Conceptual and numerical questions

Respond with JSON:
\`\`\`json
{
  "title": "Professional NEET practice test title",
  "description": "Comprehensive description highlighting NEET relevance and medical entrance preparation"
}
\`\`\`
Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "NEET Practice Test - Medical Entrance Preparation",
        fallbackDescription: (topics) => `Comprehensive NEET practice test covering ${topics.length} essential topics. Features Class 11-12 level MCQs based on NCERT syllabus, designed for medical entrance preparation with focus on conceptual understanding and problem-solving skills.`
    },

    jee: {
        name: "JEE (Joint Entrance Examination)",
        difficulty: "Advanced/Engineering Level",
        description: "Complex problem-solving questions requiring mathematical rigor and analytical thinking.",
        points: "4 points per question",
        timePerQuestion: "2-4 minutes",
        buildPrompt: (topic, count) => `You are an expert in creating questions for the JEE (Joint Entrance Examination) for engineering entrance. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at JEE level difficulty (Class 11-12 advanced standard)
2. Focus on PROBLEM-SOLVING, ANALYTICAL THINKING, and MATHEMATICAL RIGOR
3. Questions should test deep conceptual understanding and application
4. Include challenging numerical problems and multi-concept integration
5. Each question should have 4 options with exactly ONE correct answer
6. Options should be designed to catch common misconceptions
7. Provide detailed explanations with step-by-step solutions

QUESTION TYPES TO INCLUDE:
- Complex numerical problems requiring multiple steps
- Conceptual questions with tricky scenarios
- Integration of multiple topics/concepts
- Graph interpretation and analysis
- Theoretical derivations and applications
- Problem-solving with given constraints

FORMAT: Respond with a JSON array in this exact format:
\`\`\`json
[
  {
    "text": "Challenging JEE-level question requiring analytical thinking",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 4,
    "explanation": "Detailed step-by-step solution with mathematical reasoning and concept explanation"
  }
]
\`\`\`

DIFFICULTY GUIDELINES:
- Points: 4 (standard JEE marking)
- Questions should require 2-4 minutes of focused thinking
- Include both single-concept and multi-concept questions
- Emphasize mathematical problem-solving skills

Topic: ${topic}
Generate ${count} high-quality JEE-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,

        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a JEE (Joint Entrance Examination) practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- JEE examination standards
- Advanced problem-solving focus
- Engineering entrance preparation
- Mathematical rigor and analytical thinking

Respond with JSON:
\`\`\`json
{
  "title": "Professional JEE practice test title",
  "description": "Comprehensive description highlighting JEE relevance and engineering entrance preparation"
}
\`\`\`
Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "JEE Practice Test - Engineering Entrance Preparation",
        fallbackDescription: (topics) => `Comprehensive JEE practice test covering ${topics.length} key topics. Features advanced-level MCQs designed for engineering entrance preparation with emphasis on problem-solving, analytical thinking, and mathematical rigor.`
    },

    upsc: {
        name: "UPSC Civil Services Examination",
        difficulty: "Advanced/Administrative Level",
        description: "Questions integrating theory with governance, policy analysis, and current affairs.",
        points: "2 points per question",
        timePerQuestion: "Analytical thinking required",
        buildPrompt: (topic, count) => `You are an expert in creating questions for the UPSC Civil Services Examination. Generate ${count} Multiple Choice Questions (MCQs) on the topic: "${topic}"

IMPORTANT REQUIREMENTS:
1. Questions must be at UPSC level difficulty (graduate and above)
2. Focus on ANALYTICAL THINKING, CURRENT AFFAIRS integration, and POLICY UNDERSTANDING
3. Questions should test comprehensive knowledge and critical analysis
4. Include questions connecting theory with practical governance
5. Each question should have 4 options with exactly ONE correct answer
6. Options should test nuanced understanding of concepts
7. Provide explanations linking to governance, policy, and current context

QUESTION TYPES TO INCLUDE:
- Policy analysis and implementation questions
- Current affairs integration with theoretical concepts
- Cause-effect relationships in governance
- Comparative analysis of different approaches
- Constitutional and legal framework questions
- Socio-economic impact analysis

FORMAT: Respond with a JSON array in this exact format:
\`\`\`json
[
  {
    "text": "UPSC-level question integrating theory with practical governance",
    "type": "multiple_choice",
    "options": [
      {"text": "Option A", "isCorrect": false},
      {"text": "Option B", "isCorrect": true},
      {"text": "Option C", "isCorrect": false},
      {"text": "Option D", "isCorrect": false}
    ],
    "points": 2,
    "explanation": "Comprehensive explanation linking theory, policy, and current affairs context"
  }
]
\`\`\`

DIFFICULTY GUIDELINES:
- Points: 2 (standard UPSC marking)
- Questions should require analytical thinking and broad knowledge
- Include current affairs and policy dimensions
- Focus on administrative and governance perspectives

Topic: ${topic}
Generate ${count} high-quality UPSC-level MCQs now. Respond only with the JSON array wrapped in \`\`\`json\`\`\` code blocks.`,

        titleDescriptionPrompt: (topics) => `Generate a professional title and description for a UPSC Civil Services Examination practice test covering these topics:
Topics: ${topics.join(', ')}

The test should reflect:
- UPSC examination standards
- Administrative and governance focus
- Current affairs integration
- Policy analysis and critical thinking

Respond with JSON:
\`\`\`json
{
  "title": "Professional UPSC practice test title",
  "description": "Comprehensive description highlighting UPSC relevance and civil services preparation"
}
\`\`\`
Respond only with the JSON object wrapped in \`\`\`json\`\`\` code blocks.`,

        fallbackTitle: "UPSC Civil Services Practice Test",
        fallbackDescription: (topics) => `Comprehensive UPSC Civil Services practice test covering ${topics.length} important topics. Features graduate-level MCQs designed for administrative services preparation with focus on analytical thinking, policy understanding, and current affairs integration.`
    }
};

/**
 * Get available exam types
 * @returns {Array<string>} - Array of available exam type keys
 */
function getAvailableExams() {
    return Object.keys(examPrompts);
}

/**
 * Get exam configuration by type
 * @param {string} examType - Exam type key
 * @returns {Object|null} - Exam configuration or null if not found
 */
function getExamConfig(examType) {
    return examPrompts[examType] || null;
}

/**
 * Validate if exam type exists
 * @param {string} examType - Exam type to validate
 * @returns {boolean} - Whether exam type is valid
 */
function isValidExamType(examType) {
    return examType && examPrompts.hasOwnProperty(examType);
}

module.exports = {
    examPrompts,
    getAvailableExams,
    getExamConfig,
    isValidExamType
};