# F1 Fantasy Scraper - GitHub Setup Guide

## Files to Upload vs Exclude

### ✅ INCLUDE These Files:
- `fantasy_scraper_V3.1.js` (main scraper)
- `package.json` (if it exists)
- `README.md`
- `RUN_COMMANDS.md`
- `GITHUB_SETUP.md`
- `driver_data/` folder (sample output)
- `summary_data/` folder (sample output)

### ❌ EXCLUDE These Files/Folders:
- `node_modules/` (too large, auto-generated)
- `.claude/` (Claude-specific files)
- `archive/` (old development files)
- `.DS_Store` (macOS system files)
- Any temporary files

## Step-by-Step GitHub Upload

### 1. Create .gitignore File
```bash
cat > .gitignore << 'EOF'
node_modules/
.claude/
archive/
.DS_Store
*.log
EOF
```

### 2. Initialize Git Repository
```bash
git init
```

### 3. Add Files to Repository
```bash
git add .
```

### 4. Create First Commit
```bash
git commit -m "Initial commit: F1 Fantasy data scraper v3.1

- Complete F1 Fantasy driver data extraction
- Handles team swap scenarios (Tsunoda/Lawson)
- Extracts percentage picked and race breakdowns
- Generates comprehensive summary files
- Saves individual driver files as abbreviation.json

🤖 Generated with Claude Code"
```

### 5. Connect to Existing GitHub Repository
```bash
git remote add origin https://github.com/JoshCBruce/fantasy-data.git
```

### 6. Push to GitHub
```bash
git branch -M main
git push -u origin main
```

## About node_modules

**NO** - Do not upload `node_modules/` to GitHub because:
- It's huge (thousands of files)
- It's auto-generated from package.json
- GitHub repositories should exclude it
- Users run `npm install` to recreate it locally

## Package.json Setup (if missing)

If you don't have a package.json, create one:
```bash
cat > package.json << 'EOF'
{
  "name": "f1-fantasy-scraper",
  "version": "3.1.0",
  "description": "F1 Fantasy data scraper with team swap handling",
  "main": "fantasy_scraper_V3.1.js",
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "scripts": {
    "start": "node fantasy_scraper_V3.1.js",
    "install-browsers": "npx playwright install chromium"
  },
  "keywords": ["f1", "fantasy", "scraper", "formula1"],
  "author": "Your Name",
  "license": "MIT"
}
EOF
```

## Repository Structure on GitHub
```
fantasy-data/
├── fantasy_scraper_V3.1.js
├── package.json
├── README.md
├── RUN_COMMANDS.md
├── GITHUB_SETUP.md
├── .gitignore
├── driver_data/
│   ├── NOR.json
│   ├── PIA.json
│   └── ... (21 total)
└── summary_data/
    ├── extraction_summary.json
    ├── percentage_picked_ranking.json
    ├── team_summary.json
    └── weekend_summary.json
```

## Future Updates
```bash
git add .
git commit -m "Update: [describe changes]"
git push
```