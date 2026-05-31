function buildNaivePrompt() {
    return `Analyze this web interface screenshot and identify usability problems.

Return your answer in clear English.

Focus on:
- confusing elements
- unclear labels
- visual hierarchy problems
- navigation problems
- form or input problems
- accessibility or readability problems
- layout and spacing problems

Do not invent issues that are not visible in the screenshot.`;
}

function buildStructuredPrompt() {
    return `You are a professional UX evaluator.

Analyze this web interface screenshot using Nielsen's 10 Usability Heuristics:

1. Visibility of system status
2. Match between system and the real world
3. User control and freedom
4. Consistency and standards
5. Error prevention
6. Recognition rather than recall
7. Flexibility and efficiency of use
8. Aesthetic and minimalist design
9. Help users recognize, diagnose, and recover from errors
10. Help and documentation

Return ONLY a valid JSON array. Do not include Markdown. Do not include explanations outside JSON.

Each array item must have this structure:
{
  "element": "specific visible UI element",
  "heuristic": "one of Nielsen's 10 heuristic names",
  "severity": 1,
  "description": "short explanation of the usability issue",
  "fix": "specific recommendation"
}

Rules:
- Report only problems that are clearly visible in the screenshot.
- Use severity from 1 to 5, where 1 is minor and 5 is critical.
- Be specific: mention concrete UI elements.
- If no significant usability issues are visible, return an empty JSON array: []`;
}

function getPromptByStrategy(strategy) {
    if (strategy === "structured") {
        return buildStructuredPrompt();
    }

    return buildNaivePrompt();
}
