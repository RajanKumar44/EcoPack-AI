let latestResults = [];
let latestTop10 = [];
let latestMeta = {};
let history = []; // stores only the displayed (top 3) recommendations per run

// ===============================
// UPDATE TIMESTAMP
// ===============================
function updateTimestamp() {
    const el = document.getElementById("lastUpdateTime");
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleTimeString("en-US", { 
            hour: "2-digit", 
            minute: "2-digit",
            hour12: true 
        });
    }
}

// ===============================
// THEME INITIALIZATION
// ===============================
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
        darkModeToggle.checked = savedTheme === "dark";
    }
}

const baseLayout = (title, xTitle, yTitle) => ({
    title,
    margin: { l: 80, r: 30, b: 90, t: 60 },
    xaxis: { title: { text: xTitle, standoff: 14 }, automargin: true },
    yaxis: { title: { text: yTitle, standoff: 14 }, automargin: true },
    legend: { orientation: "h", x: 0, y: 1.18 }
});

// Load persisted history on page load
document.addEventListener("DOMContentLoaded", () => {
    loadHistory();
    loadAnalytics();
    updateTimestamp();
    initTheme();
    
    // ===============================
    // SIDEBAR TOGGLE (Collapse/Expand)
    // ===============================
    const sidebarToggle = document.getElementById("sidebarToggle");
    const sidebar = document.querySelector(".sidebar");
    if (sidebarToggle && sidebar) {
        // Load saved sidebar state
        const sidebarCollapsed = localStorage.getItem("sidebarCollapsed") === "true";
        if (sidebarCollapsed) {
            sidebar.classList.add("collapsed");
        }
        
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("collapsed");
            localStorage.setItem("sidebarCollapsed", sidebar.classList.contains("collapsed"));
        });
    }
    
    // ===============================
    // SETTINGS MODAL
    // ===============================
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsModal = document.getElementById("settingsModal");
    const settingsClose = document.getElementById("settingsClose");
    
    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener("click", () => {
            settingsModal.classList.add("active");
        });
    }
    
    if (settingsClose && settingsModal) {
        settingsClose.addEventListener("click", () => {
            settingsModal.classList.remove("active");
        });
    }
    
    // Close settings modal on outside click
    if (settingsModal) {
        settingsModal.addEventListener("click", (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove("active");
            }
        });
    }
    
    // ===============================
    // DARK MODE TOGGLE
    // ===============================
    const darkModeToggle = document.getElementById("darkModeToggle");
    if (darkModeToggle) {
        darkModeToggle.addEventListener("change", () => {
            const theme = darkModeToggle.checked ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", theme);
            localStorage.setItem("theme", theme);
        });
    }
    
    // ===============================
    // REFRESH BUTTON
    // ===============================
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
            loadAnalytics();
            updateTimestamp();
        });
    }
    
    // ===============================
    // CHART TABS (new style)
    // ===============================
    document.querySelectorAll(".chart-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".chart-tab").forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const mode = tab.dataset.chartMode;
            const titleEl = document.getElementById("primaryChartTitle");
            
            if (mode === "material_comparison") {
                if (titleEl) titleEl.innerHTML = '<i class="fas fa-chart-bar"></i> Material Comparison';
                drawMaterialComparison(latestResults);
            }
            if (mode === "ranking_display") {
                if (titleEl) titleEl.innerHTML = '<i class="fas fa-trophy"></i> Sustainability Ranking';
                drawRankingDisplay();
            }
        });
    });
    
    // ===============================
    // FOOTER EXPORT BUTTONS
    // ===============================
    const exportPdfBtnFooter = document.getElementById("exportPdfBtnFooter");
    const exportExcelBtnFooter = document.getElementById("exportExcelBtnFooter");
    const exportPdfBtn = document.getElementById("exportPdfBtn");
    const exportExcelBtn = document.getElementById("exportExcelBtn");
    
    if (exportPdfBtnFooter) {
        exportPdfBtnFooter.addEventListener("click", () => {
            if (exportPdfBtn) exportPdfBtn.click();
        });
    }
    
    if (exportExcelBtnFooter) {
        exportExcelBtnFooter.addEventListener("click", () => {
            if (exportExcelBtn) exportExcelBtn.click();
        });
    }
    
    // ===============================
    // FORM SUBMIT
    // ===============================
    const form = document.getElementById("recommendationForm");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        // Save form values to localStorage
        const formData = {
            product_category: document.getElementById("product_category").value,
            fragility: document.getElementById("fragility").value,
            shipping_type: document.getElementById("shipping_type").value,
            sustainability_priority: document.getElementById("sustainability_priority").value
        };
        localStorage.setItem("ecopackFormData", JSON.stringify(formData));

        const payload = formData;

        try {
            const res = await fetch(`${API_BASE_URL}/recommend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            latestResults = data.recommended_materials || [];
            latestTop10 = data.top10 && data.top10.length ? data.top10 : latestResults;
            latestMeta = data.inputs || {};

            if (latestResults.length === 0) return;

            history.push(latestResults);

            updateTable(latestResults);
            updateMetrics(latestResults);
            drawMaterialComparison(latestResults);
            enableExports();
            
            // Refresh the Packaging Insights Dashboard
            loadAnalytics();
            updateTimestamp();
        } catch (err) {
            console.error("Error fetching recommendations:", err);
        }
    });
    
    // ===============================
    // CLEAR FORM
    // ===============================
    document.getElementById("clearFormBtn").addEventListener("click", () => {
        form.reset();
        localStorage.removeItem("ecopackFormData");
        clearRecommendationResults();
    });
    
    // ===============================
    // RESTORE FORM VALUES
    // ===============================
    const savedFormData = localStorage.getItem("ecopackFormData");
    if (savedFormData) {
        try {
            const formData = JSON.parse(savedFormData);
            document.getElementById("product_category").value = formData.product_category || "";
            document.getElementById("fragility").value = formData.fragility || "";
            document.getElementById("shipping_type").value = formData.shipping_type || "";
            document.getElementById("sustainability_priority").value = formData.sustainability_priority || "";
        } catch (err) {
            console.error("Error restoring form data:", err);
        }
    }
    
    // Setup chart mode button listeners
    document.querySelectorAll(".chart-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".chart-mode-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const mode = btn.dataset.chartMode;

            if (mode === "material_comparison") drawMaterialComparison(latestResults);
            if (mode === "ranking_display") drawRankingDisplay();
        });
    });
    
    // Setup clickable info card listeners
    document.querySelectorAll(".clickable-card").forEach(card => {
        card.addEventListener("click", () => {
            const mode = card.dataset.chartMode;
            
            if (mode === "co2_reduction") openCO2Modal();
            if (mode === "cost_savings") openCostSavingsModal();
        });
    });
    
    // Setup modal event listeners
    document.getElementById("co2ModalClose").addEventListener("click", closeCO2Modal);
    document.getElementById("costModalClose").addEventListener("click", closeCostSavingsModal);

    // Close modal when clicking outside
    document.getElementById("co2Modal").addEventListener("click", (e) => {
        if (e.target.id === "co2Modal") closeCO2Modal();
    });

    document.getElementById("costModal").addEventListener("click", (e) => {
        if (e.target.id === "costModal") closeCostSavingsModal();
    });
});

// ===============================
// HISTORY LOAD
// ===============================
async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE_URL}/history`);
        const data = await res.json();
        const rawHistory = data.history || [];
        // keep only top 3 per run for charting
        history = rawHistory.map(run => run.slice(0, 3));

        if (history.length > 0) {
            const lastRunTop3 = history[history.length - 1];
            const lastRunFull = rawHistory[rawHistory.length - 1] || [];
            latestResults = lastRunTop3;
            latestTop10 = lastRunFull.slice(0, 10);
            latestMeta = {};
            updateTable(latestResults);
            updateMetrics(latestResults);
            drawMaterialComparison(latestResults);
        }
    } catch (err) {
        console.error("Failed to load history", err);
    }
}

