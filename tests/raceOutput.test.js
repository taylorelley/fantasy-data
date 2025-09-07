/* eslint-env jest */
/* global describe, test, expect */
const { organizeRaceData } = require("../src/main");

describe("race data organization", () => {
  test("organizeRaceData groups drivers and constructors by race", () => {
    const driverBreakdowns = new Map([
      [
        "ham",
        {
          abbreviation: "HAM",
          displayName: "Lewis Hamilton",
          team: "Mercedes",
          value: "25.0",
          percentagePicked: 60,
          position: 1,
          races: [
            { round: "1", raceName: "Bahrain", totalPoints: 10 },
            { round: "2", raceName: "Saudi", totalPoints: 12 },
          ],
        },
      ],
      [
        "ver",
        {
          abbreviation: "VER",
          displayName: "Max Verstappen",
          team: "Red Bull",
          value: "26.0",
          percentagePicked: 70,
          position: 2,
          races: [{ round: "1", raceName: "Bahrain", totalPoints: 25 }],
        },
      ],
    ]);

    const constructorBreakdowns = new Map([
      [
        "mer",
        {
          abbreviation: "MER",
          name: "Mercedes",
          percentagePicked: 65,
          position: 1,
          races: [{ round: "1", raceName: "Bahrain", totalPoints: 35 }],
        },
      ],
    ]);

    const raceData = organizeRaceData(driverBreakdowns, constructorBreakdowns);

    expect(Object.keys(raceData)).toEqual(["1", "2"]);
    expect(raceData["1"].raceName).toBe("Bahrain");
    expect(Object.keys(raceData["1"].drivers)).toEqual(["HAM", "VER"]);
    expect(raceData["1"].drivers.HAM.totalPoints).toBe(10);
    expect(raceData["1"].constructors.MER.totalPoints).toBe(35);
  });
});
