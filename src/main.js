const { chromium } = require("playwright");
const fs = require("fs").promises;
const path = require("path");
const { CONFIG } = require("./config");
const {
  extractDriverListData,
  establishRaceOrder,
  processAllDrivers,
  mergeTeamSwapDrivers,
  driverBreakdowns,
} = require("./drivers");
const {
  extractConstructorListData,
  processAllConstructors,
  constructorBreakdowns,
} = require("./constructors");
const {
  summaryData,
  constructorSummaryData,
  fixWeekendSummaryOrdering,
  fixConstructorWeekendSummaryOrdering,
  getSortedRoundKeys,
} = require("./summary");

async function main() {
  const browser = await chromium.launch({ headless: CONFIG.BROWSER_HEADLESS });
  const page = await browser.newPage();

  try {
    console.log("🏁 F1 Fantasy Complete Data Scraper v3.1 Starting...");

    console.log(`📊 Target: ${CONFIG.DRIVER_URL}`);
    await page.goto(CONFIG.DRIVER_URL, { waitUntil: "load" });
    await page.waitForTimeout(CONFIG.DELAYS.PAGE_LOAD);

    const driverElements = await extractDriverListData(page);
    const raceOrderDriverIndex = await establishRaceOrder(page, driverElements);
    await processAllDrivers(page, driverElements, raceOrderDriverIndex);
    await mergeTeamSwapDrivers();

    console.log(`📊 Target: ${CONFIG.CONSTRUCTOR_URL}`);
    await page.goto(CONFIG.CONSTRUCTOR_URL, { waitUntil: "load" });
    await page.waitForTimeout(CONFIG.DELAYS.PAGE_LOAD);

    const constructorElements = await extractConstructorListData(page);
    await processAllConstructors(page, constructorElements);

    await saveResults();
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
  } finally {
    await browser.close();
  }
}

function getMostRecentRace() {
  let maxRound = 0;
  let mostRecentRace = { round: "0", raceName: "Unknown" };

  for (const driver of driverBreakdowns.values()) {
    for (const race of driver.races) {
      const roundNum = parseInt(race.round);
      if (roundNum > maxRound) {
        maxRound = roundNum;
        mostRecentRace = race;
      }
    }
  }

  return mostRecentRace;
}

function organizeRaceData(driverMap, constructorMap) {
  const raceMap = new Map();

  for (const [, driver] of driverMap) {
    for (const race of driver.races) {
      if (!raceMap.has(race.round)) {
        raceMap.set(race.round, {
          round: race.round,
          raceName: race.raceName,
          drivers: {},
          constructors: {},
        });
      }
      raceMap.get(race.round).drivers[driver.abbreviation] = {
        abbreviation: driver.abbreviation,
        name: driver.displayName,
        team: driver.team,
        value: driver.value,
        percentagePicked: driver.percentagePicked,
        position: driver.position,
        ...race,
      };
    }
  }

  for (const [, constructor] of constructorMap) {
    for (const race of constructor.races) {
      if (!raceMap.has(race.round)) {
        raceMap.set(race.round, {
          round: race.round,
          raceName: race.raceName,
          drivers: {},
          constructors: {},
        });
      }
      raceMap.get(race.round).constructors[constructor.abbreviation] = {
        abbreviation: constructor.abbreviation,
        name: constructor.name,
        percentagePicked: constructor.percentagePicked,
        position: constructor.position,
        ...race,
      };
    }
  }

  const sorted = {};
  for (const round of Array.from(raceMap.keys()).sort(
    (a, b) => Number(a) - Number(b),
  )) {
    sorted[round] = raceMap.get(round);
  }
  return sorted;
}

