// dashboard.js - Complete code for Productivity Tracker Dashboard

// Chart instances
let todayChart = null;
let weekChart = null;
let monthChart = null;

// Current period for top sites table
let currentPeriod = 'daily';

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Dashboard loading...');
    loadAllData();
    
    // Event listeners for buttons
    document.getElementById('refreshBtn').addEventListener('click', loadAllData);
    
    document.getElementById('exportBtn').addEventListener('click', exportData);
    
    document.getElementById('settingsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
    
    // Tab buttons for period switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentPeriod = e.target.dataset.period;
            loadSitesTable();
        });
    });
});

// Load all dashboard data
function loadAllData() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (!response) {
            console.log('No response from background, showing mock data');
            showMockData();
            return;
        }
        
        console.log('Data received:', response);
        
        // Update all sections
        updateTodayStats(response.daily);
        updateWeekStats(response.weekly);
        updateMonthStats(response.monthly);
        loadSitesTable();
        loadReports(response.reports);
    });
}

// Show mock data for demonstration
function showMockData() {
    const mockDaily = {
        productive: 3600,
        unproductive: 1800,
        neutral: 900,
        total: 6300,
        sites: {
            'github.com': { time: 1800, category: 'productive', visits: 3 },
            'stackoverflow.com': { time: 1200, category: 'productive', visits: 5 },
            'youtube.com': { time: 1500, category: 'unproductive', visits: 2 },
            'gmail.com': { time: 600, category: 'neutral', visits: 4 },
            'docs.google.com': { time: 900, category: 'productive', visits: 2 }
        }
    };
    
    const mockWeekly = {
        productive: 18000,
        unproductive: 9000,
        neutral: 4500,
        total: 31500,
        days: [
            { date: 'Mon Feb 10 2026', productive: 2700, unproductive: 1200, neutral: 600 },
            { date: 'Tue Feb 11 2026', productive: 3000, unproductive: 1500, neutral: 500 },
            { date: 'Wed Feb 12 2026', productive: 2400, unproductive: 1800, neutral: 800 },
            { date: 'Thu Feb 13 2026', productive: 3300, unproductive: 900, neutral: 400 },
            { date: 'Fri Feb 14 2026', productive: 2100, unproductive: 2100, neutral: 700 },
            { date: 'Sat Feb 15 2026', productive: 1800, unproductive: 2700, neutral: 900 },
            { date: 'Sun Feb 16 2026', productive: 2700, unproductive: 1800, neutral: 600 }
        ]
    };
    
    const mockMonthly = {
        productive: 72000,
        unproductive: 36000,
        neutral: 18000,
        total: 126000
    };
    
    const mockReports = [
        { week: 6, year: 2026, productive: 18000, unproductive: 9000, score: 67, level: 'Good', date: '2026-02-10' },
        { week: 5, year: 2026, productive: 16500, unproductive: 10500, score: 61, level: 'Good', date: '2026-02-03' },
        { week: 4, year: 2026, productive: 19200, unproductive: 7800, score: 71, level: 'Excellent', date: '2026-01-27' }
    ];
    
    updateTodayStats(mockDaily);
    updateWeekStats(mockWeekly);
    updateMonthStats(mockMonthly);
    loadSitesTableFromData(mockDaily.sites, mockDaily.total);
    loadReports(mockReports);
}

// Update today's statistics
function updateTodayStats(daily) {
    if (!daily) return;
    
    const prodMins = Math.round(daily.productive / 60);
    const unprodMins = Math.round(daily.unproductive / 60);
    const neutralMins = Math.round((daily.neutral || 0) / 60);
    const totalMins = prodMins + unprodMins + neutralMins;
    
    document.getElementById('todayProd').textContent = formatTime(prodMins);
    document.getElementById('todayUnprod').textContent = formatTime(unprodMins);
    document.getElementById('todayNeutral').textContent = formatTime(neutralMins);
    document.getElementById('todayTotal').textContent = formatTime(totalMins);
    
    const score = daily.total > 0 ? Math.round((daily.productive / daily.total) * 100) : 0;
    const scoreEl = document.getElementById('todayScore');
    scoreEl.textContent = score + '%';
    
    // Color code score
    if (score >= 70) {
        scoreEl.style.color = '#4CAF50';
    } else if (score >= 40) {
        scoreEl.style.color = '#FF9800';
    } else {
        scoreEl.style.color = '#F44336';
    }
    
    // Create today chart
    createTodayChart(daily.productive, daily.unproductive, daily.neutral || 0);
}

