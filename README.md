# F1 Fantasy Data Scraper

A Node.js tool that collects driver and constructor data from the official [Formula 1 Fantasy](https://fantasy.formula1.com/) site. The scraper uses [Playwright](https://playwright.dev/) to drive a Chromium browser, builds JSON files for every driver and constructor, and generates summary datasets for quick analysis.

## Features

- Gathers statistics for all drivers and constructors
- Detects race order automatically and merges team–swap drivers
- Produces versioned output along with a `latest/` snapshot
- Exports summary files including weekend results and popularity rankings

## Requirements

- Node.js 22 LTS
- npm (Playwright installs a Chromium browser automatically)

## Installation

```bash
npm install
```

## Usage

Run the scraper:

```bash
node src/main.js
```

The behaviour of the scraper (headless mode, delays, URLs) can be customised in [`src/config.js`](src/config.js).

### API server

An Express server can expose the generated JSON data:

```bash
npm start
```

By default it serves content from the `latest/` folder and listens on port `3000`. Environment variables can change these values:

```bash
PORT=4000 DATA_DIR=/path/to/data npm start
```

Endpoints:

- `GET /drivers` – list driver JSON objects
- `GET /constructors` – list constructor JSON objects
- `GET /summary` – combined summary JSON files

## Output

After a successful run the script writes data to a folder named after the most recent race and mirrors it into `latest/`:

```
{round}-{race}/
├── driver_data/
│   ├── NOR.json
│   └── ...
├── constructor_data/
│   ├── FER.json
│   └── ...
└── summary_data/
    ├── weekend_summary.json
    ├── constructor_weekend_summary.json
    ├── extraction_summary.json
    ├── team_summary.json
    ├── percentage_picked_ranking.json
    └── constructor_percentage_picked_ranking.json
latest/
  (mirrors the same structure)
```

Each driver or constructor file contains the abbreviation, display name, season totals and a race‑by‑race breakdown.

## Development

Formatting, linting and tests:

```bash
npm run format
npm run lint
npm test
```

### Debug logging

Verbose logging for some utilities can be toggled with a `DEBUG` flag. Set it to `true` to print additional output, for example:

```
DEBUG=true node src/main.js
```

This currently enables extra information from `fixConstructorWeekendSummaryOrdering`.

## Contributing

Please ensure changes include tests and pass `npm run lint` and `npm test` before submitting a pull request.
