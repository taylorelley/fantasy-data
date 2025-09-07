/* eslint-env jest */
/* global describe, test, expect, jest */
const { DriverScraper } = require("../src/drivers");
const { CONFIG } = require("../src/config");

describe("DriverScraper.establishRaceOrder", () => {
  test("falls back to Escape when close button is missing", async () => {
    const scraper = new DriverScraper();
    const driverElements = [{ element: { click: jest.fn() } }];

    const raceNameElement = {
      textContent: jest.fn().mockResolvedValue("Bahrain GP"),
    };
    const accordionItem = {
      $: jest.fn().mockResolvedValue(raceNameElement),
    };
    const popup = {
      $$: jest.fn().mockResolvedValue([accordionItem]),
      $: jest.fn().mockResolvedValue(null),
    };
    const page = {
      waitForSelector: jest.fn().mockResolvedValue(),
      $: jest.fn().mockResolvedValue(popup),
      waitForTimeout: jest.fn().mockResolvedValue(),
      keyboard: { press: jest.fn().mockResolvedValue() },
    };

    await scraper.establishRaceOrder(page, driverElements);
    expect(scraper.getRaceOrderMap().get("Bahrain GP")).toBe("1");
    expect(page.keyboard.press).toHaveBeenCalledWith("Escape");
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });
});
