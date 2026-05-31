const STORAGE_KEYS = {
    screenshots: "heurivision_screenshots",
    experiments: "heurivision_experiments",
    lastResult: "heurivision_last_result"
};

function getFromStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (error) {
        console.error("Storage read error:", error);
        return fallback;
    }
}

function saveToStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getScreenshots() {
    return getFromStorage(STORAGE_KEYS.screenshots, []);
}

function saveScreenshot(screenshot) {
    const screenshots = getScreenshots();
    screenshots.push(screenshot);
    saveToStorage(STORAGE_KEYS.screenshots, screenshots);
}

function getExperiments() {
    return getFromStorage(STORAGE_KEYS.experiments, []);
}

function saveExperiment(experiment) {
    const experiments = getExperiments();
    experiments.push(experiment);
    saveToStorage(STORAGE_KEYS.experiments, experiments);
}

function saveLastResult(result) {
    saveToStorage(STORAGE_KEYS.lastResult, result);
}

function getLastResult() {
    return getFromStorage(STORAGE_KEYS.lastResult, null);
}

function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.screenshots);
    localStorage.removeItem(STORAGE_KEYS.experiments);
    localStorage.removeItem(STORAGE_KEYS.lastResult);
}

function exportExperimentsToCsv() {
    const experiments = getExperiments();

    const headers = [
        "id",
        "screenshot_id",
        "screenshot_label",
        "group_name",
        "strategy_used",
        "run_number",
        "heuristic_coverage_percent",
        "issue_specificity_score",
        "issue_count",
        "potential_false_positive_count",
        "consistency_score_percent",
        "timestamp"
    ];

    const rows = experiments.map(exp => [
        exp.id,
        exp.screenshot_id,
        exp.screenshot_label,
        exp.group_name,
        exp.strategy_used,
        exp.run_number,
        exp.metrics?.heuristicCoveragePercent ?? "",
        exp.metrics?.issueSpecificityScore ?? "",
        exp.metrics?.issueCount ?? "",
        exp.metrics?.potentialFalsePositiveCount ?? exp.metrics?.falsePositiveCount ?? "",
        exp.metrics?.consistencyScorePercent ?? "",
        exp.timestamp
    ]);

    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(","))
    ].join("\n");

    downloadTextFile(csvContent, "heurivision_experiments.csv", "text/csv;charset=utf-8;");
}

function exportExperimentsToJson() {
    const experiments = getExperiments();
    const jsonContent = JSON.stringify(experiments, null, 2);
    downloadTextFile(jsonContent, "heurivision_experiments.json", "application/json;charset=utf-8;");
}

function downloadTextFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}
function importDatabaseFromJson(importedData) {
    if (!importedData || typeof importedData !== "object") {
        throw new Error("Invalid JSON file format.");
    }

    const screenshots = Array.isArray(importedData.screenshots)
        ? importedData.screenshots
        : [];

    const experiments = Array.isArray(importedData.experiments)
        ? importedData.experiments
        : [];

    if (screenshots.length === 0 && experiments.length === 0) {
        throw new Error("The JSON file does not contain screenshots or experiments.");
    }

    localStorage.setItem(STORAGE_KEYS.screenshots, JSON.stringify(screenshots));
    localStorage.setItem(STORAGE_KEYS.experiments, JSON.stringify(experiments));

    return {
        screenshotsImported: screenshots.length,
        experimentsImported: experiments.length
    };
}
