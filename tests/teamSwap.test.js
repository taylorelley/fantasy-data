/* eslint-env jest */
/* global describe, test, expect, jest */
const { DriverScraper } = require("../src/drivers");
const { summaryData } = require("../src/summary");
const { CONFIG } = require("../src/config");

describe("team swap merging", () => {
  test("merges multiple versions of a driver", async () => {
    const scraper = new DriverScraper();
    summaryData.clear();
    CONFIG.DELAYS.POPUP_WAIT = 0;
    CONFIG.DELAYS.BETWEEN_DRIVERS = 0;
    CONFIG.DELAYS.POPUP_CLOSE = 0;

    const page = {
      waitForSelector: jest.fn().mockResolvedValue(null),
      waitForTimeout: jest.fn().mockResolvedValue(null),
      $: jest.fn().mockResolvedValue(null),
      keyboard: { press: jest.fn().mockResolvedValue(null) },
    };

    const driverElements = [
      {
        element: { click: jest.fn().mockResolvedValue(null) },
        index: 0,
        position: 1,
        name: "Yuki Tsunoda",
        team: "AlphaTauri",
        cost: "0",
        points: 0,
        text: "1 Yuki Tsunoda",
      },
      {
        element: { click: jest.fn().mockResolvedValue(null) },
        index: 1,
        position: 2,
        name: "Yuki Tsunoda",
        team: "RB",
        cost: "0",
        points: 0,
        text: "2 Yuki Tsunoda",
      },
    ];

    scraper.extractDriverDataEnhanced = async (page, driverData) => {
      const race =
        driverData.team === "AlphaTauri"
          ? { round: "1", raceName: "Bahrain", totalPoints: 10 }
          : { round: "2", raceName: "Jeddah", totalPoints: 12 };
      return {
        driverId: "yukitsunodadriver",
        abbreviation: "TSU",
        displayName: "Yuki Tsunoda",
        team: driverData.team,
        position: driverData.position,
        value: "0",
        percentagePicked: 0,
        races: [race],
        seasonTotalPoints: race.totalPoints,
        teams: [driverData.team],
      };
    };

    const raceOrderMap = scraper.getRaceOrderMap();
    raceOrderMap.set("Bahrain", "1");
    raceOrderMap.set("Jeddah", "2");

    await scraper.processAll(page, driverElements);

    const breakdowns = scraper.getBreakdowns();
    expect(breakdowns.size).toBe(1);
    const tsu = breakdowns.get("yukitsunodadriver");
    expect(tsu.teamSwap).toBe(true);
    expect(tsu.seasonTotalPoints).toBe(22);
    expect(tsu.races.map((r) => r.round)).toEqual(["1", "2"]);
    expect(tsu.teams.sort()).toEqual(["AlphaTauri", "RB"].sort());
    expect(summaryData.get("1").drivers.get("TSU")).toBe(10);
    expect(summaryData.get("2").drivers.get("TSU")).toBe(12);
  });
});
