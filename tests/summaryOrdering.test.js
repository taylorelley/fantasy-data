/* eslint-env jest */
/* global describe, test, expect, jest */
const fs = require("fs").promises;
const os = require("os");
const path = require("path");
const {
  getSortedRoundKeys,
  fixWeekendSummaryOrdering,
  fixConstructorWeekendSummaryOrdering,
} = require("../src/summary");

describe("summary ordering utilities", () => {
  test("getSortedRoundKeys sorts numeric keys", () => {
    const data = { 10: {}, 2: {}, 1: {} };
    expect(getSortedRoundKeys(data)).toEqual(["1", "2", "10"]);
  });

  test("fixWeekendSummaryOrdering sorts rounds in file", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "summary-"));
    const filePath = path.join(tmpDir, "driver.json");
    const unsortedJson = '{"10":{"a":1},"2":{"a":2},"1":{"a":3}}';
    await fs.writeFile(filePath, unsortedJson);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await fixWeekendSummaryOrdering(filePath);
    logSpy.mockRestore();

    const fixed = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(Object.keys(fixed)).toEqual(["1", "2", "10"]);
  });

  test("fixConstructorWeekendSummaryOrdering supports debug logging", async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "constructor-"));
    const filePath = path.join(tmpDir, "constructor.json");
    const unsortedJson = '{"3":{"b":1},"1":{"b":2}}';
    await fs.writeFile(filePath, unsortedJson);

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    await fixConstructorWeekendSummaryOrdering(filePath, true);
    logSpy.mockRestore();

    const fixed = JSON.parse(await fs.readFile(filePath, "utf8"));
    expect(Object.keys(fixed)).toEqual(["1", "3"]);
  });

  test("fixWeekendSummaryOrdering logs errors", async () => {
    const readSpy = jest
      .spyOn(fs, "readFile")
      .mockRejectedValue(new Error("fail"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await fixWeekendSummaryOrdering("bad-path.json");

    expect(errSpy).toHaveBeenCalledWith(
      "❌ Error fixing driver weekend summary ordering:",
      "fail",
    );

    readSpy.mockRestore();
    errSpy.mockRestore();
  });

  test("fixConstructorWeekendSummaryOrdering logs errors", async () => {
    const readSpy = jest
      .spyOn(fs, "readFile")
      .mockRejectedValue(new Error("oops"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await fixConstructorWeekendSummaryOrdering("bad-path.json");

    expect(errSpy).toHaveBeenCalledWith(
      "❌ Error fixing constructor weekend summary ordering:",
      "oops",
    );

    readSpy.mockRestore();
    errSpy.mockRestore();
  });
});
