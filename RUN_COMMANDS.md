# F1 Fantasy Scraper - Run Commands

## Prerequisites
```bash
npm install playwright
```

## Install Browser Dependencies
```bash
npx playwright install chromium
```

## Run the Scraper
```bash
node fantasy_scraper_V3.1.js
```

## Expected Output
- Individual driver files: `driver_data/*.json` (21 files)
- Summary files: `summary_data/*.json` (4 files)
- Console output showing progress and statistics

## Troubleshooting Commands

### Check if Playwright is installed
```bash
npx playwright --version
```

### Reinstall dependencies if needed
```bash
npm install
npx playwright install
```

### Run with verbose output (if modified)
```bash
DEBUG=pw:api node fantasy_scraper_V3.1.js
```

## Quick Test
```bash
ls driver_data/ | wc -l
# Should output: 21

ls summary_data/ | wc -l  
# Should output: 4
```