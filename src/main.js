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
  RACE_ORDER_MAP,
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

async function saveResults() {
  console.log("\n💾 Saving results...");

  const mostRecentRace = getMostRecentRace();
  const versionFolder = `${mostRecentRace.round}-${mostRecentRace.raceName}`;
  const latestFolder = "latest";

  const versionedOutputDir = path.join(versionFolder, "driver_data");
  const versionedConstructorDir = path.join(versionFolder, "constructor_data");
  const versionedSummaryDir = path.join(versionFolder, "summary_data");

  const latestOutputDir = path.join(latestFolder, "driver_data");
  const latestConstructorDir = path.join(latestFolder, "constructor_data");
  const latestSummaryDir = path.join(latestFolder, "summary_data");

  console.log(`📁 Exporting to versioned folder: ${versionFolder}/`);
  console.log(`📁 Exporting to latest folder: ${latestFolder}/`);

  try {
    await fs.rm(versionFolder, { recursive: true, force: true });
    await fs.rm(latestFolder, { recursive: true, force: true });
  } catch (e) {}

  await fs.mkdir(versionedOutputDir, { recursive: true });
  await fs.mkdir(versionedConstructorDir, { recursive: true });
  await fs.mkdir(versionedSummaryDir, { recursive: true });

  await fs.mkdir(latestOutputDir, { recursive: true });
  await fs.mkdir(latestConstructorDir, { recursive: true });
  await fs.mkdir(latestSummaryDir, { recursive: true });

  for (const [driverId, driverData] of driverBreakdowns) {
    const filename = `${driverData.abbreviation}.json`;
    const versionedFilepath = path.join(versionedOutputDir, filename);
    const latestFilepath = path.join(latestOutputDir, filename);

    const jsonData = JSON.stringify(driverData, null, 2);
    await fs.writeFile(versionedFilepath, jsonData);
    await fs.writeFile(latestFilepath, jsonData);

    const swapIndicator = driverData.teamSwap ? " [TEAM SWAP]" : "";
    console.log(
      `✅ Saved: ${filename} (${driverData.races.length} races, ${driverData.percentagePicked}% picked)${swapIndicator}`,
    );
  }

  for (const [constructorId, constructorData] of constructorBreakdowns) {
    const filename = `${constructorData.abbreviation}.json`;
    const versionedFilepath = path.join(versionedConstructorDir, filename);
    const latestFilepath = path.join(latestConstructorDir, filename);

    const jsonData = JSON.stringify(constructorData, null, 2);
    await fs.writeFile(versionedFilepath, jsonData);
    await fs.writeFile(latestFilepath, jsonData);

    console.log(
      `✅ Saved constructor: ${filename} (${constructorData.races.length} races, ${constructorData.percentagePicked}% picked)`,
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
};
