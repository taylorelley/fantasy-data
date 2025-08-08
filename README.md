# F1 Fantasy Complete Data Scraper

A comprehensive web scraper for extracting F1 Fantasy driver data from the official Formula 1 Fantasy website. This tool handles all drivers including complex team swap scenarios and provides detailed race-by-race breakdowns.

## ✨ Features

- **Complete Driver Coverage**: Extracts data for all 21+ F1 drivers
- **Team Swap Handling**: Automatically merges data for drivers who switched teams mid-season (Tsunoda, Lawson)
- **Rich Data Extraction**: 
  - Race and sprint session breakdowns
  - Fantasy points by category (position, qualifying, overtakes, etc.)
  - Percentage picked by fantasy players
  - Team information, positions, and costs
  - Driver of the Day awards
- **Smart File Organization**: Saves individual files as `{ABBREVIATION}.json` (e.g., `NOR.json`, `TSU.json`)
- **Comprehensive Summaries**: Multiple summary files for different analysis needs
- **Dynamic Race Detection**: Automatically determines race order from the website
- **Error Handling**: Robust error handling with popup management and retry logic

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Clone or download this repository
2. Install dependencies:
```bash
npm install
```

### Usage

Run the scraper:
```bash
node fantasy_scraper_V3.1.js
```

The scraper will:
1. Open a browser window (headless mode can be enabled in config)
2. Navigate to the F1 Fantasy website
3. Handle cookie consent automatically
4. Extract data for all drivers including team swaps
5. Save results to a versioned folder named after the most recent race (e.g., `15-Netherlands/`)

## 📁 Output Structure

All output files are saved in a versioned folder named after the most recent race (e.g., `15-Netherlands/`).

### Directory Structure
```
15-Netherlands/
├── driver_data/
│   ├── NOR.json
│   ├── TSU.json (merged team swap data)
│   ├── LAW.json (merged team swap data)
│   └── ... (21 total driver files)
└── summary_data/
    ├── weekend_summary.json
    ├── extraction_summary.json
    ├── team_summary.json
    └── percentage_picked_ranking.json
```

### Individual Driver Files (`{ROUND}-{RACE}/driver_data/`)

Each driver gets a file named `{ABBREVIATION}.json`:
- `NOR.json` - Lando Norris
- `TSU.json` - Yuki Tsunoda (merged team swap data)
- `LAW.json` - Liam Lawson (merged team swap data)
- etc.

### Summary Files (`{ROUND}-{RACE}/summary_data/`)

1. **`weekend_summary.json`** - Points by race for all drivers
2. **`extraction_summary.json`** - Overall statistics and driver list
3. **`team_summary.json`** - Data grouped by team
4. **`percentage_picked_ranking.json`** - Drivers ranked by popularity

## 📊 Data Format

### Individual Driver File Structure

```json
{
  "driverId": "landonorrisdriver",
  "name": "landonorrisdriver",
  "displayName": "landonorris",
  "abbreviation": "NOR",
  "team": "McLaren",
  "position": 1,
  "value": "31.4M",
  "seasonTotalPoints": 500,
  "percentagePicked": 23,
  "teamSwap": false,
  "races": [
    {
      "round": "01",
      "raceName": "Australia",
      "totalPoints": 59,
      "race": {
        "dotd": 10,
        "position": 25,
        "qualifyingPosition": 10,
        "fastestLap": -10,
        "overtakeBonus": 24
      },
      "sprint": {
        "position": 0,
        "qualifyingPosition": 0,
        "fastestLap": 0,
        "overtakeBonus": 0
      }
    }
  ],
  "extractedAt": "2025-08-08T03:11:36.789Z"
}
```

### Team Swap Driver Format

For drivers who switched teams (Tsunoda, Lawson), additional fields are included:

```json
{
  "teamSwap": true,
  "teams": ["Red Bull Racing", "Racing Bulls"],
  "teamSwapDetails": [
    {
      "team": "Red Bull Racing",
      "position": 13,
      "value": "11.2M",
      "points": 74
    },
    {
      "team": "Racing Bulls",
      "position": 20,
      "value": "8.4M", 
      "points": 6
    }
  ],
  "versions": 2,
  "races": [
    {
      "round": "01",
      "raceName": "Australia",
      "totalPoints": 0,
      "race": { /* race data */ },
      "team": "Racing Bulls",
      "source": "single"
    }
  ]
}
```

### Weekend Summary Format

```json
{
  "01": {
    "raceName": "Australia",
    "drivers": {
      "NOR": 59,
      "PIA": 10,
      "VER": 29,
      "TSU": 0,
      "LAW": -17
    }
  }
}
```

### Percentage Picked Ranking Format

```json
{
  "HAD": 54,
  "BEA": 44,
  "PIA": 40,
  "SAI": 39,
  "ALO": 37,
  "HUL": 34,
  "ALB": 29,
  "BOR": 25,
  "OCO": 24,
  "NOR": 23,
  "TSU": 5
}
```

## 🔧 Configuration

Edit the `CONFIG` object in `fantasy_scraper_V3.1.js`:

```javascript
const CONFIG = {
    BASE_URL: 'https://fantasy.formula1.com/en/statistics/details?tab=driver&filter=fPoints',
    BROWSER_HEADLESS: false, // Set to true for headless mode
    PROCESS_ALL_DRIVERS: true,
    DELAYS: {
        PAGE_LOAD: 5000,
        POPUP_WAIT: 3000,
        BETWEEN_DRIVERS: 2000,
        POPUP_CLOSE: 1000
    }
};

// Output directories are now automatically created as versioned folders
// based on the most recent race (e.g., "15-Netherlands/driver_data/")
```

