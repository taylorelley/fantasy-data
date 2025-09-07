// Mapping of normalized event names to session sections and properties
// Order matters for matching to ensure specific events are handled before generic ones
const DRIVER_EVENT_MAP = {
  "driver of the day": { section: "race", property: "dotd" },
  "race positions gained": {
    section: "race",
    property: "positionsGained",
    accumulate: true,
  },
  "race positions lost": {
    section: "race",
    property: "positionsLost",
    accumulate: true,
  },
  "race overtake": {
    section: "race",
    property: "overtakeBonus",
    accumulate: true,
  },
  "race fastest lap": { section: "race", property: "fastestLap" },
  "race disqualified": {
    section: "race",
    property: "disqualificationPenalty",
    accumulate: true,
  },
  "race position": { section: "race", property: "position" },
  "qualifying position": { section: "qualifying", property: "position" },
  "qualifying disqualified": {
    section: "qualifying",
    property: "disqualificationPenalty",
    accumulate: true,
  },
  "sprint positions gained": {
    section: "sprint",
    property: "positionsGained",
    accumulate: true,
  },
  "sprint positions lost": {
    section: "sprint",
    property: "positionsLost",
    accumulate: true,
  },
  "sprint overtake": {
    section: "sprint",
    property: "overtakeBonus",
    accumulate: true,
  },
  "sprint fastest lap": { section: "sprint", property: "fastestLap" },
  "sprint disqualified": {
    section: "sprint",
    property: "disqualificationPenalty",
    accumulate: true,
  },
  "sprint position": { section: "sprint", property: "position" },
};

// Mapping of normalized event names to session sections and properties
// Order is important to ensure specific phrases match before generic ones
const CONSTRUCTOR_EVENT_MAP = {
  "race positions gained": {
    section: "race",
    property: "positionsGained",
    accumulate: true,
  },
  "race positions lost": {
    section: "race",
    property: "positionsLost",
    accumulate: true,
  },
  "race overtake": {
    section: "race",
    property: "overtakes",
    accumulate: true,
  },
  "race fastest lap": { section: "race", property: "fastestLap" },
  "fastest pit stop": { section: "race", property: "fastestPitStop" },
  "fastest pitstop": { section: "race", property: "fastestPitStop" },
  "pitstop world record": { section: "race", property: "worldRecordBonus" },
  "world record": { section: "race", property: "worldRecordBonus" },
  "pit stop": {
    section: "race",
    property: "pitStopBonus",
    accumulate: true,
  },
  pitstop: {
    section: "race",
    property: "pitStopBonus",
    accumulate: true,
  },
  "race disqualified": {
    section: "race",
    property: "disqualificationPenalty",
    accumulate: true,
  },
  "race position": { section: "race", property: "position" },
  "qualifying position": { section: "race", property: "qualifyingPosition" },
  "both drivers reach q3": {
    section: "qualifying",
    property: "q3Bonus",
  },
  "reach q3": { section: "qualifying", property: "q3Bonus" },
  q3: { section: "qualifying", property: "q3Bonus" },
  "both drivers reach q2": {
    section: "qualifying",
    property: "q2Bonus",
  },
  "reach q2": { section: "qualifying", property: "q2Bonus" },
  q2: { section: "qualifying", property: "q2Bonus" },
  "qualifying disqualified": {
    section: "qualifying",
    property: "disqualificationPenalty",
    accumulate: true,
  },
  "sprint positions gained": {
    section: "sprint",
    property: "positionsGained",
    accumulate: true,
  },
  "sprint positions lost": {
    section: "sprint",
    property: "positionsLost",
    accumulate: true,
  },
  "sprint overtake": {
    section: "sprint",
    property: "overtakes",
    accumulate: true,
  },
  "sprint fastest lap": { section: "sprint", property: "fastestLap" },
  "sprint disqualified": {
    section: "sprint",
    property: "disqualificationPenalty",
    accumulate: true,
  },
  "sprint position": { section: "sprint", property: "position" },
};

module.exports = { DRIVER_EVENT_MAP, CONSTRUCTOR_EVENT_MAP };