// ===============================
// TABLE
// ===============================
function updateTable(data) {
    const tbody = document.getElementById("resultsTable");
    tbody.innerHTML = "";

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.material}</td>
                <td>${item.predicted_cost.toFixed(2)}</td>
                <td>${item.predicted_co2.toFixed(2)}</td>
                <td>${item.suitability_score.toFixed(2)}</td>
            </tr>
        `;
    });
}

// ===============================
// METRICS
// ===============================
function updateMetrics(data) {
    const baselineCO2 = 10;
    const baselineCost = 10;

    const avgCO2 = data.reduce((s, d) => s + d.predicted_co2, 0) / data.length;
    const avgCost = data.reduce((s, d) => s + d.predicted_cost, 0) / data.length;

    const co2Reduction = ((baselineCO2 - avgCO2) / baselineCO2) * 100;
    const costSavings = baselineCost - avgCost;

    // Calculate average across all historical runs
    let avgCO2Reduction = 0;
    let avgCostSavings = 0;

    if (history.length > 0) {
        const reductions = history.map(run => {
            const runAvgCO2 = run.reduce((s, d) => s + d.predicted_co2, 0) / run.length;
            return ((baselineCO2 - runAvgCO2) / baselineCO2) * 100;
        });
        avgCO2Reduction = reductions.reduce((a, b) => a + b, 0) / reductions.length;

        const savings = history.map(run => {
            const runAvgCost = run.reduce((s, d) => s + d.predicted_cost, 0) / run.length;
            return baselineCost - runAvgCost;
        });
        avgCostSavings = savings.reduce((a, b) => a + b, 0) / savings.length;
    } else {
        avgCO2Reduction = co2Reduction;
        avgCostSavings = costSavings;
    }

    document.getElementById("co2ReductionValue").innerText =
        `${avgCO2Reduction.toFixed(2)}%`;
    
    const co2SubEl = document.getElementById("co2ReductionSubtext");
    if (co2SubEl) {
        co2SubEl.innerHTML = avgCO2Reduction >= 0 
            ? `<i class="fas fa-arrow-up"></i> ${history.length} analysis runs`
            : `<i class="fas fa-arrow-down"></i> ${history.length} analysis runs`;
        co2SubEl.className = avgCO2Reduction >= 0 ? "kpi-trend positive" : "kpi-trend negative";
    }

    document.getElementById("costSavingsValue").innerText =
        avgCostSavings.toFixed(2);
    
    const costSubEl = document.getElementById("costSavingsSubtext");
    if (costSubEl) {
        costSubEl.innerHTML = avgCostSavings >= 0 
            ? `<i class="fas fa-arrow-up"></i> ${history.length} analysis runs`
            : `<i class="fas fa-arrow-down"></i> ${history.length} analysis runs`;
        costSubEl.className = avgCostSavings >= 0 ? "kpi-trend positive" : "kpi-trend negative";
    }
    
    // Update sustainability score (average suitability score)
    const avgSuitability = data.reduce((s, d) => s + (d.suitability_score || 0), 0) / data.length;
    const sustainabilityEl = document.getElementById("sustainabilityScore");
    if (sustainabilityEl) {
        sustainabilityEl.innerText = avgSuitability.toFixed(1);
    }
}

// ===============================
// MODAL MANAGEMENT
// ===============================
function openCO2Modal() {
    const modal = document.getElementById("co2Modal");
    modal.classList.add("active");
    setTimeout(() => drawCO2ReductionChartInModal(), 100);
}

function closeCO2Modal() {
    const modal = document.getElementById("co2Modal");
    modal.classList.remove("active");
}

function openCostSavingsModal() {
    const modal = document.getElementById("costModal");
    modal.classList.add("active");
    setTimeout(() => drawCostSavingsChartInModal(), 100);
}

function closeCostSavingsModal() {
    const modal = document.getElementById("costModal");
    modal.classList.remove("active");
}

// ===============================
// BAR CHART – MATERIAL COMPARISON
// ===============================
function drawMaterialComparison(data) {
    const pool = history.flat().length ? history.flat() : data;
    const byMaterial = {};
    pool.forEach(d => {
        if (!byMaterial[d.material]) byMaterial[d.material] = { total: 0, count: 0 };
        byMaterial[d.material].total += d.suitability_score;
        byMaterial[d.material].count += 1;
    });

    const materials = Object.keys(byMaterial);
    const avgScores = materials.map(m => byMaterial[m].total / byMaterial[m].count);

    Plotly.newPlot("primaryChartCanvas", [{
        x: materials,
        y: avgScores,
        type: "bar"
    }], baseLayout("Material Comparison", "Material", "Avg Suitability Score"));
}


// ===============================
// HORIZONTAL BAR – RANKING
// ===============================
function drawRankingDisplay() {
    const pool = history.flat().length ? history.flat() : latestResults;
    const byMaterial = {};
    pool.forEach(d => {
        if (!byMaterial[d.material]) byMaterial[d.material] = { total: 0, count: 0 };
        byMaterial[d.material].total += d.suitability_score;
        byMaterial[d.material].count += 1;
    });
    const materials = Object.keys(byMaterial);
    const avgScores = materials.map(m => byMaterial[m].total / byMaterial[m].count);

    Plotly.newPlot("primaryChartCanvas", [{
        y: materials,
        x: avgScores,
        type: "bar",
        orientation: "h"
    }], baseLayout("Sustainability Ranking", "Avg Suitability Score", "Material"));
}

// ===============================
// CO2 REDUCTION CHART
// ===============================
function drawCO2ReductionChart() {
    const baselineCO2 = 10;
    const pool = history.flat().length ? history.flat() : latestResults;
    
    if (pool.length === 0) {
        Plotly.purge("primaryChartCanvas");
        return;
    }

    const byMaterial = {};
    pool.forEach(d => {
        if (!byMaterial[d.material]) byMaterial[d.material] = { total: 0, count: 0 };
        byMaterial[d.material].total += d.predicted_co2;
        byMaterial[d.material].count += 1;
    });

    const materials = Object.keys(byMaterial);
    const avgCO2s = materials.map(m => byMaterial[m].total / byMaterial[m].count);
    const reductions = avgCO2s.map(co2 => ((baselineCO2 - co2) / baselineCO2) * 100);

    Plotly.newPlot("primaryChartCanvas", [{
        x: materials,
        y: reductions,
        type: "bar",
        marker: { color: "#2f9d78" }
    }], baseLayout("CO2 Reduction %", "Material", "Reduction %"));
}

// ===============================
// COST SAVINGS CHART
// ===============================
function drawCostSavingsChart() {
    const baselineCost = 10;
    const pool = history.flat().length ? history.flat() : latestResults;
    
    if (pool.length === 0) {
        Plotly.purge("primaryChartCanvas");
        return;
    }

    const byMaterial = {};
    pool.forEach(d => {
        if (!byMaterial[d.material]) byMaterial[d.material] = { total: 0, count: 0 };
        byMaterial[d.material].total += d.predicted_cost;
        byMaterial[d.material].count += 1;
    });

    const materials = Object.keys(byMaterial);
    const avgCosts = materials.map(m => byMaterial[m].total / byMaterial[m].count);
    const savings = avgCosts.map(cost => baselineCost - cost);

    Plotly.newPlot("primaryChartCanvas", [{
        x: materials,
        y: savings,
        type: "bar",
        marker: { color: "#ef9b33" }
    }], baseLayout("Cost Savings", "Material", "Savings ($)"));
}

// ===============================
// CO2 REDUCTION TREND CHART (MODAL)
// ===============================
function drawCO2ReductionChartInModal() {
    const baselineCO2 = 10;
    
    if (history.length === 0) {
        return;
    }

    // Calculate CO2 reduction % for each run
    const runNumbers = [];
    const reductionValues = [];

    history.forEach((run, runIndex) => {
        const avgCO2 = run.reduce((s, d) => s + d.predicted_co2, 0) / run.length;
        const reduction = ((baselineCO2 - avgCO2) / baselineCO2) * 100;
        runNumbers.push(`Run ${runIndex + 1}`);
        reductionValues.push(reduction);
    });

    Plotly.newPlot("co2ChartCanvas", [{
        x: runNumbers,
        y: reductionValues,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#2f9d78", width: 3 },
        marker: { size: 8, color: "#2f9d78" },
        fill: "tozeroy",
        fillcolor: "rgba(47, 157, 120, 0.2)"
    }], {
        title: "CO₂ Reduction Trend Over Time",
        xaxis: { title: "Recommendation Runs" },
        yaxis: { title: "CO₂ Reduction (%)" },
        margin: { l: 80, r: 30, b: 80, t: 60 },
        hovermode: "x unified"
    });
}

// ===============================
// COST SAVINGS TREND CHART (MODAL)
// ===============================
function drawCostSavingsChartInModal() {
    const baselineCost = 10;
    
    if (history.length === 0) {
        return;
    }

    // Calculate cost savings for each run
    const runNumbers = [];
    const savingsValues = [];

    history.forEach((run, runIndex) => {
        const avgCost = run.reduce((s, d) => s + d.predicted_cost, 0) / run.length;
        const savings = baselineCost - avgCost;
        runNumbers.push(`Run ${runIndex + 1}`);
        savingsValues.push(savings);
    });

    Plotly.newPlot("costChartCanvas", [{
        x: runNumbers,
        y: savingsValues,
        type: "scatter",
        mode: "lines+markers",
        line: { color: "#ef9b33", width: 3 },
        marker: { size: 8, color: "#ef9b33" },
        fill: "tozeroy",
        fillcolor: "rgba(239, 155, 51, 0.2)"
    }], {
        title: "Cost Savings Trend Over Time",
        xaxis: { title: "Recommendation Runs" },
        yaxis: { title: "Cost Savings ($)" },
        margin: { l: 80, r: 30, b: 80, t: 60 },
        hovermode: "x unified"
    });
}

// ===============================
// EXPORTS
// ===============================
function enableExports() {
    document.getElementById("exportPdfBtn").disabled = false;
    document.getElementById("exportExcelBtn").disabled = false;
    // Enable footer buttons too
    const pdfFooter = document.getElementById("exportPdfBtnFooter");
    const excelFooter = document.getElementById("exportExcelBtnFooter");
    if (pdfFooter) pdfFooter.disabled = false;
    if (excelFooter) excelFooter.disabled = false;
}

document.getElementById("exportExcelBtn").addEventListener("click", () => {
    try {
        const exportData = (latestTop10.length ? latestTop10 : latestResults).slice(0, 10);
        if (exportData.length === 0) {
            alert("No data to export. Please run a recommendation first.");
            return;
        }
        const metaRows = [
            { Field: "Category", Value: latestMeta.product_category || "-" },
            { Field: "Fragility", Value: latestMeta.fragility || "-" },
            { Field: "Shipping", Value: latestMeta.shipping_type || "-" },
            { Field: "Priority", Value: latestMeta.sustainability_priority || "-" }
        ];

        const wsMeta = XLSX.utils.json_to_sheet(metaRows);
        const wsData = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsMeta, "Inputs");
        XLSX.utils.book_append_sheet(wb, wsData, "Top10 Ranking");
        XLSX.writeFile(wb, "EcoPackAI_Ranking.xlsx");
    } catch (err) {
        console.error("Excel export error:", err);
        alert("Error exporting to Excel: " + err.message);
    }
});

document.getElementById("exportPdfBtn").addEventListener("click", () => {
    try {
        const exportData = (latestTop10.length ? latestTop10 : latestResults).slice(0, 10);
        if (exportData.length === 0) {
            alert("No data to export. Please run a recommendation first.");
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.text("EcoPackAI – Sustainability Report", 14, 14);
        doc.text(`Category: ${latestMeta.product_category || "-"}`, 14, 22);
        doc.text(`Fragility: ${latestMeta.fragility || "-"}`, 14, 28);
        doc.text(`Shipping: ${latestMeta.shipping_type || "-"}`, 14, 34);
        doc.text(`Priority: ${latestMeta.sustainability_priority || "-"}`, 14, 40);

        doc.autoTable({
            startY: 46,
            head: [["Material", "Cost", "CO2", "Score"]],
            body: exportData.map(d => [
                d.material,
                (d.predicted_cost || 0).toFixed(2),
                (d.predicted_co2 || 0).toFixed(2),
                (d.suitability_score || 0).toFixed(2)
            ])
        });

        doc.save("EcoPackAI_Report.pdf");
    } catch (err) {
        console.error("PDF export error:", err);
        alert("Error exporting to PDF: " + err.message);
    }
});

// ===============================
// CLEAR HISTORY
// ===============================
document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    clearHistory();
});

async function clearHistory() {
    try {
        await fetch(`${API_BASE_URL}/history/clear`, { method: "POST" });
    } catch (err) {
        console.error("Failed to clear server history", err);
    }

    history = [];
    latestResults = [];
    latestTop10 = [];
    latestMeta = {};

    const tbody = document.getElementById("resultsTable");
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fas fa-trash-alt"></i><span>History cleared. Submit new recommendation.</span></td></tr>`;

    document.getElementById("co2ReductionValue").innerText = "--";
    const co2SubEl = document.getElementById("co2ReductionSubtext");
    if (co2SubEl) {
        co2SubEl.innerHTML = '<i class="fas fa-arrow-up"></i> Run analysis';
        co2SubEl.className = "kpi-trend positive";
    }
    
    document.getElementById("costSavingsValue").innerText = "--";
    const costSubEl = document.getElementById("costSavingsSubtext");
    if (costSubEl) {
        costSubEl.innerHTML = '<i class="fas fa-arrow-up"></i> Run analysis';
        costSubEl.className = "kpi-trend positive";
    }

    Plotly.purge("primaryChartCanvas");
    
    // Clear Packaging Insights Dashboard
    document.getElementById("totalRecs").textContent = "0";
    document.getElementById("co2Reduction").textContent = "--";
    document.getElementById("costSavings").textContent = "--";
    
    // Destroy existing Chart.js instances and clear canvases
    const chartIds = ["materialUsageBar", "materialPie", "rankingHorizontalBar", "trendsLine"];
    chartIds.forEach(id => {
        const canvas = document.getElementById(id);
        if (canvas) {
            const chartInstance = Chart.getChart(canvas);
            if (chartInstance) {
                chartInstance.destroy();
            }
        }
    });
    
    // Disable export buttons
    document.getElementById("exportPdfBtn").disabled = true;
    document.getElementById("exportExcelBtn").disabled = true;
    const pdfFooter = document.getElementById("exportPdfBtnFooter");
    const excelFooter = document.getElementById("exportExcelBtnFooter");
    if (pdfFooter) pdfFooter.disabled = true;
    if (excelFooter) excelFooter.disabled = true;
    
    // Reset sustainability score
    const sustainabilityEl = document.getElementById("sustainabilityScore");
    if (sustainabilityEl) sustainabilityEl.innerText = "--";
}

