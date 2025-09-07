/* eslint-env jest */
/* global jest */
function createDriverFixtures() {
  const page = {
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(null),
    $: jest.fn().mockResolvedValue(null),
    keyboard: { press: jest.fn().mockResolvedValue(null) },
  };

  const driverElements = [
    {
      element: { click: jest.fn().mockResolvedValue(null) },
      index: 0,
      position: 1,
      name: "Max Verstappen",
      team: "Red Bull",
      cost: "0",
      points: 0,
      text: "1 Max Verstappen",
    },
    {
      element: { click: jest.fn().mockResolvedValue(null) },
      index: 1,
      position: 2,
      name: "Lewis Hamilton",
      team: "Mercedes",
      cost: "0",
      points: 0,
      text: "2 Lewis Hamilton",
    },
  ];

  return { page, driverElements };
}

function createConstructorFixtures() {
  const page = {
    waitForSelector: jest.fn().mockResolvedValue(null),
    waitForTimeout: jest.fn().mockResolvedValue(null),
    $: jest.fn().mockResolvedValue(null),
    keyboard: { press: jest.fn().mockResolvedValue(null) },
  };

  const constructorElements = [
    {
      element: { click: jest.fn().mockResolvedValue(null) },
      index: 0,
      position: 1,
      name: "Red Bull",
      cost: "0",
      points: 0,
      text: "1 Red Bull",
    },
    {
      element: { click: jest.fn().mockResolvedValue(null) },
      index: 1,
      position: 2,
      name: "Mercedes",
      cost: "0",
      points: 0,
      text: "2 Mercedes",
    },
  ];

  return { page, constructorElements };
}

module.exports = { createDriverFixtures, createConstructorFixtures };
