// ===========================================
// PRODUCTIVITY TRACKER - BACKGROUND SERVICE
// ===========================================

// Website classification database
const WEBSITE_CATEGORIES = {
  productive: [
    // Coding & Development
    'github.com', 'gitlab.com', 'stackoverflow.com', 'stackexchange.com',
    'codesandbox.io', 'codepen.io', 'replit.com', 'w3schools.com',
    'developer.mozilla.org', 'freecodecamp.org', 'codecademy.com',
    'udemy.com', 'coursera.org', 'edx.org', 'pluralsight.com',
    'leetcode.com', 'hackerrank.com', 'codeforces.com',
    
    // Documentation & Tools
    'docs.google.com', 'drive.google.com', 'calendar.google.com',
    'notion.so', 'miro.com', 'figma.com', 'asana.com', 'trello.com',
    'jira.com', 'slack.com', 'teams.microsoft.com', 'zoom.us',
    'meet.google.com', 'evernote.com', 'onenote.com',
    
    // Learning & Productivity
    'medium.com', 'dev.to', 'hashnode.com', 'todoist.com',
    'grammarly.com', 'canva.com', 'overleaf.com', 'draw.io'
  ],
  
  unproductive: [
    // Social Media
    'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com',
    'snapchat.com', 'pinterest.com', 'reddit.com', 'tumblr.com',
    'linkedin.com', 'threads.net',
    
    // Video Streaming
    'youtube.com', 'netflix.com', 'primevideo.com', 'hulu.com',
    'disneyplus.com', 'hotstar.com', 'vimeo.com', 'twitch.tv',
    'dailymotion.com',
    
    // Gaming
    'steam.com', 'epicgames.com', 'origin.com', 'xbox.com', 'playstation.com',
    'roblox.com', 'minecraft.net', 'chess.com', 'lichess.org',
    
    // Entertainment & News
    '9gag.com', 'buzzfeed.com', 'imgur.com', 'cnn.com', 'bbc.com',
    'nytimes.com', 'theguardian.com', 'foxnews.com', 'wsj.com',
    'espn.com', 'sports.yahoo.com',
    
    // Shopping
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'aliexpress.com',
    'flipkart.com', 'etsy.com', 'bestbuy.com', 'newegg.com'
  ]
};

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ Productivity Tracker installed');
  
  const today = new Date().toDateString();
  
  // Initialize storage
  chrome.storage.local.set({
    settings: {
      autoReset: true,
      notifications: true,
      weeklyReport: true,
      productiveThreshold: 70,
      idleThreshold: 5
    },
    categories: WEBSITE_CATEGORIES,
    daily: {
      date: today,
      sites: {},
      productive: 0,
      unproductive: 0,
      neutral: 0,
      total: 0
    },
    weekly: {
      days: [],
      productive: 0,
      unproductive: 0,
      neutral: 0,
      total: 0
    },
    monthly: {
      months: [],
      productive: 0,
      unproductive: 0,
      total: 0
    },
    history: [],
    reports: []
  });
  
  // Create alarms
  chrome.alarms.create('trackingAlarm', { periodInMinutes: 1 });
  chrome.alarms.create('dailyReset', { periodInMinutes: 60 });
  chrome.alarms.create('weeklyReport', { periodInMinutes: 60 * 24 });
  chrome.alarms.create('idleCheck', { periodInMinutes: 1 });
});

// Tracking variables
let activeTabId = null;
let activeDomain = null;
let startTime = null;
let isTracking = true;

// Tab change listeners
chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tabId === activeTabId) {
    handleTabChange(tabId);
  }
});

// Handle tab change
function handleTabChange(tabId) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url || !tab.url.startsWith('http')) {
      return;
    }
    
    // Save time for previous domain
    saveTimeForCurrentDomain();
    
    // Start tracking new domain
    activeTabId = tabId;
    activeDomain = extractDomain(tab.url);
    startTime = Date.now();
    
    console.log(`🔍 Tracking: ${activeDomain}`);
  });
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (e) {
    return null;
  }
}

