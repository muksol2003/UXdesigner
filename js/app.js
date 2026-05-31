function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(file);
    });
}

function showImagePreview(fileInput, previewElement) {
    const file = fileInput.files[0];

    if (!file) {
        previewElement.innerHTML = "<span>No screenshot uploaded yet</span>";
        return;
    }

    const imageUrl = URL.createObjectURL(file);

    previewElement.innerHTML = `
        <img src="${imageUrl}" alt="Uploaded screenshot preview" class="preview-image">
    `;
}

function initStrategyCards() {
    const radios = document.querySelectorAll("input[name='strategyRadio']");
    const hiddenStrategy = document.getElementById("strategy");

    if (!radios.length || !hiddenStrategy) return;

    radios.forEach(radio => {
        radio.addEventListener("change", () => {
            hiddenStrategy.value = radio.value;
        });
    });
}

function initUploadPage() {
    const form = document.getElementById("analysisForm");
    const fileInput = document.getElementById("screenshotFile");
    const preview = document.getElementById("imagePreview");
    const statusBox = document.getElementById("statusBox");
    const analyzeButton = document.getElementById("analyzeButton");

    if (!form) return;

    initStrategyCards();

    fileInput.addEventListener("change", () => {
        showImagePreview(fileInput, preview);
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const file = fileInput.files[0];

        if (!file) {
            alert("Please upload a screenshot.");
            return;
        }

        const label = document.getElementById("screenshotLabel").value.trim();
        const groupName = document.getElementById("groupName").value;
        const strategy = document.getElementById("strategy").value;
        const runNumber = Number(document.getElementById("runNumber").value);

        if (!label) {
            alert("Please enter a screenshot label.");
            return;
        }

        try {
            analyzeButton.disabled = true;
            analyzeButton.textContent = "Analyzing...";

            statusBox.className = "status-box loading";
            statusBox.textContent = "Encoding image and sending request to Gemini. Please wait...";

            const base64 = await fileToBase64(file);

            const screenshotId = generateId("screenshot");

            const screenshot = {
                id: screenshotId,
                group_name: groupName,
                label: label,
                file_name: file.name,
                file_type: file.type,
                base64_thumbnail: base64,
                uploaded_at: new Date().toISOString()
            };

            saveScreenshot(screenshot);

            const geminiResult = await analyzeScreenshotWithGemini(base64, file.type, strategy);

            const metrics = calculateAllMetrics(geminiResult.text, strategy, groupName);

            const experiment = {
                id: generateId("experiment"),
                screenshot_id: screenshotId,
                screenshot_label: label,
                group_name: groupName,
                strategy_used: strategy,
                run_number: runNumber,
                output_text: geminiResult.text,
                raw_response: geminiResult.raw,
                metrics: metrics,
                timestamp: new Date().toISOString()
            };

            saveExperiment(experiment);

            const lastResult = {
                screenshot: screenshot,
                experiment: experiment
            };

            saveLastResult(lastResult);

            statusBox.className = "status-box success";
            statusBox.textContent = "Analysis completed. Redirecting to results page...";

            setTimeout(() => {
                window.location.href = "results.html";
            }, 700);
        } catch (error) {
            console.error(error);
            statusBox.className = "status-box error";
            statusBox.textContent = error.message;
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.textContent = "Analyze with Gemini";
        }
    });
}

