/* global document */
const { CONFIG, DRIVER_ABBREVIATIONS, TEAM_SWAP_DRIVERS } = require("./config");
const {
  updateSummaryData,
  summaryData,
  constructorSummaryData,
} = require("./summary");
const { closePopup, emergencyClosePopup } = require("./utils");

const RACE_ORDER_MAP = new Map();
const driverBreakdowns = new Map();
const processedDrivers = new Set();
const teamSwapData = new Map();
const driverListData = new Map();

/**
 * Extract comprehensive driver data from main list including teams, positions, costs
 */
async function extractDriverListData(page) {
  console.log("🔍 Extracting driver list data with teams...");

  const driverElements = await page.$$('div[class*="si-stats__list-item"]');
  const validDrivers = [];
  const driverSurnames = [
    "NORRIS",
    "PIASTRI",
    "VERSTAPPEN",
    "RUSSELL",
    "HAMILTON",
    "LECLERC",
    "SAINZ",
    "PEREZ",
    "ALONSO",
    "STROLL",
    "GASLY",
    "OCON",
    "HULKENBERG",
    "MAGNUSSEN",
    "BOTTAS",
    "ZHOU",
    "ALBON",
    "SARGEANT",
    "TSUNODA",
    "RICCIARDO",
    "ANTONELLI",
    "BEARMAN",
    "HADJAR",
    "BORTOLETO",
    "LAWSON",
    "COLAPINTO",
    "DOOHAN",
  ];

  console.log(`📋 Analyzing ${driverElements.length} list elements...`);

  // Parse driver list data in groups of 4 (position, team, cost, points)
  for (let i = 0; i < driverElements.length - 3; i += 4) {
    try {
      const positionText = await driverElements[i].textContent();
      const teamText = await driverElements[i + 1].textContent();
      const costText = await driverElements[i + 2].textContent();
      const pointsText = await driverElements[i + 3].textContent();

      if (!positionText) continue;

      // Check if this is a driver row
      const hasDriverName = driverSurnames.some((surname) =>
        positionText.includes(surname),
      );
      const positionMatch = positionText.trim().match(/^(\d+)/);

      if (hasDriverName && positionMatch) {
        const position = parseInt(positionMatch[1]);
        const driverName = positionText.replace(/^\d+/, "").trim();

        const driverInfo = {
          element: driverElements[i],
          index: i,
          position: position,
          name: driverName,
          team: teamText?.trim() || "Unknown",
          cost: costText?.trim() || "0",
          points: parseInt(pointsText?.trim()) || 0,
          text: positionText.trim(),
        };

        validDrivers.push(driverInfo);

        // Store in global map for later reference
        const cleanDriverName =
          driverName.toLowerCase().replace(/\s+/g, "") + "driver";
        driverListData.set(cleanDriverName, driverInfo);

        console.log(
          `   📍 [${position}] ${driverName} | ${driverInfo.team} | ${driverInfo.cost} | ${driverInfo.points} pts`,
        );
      }
    } catch (error) {
      // Skip this set of elements and continue
      continue;
    }
  }

  console.log(
    `📊 Extracted ${validDrivers.length} valid drivers from main list`,
  );
  return validDrivers;
}

/**
 * Establish race order from website to maintain correct chronological order
 */
