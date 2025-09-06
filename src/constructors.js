const { CONFIG, CONSTRUCTOR_ABBREVIATIONS } = require("./config");
const { updateConstructorSummaryData } = require("./summary");
const { closePopup, emergencyClosePopup } = require("./utils");
const { RACE_ORDER_MAP } = require("./drivers");

const constructorBreakdowns = new Map();
const processedConstructors = new Set();
const constructorListData = new Map();

async function extractConstructorListData(page) {
  console.log("🔍 Extracting constructor list data...");

  const constructorElements = await page.$$(
    'div[class*="si-stats__list-item"]',
  );
  const validConstructors = [];
  const constructorNames = [
    "MCLAREN",
    "RED BULL",
    "FERRARI",
    "MERCEDES",
    "ASTON MARTIN",
    "ALPINE",
    "HAAS",
    "WILLIAMS",
    "KICK SAUBER",
    "RB",
    "RACING BULLS",
  ];

  console.log(`📋 Analyzing ${constructorElements.length} list elements...`);

  // Parse constructor list data in groups of 3 (position, cost, points)
  for (let i = 0; i < constructorElements.length - 2; i += 3) {
    try {
      const positionText = await constructorElements[i].textContent();
      const costText = await constructorElements[i + 1].textContent();
      const pointsText = await constructorElements[i + 2].textContent();

      if (!positionText) continue;

      // Check if this is a constructor row
      const hasConstructorName = constructorNames.some((name) =>
        positionText.toUpperCase().includes(name),
      );
      const positionMatch = positionText.trim().match(/^(\d+)/);

      if (hasConstructorName && positionMatch) {
        const position = parseInt(positionMatch[1]);
        const constructorName = positionText.replace(/^\d+/, "").trim();

        const constructorInfo = {
          element: constructorElements[i],
          index: i,
          position: position,
          name: constructorName,
          cost: costText?.trim() || "0",
          points: parseInt(pointsText?.trim()) || 0,
          text: positionText.trim(),
        };

        validConstructors.push(constructorInfo);

        // Store in global map for later reference
        const cleanConstructorName = constructorName
          .toLowerCase()
          .replace(/[\s\-]/g, "");
        constructorListData.set(cleanConstructorName, constructorInfo);

        console.log(
          `   📍 [${position}] ${constructorName} | ${constructorInfo.cost} | ${constructorInfo.points} pts`,
        );
      }
    } catch (error) {
      // Skip this set of elements and continue
      continue;
    }
  }

  console.log(
    `📊 Extracted ${validConstructors.length} valid constructors from main list`,
  );
  return validConstructors;
}

/**
 * Process all constructors
 */
async function processAllConstructors(page, constructorElements) {
  console.log(`🏗️  Processing ${constructorElements.length} constructors...`);

  for (let i = 0; i < constructorElements.length; i++) {
    const constructorData = constructorElements[i];
    try {
      await processConstructor(page, constructorData, i);
      await page.waitForTimeout(CONFIG.DELAYS.BETWEEN_CONSTRUCTORS);
    } catch (error) {
      console.error(
        `❌ Error processing constructor ${i + 1}: ${error.message}`,
      );
      await emergencyClosePopup(page);
    }
  }
}

/**
 * Process individual constructor data extraction
 */
async function processConstructor(page, constructorData, index) {
  try {
    console.log(
      `\n🏗️  Processing constructor ${index + 1}/${constructorListData.size}...`,
    );
    console.log(
      `👆 Clicking: [${constructorData.position}] ${constructorData.name}`,
    );

    // Click constructor to open popup
    await constructorData.element.click();
    await page.waitForSelector(".si-popup__container", { timeout: 10000 });
    await page.waitForTimeout(CONFIG.DELAYS.POPUP_WAIT);

    // Extract comprehensive constructor data
    const extractedData = await extractConstructorDataEnhanced(
      page,
      constructorData,
    );

    if (extractedData && extractedData.constructorId) {
      const constructorId = extractedData.constructorId;

      // Check for duplicates
      if (processedConstructors.has(constructorId)) {
        console.log(
          `⚠️  DUPLICATE: ${constructorId} already processed, skipping...`,
        );
      } else {
        processedConstructors.add(constructorId);

        if (extractedData.races.length > 0) {
          constructorBreakdowns.set(constructorId, extractedData);
          updateConstructorSummaryData(extractedData);

          const totalRacePoints = extractedData.races.reduce(
            (sum, race) => sum + race.totalPoints,
            0,
          );
          console.log(
            `✅ SUCCESS: ${extractedData.name} (${extractedData.abbreviation})`,
          );
          console.log(
            `   📊 ${extractedData.races.length} races, ${totalRacePoints} total points, ${extractedData.percentagePicked}% picked`,
          );
        }
      }
    } else {
      console.log(
        `❌ No constructor data extracted for constructor ${index + 1}`,
      );
    }

    await closePopup(page);
  } catch (error) {
    console.error(
      `❌ Error processing constructor ${index + 1}: ${error.message}`,
    );
    await emergencyClosePopup(page);
  }
}

