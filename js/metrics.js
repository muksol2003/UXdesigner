const NIELSEN_HEURISTICS = [
    {
        id: 1,
        name: "Visibility of system status",
        keywords: ["visibility of system status", "system status", "feedback", "loading", "progress", "status"]
    },
    {
        id: 2,
        name: "Match between system and the real world",
        keywords: ["match between system", "real world", "user language", "terminology", "natural language"]
    },
    {
        id: 3,
        name: "User control and freedom",
        keywords: ["user control", "freedom", "undo", "cancel", "back", "exit"]
    },
    {
        id: 4,
        name: "Consistency and standards",
        keywords: ["consistency", "standards", "standard", "convention", "pattern"]
    },
    {
        id: 5,
        name: "Error prevention",
        keywords: ["error prevention", "prevent error", "validation", "mistake", "input constraint"]
    },
    {
        id: 6,
        name: "Recognition rather than recall",
        keywords: ["recognition rather than recall", "recognition", "recall", "memory load", "visible options"]
    },
    {
        id: 7,
        name: "Flexibility and efficiency of use",
        keywords: ["flexibility", "efficiency", "shortcut", "advanced user", "speed"]
    },
    {
        id: 8,
        name: "Aesthetic and minimalist design",
        keywords: ["aesthetic", "minimalist", "visual clutter", "clutter", "minimal", "layout"]
    },
    {
        id: 9,
        name: "Help users recognize, diagnose, and recover from errors",
        keywords: ["recover from errors", "diagnose", "error message", "recognize errors", "error recovery"]
    },
    {
        id: 10,
        name: "Help and documentation",
        keywords: ["help and documentation", "documentation", "help", "instructions", "guidance"]
    }
];

