const express = require("express");
const fs = require("fs/promises");
const path = require("path");

async function loadData(baseDir, subdir) {
  try {
    const directory = path.join(baseDir, subdir);
    const files = await fs.readdir(directory);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const results = await Promise.all(
      jsonFiles.map((file) =>
        fs
          .readFile(path.join(directory, file), "utf8")
          .then((data) => JSON.parse(data)),
      ),
    );
    return results;
  } catch {
    return [];
  }
}

async function loadSummary(baseDir) {
  const summaries = {};
  try {
    const directory = path.join(baseDir, "summary_data");
    const files = await fs.readdir(directory);
    for (const file of files.filter((f) => f.endsWith(".json"))) {
      const data = await fs.readFile(path.join(directory, file), "utf8");
      summaries[file.replace(/\.json$/, "")] = JSON.parse(data);
    }
  } catch {
    // ignore if summary directory missing
  }
  return summaries;
}

function createServer(dataDir = path.join(__dirname, "..", "latest")) {
  const app = express();

  app.get("/drivers", async (req, res) => {
    const drivers = await loadData(dataDir, "driver_data");
    res.json(drivers);
  });

  app.get("/constructors", async (req, res) => {
    const constructors = await loadData(dataDir, "constructor_data");
    res.json(constructors);
  });

  app.get("/summary", async (req, res) => {
    const summary = await loadSummary(dataDir);
    res.json(summary);
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "latest");
  const app = createServer(dataDir);
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

module.exports = { createServer };
