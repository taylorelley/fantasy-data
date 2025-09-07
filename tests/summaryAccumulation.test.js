/* eslint-env jest */
/* global describe, test, expect, beforeEach */
const {
  updateSummaryData,
  summaryData,
  updateConstructorSummaryData,
  constructorSummaryData,
} = require("../src/summary");

describe("summary data aggregation", () => {
  beforeEach(() => {
    summaryData.clear();
    constructorSummaryData.clear();
  });

  test("updateSummaryData aggregates driver race results", () => {
    const driver1 = {
      abbreviation: "HAM",
      races: [
        { round: "1", raceName: "Bahrain", totalPoints: 10 },
        { round: "2", raceName: "Saudi", totalPoints: 8 },
      ],
    };
    const driver2 = {
      abbreviation: "VER",
      races: [{ round: "1", raceName: "Bahrain", totalPoints: 25 }],
    };
    updateSummaryData(driver1);
    updateSummaryData(driver2);
    const race1 = summaryData.get("1");
    const race2 = summaryData.get("2");
    expect(race1.raceName).toBe("Bahrain");
    expect(race1.drivers.get("HAM")).toBe(10);
    expect(race1.drivers.get("VER")).toBe(25);
    expect(race2.drivers.get("HAM")).toBe(8);
  });

  test("updateConstructorSummaryData aggregates constructor race results", () => {
    const constructor1 = {
      abbreviation: "MER",
      races: [{ round: "1", raceName: "Bahrain", totalPoints: 35 }],
    };
    const constructor2 = {
      abbreviation: "RED",
      races: [
        { round: "1", raceName: "Bahrain", totalPoints: 40 },
        { round: "2", raceName: "Saudi", totalPoints: 44 },
      ],
    };
    updateConstructorSummaryData(constructor1);
    updateConstructorSummaryData(constructor2);
    const race1 = constructorSummaryData.get("1");
    const race2 = constructorSummaryData.get("2");
    expect(race1.raceName).toBe("Bahrain");
    expect(race1.constructors.get("MER")).toBe(35);
    expect(race1.constructors.get("RED")).toBe(40);
    expect(race2.constructors.get("RED")).toBe(44);
  });
});