// Create today's chart
function createTodayChart(productive, unproductive, neutral) {
    const canvas = document.getElementById('todayChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (todayChart) {
        todayChart.destroy();
    }
    
    // Create new chart
    todayChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Productive', 'Unproductive', 'Neutral'],
            datasets: [{
                data: [productive, unproductive, neutral],
                backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const minutes = Math.round(value / 60);
                            return `${context.label}: ${formatTime(minutes)}`;
                        }
                    }
                }
            }
        }
    });
}

// Update weekly statistics
function updateWeekStats(weekly) {
    if (!weekly) return;
    
    const prodMins = Math.round(weekly.productive / 60);
    const unprodMins = Math.round(weekly.unproductive / 60);
    const neutralMins = Math.round((weekly.neutral || 0) / 60);
    const totalMins = prodMins + unprodMins + neutralMins;
    
    document.getElementById('weekProd').textContent = formatTime(prodMins);
    document.getElementById('weekUnprod').textContent = formatTime(unprodMins);
    document.getElementById('weekNeutral').textContent = formatTime(neutralMins);
    document.getElementById('weekTotal').textContent = formatTime(totalMins);
    
    const avgScore = weekly.total > 0 ? Math.round((weekly.productive / weekly.total) * 100) : 0;
    document.getElementById('weekScore').textContent = avgScore + '%';
    
    // Create week chart
    createWeekChart(weekly.days);
}

// Create weekly chart
function createWeekChart(days) {
    const canvas = document.getElementById('weekChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (weekChart) {
        weekChart.destroy();
    }
    
    // Prepare data
    let labels = [];
    let productiveData = [];
    let unproductiveData = [];
    
    if (days && days.length > 0) {
        // Use actual data
        days.forEach(day => {
            const date = new Date(day.date);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            productiveData.push(Math.round(day.productive / 60));
            unproductiveData.push(Math.round(day.unproductive / 60));
        });
    } else {
        // Use mock data
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        productiveData = [45, 60, 30, 75, 90, 45, 60];
        unproductiveData = [30, 15, 45, 30, 15, 30, 20];
    }
    
    // Create new chart
    weekChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Productive (min)',
                    data: productiveData,
                    backgroundColor: '#4CAF50',
                    borderRadius: 6
                },
                {
                    label: 'Unproductive (min)',
                    data: unproductiveData,
                    backgroundColor: '#F44336',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw} min`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Minutes'
                    },
                    grid: {
                        color: '#f0f0f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// Update monthly statistics
function updateMonthStats(monthly) {
    if (!monthly) {
        document.getElementById('monthProd').textContent = '0 min';
        document.getElementById('monthUnprod').textContent = '0 min';
        document.getElementById('monthNeutral').textContent = '0 min';
        document.getElementById('monthTotal').textContent = '0 min';
        document.getElementById('monthScore').textContent = '0%';
        return;
    }
    
    const prodMins = Math.round(monthly.productive / 60);
    const unprodMins = Math.round(monthly.unproductive / 60);
    const neutralMins = Math.round((monthly.neutral || 0) / 60);
    const totalMins = prodMins + unprodMins + neutralMins;
    
    document.getElementById('monthProd').textContent = formatTime(prodMins);
    document.getElementById('monthUnprod').textContent = formatTime(unprodMins);
    document.getElementById('monthNeutral').textContent = formatTime(neutralMins);
    document.getElementById('monthTotal').textContent = formatTime(totalMins);
    
    const score = monthly.total > 0 ? Math.round((monthly.productive / monthly.total) * 100) : 0;
    document.getElementById('monthScore').textContent = score + '%';
    
    // Create month chart
    createMonthChart(monthly.productive || 0, monthly.unproductive || 0, monthly.neutral || 0);
}

// Create monthly chart
function createMonthChart(productive, unproductive, neutral) {
    const canvas = document.getElementById('monthChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (monthChart) {
        monthChart.destroy();
    }
    
    // Create new chart
    monthChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Productive', 'Unproductive', 'Neutral'],
            datasets: [{
                data: [productive, unproductive, neutral],
                backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const minutes = Math.round(value / 60);
                            return `${context.label}: ${formatTime(minutes)}`;
                        }
                    }
                }
            }
        }
    });
}

// Load sites table based on current period
function loadSitesTable() {
    chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        if (!response) return;
        
        let sites = {};
        let total = 0;
        
        if (currentPeriod === 'daily') {
            sites = response.daily?.sites || {};
            total = response.daily?.total || 0;
        } else if (currentPeriod === 'weekly') {
            // Aggregate weekly sites
            const days = response.weekly?.days || [];
            days.forEach(day => {
                Object.entries(day.sites || {}).forEach(([domain, data]) => {
                    if (!sites[domain]) {
                        sites[domain] = { 
                            time: 0, 
                            category: data.category, 
                            visits: 0 
                        };
                    }
                    sites[domain].time += data.time;
                    sites[domain].visits += data.visits || 0;
                    total += data.time;
                });
            });
        } else {
            // For monthly, use weekly data as fallback
            sites = response.daily?.sites || {};
            total = response.daily?.total || 0;
        }
        
        loadSitesTableFromData(sites, total);
    });
}

// Load sites table from data object
function loadSitesTableFromData(sites, total = 0) {
    const tbody = document.getElementById('sitesTableBody');
    if (!tbody) return;
    
    // Convert to array and sort by time
    const sitesArray = Object.entries(sites)
        .map(([domain, data]) => ({ domain, ...data }))
        .sort((a, b) => b.time - a.time)
        .slice(0, 15); // Show top 15
    
    if (sitesArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No data available for this period</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    sitesArray.forEach(site => {
        const minutes = Math.round(site.time / 60);
        const timeDisplay = formatTime(minutes);
        const percent = total > 0 ? Math.round((site.time / total) * 100) : 0;
        
        const row = document.createElement('tr');
        row.className = site.category || 'neutral';
        row.innerHTML = `
            <td>${site.domain}</td>
            <td><span class="badge ${site.category || 'neutral'}">${site.category || 'neutral'}</span></td>
            <td>${timeDisplay}</td>
            <td>${site.visits || 1}</td>
            <td>${percent}%</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Load weekly reports
