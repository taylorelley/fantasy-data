const fs = require("fs").promises;

const summaryData = new Map();
const constructorSummaryData = new Map();

function getSortedRoundKeys(data) {
  return Object.keys(data).sort((a, b) => Number(a) - Number(b));
}

async function fixWeekendSummaryOrdering(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);
    const sortedData = {};
    for (const round of getSortedRoundKeys(data)) {
      sortedData[round] = data[round];
    }
    await fs.writeFile(filePath, JSON.stringify(sortedData, null, 2));
    console.log("✅ Driver weekend summary file ordering fixed");
  } catch (error) {
    console.error(
      "❌ Error fixing driver weekend summary ordering:",
      error.message,
    );
  }
}

async function fixConstructorWeekendSummaryOrdering(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);
    console.log("🔧 Keys in original file:", Object.keys(data).slice(0, 10));
    const sortedData = {};
    for (const round of getSortedRoundKeys(data)) {
      sortedData[round] = data[round];
    }
    console.log(
      "🔧 Keys in sorted data:",
      Object.keys(sortedData).slice(0, 10),
    );
    await fs.writeFile(filePath, JSON.stringify(sortedData, null, 2));
    console.log("✅ Constructor weekend summary file ordering fixed");
  } catch (error) {
    console.error(
      "❌ Error fixing constructor weekend summary ordering:",
      error.message,
    );
  }
}

function updateSummaryData(driverData) {
  for (const race of driverData.races) {
    if (!summaryData.has(race.round)) {
      summaryData.set(race.round, {
        round: race.round,
        raceName: race.raceName,
        drivers: new Map(),
      });
    }
    const raceData = summaryData.get(race.round);
    raceData.drivers.set(driverData.abbreviation, race.totalPoints);
  }
}

function updateConstructorSummaryData(constructorData) {
  for (const race of constructorData.races) {
    if (!constructorSummaryData.has(race.round)) {
      constructorSummaryData.set(race.round, {
        round: race.round,
        raceName: race.raceName,
        constructors: new Map(),
      });
    }
    const raceData = constructorSummaryData.get(race.round);
    raceData.constructors.set(constructorData.abbreviation, race.totalPoints);
  }
}

module.exports = {
  getSortedRoundKeys,
  fixWeekendSummaryOrdering,
  fixConstructorWeekendSummaryOrdering,
  updateSummaryData,
  updateConstructorSummaryData,
  summaryData,
  constructorSummaryData,
};
