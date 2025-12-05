# FB Trust Checker

A Chrome extension to detect potential scams on Facebook Marketplace by analyzing seller profiles and listings.

## Features

- **Automatic Analysis**: Scans listings when you view them on FB Marketplace
- **Trust Score**: Displays a risk badge (🟢 Low / 🟡 Medium / 🔴 High)
- **Red Flag Detection**: Identifies common scam indicators
- **Seller Profile Analysis**: Checks account age, listing history, ratings

## Red Flags Detected

| Indicator | Risk Weight | Description |
|-----------|-------------|-------------|
| New Account (2024-2025) | +2 | Recently created accounts |
| Single Listing | +3 | Seller has only 1 listing |
| Old Account + Few Listings | +4 | Possible hijacked account (MOST SUSPICIOUS) |
| "Rate me first" requests | +3 | Common scam tactic |
| Scam phrases | +2 | Known scam language patterns |
| No seller ratings | +2 | Unverified seller |

### Risk Score Levels
- **🟢 Low Risk**: Score 0-3
- **🟡 Caution**: Score 4-6  
- **🔴 High Risk**: Score 7+

## Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/specialdk/FB-checker.git
   ```

2. **Add icons** (required before loading):
   - Go to https://favicon.io/emoji-favicons/
   - Search for "magnifying glass" emoji
   - Download and extract
   - Rename files to `icon16.png`, `icon48.png`, `icon128.png`
   - Place in the `icons/` folder

3. Open Chrome and go to `chrome://extensions/`

4. Enable **Developer mode** (toggle in top right)

5. Click **Load unpacked**

6. Select the `FB-checker` folder

7. The extension is now active! Visit Facebook Marketplace to test.

## Usage

1. Browse to Facebook Marketplace
2. Click on any listing
3. The trust badge appears in the top-right corner
4. Click the badge header to expand and see detailed analysis

## Project Structure

```
FB-checker/
├── manifest.json          # Extension configuration
├── background.js          # Service worker
├── content.js             # Main analysis logic (runs on FB pages)
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic
├── styles/
│   └── overlay.css        # Trust badge overlay styles
├── icons/
│   ├── icon16.png         # Toolbar icon
│   ├── icon48.png         # Extensions page icon
│   └── icon128.png        # Chrome Web Store icon
└── README.md
```

## Development Roadmap

- [x] Phase 1: Basic extension skeleton
- [ ] Phase 2: Improved FB DOM data extraction
- [ ] Phase 3: Enhanced rules engine
- [ ] Phase 4: Seller profile deep-dive (click into profile)
- [ ] Phase 5: Claude AI integration for smart analysis
- [ ] Phase 6: Mobile screenshot analyzer
- [ ] Phase 7: Chrome Web Store release

## Known Limitations

- Facebook changes their page structure frequently - selectors may need updating
- Some seller data requires clicking into their profile (Phase 4)
- Mobile Chrome doesn't support extensions (Phase 6 will address)

## Contributing

This is a personal project but suggestions welcome! Open an issue to discuss.

## License

MIT License - Use freely, no warranty provided.

## Disclaimer

This tool provides risk indicators based on observable patterns. It cannot guarantee a listing is legitimate or a scam. Always use your own judgment and follow safe buying practices:
- Meet in public places
- Inspect items before paying
- Use secure payment methods
- Trust your instincts