function initResultsPage() {
    const container = document.getElementById("resultsContainer");

    if (!container) return;

    const lastResult = getLastResult();

    if (!lastResult) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No result found</h2>
                <p>Please run an analysis first.</p>
                <a class="button primary" href="upload.html">Go to upload</a>
            </div>
        `;
        return;
    }

    const { screenshot, experiment } = lastResult;
    const metrics = experiment.metrics;

    container.innerHTML = `
        <div class="result-grid">
            <article class="result-card">
                <h2>Screenshot</h2>
                <img src="${screenshot.base64_thumbnail}" alt="Analyzed screenshot" class="result-image">
                <p><strong>Label:</strong> ${escapeHtml(screenshot.label)}</p>
                <p><strong>Group:</strong> ${formatGroupName(screenshot.group_name)}</p>
                <p><strong>Strategy:</strong> ${formatStrategyName(experiment.strategy_used)}</p>
                <p><strong>Run number:</strong> ${experiment.run_number}</p>
            </article>

            <article class="result-card">
                <h2>Calculated metrics</h2>

                <div class="metric-grid">
                    <div class="metric-item">
                        <span>Heuristic coverage</span>
                        <strong>${metrics.heuristicCoveragePercent}%</strong>
                    </div>

                    <div class="metric-item">
                        <span>Issue specificity</span>
                        <strong>${metrics.issueSpecificityScore}/5</strong>
                    </div>

                    <div class="metric-item">
                        <span>Issue count</span>
                        <strong>${metrics.issueCount}</strong>
                    </div>

                    <div class="metric-item">
                        <span>Potential false positives</span>
                        <strong>${metrics.potentialFalsePositiveCount ?? metrics.falsePositiveCount ?? 0}</strong>
                    </div>
                </div>

                <h3>Matched Nielsen heuristics</h3>
                ${renderHeuristicList(metrics.matchedHeuristics)}
            </article>
        </div>

        <article class="result-card">
            <h2>AI output</h2>
            <pre class="output-box">${escapeHtml(experiment.output_text)}</pre>
        </article>

        <div class="actions">
            <a class="button primary" href="upload.html">Run another analysis</a>
            <a class="button ghost" href="history.html">View history</a>
            <a class="button ghost" href="comparison.html">Compare strategies</a>
            <a class="button ghost" href="admin-stats.html">View statistics</a>
        </div>
    `;
}

function initHistoryPage() {
    const container = document.getElementById("historyContainer");

    if (!container) return;

    const experiments = getExperiments().slice().reverse();

    if (experiments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No experiments yet</h2>
                <p>Run your first analysis from the upload page.</p>
                <a class="button primary" href="upload.html">Start analysis</a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <article class="data-card">
            <h2>Saved experiment runs</h2>
            <p>Total experiments: <strong>${experiments.length}</strong></p>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Screenshot</th>
                            <th>Group</th>
                            <th>Strategy</th>
                            <th>Run</th>
                            <th>Coverage</th>
                            <th>Specificity</th>
                            <th>Issues</th>
                            <th>Potential false positives</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${experiments.map(exp => `
                            <tr>
                                <td>${new Date(exp.timestamp).toLocaleString()}</td>
                                <td>${escapeHtml(exp.screenshot_label)}</td>
                                <td>${formatGroupName(exp.group_name)}</td>
                                <td>${formatStrategyName(exp.strategy_used)}</td>
                                <td>${exp.run_number}</td>
                                <td>${exp.metrics?.heuristicCoveragePercent ?? ""}%</td>
                                <td>${exp.metrics?.issueSpecificityScore ?? ""}/5</td>
                                <td>${exp.metrics?.issueCount ?? ""}</td>
                                <td>${exp.metrics?.potentialFalsePositiveCount ?? exp.metrics?.falsePositiveCount ?? ""}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </article>

        <div class="actions">
            <button class="button ghost" type="button" onclick="exportExperimentsToCsv()">Export CSV</button>
            <button class="button ghost" type="button" onclick="exportExperimentsToJson()">Export JSON</button>
            <button class="button danger" type="button" onclick="confirmClearData()">Clear all data</button>
        </div>
    `;
}

function confirmClearData() {
    const confirmed = confirm("Are you sure? This will delete all local experiment data.");

    if (confirmed) {
        clearAllData();
        window.location.reload();
    }
}

function formatStrategyName(strategy) {
    if (strategy === "structured") {
        return "Structured Heuristic";
    }

    return "Naive";
}

function formatGroupName(group) {
    const map = {
        "well-designed": "A: Well-designed",
        "problematic": "B: Problematic",
        "average": "C: Average"
    };

    return map[group] || group;
}

function renderHeuristicList(items) {
    if (!items || items.length === 0) {
        return `<p class="muted">No Nielsen heuristics detected in the output.</p>`;
    }

    return `
        <ul class="inline-list">
            ${items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
    `;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
    initUploadPage();
    initResultsPage();
    initHistoryPage();
});
