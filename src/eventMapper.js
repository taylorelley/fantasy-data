function applyEvent(sessionData, eventName, points, map) {
  const normalized = eventName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let matched = false;
  for (const [key, target] of Object.entries(map)) {
    if (normalized.includes(key)) {
      matched = true;
      const { section, property, accumulate } = target;
      if (sessionData[section]) {
        if (accumulate) {
          sessionData[section][property] += points;
        } else {
          sessionData[section][property] = points;
        }
      }
      break;
    }
  }

  if (!matched) {
    console.log(`ℹ️ Unknown event: ${eventName}`);
  }
}

module.exports = { applyEvent };