async function establishRaceOrder(page, driverElements) {
  try {
    // Find the first clickable driver to establish race order
    for (let i = 0; i < Math.min(5, driverElements.length); i++) {
      try {
        const driverData = driverElements[i];
        console.log(`📅 Establishing race order from: ${driverData.name}...`);

        await driverData.element.click();
        await page.waitForSelector(".si-popup__container", { timeout: 10000 });
        await page.waitForTimeout(CONFIG.DELAYS.POPUP_WAIT);

        const popup = await page.$(".si-popup__container");
        const accordionItems = await popup.$$(".si-accordion__box");

        let raceOrder = 1;
        for (const accordionItem of accordionItems) {
          const raceNameElement = await accordionItem.$(
            ".si-league__card-title span",
          );
          const raceName = await raceNameElement?.textContent();

          if (raceName && raceName !== "Season") {
            const raceNameTrimmed = raceName.trim();
            const round = String(raceOrder);
            RACE_ORDER_MAP.set(raceNameTrimmed, round);
            console.log(`   📅 Round ${round}: ${raceNameTrimmed}`);
            raceOrder++;
          }
        }

        await closePopup(page);
        console.log(
          `✅ Race order established: ${RACE_ORDER_MAP.size} races found`,
        );

        // Pre-populate summary Maps with correct race order to ensure proper sorting
        console.log(`📋 Pre-populating summary data structures...`);

        // Create sorted list of race rounds in chronological order
        const sortedRaces = Array.from(RACE_ORDER_MAP.entries()).sort(
          ([, roundA], [, roundB]) => parseInt(roundA) - parseInt(roundB),
        );

        for (const [raceName, round] of sortedRaces) {
          // Pre-populate driver summary data
          if (!summaryData.has(round)) {
            summaryData.set(round, {
              round: round,
              raceName: raceName,
              drivers: new Map(),
            });
          }

          // Pre-populate constructor summary data
          if (!constructorSummaryData.has(round)) {
            constructorSummaryData.set(round, {
              round: round,
              raceName: raceName,
              constructors: new Map(),
            });
          }
        }
        console.log(
          `✅ Summary data structures pre-populated in correct order`,
        );

        // Mark this driver as race order established so we can skip processing it later
        driverData.usedForRaceOrder = true;

        return i; // Return the index of the driver used for race order
      } catch (error) {
        console.log(
          `   ⚠️  Failed to establish from ${driverElements[i]?.name || "driver"}, trying next...`,
        );
        await emergencyClosePopup(page);
        continue;
      }
    }

    throw new Error("Could not establish race order from any driver");
  } catch (error) {
    console.error(`❌ Error establishing race order: ${error.message}`);
    throw error;
  }
}

/**
 * Process all drivers including team swap handling
 */
async function processAllDrivers(
  page,
  driverElements,
  raceOrderDriverIndex = -1,
) {
  console.log(`🏎️  Processing ${driverElements.length} drivers...`);

  for (let i = 0; i < driverElements.length; i++) {
    const driverData = driverElements[i];

    try {
      // Process normally, but add note if this was the race order driver
      if (i === raceOrderDriverIndex) {
        console.log(
          `\n👤 Processing driver ${i + 1}/${driverElements.length} (race order driver)...`,
        );
      } else {
        console.log(
          `\n👤 Processing driver ${i + 1}/${driverElements.length}...`,
        );
      }

      await processDriver(page, driverData, i);
      await page.waitForTimeout(CONFIG.DELAYS.BETWEEN_DRIVERS);
    } catch (error) {
      console.error(`❌ Error processing driver ${i + 1}: ${error.message}`);
      await emergencyClosePopup(page);
    }
  }
}

/**
 * Process individual driver data extraction
 */
async function processDriver(page, driverData, index) {
  try {
    console.log(
      `👆 Clicking: [${driverData.position}] ${driverData.name} (${driverData.team})`,
    );

    // Click driver to open popup
    await driverData.element.click();
    await page.waitForSelector(".si-popup__container", { timeout: 10000 });
    await page.waitForTimeout(CONFIG.DELAYS.POPUP_WAIT);

    // Extract comprehensive driver data
    const extractedData = await extractDriverDataEnhanced(page, driverData);

    if (extractedData && extractedData.driverId) {
      const driverId = extractedData.driverId;

      // Check if this is a team swap driver
      if (TEAM_SWAP_DRIVERS[driverId]) {
        console.log(
          `🔄 Team swap driver detected: ${extractedData.name} (${extractedData.team})`,
        );

        // Store this version for later merging
        if (!teamSwapData.has(driverId)) {
          teamSwapData.set(driverId, []);
        }
        teamSwapData.get(driverId).push(extractedData);

        console.log(
          `✅ Stored version ${teamSwapData.get(driverId).length} for ${extractedData.name} with ${extractedData.team}`,
        );
      } else {
        // Regular driver processing
        if (processedDrivers.has(driverId)) {
          console.log(
            `⚠️  DUPLICATE: ${driverId} already processed, skipping...`,
          );
        } else {
          processedDrivers.add(driverId);

          if (extractedData.races.length > 0) {
            driverBreakdowns.set(driverId, extractedData);
            updateSummaryData(extractedData);

            const totalRacePoints = extractedData.races.reduce(
              (sum, race) => sum + race.totalPoints,
              0,
            );
            console.log(
              `✅ SUCCESS: ${extractedData.name} (${extractedData.abbreviation}) - ${extractedData.team}`,
            );
            console.log(
              `   📊 ${extractedData.races.length} races, ${totalRacePoints} total points, ${extractedData.percentagePicked}% picked`,
            );
          }
        }
      }
    } else {
      console.log(`❌ No driver data extracted for driver ${index + 1}`);
    }

    await closePopup(page);
  } catch (error) {
    console.error(`❌ Error processing driver ${index + 1}: ${error.message}`);
    await emergencyClosePopup(page);
  }
}

