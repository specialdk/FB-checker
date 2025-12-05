/**
 * FB Trust Checker - Content Script
 * Runs on Facebook Marketplace pages to analyze listings and sellers
 */

(function() {
  'use strict';
  
  console.log('FB Trust Checker: Content script loaded');
  
  // ============================================
  // CONFIGURATION
  // ============================================
  
  const CONFIG = {
    scanInterval: 2000,
    analysisDelay: 1000,
    scamPhrases: [
      'rate me first',
      'rate me before',
      'leave review first',
      'serious buyers only',
      'serious inquiries only',
      'dm me',
      'message me on whatsapp',
      'contact me on',
      'telegram',
      'cash only',
      'no lowballers',
      'price is firm',
      'first come first serve',
      'moving sale',
      'must go today',
      'urgent sale',
      'no trades'
    ]
  };
  
  // ============================================
  // RISK SCORING RULES
  // ============================================
  
  const RISK_RULES = {
    newAccount2024_2025: { weight: 2, reason: 'Account created in 2024-2025' },
    singleListing: { weight: 3, reason: 'Seller has only 1 listing' },
    fewListings: { weight: 2, reason: 'Seller has very few listings (2-3)' },
    oldAccountFewListings: { weight: 4, reason: 'Old account but only 1-2 listings (possible hijacked account)' },
    priceTooLow: { weight: 2, reason: 'Price significantly below market value' },
    scamPhrase: { weight: 2, reason: 'Contains common scam phrases' },
    askingForRating: { weight: 3, reason: 'Asking for rating before transaction' },
    noRatings: { weight: 2, reason: 'Seller has no ratings or reviews' },
    noProfilePhoto: { weight: 1, reason: 'Seller has no profile photo' }
  };
  
  // ============================================
  // STATE
  // ============================================
  
  let isAnalyzing = false;
  let currentListingData = null;
  let badgeElement = null;
  
  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found`));
      }, timeout);
    });
  }
  
  function extractYear(text) {
    const match = text.match(/(19|20)\d{2}/);
    return match ? parseInt(match[0]) : null;
  }
  
  function isListingPage() {
    const url = window.location.href;
    return url.includes('/marketplace/item/') || 
           url.match(/\/marketplace\/\d+/) !== null;
  }
  
  function isBrowsePage() {
    const url = window.location.href;
    return url.includes('/marketplace') && !isListingPage();
  }
  
  // ============================================
  // DATA EXTRACTION FUNCTIONS
  // ============================================
  
  function extractListingData() {
    console.log('FB Trust Checker: Extracting listing data...');
    
    const data = {
      title: '',
      price: '',
      description: '',
      location: '',
      seller: {
        name: '',
        profileUrl: '',
        joinedYear: null,
        listingCount: null,
        rating: null,
        hasProfilePhoto: false
      },
      extractedAt: Date.now()
    };
    
    try {
      // Get title
      const titleSelectors = ['h1 span', '[data-testid="marketplace_listing_title"]'];
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim()) {
          data.title = el.textContent.trim();
          break;
        }
      }
      
      // Get price
      const priceEl = document.querySelector('[data-testid="marketplace_listing_price"]');
      if (priceEl) {
        data.price = priceEl.textContent.trim();
      }
      
      // Get description
      const descEl = document.querySelector('[data-testid="marketplace_listing_body"]');
      if (descEl) {
        data.description = descEl.textContent.trim();
      }
      
      // Get seller profile link
      const sellerLinks = document.querySelectorAll('a[href*="/marketplace/profile/"]');
      if (sellerLinks.length > 0) {
        const sellerLink = sellerLinks[0];
        data.seller.profileUrl = sellerLink.href;
        data.seller.name = sellerLink.textContent.trim();
      }
      
      // Look for "Joined" text
      const allText = document.body.innerText;
      const joinedMatch = allText.match(/Joined.*?(19|20)\d{2}|Member since.*?(19|20)\d{2}/i);
      if (joinedMatch) {
        data.seller.joinedYear = extractYear(joinedMatch[0]);
      }
      
      // Try to find listing count
      const listingsMatch = allText.match(/(\d+)\s*listings?/i);
      if (listingsMatch) {
        data.seller.listingCount = parseInt(listingsMatch[1]);
      }
      
      console.log('FB Trust Checker: Extracted data:', data);
      
    } catch (error) {
      console.error('FB Trust Checker: Error extracting data:', error);
    }
    
    return data;
  }
  
  // ============================================
  // RISK ANALYSIS
  // ============================================
  
  function analyzeRisk(listingData) {
    console.log('FB Trust Checker: Analyzing risk...');
    
    const risks = [];
    let totalScore = 0;
    const currentYear = new Date().getFullYear();
    
    // Check account age
    if (listingData.seller.joinedYear) {
      if (listingData.seller.joinedYear >= 2024) {
        risks.push(RISK_RULES.newAccount2024_2025);
        totalScore += RISK_RULES.newAccount2024_2025.weight;
      }
    }
    
    // Check listing count
    if (listingData.seller.listingCount !== null) {
      if (listingData.seller.listingCount === 1) {
        risks.push(RISK_RULES.singleListing);
        totalScore += RISK_RULES.singleListing.weight;
      } else if (listingData.seller.listingCount <= 3) {
        risks.push(RISK_RULES.fewListings);
        totalScore += RISK_RULES.fewListings.weight;
      }
      
      // OLD ACCOUNT + FEW LISTINGS = MOST SUSPICIOUS
      if (listingData.seller.joinedYear && 
          listingData.seller.joinedYear < 2023 && 
          listingData.seller.listingCount <= 2) {
        risks.push(RISK_RULES.oldAccountFewListings);
        totalScore += RISK_RULES.oldAccountFewListings.weight;
      }
    }
    
    // Check for scam phrases
    const descLower = (listingData.description || '').toLowerCase();
    const titleLower = (listingData.title || '').toLowerCase();
    const combinedText = descLower + ' ' + titleLower;
    
    for (const phrase of CONFIG.scamPhrases) {
      if (combinedText.includes(phrase.toLowerCase())) {
        if (phrase.includes('rate')) {
          risks.push(RISK_RULES.askingForRating);
          totalScore += RISK_RULES.askingForRating.weight;
        } else {
          risks.push({ ...RISK_RULES.scamPhrase, detail: phrase });
          totalScore += RISK_RULES.scamPhrase.weight;
        }
        break;
      }
    }
    
    // Check seller ratings
    if (listingData.seller.rating === null || listingData.seller.rating === 0) {
      risks.push(RISK_RULES.noRatings);
      totalScore += RISK_RULES.noRatings.weight;
    }
    
    // Determine risk level
    let riskLevel = 'low';
    if (totalScore >= 7) {
      riskLevel = 'high';
    } else if (totalScore >= 4) {
      riskLevel = 'medium';
    }
    
    const result = {
      score: totalScore,
      level: riskLevel,
      risks: risks,
      analyzedAt: Date.now()
    };
    
    console.log('FB Trust Checker: Risk analysis result:', result);
    return result;
  }
  
  // ============================================
  // UI FUNCTIONS
  // ============================================
  
  function displayTrustBadge(riskAnalysis, listingData) {
    removeTrustBadge();
    
    const badge = document.createElement('div');
    badge.id = 'fb-trust-checker-badge';
    badge.className = `fb-trust-badge fb-trust-${riskAnalysis.level}`;
    
    const emoji = riskAnalysis.level === 'high' ? '🔴' : 
                  riskAnalysis.level === 'medium' ? '🟡' : '🟢';
    
    const levelText = riskAnalysis.level === 'high' ? 'High Risk' :
                      riskAnalysis.level === 'medium' ? 'Caution' : 'Looks OK';
    
    badge.innerHTML = `
      <div class="fb-trust-badge-header">
        <span class="fb-trust-badge-emoji">${emoji}</span>
        <span class="fb-trust-badge-level">${levelText}</span>
        <span class="fb-trust-badge-score">Score: ${riskAnalysis.score}</span>
        <button class="fb-trust-badge-toggle">▼</button>
      </div>
      <div class="fb-trust-badge-details">
        <div class="fb-trust-badge-section">
          <strong>Seller Info:</strong>
          <ul>
            <li>Account: ${listingData.seller.joinedYear ? 'Joined ' + listingData.seller.joinedYear : 'Unknown'}</li>
            <li>Listings: ${listingData.seller.listingCount !== null ? listingData.seller.listingCount : 'Unknown'}</li>
            <li>Rating: ${listingData.seller.rating || 'No ratings'}</li>
          </ul>
        </div>
        ${riskAnalysis.risks.length > 0 ? `
          <div class="fb-trust-badge-section">
            <strong>Red Flags:</strong>
            <ul>
              ${riskAnalysis.risks.map(r => `<li>⚠️ ${r.reason}${r.detail ? ` ("${r.detail}")` : ''}</li>`).join('')}
            </ul>
          </div>
        ` : '<div class="fb-trust-badge-section"><strong>No major red flags detected</strong></div>'}
      </div>
    `;
    
    badge.querySelector('.fb-trust-badge-toggle').addEventListener('click', () => {
      badge.classList.toggle('fb-trust-badge-expanded');
    });
    
    document.body.appendChild(badge);
    badgeElement = badge;
    
    console.log('FB Trust Checker: Badge displayed');
  }
  
  function removeTrustBadge() {
    const existing = document.getElementById('fb-trust-checker-badge');
    if (existing) {
      existing.remove();
    }
    badgeElement = null;
  }
  
  // ============================================
  // MAIN ANALYSIS FLOW
  // ============================================
  
  async function analyzeCurrentListing() {
    if (isAnalyzing) return;
    if (!isListingPage()) {
      removeTrustBadge();
      return;
    }
    
    isAnalyzing = true;
    console.log('FB Trust Checker: Starting analysis...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, CONFIG.analysisDelay));
      
      const listingData = extractListingData();
      currentListingData = listingData;
      
      const riskAnalysis = analyzeRisk(listingData);
      displayTrustBadge(riskAnalysis, listingData);
      
      chrome.runtime.sendMessage({
        type: 'SCAN_COMPLETE',
        data: {
          listingData,
          riskScore: riskAnalysis.score,
          riskLevel: riskAnalysis.level
        }
      });
      
    } catch (error) {
      console.error('FB Trust Checker: Analysis error:', error);
    } finally {
      isAnalyzing = false;
    }
  }
  
  // ============================================
  // PAGE NAVIGATION DETECTION
  // ============================================
  
  function watchForNavigation() {
    let lastUrl = window.location.href;
    
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log('FB Trust Checker: URL changed to:', currentUrl);
        lastUrl = currentUrl;
        
        setTimeout(() => {
          if (isListingPage()) {
            analyzeCurrentListing();
          } else {
            removeTrustBadge();
          }
        }, 500);
      }
    }, CONFIG.scanInterval);
  }
  
  // ============================================
  // INITIALIZATION
  // ============================================
  
  function init() {
    console.log('FB Trust Checker: Initializing...');
    watchForNavigation();
    
    if (isListingPage()) {
      analyzeCurrentListing();
    }
    
    console.log('FB Trust Checker: Ready!');
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
