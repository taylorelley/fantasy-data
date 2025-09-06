const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const {
  fixWeekendSummaryOrdering,
  fixConstructorWeekendSummaryOrdering,
  getSortedRoundKeys,
} = require("../src/summary");

describe("ordering utilities", () => {
  test("getSortedRoundKeys sorts numeric keys beyond 15", () => {
    const data = { 20: true, 2: true, 16: true, 1: true };
    expect(getSortedRoundKeys(data)).toEqual(["1", "2", "16", "20"]);
  });

  test("fixWeekendSummaryOrdering handles more than 15 races", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "weekend-"));
    const file = path.join(tempDir, "weekend.json");
    const data = {
      20: { raceName: "R20" },
      1: { raceName: "R1" },
      16: { raceName: "R16" },
      5: { raceName: "R5" },
    };
    await fs.writeFile(file, JSON.stringify(data));
    await fixWeekendSummaryOrdering(file);
    const sorted = JSON.parse(await fs.readFile(file, "utf8"));
    expect(Object.keys(sorted)).toEqual(["1", "5", "16", "20"]);
  });

  test("fixConstructorWeekendSummaryOrdering handles more than 15 races", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "constructor-"));
    const file = path.join(tempDir, "constructor.json");
    const data = {
      20: { raceName: "R20" },
      1: { raceName: "R1" },
      16: { raceName: "R16" },
      5: { raceName: "R5" },
    };
    await fs.writeFile(file, JSON.stringify(data));
    await fixConstructorWeekendSummaryOrdering(file);
    const sorted = JSON.parse(await fs.readFile(file, "utf8"));
    expect(Object.keys(sorted)).toEqual(["1", "5", "16", "20"]);
  });
});
