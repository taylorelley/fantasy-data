const { CONFIG, DRIVER_ABBREVIATIONS } = require("../config");
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
    await page.waitForSelector('[class*="si-stats__list"]');
    await this._scrollStatsToEnd(page);

    const rowSelector = '[class*="si-stats__row"]';
    const rows = await page.$$(rowSelector);
    const validDrivers = [];

    for (const [index, row] of rows.entries()) {
      try {
        const cells = await row.$$('div[class*="si-stats__list-item"]');
        if (cells.length < 4) continue;

        const positionText = await cells[0].textContent();
        const teamText = await cells[1].textContent();
        const costText = await cells[2].textContent();
        const pointsText = await cells[3].textContent();

        if (!positionText) continue;

        const positionMatch = positionText.trim().match(/^(\d+)/);
        const costValid = /\d/.test(costText || "");
        const pointsValid = /\d/.test(pointsText || "");
        const namePart = positionText.replace(/^\d+/, "").trim();

        if (positionMatch && costValid && pointsValid && namePart) {
          const position = parseInt(positionMatch[1]);
          const driverName = namePart;
          const driverInfo = {
            element: row,
            index,
            position,
            name: driverName,
            team: teamText?.trim() || "Unknown",
            cost: costText?.trim() || "0",
            points: parseInt(pointsText?.trim()) || 0,
            text: positionText.trim(),
          };
          validDrivers.push(driverInfo);
          const cleanDriverName =
            driverName.toLowerCase().replace(/[^a-z0-9]/gi, "") + "driver";
          this.driverListData.set(cleanDriverName, driverInfo);
        }
      } catch (_) {
        continue;
      }
    }
    return validDrivers;
  }

  async _scrollStatsToEnd(page) {
    const rowSelector = '[class*="si-stats__row"]';
    let lastCount = 0;
    for (let i = 0; i < 20; i++) {
      const rows = await page.$$(rowSelector);
      const count = rows.length;
      if (count <= lastCount) break;
      lastCount = count;
      await page.evaluate(() => {
        // eslint-disable-next-line no-undef
        window.scrollBy(0, window.innerHeight);
      });
      await page.waitForTimeout(200);
    }
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

  async extractDriverDataEnhanced(page, driverData, index) {
    try {
      await driverData.element.click();
      await page.waitForSelector(".si-popup__container", {
        timeout: CONFIG.DELAYS.POPUP_WAIT,
      });
      const popup = await page.$(".si-popup__container");
      if (!popup) return null;

      let percentagePicked = 0;
      const pctEl = await popup.$(".si-popup__percentage");
      if (pctEl) {
        const pctText = await pctEl.textContent();
        const match = pctText && pctText.match(/(\d+)/);
        if (match) percentagePicked = parseInt(match[1]);
      }

      const races = [];
      const accordionItems = await popup.$$(".si-accordion__box");
      for (const item of accordionItems) {
        const titleEl = await item.$(".si-league__card-title span");
        const raceName = (await titleEl?.textContent())?.trim();
        if (!raceName || raceName === "Season") continue;

        const totalEl = await item.$(".si-league__card-total, .si-value__box");
        const totalText = await totalEl?.textContent();
        const pointsMatch = totalText && totalText.match(/-?\d+/);
        const totalPoints = pointsMatch ? parseInt(pointsMatch[0]) : 0;

        const round = this.RACE_ORDER_MAP.get(raceName) || String(index + 1);
        const sessionData = await this.extractSessionDataEnhanced(item);
        races.push({ round, raceName, totalPoints, ...sessionData });
      }

      const driverId =
        driverData.name.toLowerCase().replace(/[^a-z0-9]/gi, "") + "driver";
      const abbreviation =
        DRIVER_ABBREVIATIONS[driverId] ||
        driverData.name.slice(0, 3).toUpperCase();
      const seasonTotalPoints = races.reduce(
        (sum, r) => sum + (r.totalPoints || 0),
        0,
      );
      const result = {
        driverId,
        abbreviation,
        displayName: driverData.name,
        team: driverData.team,
        value: driverData.cost,
        percentagePicked,
        position: driverData.position,
        races,
        seasonTotalPoints,
        teams: [driverData.team],
        extractedAt: new Date().toISOString(),
      };

      const closeBtn = await popup.$(
        'button.si-popup__close, button[aria-label*="close" i]',
      );
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);

      return result;
    } catch (error) {
      console.log(`⚠️  Error extracting driver data: ${error.message}`);
      try {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
      } catch (_) {
        /* ignore */
      }
      return null;
    }
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
      const rowSelectors = [
        "table.si-tbl tbody tr",
        '[role="row"]',
        '[class*="si-table__row"]',
      ].join(", ");
      const rows = await raceElement.$$(rowSelectors);
      for (const row of rows) {
        const cells = await row.$$(":scope > *");
        if (cells.length < 2) continue;
        const eventName = await cells[0].textContent();
        const pointsCell = cells[cells.length - 1];
        const pointsText = await pointsCell.textContent();
        const isNegative = await pointsCell.evaluate((cell) =>
          cell.classList.contains("si-negative"),
        );
        let points = 0;
        if (pointsText && pointsText.trim() !== "-") {
          const match = pointsText.match(/(-?)(\d+)/);
          if (match) {
            points = parseInt(match[2]);
            if (isNegative || match[1] === "-") {
              points = -Math.abs(points);
            }
          }
        }
        if (eventName) {
          applyEvent(sessionData, eventName, points, DRIVER_EVENT_MAP);
        }
      }
    } catch (error) {
      console.log(`⚠️  Error parsing session data: ${error.message}`);
    }
    return sessionData;
  }
}

module.exports = { DriverScraper };
