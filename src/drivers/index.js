const { CONFIG } = require("../config");
const { updateSummaryData } = require("../summary");
const { emergencyClosePopup } = require("../utils");
const { applyEvent } = require("../eventMapper");
const { DRIVER_EVENT_MAP } = require("../eventMaps");

class DriverScraper {
  constructor() {
    this.RACE_ORDER_MAP = new Map();
    this.driverBreakdowns = new Map();
    this.processedDrivers = new Set();
    this.teamSwapData = new Map();
    this.driverListData = new Map();
  }

  getRaceOrderMap() {
    return this.RACE_ORDER_MAP;
  }

  getBreakdowns() {
    return this.driverBreakdowns;
  }

  async extractListData(page) {
    const driverElements = await page.$$('div[class*="si-stats__list-item"]');
    const validDrivers = [];

    for (let i = 0; i < driverElements.length - 3; i += 4) {
      try {
        const positionText = await driverElements[i].textContent();
        const teamText = await driverElements[i + 1].textContent();
        const costText = await driverElements[i + 2].textContent();
        const pointsText = await driverElements[i + 3].textContent();

        if (!positionText) continue;

        const positionMatch = positionText.trim().match(/^(\d+)/);
        const costValid = /\d/.test(costText || "");
        const pointsValid = /\d/.test(pointsText || "");
        const namePart = positionText.replace(/^\d+/, "").trim();

        if (positionMatch && costValid && pointsValid && namePart) {
          const position = parseInt(positionMatch[1]);
          const driverName = namePart;
          const driverInfo = {
            element: driverElements[i],
            index: i,
            position,
            name: driverName,
            team: teamText?.trim() || "Unknown",
            cost: costText?.trim() || "0",
            points: parseInt(pointsText?.trim()) || 0,
            text: positionText.trim(),
          };
          validDrivers.push(driverInfo);
          const cleanDriverName =
            driverName.toLowerCase().replace(/\s+/g, "") + "driver";
          this.driverListData.set(cleanDriverName, driverInfo);
        }
      } catch (err) {
        continue;
      }
    }
    return validDrivers;
  }

  async establishRaceOrder(page, driverElements) {
    if (this.RACE_ORDER_MAP.size > 0) return;
    try {
      const driverData = driverElements[0];
      await driverData.element.click();
      await page.waitForSelector(".si-popup__container", { timeout: 10000 });
      const popup = await page.$(".si-popup__container");
      const accordionItems = await popup.$$(".si-accordion__box");
      let raceOrder = 1;
      for (const accordionItem of accordionItems) {
        const raceNameElement = await accordionItem.$(
          ".si-league__card-title span",
        );
        const raceName = await raceNameElement?.textContent();
        if (raceName && raceName.trim() !== "Season") {
          this.RACE_ORDER_MAP.set(raceName.trim(), String(raceOrder));
          raceOrder++;
        }
      }
      const closeBtn = await popup.$(
        'button.si-popup__close, button[aria-label*="close" i]',
      );
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
    } catch (err) {
      console.log(`⚠️  Unable to establish race order: ${err.message}`);
      try {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
      } catch (_) {
        /* ignore */
      }
    }
  }

  async processAll(page, driverElements) {
    await this.establishRaceOrder(page, driverElements);
    for (let i = 0; i < driverElements.length; i++) {
      const driverData = driverElements[i];
      try {
        await this.processDriver(page, driverData, i);
        await page.waitForTimeout(CONFIG.DELAYS.BETWEEN_DRIVERS);
      } catch (err) {
        console.error(`❌ Error processing driver ${i + 1}: ${err.message}`);
        await emergencyClosePopup(page);
      }
    }
    await this.mergeTeamSwapDrivers();
    return this.driverBreakdowns;
  }

  async processDriver(page, driverData, index) {
    const enhanced = await this.extractDriverDataEnhanced(
      page,
      driverData,
      index,
    );
    if (!enhanced) return;
    this.driverBreakdowns.set(enhanced.driverId, enhanced);
    this.processedDrivers.add(enhanced.driverId);
    updateSummaryData(enhanced);
  }

  async mergeTeamSwapDrivers() {
    // Simplified merge logic
    for (const [baseId, swapId] of Object.entries({})) {
      if (
        this.driverBreakdowns.has(baseId) &&
        this.driverBreakdowns.has(swapId)
      ) {
        const base = this.driverBreakdowns.get(baseId);
        const swap = this.driverBreakdowns.get(swapId);
        base.teams = Array.from(new Set([...base.teams, ...swap.teams]));
        base.races.push(...swap.races);
        base.races.sort((a, b) => a.round.localeCompare(b.round));
        this.driverBreakdowns.delete(swapId);
      }
    }
  }

  async extractDriverDataEnhanced() {
    throw new Error("extractDriverDataEnhanced not implemented");
  }

  async extractSessionDataEnhanced(raceElement) {
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
            if (eventName) {
              applyEvent(sessionData, eventName, points, DRIVER_EVENT_MAP);
            }
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Error parsing session data: ${error.message}`);
    }
    return sessionData;
  }
}

module.exports = { DriverScraper };