## 🏎️ Team Swap Handling

The scraper automatically detects and handles drivers who switched teams mid-season:

### Current Team Swap Drivers (2025 Season)
- **Yuki Tsunoda**: Red Bull Racing → Racing Bulls
- **Liam Lawson**: Racing Bulls → Red Bull Racing

### How It Works
1. **Detection**: Identifies multiple entries for the same driver with different teams
2. **Collection**: Gathers race data from both team periods
3. **Merging**: Combines data into a single comprehensive driver record
4. **Conflict Resolution**: When the same race has different data, chooses the version with more points
5. **Metadata**: Includes team swap details and version tracking

## 📈 Points Breakdown

Fantasy points are broken down by category:

### Race Points
- **Position Points**: Based on finishing position
- **Qualifying Points**: Based on qualifying position  
- **Driver of the Day**: 10 points bonus
- **Fastest Lap**: Points for fastest lap
- **Overtake Bonus**: Points for positions gained/lost

### Sprint Points (Sprint weekends only)
- **Sprint Position**: Based on sprint finishing position
- **Sprint Qualifying**: Based on sprint qualifying position
- **Sprint Fastest Lap**: Points for sprint fastest lap
- **Sprint Overtake Bonus**: Points for sprint positions gained/lost

## 🛠️ Technical Details

### Dependencies
- **Playwright**: Browser automation for web scraping
- **Node.js fs/promises**: File system operations
- **Path**: File path handling

### Architecture
1. **Main Controller**: Orchestrates the scraping process
2. **Data Extraction**: Handles popup navigation and data parsing
3. **Team Swap Logic**: Merges multiple driver versions
4. **File Generation**: Creates JSON outputs with proper formatting

### Error Handling
- Cookie consent automation
- Popup management with fallback escape keys
- Element waiting with timeouts
- Graceful error recovery between drivers

## 🏁 Race Coverage

The scraper dynamically determines race order from the website and typically covers:

- **15 Regular Races**: Full season calendar
- **6 Sprint Weekends**: Races with both sprint and main sessions
- **All Sessions**: Qualifying, race, sprint qualifying, sprint race

### 2025 Season Races Covered
1. Australia
2. China (Sprint)
3. Japan
4. Bahrain
5. Saudi Arabia
6. United States (Sprint)
7. Italy
8. Monaco
9. Spain
10. Canada
11. Austria (Sprint)
12. United Kingdom
13. Belgium (Sprint)
14. Hungary
15. Netherlands

## 📊 Analysis Use Cases

The extracted data enables various analyses:

### Driver Performance
- Points progression over the season
- Race vs qualifying performance comparison
- Consistency analysis (standard deviation of points)

### Team Analysis  
- Team total points and driver comparisons
- Team development through the season
- Cost vs performance analysis

### Fantasy Strategy
- Percentage picked trends
- Value for money calculations (points per cost)
- Popular vs contrarian pick identification

### Team Swap Impact
- Before/after team switch performance
- Team environment effects on driver performance

## 🚨 Important Notes

### Ethical Usage
- This scraper is for personal analysis only
- Respect the F1 Fantasy website's terms of service
- Don't overload their servers with rapid requests
- Use reasonable delays between requests

### Browser Requirements
- Chromium-based browser (installed automatically by Playwright)
- JavaScript enabled
- Stable internet connection

### Data Accuracy
- Data reflects the state at the time of scraping
- Fantasy points may change if official results are updated
- Team swap detection is based on current season patterns

## 🔄 Updates and Maintenance

### Updating Team Swap Drivers
If new team swaps occur, update the `TEAM_SWAP_DRIVERS` object:

```javascript
const TEAM_SWAP_DRIVERS = {
    'yukitsunodadriver': {
        name: 'Yuki Tsunoda',
        abbreviation: 'TSU'
    },
    'liamlawsondriver': {
        name: 'Liam Lawson', 
        abbreviation: 'LAW'
    }
    // Add new team swap drivers here
};
```

### Adding New Drivers
Update the `DRIVER_ABBREVIATIONS` mapping for new drivers:

```javascript
const DRIVER_ABBREVIATIONS = {
    // ... existing drivers
    'newdriverdriver': 'NEW'
};
```

## 📝 Version History

### v3.1 (Current)
- ✅ **Versioned Export**: Data exports to folders named after most recent race (e.g., `15-Netherlands/`)
- ✅ Individual files named as `{ABBREVIATION}.json`
- ✅ Percentage picked data extraction
- ✅ Proper team information from main driver list
- ✅ Team swap logic with actual team names
- ✅ Comprehensive summary files including popularity ranking
- ✅ Enhanced error handling and logging
- ✅ Removed duplicate `cost` field - now only uses `value`

### v3.0
- ✅ Team swap driver handling (Tsunoda, Lawson)
- ✅ Comprehensive race and sprint data extraction
- ✅ Dynamic race order detection
- ✅ Multiple summary file generation

### v2.0
- ✅ Enhanced data extraction with session breakdowns
- ✅ Duplicate driver prevention
- ✅ Improved popup handling

### v1.0
- ✅ Basic driver data extraction
- ✅ Race points collection
- ✅ JSON file generation

## 🤝 Contributing

This scraper was developed to solve the specific challenge of team swap drivers in F1 Fantasy data collection. If you encounter issues or have suggestions for improvements, please ensure any changes maintain the robust team swap handling and data accuracy.

## 📜 License

This tool is provided for educational and personal analysis purposes. Please respect the Formula 1 Fantasy website's terms of service and use responsibly.

---

**Happy F1 Fantasy analysis! 🏎️📊**