function cleanModelOutput(outputText) {
    return String(outputText || "")
        .replace(/```json/gi, "")
        .replace(/```javascript/gi, "")
        .replace(/```/g, "")
        .trim();
}

function extractJsonArray(outputText) {
    try {
        const cleaned = cleanModelOutput(outputText);

        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
            return JSON.parse(cleaned);
        }

        const start = cleaned.indexOf("[");
        const end = cleaned.lastIndexOf("]");

        if (start === -1 || end === -1 || end <= start) {
            return null;
        }

        const jsonString = cleaned.substring(start, end + 1);
        return JSON.parse(jsonString);
    } catch (error) {
        return null;
    }
}

function calculateHeuristicCoverage(outputText) {
    const parsed = extractJsonArray(outputText);

    if (Array.isArray(parsed)) {
        const matchedFromJson = [];

        parsed.forEach(issue => {
            const heuristicValue = String(issue.heuristic || "").toLowerCase();

            NIELSEN_HEURISTICS.forEach(heuristic => {
                const heuristicName = heuristic.name.toLowerCase();

                if (
                    heuristicValue.includes(heuristicName) ||
                    heuristic.keywords.some(keyword => heuristicValue.includes(keyword.toLowerCase()))
                ) {
                    matchedFromJson.push(heuristic.name);
                }
            });
        });

        const uniqueMatched = [...new Set(matchedFromJson)];

        return {
            matchedCount: uniqueMatched.length,
            coveragePercent: Math.round((uniqueMatched.length / 10) * 100),
            matchedHeuristics: uniqueMatched
        };
    }

    const text = String(outputText || "").toLowerCase();

    const matched = NIELSEN_HEURISTICS.filter(heuristic => {
        return heuristic.keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });

    return {
        matchedCount: matched.length,
        coveragePercent: Math.round((matched.length / 10) * 100),
        matchedHeuristics: matched.map(item => item.name)
    };
}

function countIssues(outputText) {
    const parsed = extractJsonArray(outputText);

    if (Array.isArray(parsed)) {
        return parsed.length;
    }

    const issueIndicators = [
        "issue",
        "problem",
        "confusing",
        "unclear",
        "difficult",
        "poor",
        "lack",
        "missing",
        "inconsistent",
        "cluttered",
        "hard to",
        "not clear",
        "low contrast",
        "ambiguous",
        "overwhelming"
    ];

    const sentences = String(outputText || "")
        .split(/[.!?\n]/)
        .map(item => item.trim())
        .filter(Boolean);

    let count = 0;

    sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();

        if (issueIndicators.some(word => lower.includes(word))) {
            count++;
        }
    });

    if (count === 0 && String(outputText || "").trim().length > 40) {
        count = 1;
    }

    return count;
}

function calculateSpecificityScore(outputText) {
    const parsed = extractJsonArray(outputText);

    if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
            return 0;
        }

        let total = 0;

        parsed.forEach(issue => {
            let score = 1;

            if (issue.element && String(issue.element).length > 3) score++;
            if (issue.heuristic && String(issue.heuristic).length > 3) score++;
            if (issue.description && String(issue.description).length > 25) score++;
            if (issue.fix && String(issue.fix).length > 20) score++;

            total += Math.min(score, 5);
        });

        return Math.round((total / parsed.length) * 10) / 10;
    }

    const text = String(outputText || "").toLowerCase();

    let score = 1;

    const hasLongText = outputText.length > 700;
    const hasNumbers = /\d/.test(outputText);
    const hasUiTerms = [
        "button",
        "navigation",
        "menu",
        "form",
        "input",
        "label",
        "contrast",
        "layout",
        "cta",
        "header",
        "footer",
        "modal",
        "card",
        "link",
        "icon",
        "search",
        "dropdown"
    ].some(term => text.includes(term));

    const hasActionableFix = [
        "recommend",
        "should",
        "increase",
        "reduce",
        "change",
        "make",
        "add",
        "remove",
        "improve",
        "use",
        "fix",
        "provide"
    ].some(term => text.includes(term));

    const hasSpecificLocation = [
        "top",
        "bottom",
        "left",
        "right",
        "header",
        "sidebar",
        "footer",
        "main section",
        "navigation bar"
    ].some(term => text.includes(term));

    if (hasLongText) score++;
    if (hasNumbers) score++;
    if (hasUiTerms) score++;
    if (hasActionableFix || hasSpecificLocation) score++;

    return Math.min(score, 5);
}

function calculatePotentialFalsePositiveCount(groupName, issueCount) {
    if (groupName === "well-designed") {
        return issueCount;
    }

    return 0;
}

function normalizeTextForSimilarity(text) {
    return String(text || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => ![
            "this",
            "that",
            "with",
            "from",
            "there",
            "their",
            "should",
            "could",
            "would",
            "interface",
            "issue",
            "problem",
            "user",
            "users"
        ].includes(word))
        .join(" ");
}

function extractIssueSignatures(outputText) {
    const parsed = extractJsonArray(outputText);

    if (Array.isArray(parsed)) {
        return parsed.map(issue => {
            const raw = [
                issue.element || "",
                issue.heuristic || "",
                issue.description || ""
            ].join(" ");

            return normalizeTextForSimilarity(raw)
                .split(/\s+/)
                .slice(0, 18)
                .join(" ");
        }).filter(Boolean);
    }

    const sentences = String(outputText || "")
        .split(/[.!?\n]/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 20);

    const issueIndicators = [
        "issue",
        "problem",
        "confusing",
        "unclear",
        "difficult",
        "poor",
        "lack",
        "missing",
        "inconsistent",
        "cluttered",
        "low contrast",
        "hard to"
    ];

    const issueSentences = sentences.filter(sentence => {
        const lower = sentence.toLowerCase();
        return issueIndicators.some(indicator => lower.includes(indicator));
    });

    const source = issueSentences.length > 0 ? issueSentences : sentences.slice(0, 6);

    return source.map(sentence => {
        return normalizeTextForSimilarity(sentence)
            .split(/\s+/)
            .slice(0, 18)
            .join(" ");
    }).filter(Boolean);
}

function jaccardSetSimilarity(arrayA, arrayB) {
    const setA = new Set(arrayA.filter(Boolean));
    const setB = new Set(arrayB.filter(Boolean));

    if (setA.size === 0 && setB.size === 0) {
        return 1;
    }

    if (setA.size === 0 || setB.size === 0) {
        return 0;
    }

    const intersection = new Set([...setA].filter(item => setB.has(item)));
    const union = new Set([...setA, ...setB]);

    return intersection.size / union.size;
}

function jaccardSimilarity(textA, textB) {
    const issuesA = extractIssueSignatures(textA);
    const issuesB = extractIssueSignatures(textB);

    return jaccardSetSimilarity(issuesA, issuesB);
}

function calculateAllMetrics(outputText, strategy, groupName) {
    const coverage = calculateHeuristicCoverage(outputText);
    const issueCount = countIssues(outputText);
    const specificity = calculateSpecificityScore(outputText);
    const potentialFalsePositiveCount = calculatePotentialFalsePositiveCount(groupName, issueCount);

    return {
        heuristicCoveragePercent: coverage.coveragePercent,
        matchedHeuristics: coverage.matchedHeuristics,
        issueCount: issueCount,
        issueSpecificityScore: specificity,
        potentialFalsePositiveCount: potentialFalsePositiveCount,
        falsePositiveCount: potentialFalsePositiveCount,
        consistencyScorePercent: null
    };
}
