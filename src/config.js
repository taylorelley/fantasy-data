const CONFIG = {
  DRIVER_URL:
    "https://fantasy.formula1.com/en/statistics/details?tab=driver&filter=fPoints",
  CONSTRUCTOR_URL:
    "https://fantasy.formula1.com/en/statistics/details?tab=constructor&filter=fPoints",
  OUTPUT_DIR: "driver_data",
  CONSTRUCTOR_OUTPUT_DIR: "constructor_data",
  SUMMARY_OUTPUT_DIR: "summary_data",
  BROWSER_HEADLESS: false, // Set to true for production
  PROCESS_ALL_DRIVERS: true,
  PROCESS_ALL_CONSTRUCTORS: true,
  DELAYS: {
    PAGE_LOAD: 5000,
    POPUP_WAIT: 3000,
    BETWEEN_DRIVERS: 2000,
    BETWEEN_CONSTRUCTORS: 2000,
    POPUP_CLOSE: 1000,
    TAB_SWITCH: 2000,
  },
};

const DRIVER_ABBREVIATIONS = {
  landonorrisdriver: "NOR",
  oscarpiastridriver: "PIA",
  maxverstappendriver: "VER",
  georgerusselldriver: "RUS",
  lewishamiltondriver: "HAM",
  charlesleclercdriver: "LEC",
  carlossainzdriver: "SAI",
  sergioperezdriver: "PER",
  fernandoalonsodriver: "ALO",
  lancestrolldriver: "STR",
  pierregaslydriver: "GAS",
  estebanocondriver: "OCO",
  nicohulkenbergdriver: "HUL",
  kevinmagnussendriver: "MAG",
  valtteribottasdriver: "BOT",
  guanyuzhoudriver: "ZHO",
  alexanderalbondriver: "ALB",
  logansargeantdriver: "SAR",
  yukitsunodadriver: "TSU",
  danielricciardodriver: "RIC",
  kimiantonellidriver: "ANT",
  oliverbearmandriver: "BEA",
  isackhadjardriver: "HAD",
  gabrielbortoletodriver: "BOR",
  liamlawsondriver: "LAW",
  francocolapintodriver: "COL",
  jackdoohandriver: "DOO",
};

const TEAM_SWAP_DRIVERS = {
  yukitsunodadriver: {
    name: "Yuki Tsunoda",
    abbreviation: "TSU",
  },
  liamlawsondriver: {
    name: "Liam Lawson",
    abbreviation: "LAW",
  },
};

const CONSTRUCTOR_ABBREVIATIONS = {
  mclaren: "MCL",
  redbull: "RBR",
  redbullracing: "RBR",
  ferrari: "FER",
  mercedes: "MER",
  astonmartin: "AMR",
  alpine: "ALP",
  haas: "HAS",
  williams: "WIL",
  kicksauber: "SAU",
  sauber: "SAU",
  rb: "RB",
  racingbulls: "RB",
  alphatauri: "RB",
};

module.exports = {
  CONFIG,
  DRIVER_ABBREVIATIONS,
  TEAM_SWAP_DRIVERS,
  CONSTRUCTOR_ABBREVIATIONS,
};