// Save time for current domain
function saveTimeForCurrentDomain() {
  if (!activeDomain || !startTime || !isTracking) return;
  
  const endTime = Date.now();
  const timeSpent = Math.round((endTime - startTime) / 1000);
  
  if (timeSpent < 2) return;
  
  updateTrackingData(activeDomain, timeSpent);
  startTime = Date.now();
}

// Update tracking data
function updateTrackingData(domain, seconds) {
  chrome.storage.local.get(['categories', 'daily', 'weekly', 'history', 'settings'], (result) => {
    const categories = result.categories || WEBSITE_CATEGORIES;
    const daily = result.daily || { sites: {}, productive: 0, unproductive: 0, neutral: 0, total: 0 };
    const weekly = result.weekly || { days: [], productive: 0, unproductive: 0, neutral: 0, total: 0 };
    const history = result.history || [];
    const settings = result.settings || {};
    
    let category = 'neutral';
    if (categories.productive.includes(domain)) {
      category = 'productive';
    } else if (categories.unproductive.includes(domain)) {
      category = 'unproductive';
    }
    
    if (!daily.sites[domain]) {
      daily.sites[domain] = { time: 0, category, visits: 0 };
    }
    daily.sites[domain].time += seconds;
    daily.sites[domain].visits += 1;
    daily.total += seconds;
    daily[category] += seconds;
    
    weekly.total += seconds;
    weekly[category] += seconds;
    
    history.push({
      timestamp: new Date().toISOString(),
      domain,
      seconds,
      category
    });
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    while (history.length > 0 && new Date(history[0].timestamp).getTime() < thirtyDaysAgo) {
      history.shift();
    }
    
    chrome.storage.local.set({ daily, weekly, history });
    
    console.log(`📊 +${seconds}s on ${domain} (${category})`);
  });
}

// Window focus change
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (isTracking) {
      saveTimeForCurrentDomain();
      isTracking = false;
    }
  } else {
    if (!isTracking) {
      isTracking = true;
      startTime = Date.now();
    }
  }
});

// Idle state detection
chrome.idle.onStateChanged.addListener((state) => {
  if (state === 'idle' || state === 'locked') {
    if (isTracking) {
      saveTimeForCurrentDomain();
      isTracking = false;
    }
  } else if (state === 'active') {
    if (!isTracking) {
      isTracking = true;
      startTime = Date.now();
    }
  }
});

// Alarm handler
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'trackingAlarm') {
    if (isTracking && activeDomain && startTime) {
      saveTimeForCurrentDomain();
    }
  } else if (alarm.name === 'dailyReset') {
    checkAndResetDaily();
  } else if (alarm.name === 'weeklyReport') {
    generateWeeklyReport();
  } else if (alarm.name === 'idleCheck') {
    checkIdleTime();
  }
});

// Check idle time
function checkIdleTime() {
  chrome.storage.local.get(['settings'], (result) => {
    const threshold = result.settings?.idleThreshold || 5;
    chrome.idle.queryState(threshold * 60, (state) => {
      if (state === 'idle' && isTracking) {
        saveTimeForCurrentDomain();
        isTracking = false;
      } else if (state === 'active' && !isTracking) {
        isTracking = true;
        startTime = Date.now();
      }
    });
  });
}