async function saveResults() {
  console.log("\n💾 Saving results...");

  const mostRecentRace = getMostRecentRace();
  const versionFolder = `${mostRecentRace.round}-${mostRecentRace.raceName}`;
  const latestFolder = "latest";

  const versionedRaceDir = path.join(versionFolder, "race_data");
  const versionedSummaryDir = path.join(versionFolder, "summary_data");

  const latestRaceDir = path.join(latestFolder, "race_data");
  const latestSummaryDir = path.join(latestFolder, "summary_data");

  console.log(`📁 Exporting to versioned folder: ${versionFolder}/`);
  console.log(`📁 Exporting to latest folder: ${latestFolder}/`);

  try {
    await fs.rm(versionFolder, { recursive: true, force: true });
    await fs.rm(latestFolder, { recursive: true, force: true });
  } catch (e) {
    console.error("⚠️ Error removing output directories:", e.message);
  }

  await fs.mkdir(versionedRaceDir, { recursive: true });
  await fs.mkdir(versionedSummaryDir, { recursive: true });

  await fs.mkdir(latestRaceDir, { recursive: true });
  await fs.mkdir(latestSummaryDir, { recursive: true });

  const raceData = organizeRaceData(driverBreakdowns, constructorBreakdowns);
  for (const [round, data] of Object.entries(raceData)) {
    const safeName = data.raceName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    const filename = `${round}-${safeName}.json`;
    const versionedFile = path.join(versionedRaceDir, filename);
    const latestFile = path.join(latestRaceDir, filename);
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(versionedFile, jsonData);
    await fs.writeFile(latestFile, jsonData);
    console.log(
      `✅ Saved race: ${filename} (${Object.keys(data.drivers).length} drivers, ${Object.keys(data.constructors).length} constructors)`,
    );
  }

  const weekendSummary = {};

  for (const [round, raceData] of summaryData) {
    weekendSummary[round] = {
      raceName: raceData.raceName,
      drivers: Object.fromEntries(raceData.drivers),
    };
  }

  const sortedSummary = {};
  for (const round of getSortedRoundKeys(weekendSummary)) {
    sortedSummary[round] = weekendSummary[round];
  }

  const weekendSummaryJson = JSON.stringify(sortedSummary, null, 2);
  await fs.writeFile(
    path.join(versionedSummaryDir, "weekend_summary.json"),
    weekendSummaryJson,
  );
  await fs.writeFile(
    path.join(latestSummaryDir, "weekend_summary.json"),
    weekendSummaryJson,
  );

  console.log("✅ Weekend summary saved: weekend_summary.json");

  console.log("🔧 Second pass: Fixing driver weekend summary file ordering...");
  await fixWeekendSummaryOrdering(
    path.join(versionedSummaryDir, "weekend_summary.json"),
  );
  await fixWeekendSummaryOrdering(
    path.join(latestSummaryDir, "weekend_summary.json"),
  );

  const constructorWeekendSummary = {};

  for (const [round, raceData] of constructorSummaryData) {
    constructorWeekendSummary[round] = {
      raceName: raceData.raceName,
      constructors: Object.fromEntries(raceData.constructors),
    };
  }

  const sortedConstructorSummary = {};
  for (const round of getSortedRoundKeys(constructorWeekendSummary)) {
    sortedConstructorSummary[round] = constructorWeekendSummary[round];
  }

  const constructorWeekendSummaryJson = JSON.stringify(
    sortedConstructorSummary,
    null,
    2,
  );
  await fs.writeFile(
    path.join(versionedSummaryDir, "constructor_weekend_summary.json"),
    constructorWeekendSummaryJson,
  );
  await fs.writeFile(
    path.join(latestSummaryDir, "constructor_weekend_summary.json"),
    constructorWeekendSummaryJson,
  );

  console.log(
    "✅ Constructor weekend summary saved: constructor_weekend_summary.json",
  );

  console.log(
    "🔧 Second pass: Fixing constructor weekend summary file ordering...",
  );
  await fixConstructorWeekendSummaryOrdering(
    path.join(versionedSummaryDir, "constructor_weekend_summary.json"),
  );
  await fixConstructorWeekendSummaryOrdering(
    path.join(latestSummaryDir, "constructor_weekend_summary.json"),
  );

  const detailedSummary = {
    totalDrivers: driverBreakdowns.size,
    totalConstructors: constructorBreakdowns.size,
    teamSwapDrivers: Array.from(driverBreakdowns.values()).filter(
      (d) => d.teamSwap,
    ).length,
    totalRaces: Array.from(driverBreakdowns.values()).reduce(
      (sum, d) => sum + d.races.length,
      0,
    ),
    averageDriverPoints:
      driverBreakdowns.size > 0
        ? Math.round(
            Array.from(driverBreakdowns.values()).reduce(
              (sum, d) => sum + d.seasonTotalPoints,
              0,
            ) / driverBreakdowns.size,
          )
        : 0,
    averageConstructorPoints:
      constructorBreakdowns.size > 0
        ? Math.round(
            Array.from(constructorBreakdowns.values()).reduce(
              (sum, c) => sum + c.seasonTotalPoints,
              0,
            ) / constructorBreakdowns.size,
          )
        : 0,
    drivers: Array.from(driverBreakdowns.values())
      .map((d) => ({
        abbreviation: d.abbreviation,
        name: d.displayName,
        team: d.team,
        points: d.seasonTotalPoints,
        value: d.value,
        percentagePicked: d.percentagePicked,
        position: d.position,
      }))
      .sort((a, b) => a.position - b.position),
    constructors: Array.from(constructorBreakdowns.values())
      .map((c) => ({
        abbreviation: c.abbreviation,
        name: c.name,
        points: c.seasonTotalPoints,
        percentagePicked: c.percentagePicked,
        position: c.position,
      }))
      .sort((a, b) => a.position - b.position),
  };

  const detailedSummaryJson = JSON.stringify(detailedSummary, null, 2);
  await fs.writeFile(
    path.join(versionedSummaryDir, "extraction_summary.json"),
    detailedSummaryJson,
  );
  await fs.writeFile(
    path.join(latestSummaryDir, "extraction_summary.json"),
    detailedSummaryJson,
  );

  console.log("✅ Extraction summary saved: extraction_summary.json");

  const teamSummary = {};
  Array.from(driverBreakdowns.values()).forEach((driver) => {
    if (!teamSummary[driver.team]) {
      teamSummary[driver.team] = {
        drivers: [],
        totalPoints: 0,
        averagePercentagePicked: 0,
      };
    }

    teamSummary[driver.team].drivers.push({
      abbreviation: driver.abbreviation,
      name: driver.displayName,
      points: driver.seasonTotalPoints,
      percentagePicked: driver.percentagePicked,
      value: driver.value,
      position: driver.position,
    });

    teamSummary[driver.team].totalPoints += driver.seasonTotalPoints;
  });

  Object.keys(teamSummary).forEach((team) => {
    const teamData = teamSummary[team];
    teamData.averagePercentagePicked = Math.round(
      teamData.drivers.reduce((sum, d) => sum + d.percentagePicked, 0) /
        teamData.drivers.length,
    );
    teamData.drivers.sort((a, b) => a.position - b.position);
  });

  const teamSummaryJson = JSON.stringify(teamSummary, null, 2);
  await fs.writeFile(
    path.join(versionedSummaryDir, "team_summary.json"),
    teamSummaryJson,
  );
  await fs.writeFile(
    path.join(latestSummaryDir, "team_summary.json"),
    teamSummaryJson,
  );

  console.log("✅ Team summary saved: team_summary.json");

  const percentagePickedRanking = {};
  Array.from(driverBreakdowns.values())
    .sort((a, b) => b.percentagePicked - a.percentagePicked)
    .forEach((driver) => {
      percentagePickedRanking[driver.abbreviation] = driver.percentagePicked;
    });

  const percentagePickedJson = JSON.stringify(percentagePickedRanking, null, 2);
  await fs.writeFile(
    path.join(versionedSummaryDir, "percentage_picked_ranking.json"),
    percentagePickedJson,
  );
  await fs.writeFile(
    path.join(latestSummaryDir, "percentage_picked_ranking.json"),
    percentagePickedJson,
  );

  console.log(
    "✅ Percentage picked ranking saved: percentage_picked_ranking.json",
  );

  const constructorPercentagePickedRanking = {};
  Array.from(constructorBreakdowns.values())
    .sort((a, b) => b.percentagePicked - a.percentagePicked)
    .forEach((constructor) => {
      constructorPercentagePickedRanking[constructor.abbreviation] =
        constructor.percentagePicked;
    });

  const constructorPercentagePickedJson = JSON.stringify(
    constructorPercentagePickedRanking,
    null,
    2,
  );
  await fs.writeFile(
    path.join(
      versionedSummaryDir,
      "constructor_percentage_picked_ranking.json",
    ),
    constructorPercentagePickedJson,
  );
  await fs.writeFile(
    path.join(latestSummaryDir, "constructor_percentage_picked_ranking.json"),
    constructorPercentagePickedJson,
  );

  console.log(
    "✅ Constructor percentage picked ranking saved: constructor_percentage_picked_ranking.json",
  );
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  main,
  fixWeekendSummaryOrdering,
  fixConstructorWeekendSummaryOrdering,
  getSortedRoundKeys,
  organizeRaceData,
};
