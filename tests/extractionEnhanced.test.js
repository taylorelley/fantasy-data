/* eslint-env jest */
/* global describe, test, expect, beforeAll, jest */
const { DriverScraper } = require("../src/drivers");
const { ConstructorScraper } = require("../src/constructors");
const { CONFIG } = require("../src/config");

function createDriverPageStub() {
  const closeBtn = { click: jest.fn().mockResolvedValue(null) };
  const raceElement = {
    $: jest.fn(async (selector) => {
      if (selector === ".si-league__card-title span") {
        return { textContent: async () => "Bahrain GP" };
      }
      if (selector === ".si-league__card-total, .si-value__box") {
        return { textContent: async () => "10" };
      }
      return null;
    }),
    $$: jest.fn().mockResolvedValue([]),
  };
  const popup = {
    $: jest.fn(async (selector) => {
      if (selector === ".si-popup__percentage") {
        return { textContent: async () => "75%" };
      }
      if (
        selector === 'button.si-popup__close, button[aria-label*="close" i]'
      ) {
        return closeBtn;
      }
      return null;
    }),
    $$: jest.fn(async (selector) => {
      if (selector === ".si-accordion__box") {
        return [raceElement];
      }
      return [];
    }),
  };
  const page = {
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(null),
    keyboard: { press: jest.fn().mockResolvedValue(null) },
    $: jest.fn(async (selector) => {
      if (selector === ".si-popup__container") {
        return popup;
      }
      return null;
    }),
  };
  return { page };
}

function createConstructorPageStub() {
  const closeBtn = { click: jest.fn().mockResolvedValue(null) };
  const raceElement = {
    $: jest.fn(async (selector) => {
      if (selector === ".si-league__card-title span") {
        return { textContent: async () => "Bahrain GP" };
      }
      if (selector === ".si-league__card-total, .si-value__box") {
        return { textContent: async () => "40" };
      }
      return null;
    }),
    $$: jest.fn().mockResolvedValue([]),
  };
  const popup = {
    $: jest.fn(async (selector) => {
      if (selector === ".si-popup__percentage") {
        return { textContent: async () => "80%" };
      }
      if (
        selector === 'button.si-popup__close, button[aria-label*="close" i]'
      ) {
        return closeBtn;
      }
      return null;
    }),
    $$: jest.fn(async (selector) => {
      if (selector === ".si-accordion__box") {
        return [raceElement];
      }
      return [];
    }),
  };
  const page = {
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(null),
    keyboard: { press: jest.fn().mockResolvedValue(null) },
    $: jest.fn(async (selector) => {
      if (selector === ".si-popup__container") {
        return popup;
      }
      return null;
    }),
  };
  return { page };
}

describe("enhanced data extraction", () => {
  beforeAll(() => {
    CONFIG.DELAYS.POPUP_CLOSE = 0;
    CONFIG.DELAYS.POPUP_WAIT = 0;
  });

  test("extractDriverDataEnhanced returns driver info with races", async () => {
    const scraper = new DriverScraper();
    const raceMap = scraper.getRaceOrderMap();
    raceMap.set("Bahrain GP", "1");
    const { page } = createDriverPageStub();
    const driverData = {
      element: { click: jest.fn().mockResolvedValue(null) },
      index: 0,
      position: 1,
      name: "Max Verstappen",
      team: "Red Bull",
      cost: "26.0",
      points: 0,
      text: "1 Max Verstappen",
    };
    const result = await scraper.extractDriverDataEnhanced(page, driverData, 0);
    expect(result.driverId).toBe("maxverstappendriver");
    expect(result.abbreviation).toBe("VER");
    expect(result.team).toBe("Red Bull");
    expect(result.races).toHaveLength(1);
    expect(result.races[0]).toMatchObject({
      round: "1",
      raceName: "Bahrain GP",
      totalPoints: 10,
    });
    expect(result.seasonTotalPoints).toBe(10);
    expect(result.percentagePicked).toBe(75);
  });

  test("extractConstructorDataEnhanced returns constructor info with races", async () => {
    const driverScraper = new DriverScraper();
    const raceMap = driverScraper.getRaceOrderMap();
    raceMap.set("Bahrain GP", "1");
    const scraper = new ConstructorScraper(raceMap);
    const { page } = createConstructorPageStub();
    const constructorData = {
      element: { click: jest.fn().mockResolvedValue(null) },
      index: 0,
      position: 1,
      name: "Red Bull",
      cost: "34.0",
      points: 0,
      text: "1 Red Bull",
    };
    const result = await scraper.extractConstructorDataEnhanced(
      page,
      constructorData,
      0,
    );
    expect(result.constructorId).toBe("redbull");
    expect(result.abbreviation).toBe("RBR");
    expect(result.races).toHaveLength(1);
    expect(result.races[0]).toMatchObject({
      round: "1",
      raceName: "Bahrain GP",
      totalPoints: 40,
    });
    expect(result.seasonTotalPoints).toBe(40);
    expect(result.percentagePicked).toBe(80);
  });
});
