/**
 * FB Trust Checker - Background Service Worker
 * Handles extension lifecycle events and messaging between components
 */

// Extension installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  console.log('FB Trust Checker installed/updated:', details.reason);
  
  // Initialize default settings
  chrome.storage.local.set({
    settings: {
      enabled: true,
      autoScan: true,
      showBadge: true,
      riskThreshold: {
        low: 3,
        medium: 6
      }
    },
    sellerCache: {},
    stats: {
      listingsScanned: 0,
      scamsDetected: 0
    }
  });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'SCAN_COMPLETE':
      chrome.storage.local.get(['stats'], (result) => {
        const stats = result.stats || { listingsScanned: 0, scamsDetected: 0 };
        stats.listingsScanned++;
        if (message.data.riskScore >= 7) {
          stats.scamsDetected++;
        }
        chrome.storage.local.set({ stats });
      });
      sendResponse({ success: true });
      break;
      
    case 'GET_SETTINGS':
      chrome.storage.local.get(['settings'], (result) => {
        sendResponse(result.settings);
      });
      return true;
      
    case 'CACHE_SELLER':
      chrome.storage.local.get(['sellerCache'], (result) => {
        const cache = result.sellerCache || {};
        cache[message.data.sellerId] = {
          ...message.data,
          cachedAt: Date.now()
        };
        chrome.storage.local.set({ sellerCache: cache });
        sendResponse({ success: true });
      });
      return true;
      
    case 'GET_CACHED_SELLER':
      chrome.storage.local.get(['sellerCache'], (result) => {
        const cache = result.sellerCache || {};
        const seller = cache[message.sellerId];
        if (seller && (Date.now() - seller.cachedAt) < 3600000) {
          sendResponse(seller);
        } else {
          sendResponse(null);
        }
      });
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});