/**
 * Extract comprehensive constructor data including percentage picked
 */
async function extractConstructorDataEnhanced(page, listConstructorData) {
  const popup = await page.$(".si-popup__container");
  if (!popup) return null;

  // Extract basic info including percentage picked
  const basicInfo = await page.evaluate(() => {
    const popup = document.querySelector(".si-popup__container");
    if (!popup) return null;

    const fullText = popup.textContent || "";

    // Extract constructor name
    let constructorName = "unknown_constructor";
    const playerNameDiv = popup.querySelector(".si-player__name");
    if (playerNameDiv) {
      const playerText = playerNameDiv.textContent.trim();
      constructorName = playerText.toLowerCase().replace(/[\s\-]/g, "");
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
      : constructorName;

    return {
      constructorName: constructorName,
      displayName: displayName,
      constructorValue: valueMatch ? valueMatch[1] : "0",
      seasonTotalPoints: seasonPointsMatch ? parseInt(seasonPointsMatch[1]) : 0,
      percentagePicked: percentagePicked,
    };
  });

  if (!basicInfo || !basicInfo.constructorName) return null;

  const abbreviation =
    CONSTRUCTOR_ABBREVIATIONS[basicInfo.constructorName] ||
    listConstructorData.name.substring(0, 3).toUpperCase();

  console.log(
    `   🔍 Extracted: ${basicInfo.constructorName} -> ${abbreviation} - ${basicInfo.percentagePicked}% picked`,
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

      const sessionData = await extractConstructorSessionData(accordionItem);

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
    constructorId: basicInfo.constructorName.replace(/[^a-z0-9]/g, "_"),
    name: basicInfo.constructorName,
    displayName: basicInfo.displayName,
    abbreviation: abbreviation,
    position: listConstructorData.position,
    value: basicInfo.constructorValue,
    seasonTotalPoints: basicInfo.seasonTotalPoints,
    percentagePicked: basicInfo.percentagePicked,
    races: races,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extract constructor session data for races and sprints
 */
async function extractConstructorSessionData(raceElement) {
  const sessionData = {
    race: {
      position: 0,
      qualifyingPosition: 0,
      fastestLap: 0,
      pitStopBonus: 0,
      fastestPitStop: 0,
      worldRecordBonus: 0,
      disqualificationPenalty: 0,
      positionsGained: 0,
      positionsLost: 0,
      overtakes: 0,
    },
    qualifying: {
      q2Bonus: 0,
      q3Bonus: 0,
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
      disqualificationPenalty: 0,
      positionsGained: 0,
      positionsLost: 0,
      overtakes: 0,
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

          // Map events to structure - constructor specific events
          const eventLower = eventName?.toLowerCase() || "";

          // Race events
          if (
            eventLower.includes("race position") &&
            !eventLower.includes("gained") &&
            !eventLower.includes("lost")
          ) {
            sessionData.race.position = points;
          } else if (eventLower.includes("race fastest lap")) {
            sessionData.race.fastestLap = points;
          } else if (
            eventLower.includes("fastest pit stop") ||
            eventLower.includes("fastest pitstop")
          ) {
            sessionData.race.fastestPitStop = points;
          } else if (
            eventLower.includes("world record") ||
            eventLower.includes("pitstop world record")
          ) {
            sessionData.race.worldRecordBonus = points;
          } else if (
            eventLower.includes("pit stop") ||
            eventLower.includes("pitstop")
          ) {
            sessionData.race.pitStopBonus += points;
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
            sessionData.race.overtakes += points;
          } else if (
            eventLower.includes("race") &&
            eventLower.includes("disqualified")
          ) {
            sessionData.race.disqualificationPenalty += points;

            // Qualifying events
          } else if (
            eventLower.includes("qualifying") &&
            !eventLower.includes("position")
          ) {
            // Handle Q2/Q3 bonuses
            if (
              eventLower.includes("q2") ||
              eventLower.includes("reach q2") ||
              eventLower.includes("both drivers reach q2")
            ) {
              sessionData.qualifying.q2Bonus = points;
            } else if (
              eventLower.includes("q3") ||
              eventLower.includes("reach q3") ||
              eventLower.includes("both drivers reach q3")
            ) {
              sessionData.qualifying.q3Bonus = points;
            }
          } else if (
            eventLower.includes("qualifying position") ||
            (eventLower.includes("qualifying") &&
              eventLower.includes("position"))
          ) {
            sessionData.race.qualifyingPosition = points;
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
            if (sessionData.sprint) sessionData.sprint.overtakes += points;
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
    console.log(`⚠️  Error parsing constructor session data: ${error.message}`);
  }

  return sessionData;
}
module.exports = {
  extractConstructorListData,
  processAllConstructors,
  processConstructor,
  constructorBreakdowns,
  constructorListData,
  processedConstructors,
};