/**
 * Extract comprehensive driver data including percentage picked and team info
 */
async function extractDriverDataEnhanced(page, listDriverData) {
  const popup = await page.$(".si-popup__container");
  if (!popup) return null;

  // Extract basic info including percentage picked
  const basicInfo = await page.evaluate(() => {
    const popup = document.querySelector(".si-popup__container");
    if (!popup) return null;

    const fullText = popup.textContent || "";

    // Extract driver name
    let driverName = "unknown_driver";
    const playerNameDiv = popup.querySelector(".si-player__name");
    if (playerNameDiv) {
      const playerText = playerNameDiv.textContent.trim().toLowerCase();
      const cleanName = playerText.replace(/\s+/g, "") + "driver";
      if (cleanName.match(/^[a-z]+driver$/)) {
        driverName = cleanName;
      }
    }

    // Fallback name extraction
    if (driverName === "unknown_driver") {
      const cleanedText = fullText.replace(/^\s*Inactive\s*/i, "").trim();
      const nameMatch = cleanedText.match(/^([a-z]+driver)/i);
      if (nameMatch) {
        driverName = nameMatch[1].toLowerCase();
      }
    }

    // Extract value, season points, and percentage picked
    const valueMatch = fullText.match(/\$([0-9.]+M)/);
    const seasonPointsMatch = fullText.match(/Season Points\s+(\d+)\s+Pts/i);

    // Extract percentage picked with multiple fallback patterns
    let percentagePicked = 0;
    const percentagePatterns = [
      /Percentage Picked\s+(\d+)\s*%/i,
      /(\d+)\s*%/,
      /picked\s+(\d+)%/i,
    ];

    for (const pattern of percentagePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        percentagePicked = parseInt(match[1]);
        break;
      }
    }

    // Also try to find percentage in specific elements
    if (percentagePicked === 0) {
      const percentageElements = popup.querySelectorAll(
        ".si-driCon__list-stats span, .si-driCon__list-stats em",
      );
      for (const el of percentageElements) {
        const text = el.textContent || "";
        const match = text.match(/(\d+)\s*%/);
        if (match) {
          percentagePicked = parseInt(match[1]);
          break;
        }
      }
    }

    const displayName = playerNameDiv
      ? playerNameDiv.textContent.trim()
      : driverName;

    return {
      driverName: driverName,
      displayName: displayName,
      driverValue: valueMatch ? valueMatch[1] : "0",
      seasonTotalPoints: seasonPointsMatch ? parseInt(seasonPointsMatch[1]) : 0,
      percentagePicked: percentagePicked,
      isInactive: fullText.includes("Inactive"),
    };
  });

  if (!basicInfo || !basicInfo.driverName) return null;

  const abbreviation = DRIVER_ABBREVIATIONS[basicInfo.driverName] || "UNK";
  const teamInfo = listDriverData.team || "Unknown";

  console.log(
    `   🔍 Extracted: ${basicInfo.driverName} -> ${abbreviation} (${teamInfo}) - ${basicInfo.percentagePicked}% picked`,
  );

  // Extract race data
  const races = [];
  const accordionItems = await popup.$$(".si-accordion__box");

  for (const accordionItem of accordionItems) {
    try {
      const raceNameElement = await accordionItem.$(
        ".si-league__card-title span",
      );
      const raceName = await raceNameElement?.textContent();

      const totalElement = await accordionItem.$(".si-totalPts__counts em");
      const totalText = await totalElement?.textContent();
      const raceTotal = totalText ? parseInt(totalText) : 0;

      if (raceName === "Season" || !raceName) continue;

      const raceNameTrimmed = raceName.trim();
      const round = RACE_ORDER_MAP.get(raceNameTrimmed) || "0";

      const sessionData = await extractSessionDataEnhanced(accordionItem);

      races.push({
        round: round,
        raceName: raceName.trim(),
        totalPoints: raceTotal,
        ...sessionData,
      });
    } catch (error) {
      console.log(`⚠️  Error processing race: ${error.message}`);
    }
  }

  // Sort races by round number (numeric sort)
  races.sort((a, b) => parseInt(a.round) - parseInt(b.round));

  return {
    driverId: basicInfo.driverName.replace(/[^a-z0-9]/g, "_"),
    name: basicInfo.driverName,
    displayName: basicInfo.displayName,
    abbreviation: abbreviation,
    team: teamInfo,
    position: listDriverData.position,
    value: basicInfo.driverValue,
    seasonTotalPoints: basicInfo.seasonTotalPoints,
    percentagePicked: basicInfo.percentagePicked,
    isInactive: basicInfo.isInactive,
    races: races,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Merge data for drivers who switched teams mid-season
 */
async function mergeTeamSwapDrivers() {
  console.log(`\n🔄 Merging team swap drivers...`);

  for (const [driverId, versions] of teamSwapData) {
    if (versions.length < 2) {
      console.log(
        `⚠️  ${driverId}: Only ${versions.length} version found, adding as regular driver`,
      );
      if (versions.length === 1) {
        driverBreakdowns.set(driverId, versions[0]);
        updateSummaryData(versions[0]);
      }
      continue;
    }

    console.log(`🔄 Merging ${versions.length} versions of ${driverId}...`);

    // Sort versions by position to get the current/main one first
    versions.sort((a, b) => a.position - b.position);
    const mainVersion = versions[0];

    // Create merged driver data
    const mergedDriver = {
      driverId: driverId,
      name: mainVersion.name,
      displayName: mainVersion.displayName,
      abbreviation: mainVersion.abbreviation,
      team: mainVersion.team,
      position: mainVersion.position,
      value: mainVersion.value,
      percentagePicked: mainVersion.percentagePicked,
      teamSwap: true,
      teams: versions.map((v) => v.team).filter((team) => team !== "Unknown"),
      teamSwapDetails: versions.map((v) => ({
        team: v.team,
        position: v.position,
        value: v.value,
        points: v.seasonTotalPoints,
      })),
      seasonTotalPoints: versions.reduce(
        (sum, v) => sum + (v.seasonTotalPoints || 0),
        0,
      ),
      races: [],
      extractedAt: new Date().toISOString(),
      versions: versions.length,
    };

    // Collect all races from all versions
    const allRaces = new Map();

    for (const version of versions) {
      console.log(
        `   📊 Processing version: ${version.team} (${version.races.length} races, ${version.seasonTotalPoints} pts)`,
      );

      for (const race of version.races) {
        const raceKey = `${race.round}-${race.raceName}`;

        if (!allRaces.has(raceKey)) {
          allRaces.set(raceKey, {
            ...race,
            team: version.team,
            source: "single",
          });
        } else {
          // If conflicting data, prefer version with more points
          const existing = allRaces.get(raceKey);
          if (Math.abs(race.totalPoints) > Math.abs(existing.totalPoints)) {
            allRaces.set(raceKey, {
              ...race,
              team: version.team,
              source: "conflict-resolved",
              conflictWith: existing.team,
            });
            console.log(
              `   ⚡ Resolved conflict for ${race.raceName}: chose ${version.team} data (${race.totalPoints} pts) over ${existing.team} (${existing.totalPoints} pts)`,
            );
          }
        }
      }
    }

    // Sort races and add to merged driver
    mergedDriver.races = Array.from(allRaces.values()).sort((a, b) =>
      a.round.localeCompare(b.round),
    );

    console.log(`✅ Merged ${driverId}:`);
    console.log(
      `   🏆 Combined season points: ${mergedDriver.seasonTotalPoints}`,
    );
    console.log(`   🏁 Teams: ${mergedDriver.teams.join(" → ")}`);
    console.log(`   📊 Total races: ${mergedDriver.races.length}`);
    console.log(`   📈 Percentage picked: ${mergedDriver.percentagePicked}%`);

    // Add to main data structures
    driverBreakdowns.set(driverId, mergedDriver);
    updateSummaryData(mergedDriver);
  }
}

/**
 * Extract session data for races and sprints
 */
async function extractSessionDataEnhanced(raceElement) {
  const sessionData = {
    race: {
      dotd: 0,
      position: 0,
      qualifyingPosition: 0,
      fastestLap: 0,
      overtakeBonus: 0,
      positionsGained: 0,
      positionsLost: 0,
      disqualificationPenalty: 0,
    },
    qualifying: {
      position: 0,
      disqualificationPenalty: 0,
    },
  };

  // Check if this is a sprint weekend
  const hasSprintSession = await raceElement.$(
    '.si-tabs__wrap button:has-text("Sprint")',
  );
  if (hasSprintSession) {
    sessionData.sprint = {
      position: 0,
      qualifyingPosition: 0,
      fastestLap: 0,
      overtakeBonus: 0,
      positionsGained: 0,
      positionsLost: 0,
      disqualificationPenalty: 0,
    };
  }

  try {
    const tables = await raceElement.$$("table.si-tbl");

    for (const table of tables) {
      const rows = await table.$$("tbody tr");

      for (const row of rows) {
        const cells = await row.$$("td");
        if (cells.length >= 3) {
          const eventName = await cells[0].textContent();
          const pointsText = await cells[2].textContent();

          const isNegative = await cells[2].evaluate((cell) =>
            cell.classList.contains("si-negative"),
          );

          let points = 0;
          if (pointsText && pointsText.trim() !== "-") {
            const pointsMatch = pointsText.match(/(-?)(\d+)/);
            if (pointsMatch) {
              points = parseInt(pointsMatch[2]);
              if (isNegative || pointsMatch[1] === "-") {
                points = -Math.abs(points);
              }
            }
          }

          // Map events to structure
          const eventLower = eventName?.toLowerCase() || "";

          // Driver-specific events
          if (eventLower.includes("driver of the day")) {
            sessionData.race.dotd = points;
          } else if (
            eventLower.includes("race position") &&
            !eventLower.includes("gained") &&
            !eventLower.includes("lost")
          ) {
            sessionData.race.position = points;
          } else if (eventLower.includes("race fastest lap")) {
            sessionData.race.fastestLap = points;
          } else if (
            eventLower.includes("race positions gained") ||
            (eventLower.includes("race") &&
              eventLower.includes("positions gained"))
          ) {
            sessionData.race.positionsGained += points;
          } else if (
            eventLower.includes("race positions lost") ||
            (eventLower.includes("race") &&
              eventLower.includes("positions lost"))
          ) {
            sessionData.race.positionsLost += points;
          } else if (
            eventLower.includes("race overtake") ||
            (eventLower.includes("race") && eventLower.includes("overtake"))
          ) {
            sessionData.race.overtakeBonus += points;
          } else if (
            eventLower.includes("race") &&
            eventLower.includes("disqualified")
          ) {
            sessionData.race.disqualificationPenalty += points;

            // Qualifying events
          } else if (
            eventLower.includes("qualifying position") ||
            (eventLower.includes("qualifying") &&
              eventLower.includes("position"))
          ) {
            sessionData.qualifying.position = points;
          } else if (
            eventLower.includes("qualifying") &&
            eventLower.includes("disqualified")
          ) {
            sessionData.qualifying.disqualificationPenalty += points;

            // Sprint events
          } else if (
            eventLower.includes("sprint position") &&
            !eventLower.includes("gained") &&
            !eventLower.includes("lost")
          ) {
            if (sessionData.sprint) sessionData.sprint.position = points;
          } else if (eventLower.includes("sprint fastest lap")) {
            if (sessionData.sprint) sessionData.sprint.fastestLap = points;
          } else if (
            eventLower.includes("sprint positions gained") ||
            (eventLower.includes("sprint") &&
              eventLower.includes("positions gained"))
          ) {
            if (sessionData.sprint)
              sessionData.sprint.positionsGained += points;
          } else if (
            eventLower.includes("sprint positions lost") ||
            (eventLower.includes("sprint") &&
              eventLower.includes("positions lost"))
          ) {
            if (sessionData.sprint) sessionData.sprint.positionsLost += points;
          } else if (
            eventLower.includes("sprint overtake") ||
            (eventLower.includes("sprint") && eventLower.includes("overtake"))
          ) {
            if (sessionData.sprint) sessionData.sprint.overtakeBonus += points;
          } else if (
            eventLower.includes("sprint") &&
            eventLower.includes("disqualified")
          ) {
            if (sessionData.sprint)
              sessionData.sprint.disqualificationPenalty += points;
          }
        }
      }
    }
  } catch (error) {
    console.log(`⚠️  Error parsing session data: ${error.message}`);
  }

  return sessionData;
}
module.exports = {
  extractDriverListData,
  establishRaceOrder,
  processAllDrivers,
  processDriver,
  mergeTeamSwapDrivers,
  driverBreakdowns,
  teamSwapData,
  driverListData,
  RACE_ORDER_MAP,
};