// Check and reset daily data
function checkAndResetDaily() {
  const now = new Date();
  const today = now.toDateString();
  
  chrome.storage.local.get(['daily', 'weekly', 'monthly', 'settings'], (result) => {
    const daily = result.daily;
    const weekly = result.weekly;
    const monthly = result.monthly;
    const settings = result.settings || { autoReset: true };
    
    if (daily && daily.date !== today && settings.autoReset) {
      const yesterday = {
        date: daily.date,
        productive: daily.productive,
        unproductive: daily.unproductive,
        neutral: daily.neutral,
        total: daily.total,
        sites: daily.sites
      };
      
      if (!weekly.days) weekly.days = [];
      weekly.days.push(yesterday);
      
      if (weekly.days.length > 7) {
        weekly.days.shift();
      }
      
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      if (!monthly.months) monthly.months = [];
      
      let monthData = monthly.months.find(m => m.month === currentMonth && m.year === currentYear);
      if (!monthData) {
        monthData = { month: currentMonth, year: currentYear, productive: 0, unproductive: 0, total: 0 };
        monthly.months.push(monthData);
      }
      
      monthData.productive += daily.productive;
      monthData.unproductive += daily.unproductive;
      monthData.total += daily.total;
      
      if (monthly.months.length > 12) {
        monthly.months.shift();
      }
      
      chrome.storage.local.set({
        daily: {
          date: today,
          sites: {},
          productive: 0,
          unproductive: 0,
          neutral: 0,
          total: 0
        },
        weekly: weekly,
        monthly: monthly
      });
      
      console.log('🔄 Daily data reset');
    }
  });
}

// Generate weekly report
function generateWeeklyReport() {
  chrome.storage.local.get(['weekly', 'settings', 'reports'], (result) => {
    const weekly = result.weekly;
    const settings = result.settings || { notifications: true, weeklyReport: true };
    const reports = result.reports || [];
    
    if (!weekly || weekly.total === 0 || !settings.weeklyReport) return;
    
    const productiveMins = Math.round(weekly.productive / 60);
    const unproductiveMins = Math.round(weekly.unproductive / 60);
    const productivityScore = Math.round((weekly.productive / weekly.total) * 100);
    
    let level = 'Needs Improvement';
    if (productivityScore >= 70) level = 'Excellent';
    else if (productivityScore >= 50) level = 'Good';
    else if (productivityScore >= 30) level = 'Average';
    
    reports.push({
      week: getWeekNumber(new Date()),
      year: new Date().getFullYear(),
      productive: weekly.productive,
      unproductive: weekly.unproductive,
      neutral: weekly.neutral,
      total: weekly.total,
      score: productivityScore,
      level: level,
      date: new Date().toISOString()
    });
    
    chrome.storage.local.set({ reports });
    
    if (settings.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '📊 Weekly Productivity Report',
        message: `This week: ${productiveMins}m productive, ${unproductiveMins}m unproductive\nScore: ${productivityScore}% - ${level}`,
        buttons: [{ title: 'View Dashboard' }],
        priority: 2
      });
    }
  });
}

// Get week number
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Handle notification clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
});

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getStats') {
    chrome.storage.local.get(['daily', 'weekly', 'monthly', 'history', 'reports', 'settings'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  if (request.action === 'resetData') {
    const today = new Date().toDateString();
    chrome.storage.local.set({
      daily: {
        date: today,
        sites: {},
        productive: 0,
        unproductive: 0,
        neutral: 0,
        total: 0
      }
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'exportData') {
    chrome.storage.local.get(null, (data) => {
      sendResponse(data);
    });
    return true;
  }
  
  if (request.action === 'clearAllData') {
    const today = new Date().toDateString();
    chrome.storage.local.set({
      daily: {
        date: today,
        sites: {},
        productive: 0,
        unproductive: 0,
        neutral: 0,
        total: 0
      },
      weekly: { days: [], productive: 0, unproductive: 0, neutral: 0, total: 0 },
      monthly: { months: [], productive: 0, unproductive: 0, total: 0 },
      history: [],
      reports: []
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'updateSettings') {
    chrome.storage.local.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'updateCategories') {
    chrome.storage.local.set({ categories: request.categories }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getCurrentSite') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        const domain = extractDomain(tabs[0].url);
        sendResponse({ domain });
      } else {
        sendResponse({ domain: null });
      }
    });
    return true;
  }
});

console.log('🚀 Productivity Tracker background service running');