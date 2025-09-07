const { CONFIG, CONSTRUCTOR_ABBREVIATIONS } = require("../config");
const { updateConstructorSummaryData } = require("../summary");
const { emergencyClosePopup } = require("../utils");
const { applyEvent } = require("../eventMapper");
const { CONSTRUCTOR_EVENT_MAP } = require("../eventMaps");

class ConstructorScraper {
  constructor(raceOrderMap) {
    this.RACE_ORDER_MAP = raceOrderMap;
    this.constructorBreakdowns = new Map();
    this.processedConstructors = new Set();
    this.constructorListData = new Map();
  }

  getBreakdowns() {
    return this.constructorBreakdowns;
  }

  async extractListData(page) {
    const constructorElements = await page.$$(
      'div[class*="si-stats__list-item"]',
    );
    const validConstructors = [];

    for (let i = 0; i < constructorElements.length - 2; i += 3) {
      try {
        const positionText = await constructorElements[i].textContent();
        const costText = await constructorElements[i + 1].textContent();
        const pointsText = await constructorElements[i + 2].textContent();
        if (!positionText) continue;
        const positionMatch = positionText.trim().match(/^(\d+)/);
        const costValid = /\d/.test(costText || "");
        const pointsValid = /\d/.test(pointsText || "");
        const namePart = positionText.replace(/^\d+/, "").trim();
        if (positionMatch && costValid && pointsValid && namePart) {
          const position = parseInt(positionMatch[1]);
          const constructorName = namePart;
          const info = {
            element: constructorElements[i],
            index: i,
            position,
            name: constructorName,
            cost: costText?.trim() || "0",
            points: parseInt(pointsText?.trim()) || 0,
            text: positionText.trim(),
          };
          validConstructors.push(info);
          const cleanName = constructorName.toLowerCase().replace(/[\s-]/g, "");
          this.constructorListData.set(cleanName, info);
        }
      } catch (err) {
        continue;
      }
    }
    return validConstructors;
  }

  async processAll(page, constructorElements) {
    for (let i = 0; i < constructorElements.length; i++) {
      const constructorData = constructorElements[i];
      try {
        await this.processConstructor(page, constructorData, i);
        await page.waitForTimeout(CONFIG.DELAYS.BETWEEN_CONSTRUCTORS);
      } catch (err) {
        console.error(
          `❌ Error processing constructor ${i + 1}: ${err.message}`,
        );
        await emergencyClosePopup(page);
      }
    }
    return this.constructorBreakdowns;
  }

  async processConstructor(page, constructorData, index) {
    const enhanced = await this.extractConstructorDataEnhanced(
      page,
      constructorData,
      index,
    );
    if (!enhanced) return;
    this.constructorBreakdowns.set(enhanced.constructorId, enhanced);
    this.processedConstructors.add(enhanced.constructorId);
    updateConstructorSummaryData(enhanced);
  }

  async extractConstructorDataEnhanced(page, constructorData, index) {
    try {
      await constructorData.element.click();
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
        const sessionData = await this.extractConstructorSessionData(item);
        races.push({ round, raceName, totalPoints, ...sessionData });
      }

      const constructorId = constructorData.name
        .toLowerCase()
        .replace(/[\s-]/g, "");
      const abbreviation =
        CONSTRUCTOR_ABBREVIATIONS[constructorId] ||
        constructorData.name.slice(0, 3).toUpperCase();
      const seasonTotalPoints = races.reduce(
        (sum, r) => sum + (r.totalPoints || 0),
        0,
      );
      const result = {
        constructorId,
        name: constructorData.name,
        abbreviation,
        position: constructorData.position,
        value: constructorData.cost,
        percentagePicked,
        races,
        seasonTotalPoints,
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
      console.log(`⚠️  Error extracting constructor data: ${error.message}`);
      try {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
      } catch (_) {
        /* ignore */
      }
      return null;
    }
  }

  async extractConstructorSessionData(raceElement) {
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
            if (eventName) {
              applyEvent(sessionData, eventName, points, CONSTRUCTOR_EVENT_MAP);
            }
          }
        }
      }
    } catch (error) {
      console.log(
        `⚠️  Error parsing constructor session data: ${error.message}`,
      );
    }
    return sessionData;
  }
}

module.exports = { ConstructorScraper };
