/* eslint-env jest */
/* global describe, beforeEach, afterEach, test, expect */
const fs = require("fs/promises");
const os = require("os");
const path = require("path");
const supertest = require("supertest");
const { createServer } = require("../src/api");

describe("API server", () => {
  let tempDir;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fantasy-data-test-"));
    await fs.mkdir(path.join(tempDir, "driver_data"));
    await fs.mkdir(path.join(tempDir, "constructor_data"));
    await fs.mkdir(path.join(tempDir, "summary_data"));
    await fs.writeFile(
      path.join(tempDir, "driver_data", "HAM.json"),
      JSON.stringify({ code: "HAM" }),
    );
    await fs.writeFile(
      path.join(tempDir, "constructor_data", "MER.json"),
      JSON.stringify({ code: "MER" }),
    );
    await fs.writeFile(
      path.join(tempDir, "summary_data", "weekend_summary.json"),
      JSON.stringify({ weekend: true }),
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("GET /drivers returns drivers", async () => {
    const app = createServer(tempDir);
    const res = await supertest(app).get("/drivers").expect(200);
    expect(res.body).toEqual([{ code: "HAM" }]);
  });

  test("GET /constructors returns constructors", async () => {
    const app = createServer(tempDir);
    const res = await supertest(app).get("/constructors").expect(200);
    expect(res.body).toEqual([{ code: "MER" }]);
  });

  test("GET /summary returns summary data", async () => {
    const app = createServer(tempDir);
    const res = await supertest(app).get("/summary").expect(200);
    expect(res.body).toEqual({ weekend_summary: { weekend: true } });
  });
});
