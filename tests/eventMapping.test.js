/* eslint-env jest */
/* global describe, test, expect */
const { extractSessionDataEnhanced } = require("../src/drivers");
const { extractConstructorSessionData } = require("../src/constructors");

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

describe("event mapping", () => {
  test("driver events map to the correct session sections", async () => {
    const rows = [
      createRow("Race Fastest Lap", "5"),
      createRow("Sprint Fastest Lap", "2"),
      createRow("Unknown Event", "1"),
    ];
    const element = createRaceElement(rows, true);
    const data = await extractSessionDataEnhanced(element);
    expect(data.race.fastestLap).toBe(5);
    expect(data.sprint.fastestLap).toBe(2);
    expect(data.race.dotd).toBe(0);
  });

  test("constructor events use mapping table and ignore unknown", async () => {
    const rows = [
      createRow("Pit Stop", "1"),
      createRow("Pit Stop", "1"),
      createRow("Both drivers reach Q3", "3"),
      createRow("Random Unknown", "4"),
    ];
    const element = createRaceElement(rows);
    const data = await extractConstructorSessionData(element);
    expect(data.race.pitStopBonus).toBe(2);
    expect(data.qualifying.q3Bonus).toBe(3);
    expect(data.race.position).toBe(0);
  });
});