// ===============================
// CLEAR RECOMMENDATION RESULTS
// ===============================
function clearRecommendationResults() {
    // Clear current recommendation rows but keep historical metrics/cards intact
    latestResults = [];
    latestTop10 = [];
    latestMeta = {};

    const tbody = document.getElementById("resultsTable");
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="fas fa-search"></i><span>Select filters and click Generate to view recommendations</span></td></tr>`;

    // Disable export buttons since table has been cleared
    document.getElementById("exportPdfBtn").disabled = true;
    document.getElementById("exportExcelBtn").disabled = true;
    const pdfFooter = document.getElementById("exportPdfBtnFooter");
    const excelFooter = document.getElementById("exportExcelBtnFooter");
    if (pdfFooter) pdfFooter.disabled = true;
    if (excelFooter) excelFooter.disabled = true;
}

async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE_URL}/analytics`);
        const data = await response.json();

        if (!data || data.status === "empty") {
            document.getElementById("totalRecs").textContent = "0";
            document.getElementById("co2Reduction").textContent = "--";
            document.getElementById("costSavings").textContent = "--";
            return;
        }

        const summary = data.summary;

        document.getElementById("totalRecs").textContent =
            summary.total_recommendations;

        document.getElementById("co2ReductionValue").textContent =
            summary.co2_reduction.toFixed(1) + "%";

        document.getElementById("costSavingsValue").textContent =
            "₹ " + summary.cost_savings.toFixed(2);

        drawCharts(data);
    } catch (err) {
        console.error("Failed to load analytics:", err);
    }
}

