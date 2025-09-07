/* eslint-env jest */
/* global describe, test, expect, beforeEach */
const { DriverScraper } = require("../src/drivers");
const { ConstructorScraper } = require("../src/constructors");
const { summaryData, constructorSummaryData } = require("../src/summary");
const { CONFIG } = require("../src/config");
const {
  createDriverFixtures,
  createConstructorFixtures,
} = require("./fixtures/mockPages");

describe("end-to-end processing", () => {
  let driverScraper;
  let constructorScraper;
  let RACE_ORDER_MAP;

  beforeEach(() => {
    driverScraper = new DriverScraper();
    RACE_ORDER_MAP = driverScraper.getRaceOrderMap();
    constructorScraper = new ConstructorScraper(RACE_ORDER_MAP);
    summaryData.clear();
    constructorSummaryData.clear();
    RACE_ORDER_MAP.clear();

    CONFIG.DELAYS.POPUP_WAIT = 0;
    CONFIG.DELAYS.BETWEEN_DRIVERS = 0;
    CONFIG.DELAYS.BETWEEN_CONSTRUCTORS = 0;
    CONFIG.DELAYS.POPUP_CLOSE = 0;
  });

  test("processAllDrivers updates driver summaries", async () => {
    const { page, driverElements } = createDriverFixtures();

    driverScraper.extractDriverDataEnhanced = async (page, driverData) => {
      const races = [
        {
          round: "1",
          raceName: "Bahrain GP",
          totalPoints: driverData.name === "Max Verstappen" ? 25 : 18,
        },
        {
          round: "2",
          raceName: "Jeddah GP",
          totalPoints: driverData.name === "Max Verstappen" ? 26 : 15,
        },
      ];
      return {
        driverId: driverData.name.toLowerCase().replace(/\s+/g, "") + "driver",
        abbreviation: driverData.name === "Max Verstappen" ? "VER" : "HAM",
        name: driverData.name,
        team: driverData.team,
        races,
        seasonTotalPoints: races.reduce((sum, r) => sum + r.totalPoints, 0),
        teams: [driverData.team],
        percentagePicked: 0,
      };
    };

    RACE_ORDER_MAP.set("Bahrain GP", "1");
    RACE_ORDER_MAP.set("Jeddah GP", "2");

    await driverScraper.processAll(page, driverElements);
    const driverBreakdowns = driverScraper.getBreakdowns();
    expect(driverBreakdowns.size).toBe(2);
    const verstappen = driverBreakdowns.get("maxverstappendriver");
    expect(verstappen.races.map((r) => r.round)).toEqual(["1", "2"]);
    expect(summaryData.get("1").drivers.get("VER")).toBe(25);
    expect(summaryData.get("2").drivers.get("HAM")).toBe(15);
  });

  test("processAllConstructors respects race order map", async () => {
    const { page, constructorElements } = createConstructorFixtures();

    constructorScraper.extractConstructorDataEnhanced = async (
      page,
      constructorData,
    ) => {
      const isRedBull = constructorData.name === "Red Bull";
      const races = [
        { raceName: "Jeddah GP", totalPoints: isRedBull ? 44 : 30 },
        { raceName: "Bahrain GP", totalPoints: isRedBull ? 40 : 35 },
      ].map((r) => ({
        ...r,
        round: RACE_ORDER_MAP.get(r.raceName),
      }));
      races.sort((a, b) => parseInt(a.round) - parseInt(b.round));
      return {
        constructorId: constructorData.name.toLowerCase().replace(/\s+/g, ""),
        name: constructorData.name,
        abbreviation: isRedBull ? "RBR" : "MER",
        position: constructorData.position,
        value: constructorData.cost,
        seasonTotalPoints: races.reduce((sum, r) => sum + r.totalPoints, 0),
        percentagePicked: 0,
        races,
        extractedAt: new Date().toISOString(),
      };
    };

    RACE_ORDER_MAP.set("Bahrain GP", "1");
    RACE_ORDER_MAP.set("Jeddah GP", "2");

    await constructorScraper.processAll(page, constructorElements);
    const constructorBreakdowns = constructorScraper.getBreakdowns();
    expect(constructorBreakdowns.size).toBe(2);
    const redBull = constructorBreakdowns.get("redbull");
    expect(redBull.races.map((r) => r.round)).toEqual(["1", "2"]);
    expect(constructorSummaryData.has("1")).toBe(true);
    expect(constructorSummaryData.get("1").constructors.get("RBR")).toBe(40);
    expect(constructorSummaryData.get("2").constructors.get("MER")).toBe(30);
  });
});