function loadReports(reports) {
    const reportsList = document.getElementById('reportsList');
    if (!reportsList) return;
    
    if (!reports || reports.length === 0) {
        reportsList.innerHTML = '<div class="empty-state">No weekly reports yet</div>';
        return;
    }
    
    reportsList.innerHTML = '';
    
    // Show last 5 reports, newest first
    reports.slice(-5).reverse().forEach(report => {
        const prodMins = Math.round(report.productive / 60);
        const date = new Date(report.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Determine badge class based on score
        let badgeClass = 'neutral';
        if (report.score >= 70) badgeClass = 'productive';
        else if (report.score >= 40) badgeClass = 'neutral';
        else badgeClass = 'unproductive';
        
        const card = document.createElement('div');
        card.className = 'report-card';
        card.innerHTML = `
            <div class="report-date">
                <i class="far fa-calendar-alt"></i>
                Week ${report.week}, ${report.year} (${dateStr})
            </div>
            <div class="report-stats">
                <span><i class="fas fa-clock"></i> ${formatTime(prodMins)} productive</span>
                <span><i class="fas fa-chart-line"></i> Score: ${report.score}%</span>
                <span class="badge ${badgeClass}">${report.level || 'Average'}</span>
            </div>
        `;
        
        reportsList.appendChild(card);
    });
}

// Export data as JSON file
function exportData() {
    chrome.runtime.sendMessage({ action: 'exportData' }, (data) => {
        // Create blob and download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `productivity-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        // Cleanup
        URL.revokeObjectURL(url);
        
        // Show success message
        showNotification('Data exported successfully');
    });
}

// Format time (minutes to readable format)
function formatTime(minutes) {
    if (minutes < 60) return minutes + ' min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours + 'h ' + (mins > 0 ? mins + 'm' : '');
}

// Show notification (simple alert for now)
function showNotification(message) {
    alert(message);
}

// Log that dashboard is ready
console.log('📊 Productivity Dashboard ready');