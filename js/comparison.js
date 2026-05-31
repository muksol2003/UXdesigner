function initComparisonPage() {
    const labelSelect = document.getElementById("comparisonLabelSelect");
    const runSelect = document.getElementById("comparisonRunSelect");
    const loadButton = document.getElementById("loadComparisonButton");
    const container = document.getElementById("comparisonContainer");

    if (!labelSelect || !runSelect || !loadButton || !container) return;

    const experiments = getExperiments();

    if (experiments.length === 0) {
        labelSelect.innerHTML = `<option value="">No saved experiments</option>`;
        container.innerHTML = `
            <div class="empty-state">
                <h2>No experiment data available</h2>
                <p>Run both prompt strategies for at least one screenshot before using comparison view.</p>
                <a class="button primary" href="upload.html">Start analysis</a>
            </div>
        `;
        return;
    }

    const labels = [...new Set(experiments.map(exp => exp.screenshot_label))].sort();

    labelSelect.innerHTML = labels.map(label => {
        return `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`;
    }).join("");

    loadButton.addEventListener("click", () => {
        renderComparison(labelSelect.value, runSelect.value);
    });

    renderComparison(labelSelect.value, runSelect.value);
}

function renderComparison(label, runSelection) {
    const container = document.getElementById("comparisonContainer");
    const experiments = getExperiments();

    const matching = experiments.filter(exp => exp.screenshot_label === label);

    if (matching.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No matching experiments</h2>
                <p>No saved experiment runs were found for this screenshot label.</p>
            </div>
        `;
        return;
    }

    const naive = selectExperimentForComparison(matching, "naive", runSelection);
    const structured = selectExperimentForComparison(matching, "structured", runSelection);

    if (!naive || !structured) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>Comparison is incomplete</h2>
                <p>
                    To compare strategies, this screenshot label must have both Naive and Structured Heuristic runs.
                </p>
                <p><strong>Selected label:</strong> ${escapeHtml(label)}</p>
                <p>Naive available: ${naive ? "yes" : "no"}</p>
                <p>Structured available: ${structured ? "yes" : "no"}</p>
                <a class="button primary" href="upload.html">Add missing run</a>
            </div>
        `;
        return;
    }

    const screenshot = findScreenshotForExperiment(naive) || findScreenshotForExperiment(structured);

    container.innerHTML = `
        ${screenshot ? `
            <article class="comparison-card">
                <h2>Selected screenshot</h2>
                <img src="${screenshot.base64_thumbnail}" alt="Selected screenshot" class="comparison-image">
                <p><strong>Label:</strong> ${escapeHtml(label)}</p>
                <p><strong>Group:</strong> ${formatGroupName(naive.group_name || structured.group_name)}</p>
            </article>
        ` : ""}

        <div class="comparison-grid">
            ${renderComparisonColumn("Naive Strategy", naive, "neutral")}
            ${renderComparisonColumn("Structured Heuristic Strategy", structured, "orange")}
        </div>
    `;
}

function selectExperimentForComparison(experiments, strategy, runSelection) {
    const filtered = experiments
        .filter(exp => exp.strategy_used === strategy)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filtered.length === 0) {
        return null;
    }

    if (runSelection === "latest") {
        return filtered[0];
    }

    const runNumber = Number(runSelection);

    return filtered.find(exp => Number(exp.run_number) === runNumber) || null;
}

function findScreenshotForExperiment(experiment) {
    const screenshots = getScreenshots();

    return screenshots.find(item => item.id === experiment.screenshot_id) || null;
}

function renderComparisonColumn(title, experiment, badgeType) {
    const metrics = experiment.metrics || {};

    const badgeClass = badgeType === "orange" ? "badge" : "badge neutral";

    return `
        <article class="comparison-card">
            <h2>${escapeHtml(title)}</h2>

            <div class="comparison-meta">
                <div>
                    <span class="${badgeClass}">Run ${experiment.run_number}</span>
                </div>
                <div>
                    <span class="${badgeClass}">${new Date(experiment.timestamp).toLocaleDateString()}</span>
                </div>
            </div>

            <div class="metric-grid">
                <div class="metric-item">
                    <span>Coverage</span>
                    <strong>${metrics.heuristicCoveragePercent ?? 0}%</strong>
                </div>

                <div class="metric-item">
                    <span>Specificity</span>
                    <strong>${metrics.issueSpecificityScore ?? 0}/5</strong>
                </div>

                <div class="metric-item">
                    <span>Issues</span>
                    <strong>${metrics.issueCount ?? 0}</strong>
                </div>

                <div class="metric-item">
                    <span>Potential false positives</span>
                    <strong>${metrics.potentialFalsePositiveCount ?? metrics.falsePositiveCount ?? 0}</strong>
                </div>
            </div>

            <h3>Matched heuristics</h3>
            ${renderHeuristicList(metrics.matchedHeuristics)}

            <h3>AI output</h3>
            <pre class="output-box">${escapeHtml(experiment.output_text)}</pre>
        </article>
    `;
}

document.addEventListener("DOMContentLoaded", () => {
    initComparisonPage();
});
