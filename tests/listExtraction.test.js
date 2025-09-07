/* eslint-env jest */
/* global describe, test, expect, beforeEach */
const { DriverScraper } = require("../src/drivers");
const { ConstructorScraper } = require("../src/constructors");

function createElement(text) {
  return {
    text,
    async textContent() {
      return this.text;
    },
  };
}

describe("list data extraction", () => {
  let driverScraper;
  let constructorScraper;

  beforeEach(() => {
    driverScraper = new DriverScraper();
    constructorScraper = new ConstructorScraper(new Map());
  });

  test("extractDriverListData detects driver rows based on structure", async () => {
    const elements = [
      createElement("1 Random Driver"),
      createElement("Some Team"),
      createElement("20.0"),
      createElement("100"),
      // invalid row missing cost
      createElement("2 Another Driver"),
      createElement("Other Team"),
      createElement(""),
      createElement("90"),
    ];
    const page = { $$: async () => elements };
    const drivers = await driverScraper.extractListData(page);
    expect(drivers).toHaveLength(1);
    expect(drivers[0].name).toBe("Random Driver");
  });

  test("extractConstructorListData detects constructor rows based on structure", async () => {
    const elements = [
      createElement("1 Unknown Team"),
      createElement("20.1"),
      createElement("200"),
      // invalid row missing points
      createElement("2 Another Team"),
      createElement("15.0"),
      createElement(""),
    ];
    const page = { $$: async () => elements };
    const constructors = await constructorScraper.extractListData(page);
    expect(constructors).toHaveLength(1);
    expect(constructors[0].name).toBe("Unknown Team");
  });
});
