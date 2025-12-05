/**
 * FB Trust Checker - Popup Script
 * Handles the extension popup UI and interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('FB Trust Checker: Popup loaded');
  
  loadStats();
  loadSettings();
  
  document.getElementById('btn-settings').addEventListener('click', () => {
    alert('Settings page coming soon!');
  });
  
  document.getElementById('btn-report').addEventListener('click', () => {
    chrome.tabs.create({ 
      url: 'https://github.com/specialdk/FB-checker/issues' 
    });
  });
});

function loadStats() {
  chrome.storage.local.get(['stats'], (result) => {
    const stats = result.stats || { listingsScanned: 0, scamsDetected: 0 };
    document.getElementById('stat-scanned').textContent = stats.listingsScanned;
    document.getElementById('stat-flagged').textContent = stats.scamsDetected;
  });
}

function loadSettings() {
  chrome.storage.local.get(['settings'], (result) => {
    const settings = result.settings || { enabled: true, autoScan: true };
    
    const enabledBadge = document.getElementById('status-enabled');
    const autoscanBadge = document.getElementById('status-autoscan');
    
    if (settings.enabled) {
      enabledBadge.textContent = 'Active';
      enabledBadge.className = 'status-badge status-active';
    } else {
      enabledBadge.textContent = 'Disabled';
      enabledBadge.className = 'status-badge status-inactive';
    }
    
    if (settings.autoScan) {
      autoscanBadge.textContent = 'On';
      autoscanBadge.className = 'status-badge status-active';
    } else {
      autoscanBadge.textContent = 'Off';
      autoscanBadge.className = 'status-badge status-inactive';
    }
  });
}
