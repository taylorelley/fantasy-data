const fs = require("fs").promises;

const summaryData = new Map();
const constructorSummaryData = new Map();

/**
 * Return the numeric-sorted round keys from a data object.
 *
 * @param {object} data Object keyed by round numbers
 * @returns {Array<string>} Sorted list of round keys
 */
function getSortedRoundKeys(data) {
  return Object.keys(data).sort((a, b) => Number(a) - Number(b));
}

/**
 * Ensure a driver weekend summary JSON file has its rounds in ascending order.
 *
 * @param {string} filePath Path to the summary JSON file
 * @returns {Promise<void>} Resolves when the file has been reordered
 */
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

/**
 * Ensure a constructor weekend summary JSON file has its rounds in ascending order.
 *
 * @param {string} filePath Path to the constructor summary JSON file
 * @returns {Promise<void>} Resolves when the file has been reordered
 */
async function fixConstructorWeekendSummaryOrdering(
  filePath,
  debug = process.env.DEBUG === "true",
) {
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const data = JSON.parse(fileContent);
    if (debug) {
      console.log("🔧 Keys in original file:", Object.keys(data).slice(0, 10));
    }
    const sortedData = {};
    for (const round of getSortedRoundKeys(data)) {
      sortedData[round] = data[round];
    }
    if (debug) {
      console.log(
        "🔧 Keys in sorted data:",
        Object.keys(sortedData).slice(0, 10),
      );
    }
    await fs.writeFile(filePath, JSON.stringify(sortedData, null, 2));
    console.log("✅ Constructor weekend summary file ordering fixed");
  } catch (error) {
    console.error(
      "❌ Error fixing constructor weekend summary ordering:",
      error.message,
    );
  }
}

/**
 * Update the driver summary map with data from a driver's race results.
 *
 * @param {object} driverData Driver data including race results
 * @returns {void}
 */
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

/**
 * Update the constructor summary map with race results for a constructor.
 *
 * @param {object} constructorData Constructor data including race results
 * @returns {void}
 */
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