function drawCharts(data){

// Destroy existing charts before creating new ones
const chartIds = ["materialUsageBar", "materialPie", "rankingHorizontalBar", "trendsLine"];
chartIds.forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
    }
});

const usage = data.material_usage;
const eco = data.eco_share;
const ranking = data.ranking;

new Chart(document.getElementById("materialUsageBar"),{

type:"bar",

data:{
labels:usage.labels,
datasets:[{
label:"Recommendation Count",
data:usage.values,
backgroundColor:"#26a69a"
}]
},

options:{
responsive:true,
plugins:{
legend:{display:false}
}
}

});


new Chart(document.getElementById("materialPie"),{

type:"pie",

data:{
labels:eco.labels,
datasets:[{

data:eco.values,

backgroundColor:[
"#66bb6a",
"#ef5350"
]

}]
}

});


new Chart(document.getElementById("rankingHorizontalBar"),{

type:"bar",

data:{

labels:ranking.labels,

datasets:[{

label:"Average Suitability",

data:ranking.values,

backgroundColor:"#42a5f5"

}]

},

options:{

indexAxis:"y",

plugins:{
legend:{display:false}
}

}

});


new Chart(document.getElementById("trendsLine"),{

type:"line",

data:{

labels:ranking.labels,

datasets:[{

label:"Suitability Trend",

data:ranking.values,

borderColor:"#ab47bc",

backgroundColor:"rgba(171,71,188,0.2)",

fill:true,

tension:0.4

}]

}

});

}