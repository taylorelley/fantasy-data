/* eslint-env jest */
/* global describe, test, expect, jest */
const { DriverScraper } = require("../src/drivers");
const { ConstructorScraper } = require("../src/constructors");
const { applyEvent } = require("../src/eventMapper");
const { DRIVER_EVENT_MAP } = require("../src/eventMaps");

function createCell(text, negative = false) {
  return {
    async textContent() {
      return text;
    },
    async evaluate(fn) {
      return fn({
        classList: {
          contains: (cls) => negative && cls === "si-negative",
        },
      });
    },
  };
}

function createRow(eventName, points, negative = false) {
  const cells = [
    createCell(eventName),
    createCell(""),
    createCell(points, negative),
  ];
  return {
    async $$() {
      return cells;
    },
  };
}

function createRaceElement(rows, sprint = false) {
  const table = {
    async $$() {
      return rows;
    },
  };
  return {
    async $$(selector) {
      if (selector === "table.si-tbl") return [table];
      return [];
    },
    async $(selector) {
      if (selector === '.si-tabs__wrap button:has-text("Sprint")')
        return sprint ? {} : null;
      return null;
    },
  };
}

describe("applyEvent", () => {
  test("accumulates and assigns events based on map", () => {
    const sessionData = {
      race: { positionsGained: 0, fastestLap: 0 },
    };
    applyEvent(sessionData, "Race Positions Gained", 3, DRIVER_EVENT_MAP);
    applyEvent(sessionData, "Race Positions Gained", 2, DRIVER_EVENT_MAP);
    applyEvent(sessionData, "Race Fastest Lap", 5, DRIVER_EVENT_MAP);
    expect(sessionData.race.positionsGained).toBe(5);
    expect(sessionData.race.fastestLap).toBe(5);
  });

  test("ignores unknown events", () => {
    const sessionData = { race: { position: 0 } };
    applyEvent(sessionData, "Unknown Event", 4, DRIVER_EVENT_MAP);
    expect(sessionData.race.position).toBe(0);
  });

  test("logs unknown events", () => {
    const sessionData = { race: {} };
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    applyEvent(sessionData, "Mystery", 1, DRIVER_EVENT_MAP);

    expect(logSpy).toHaveBeenCalledWith("ℹ️ Unknown event: Mystery");

    logSpy.mockRestore();
  });
});

describe("event mapping", () => {
  test("driver events map to the correct session sections", async () => {
    const driverScraper = new DriverScraper();
    const rows = [
      createRow("Race Fastest Lap", "5"),
      createRow("Sprint Fastest Lap", "2"),
      createRow("Unknown Event", "1"),
    ];
    const element = createRaceElement(rows, true);
    const data = await driverScraper.extractSessionDataEnhanced(element);
    expect(data.race.fastestLap).toBe(5);
    expect(data.sprint.fastestLap).toBe(2);
    expect(data.race.dotd).toBe(0);
  });

  test("constructor events use mapping table and ignore unknown", async () => {
    const constructorScraper = new ConstructorScraper(new Map());
    const rows = [
      createRow("Pit Stop", "1"),
      createRow("Pit Stop", "1"),
      createRow("Both drivers reach Q3", "3"),
      createRow("Random Unknown", "4"),
    ];
    const element = createRaceElement(rows);
    const data =
      await constructorScraper.extractConstructorSessionData(element);
    expect(data.race.pitStopBonus).toBe(2);
    expect(data.qualifying.q3Bonus).toBe(3);
    expect(data.race.position).toBe(0);
  });
});
