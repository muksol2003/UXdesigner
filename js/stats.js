function initAdminStatsPage() {
    const container = document.getElementById("statsContainer");

    if (!container) return;

    const experiments = getExperiments();

    if (experiments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h2>No data available</h2>
                <p>Run experiments first to calculate statistics.</p>
                <a class="button primary" href="upload.html">Start analysis</a>
            </div>
        `;

        renderEmptyCharts();
        return;
    }

    const enrichedExperiments = addConsistencyScores(experiments);

    const naiveStats = calculateStrategyStats(enrichedExperiments, "naive");
    const structuredStats = calculateStrategyStats(enrichedExperiments, "structured");

    container.innerHTML = `
        <article class="data-card">
            <h2>Main results table</h2>
            <p>This table can be used as the basis for Chapter 3 of the thesis.</p>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Naive Strategy</th>
                            <th>Structured Heuristic Strategy</th>
                            <th>Difference / Improvement</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Heuristic coverage (%)</td>
                            <td>${naiveStats.avgCoverage}%</td>
                            <td>${structuredStats.avgCoverage}%</td>
                            <td>${formatPointDifference(structuredStats.avgCoverage - naiveStats.avgCoverage)}</td>
                        </tr>
                        <tr>
                            <td>Issue specificity (1–5)</td>
                            <td>${naiveStats.avgSpecificity}</td>
                            <td>${structuredStats.avgSpecificity}</td>
                            <td>${formatPercentImprovement(naiveStats.avgSpecificity, structuredStats.avgSpecificity)}</td>
                        </tr>
                        <tr>
                            <td>Potential false positive rate (%)</td>
                            <td>${naiveStats.falsePositiveRate}%</td>
                            <td>${structuredStats.falsePositiveRate}%</td>
                            <td>${formatPointDifference(structuredStats.falsePositiveRate - naiveStats.falsePositiveRate)}</td>
                        </tr>
                        <tr>
                            <td>Consistency score (%)</td>
                            <td>${naiveStats.avgConsistency}%</td>
                            <td>${structuredStats.avgConsistency}%</td>
                            <td>${formatPointDifference(structuredStats.avgConsistency - naiveStats.avgConsistency)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </article>

        <div class="comparison-grid">
            <article class="data-card">
                <h2>Naive Strategy summary</h2>
                ${renderStrategySummary(naiveStats)}
            </article>

            <article class="data-card">
                <h2>Structured Heuristic Strategy summary</h2>
                ${renderStrategySummary(structuredStats)}
            </article>
        </div>

        <article class="data-card">
            <h2>Group-by-group analysis</h2>
            ${renderGroupAnalysis(enrichedExperiments)}
        </article>

        <article class="data-card">
            <h2>Experimental progress</h2>
            ${renderProgress(enrichedExperiments)}
        </article>
    `;

    renderCharts(naiveStats, structuredStats, enrichedExperiments);
}

function calculateStrategyStats(experiments, strategy) {
    const filtered = experiments.filter(exp => exp.strategy_used === strategy);

    if (filtered.length === 0) {
        return {
            count: 0,
            avgCoverage: 0,
            avgSpecificity: 0,
            totalIssues: 0,
            totalPotentialFalsePositives: 0,
            falsePositiveRate: 0,
            avgConsistency: 0
        };
    }

    const avgCoverage = average(filtered.map(exp => exp.metrics.heuristicCoveragePercent));
    const avgSpecificity = average(filtered.map(exp => exp.metrics.issueSpecificityScore));
    const totalIssues = sum(filtered.map(exp => exp.metrics.issueCount));

    const totalPotentialFalsePositives = sum(filtered.map(exp =>
        exp.metrics.potentialFalsePositiveCount ?? exp.metrics.falsePositiveCount ?? 0
    ));

    const falsePositiveRate = totalIssues === 0
        ? 0
        : Math.round((totalPotentialFalsePositives / totalIssues) * 100);

    const consistencyValues = filtered
        .map(exp => exp.metrics.consistencyScorePercent)
        .filter(value => value !== null && value !== undefined);

    const avgConsistency = consistencyValues.length === 0
        ? 0
        : average(consistencyValues);

    return {
        count: filtered.length,
        avgCoverage: round(avgCoverage, 1),
        avgSpecificity: round(avgSpecificity, 1),
        totalIssues: totalIssues,
        totalPotentialFalsePositives: totalPotentialFalsePositives,
        falsePositiveRate: falsePositiveRate,
        avgConsistency: round(avgConsistency, 1)
    };
}

function addConsistencyScores(experiments) {
    const copied = JSON.parse(JSON.stringify(experiments));

    copied.forEach(exp => {
        const sameSet = copied.filter(item =>
            item.screenshot_label === exp.screenshot_label &&
            item.strategy_used === exp.strategy_used
        );

        if (sameSet.length < 2) {
            exp.metrics.consistencyScorePercent = null;
            return;
        }

        const similarities = [];

        sameSet.forEach(other => {
            if (other.id !== exp.id) {
                similarities.push(jaccardSimilarity(exp.output_text, other.output_text));
            }
        });

        exp.metrics.consistencyScorePercent = Math.round(average(similarities) * 100);
    });

    return copied;
}

function renderStrategySummary(stats) {
    return `
        <div class="metric-grid">
            <div class="metric-item">
                <span>Total runs</span>
                <strong>${stats.count}</strong>
            </div>

            <div class="metric-item">
                <span>Average coverage</span>
                <strong>${stats.avgCoverage}%</strong>
            </div>

            <div class="metric-item">
                <span>Average specificity</span>
                <strong>${stats.avgSpecificity}/5</strong>
            </div>

            <div class="metric-item">
                <span>Total issues</span>
                <strong>${stats.totalIssues}</strong>
            </div>

            <div class="metric-item">
                <span>Potential false positive rate</span>
                <strong>${stats.falsePositiveRate}%</strong>
            </div>

            <div class="metric-item">
                <span>Average consistency</span>
                <strong>${stats.avgConsistency}%</strong>
            </div>
        </div>
    `;
}

function renderGroupAnalysis(experiments) {
    const groups = ["well-designed", "problematic", "average"];

    return `
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Group</th>
                        <th>Naive runs</th>
                        <th>Naive issues</th>
                        <th>Structured runs</th>
                        <th>Structured issues</th>
                        <th>Potential false positives</th>
                    </tr>
                </thead>
                <tbody>
                    ${groups.map(group => {
                        const naive = experiments.filter(exp => exp.group_name === group && exp.strategy_used === "naive");
                        const structured = experiments.filter(exp => exp.group_name === group && exp.strategy_used === "structured");

                        const naiveIssues = sum(naive.map(exp => exp.metrics.issueCount));
                        const structuredIssues = sum(structured.map(exp => exp.metrics.issueCount));

                        const falsePositives = sum([...naive, ...structured].map(exp =>
                            exp.metrics.potentialFalsePositiveCount ?? exp.metrics.falsePositiveCount ?? 0
                        ));

                        return `
                            <tr>
                                <td>${formatGroupName(group)}</td>
                                <td>${naive.length}</td>
                                <td>${naiveIssues}</td>
                                <td>${structured.length}</td>
                                <td>${structuredIssues}</td>
                                <td>${falsePositives}</td>
                            </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderProgress(experiments) {
    const total = experiments.length;
    const target = 72;
    const percent = Math.min(Math.round((total / target) * 100), 100);

    return `
        <p>Completed experiments: <strong>${total}</strong> / ${target}</p>
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
        <p class="muted">Target: 12 screenshots × 2 strategies × 3 runs = 72 test cases.</p>
    `;
}

function renderCharts(naiveStats, structuredStats, experiments) {
    if (typeof Chart === "undefined") {
        return;
    }

    renderCoverageChart(naiveStats, structuredStats);
    renderFalsePositiveChart(experiments);
    renderRadarChart(naiveStats, structuredStats);
}

function renderEmptyCharts() {
    if (typeof Chart === "undefined") {
        return;
    }

    const emptyStats = {
        avgCoverage: 0,
        avgSpecificity: 0,
        falsePositiveRate: 0,
        avgConsistency: 0
    };

    renderCoverageChart(emptyStats, emptyStats);
    renderFalsePositiveChart([]);
    renderRadarChart(emptyStats, emptyStats);
}

function renderCoverageChart(naiveStats, structuredStats) {
    const canvas = document.getElementById("coverageChart");
    if (!canvas) return;

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: ["Naive", "Structured"],
            datasets: [
                {
                    label: "Heuristic coverage (%)",
                    data: [naiveStats.avgCoverage, structuredStats.avgCoverage],
                    backgroundColor: ["#7a5a55", "#f05a1a"]
                }
            ]
        },
        options: getDefaultChartOptions(100)
    });
}

function renderFalsePositiveChart(experiments) {
    const canvas = document.getElementById("falsePositiveChart");
    if (!canvas) return;

    const groups = ["well-designed", "problematic", "average"];
    const labels = groups.map(formatGroupName);

    const naiveRates = groups.map(group => calculateGroupFalsePositiveRate(experiments, group, "naive"));
    const structuredRates = groups.map(group => calculateGroupFalsePositiveRate(experiments, group, "structured"));

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Naive",
                    data: naiveRates,
                    backgroundColor: "#7a5a55"
                },
                {
                    label: "Structured",
                    data: structuredRates,
                    backgroundColor: "#f05a1a"
                }
            ]
        },
        options: getDefaultChartOptions(100)
    });
}

function renderRadarChart(naiveStats, structuredStats) {
    const canvas = document.getElementById("radarChart");
    if (!canvas) return;

    const naiveSpecificityPercent = (naiveStats.avgSpecificity / 5) * 100;
    const structuredSpecificityPercent = (structuredStats.avgSpecificity / 5) * 100;

    const naiveFalsePositiveQuality = Math.max(0, 100 - naiveStats.falsePositiveRate);
    const structuredFalsePositiveQuality = Math.max(0, 100 - structuredStats.falsePositiveRate);

    new Chart(canvas, {
        type: "radar",
        data: {
            labels: [
                "Coverage",
                "Specificity",
                "Low false positives",
                "Consistency"
            ],
            datasets: [
                {
                    label: "Naive",
                    data: [
                        naiveStats.avgCoverage,
                        naiveSpecificityPercent,
                        naiveFalsePositiveQuality,
                        naiveStats.avgConsistency
                    ],
                    backgroundColor: "rgba(122, 90, 85, 0.18)",
                    borderColor: "#7a5a55",
                    pointBackgroundColor: "#7a5a55"
                },
                {
                    label: "Structured",
                    data: [
                        structuredStats.avgCoverage,
                        structuredSpecificityPercent,
                        structuredFalsePositiveQuality,
                        structuredStats.avgConsistency
                    ],
                    backgroundColor: "rgba(240, 90, 26, 0.18)",
                    borderColor: "#f05a1a",
                    pointBackgroundColor: "#f05a1a"
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                r: {
                    min: 0,
                    max: 100,
                    ticks: {
                        stepSize: 20
                    }
                }
            }
        }
    });
}

function calculateGroupFalsePositiveRate(experiments, group, strategy) {
    const filtered = experiments.filter(exp =>
        exp.group_name === group &&
        exp.strategy_used === strategy
    );

    const totalIssues = sum(filtered.map(exp => exp.metrics.issueCount));
    const falsePositives = sum(filtered.map(exp =>
        exp.metrics.potentialFalsePositiveCount ?? exp.metrics.falsePositiveCount ?? 0
    ));

    if (totalIssues === 0) {
        return 0;
    }

    return Math.round((falsePositives / totalIssues) * 100);
}

function getDefaultChartOptions(maxValue) {
    return {
        responsive: true,
        scales: {
            y: {
                beginAtZero: true,
                max: maxValue
            }
        },
        plugins: {
            legend: {
                display: true
            }
        }
    };
}

function average(values) {
    const clean = values.filter(value => typeof value === "number" && !Number.isNaN(value));

    if (clean.length === 0) return 0;

    return clean.reduce((acc, value) => acc + value, 0) / clean.length;
}

function sum(values) {
    return values.reduce((acc, value) => acc + Number(value || 0), 0);
}

function round(value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function formatPointDifference(value) {
    const rounded = round(value, 1);

    if (rounded > 0) {
        return `+${rounded} pp`;
    }

    return `${rounded} pp`;
}

function formatPercentImprovement(oldValue, newValue) {
    if (!oldValue || oldValue === 0) {
        return "N/A";
    }

    const improvement = ((newValue - oldValue) / oldValue) * 100;
    const rounded = Math.round(improvement);

    if (rounded > 0) {
        return `+${rounded}%`;
    }

    return `${rounded}%`;
}

document.addEventListener("DOMContentLoaded", () => {
    initAdminStatsPage();
});
