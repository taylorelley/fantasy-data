/* eslint-env jest */
/* global jest, describe, test, expect */
const { closePopup, emergencyClosePopup } = require("../src/utils");
const { CONFIG } = require("../src/config");

describe("closePopup", () => {
  test("clicks close button when available", async () => {
    const click = jest.fn();
    const page = {
      $: jest.fn().mockResolvedValue({ click }),
      keyboard: { press: jest.fn() },
      waitForTimeout: jest.fn(),
    };

    await closePopup(page);

    expect(page.$).toHaveBeenCalledWith(".si-popup__close");
    expect(click).toHaveBeenCalled();
    expect(page.keyboard.press).not.toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });

  test("presses escape when close button missing", async () => {
    const page = {
      $: jest.fn().mockResolvedValue(null),
      keyboard: { press: jest.fn() },
      waitForTimeout: jest.fn(),
    };

    await closePopup(page);

    expect(page.$).toHaveBeenCalledWith(".si-popup__close");
    expect(page.keyboard.press).toHaveBeenCalledWith("Escape");
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });

  test("presses escape when querying close button fails", async () => {
    const page = {
      $: jest.fn().mockRejectedValue(new Error("fail")),
      keyboard: { press: jest.fn() },
      waitForTimeout: jest.fn(),
    };

    await closePopup(page);

    expect(page.$).toHaveBeenCalled();
    expect(page.keyboard.press).toHaveBeenCalledWith("Escape");
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });
});

describe("emergencyClosePopup", () => {
  test("presses escape twice and waits", async () => {
    const page = {
      keyboard: { press: jest.fn() },
      waitForTimeout: jest.fn(),
    };

    await emergencyClosePopup(page);

    expect(page.keyboard.press).toHaveBeenCalledTimes(2);
    expect(page.keyboard.press).toHaveBeenCalledWith("Escape");
    expect(page.waitForTimeout).toHaveBeenCalledWith(1000);
  });

  test("swallows errors from keyboard presses", async () => {
    const page = {
      keyboard: { press: jest.fn().mockRejectedValue(new Error("fail")) },
      waitForTimeout: jest.fn(),
    };

    await emergencyClosePopup(page);

    expect(page.keyboard.press).toHaveBeenCalledWith("Escape");
    expect(page.waitForTimeout).not.toHaveBeenCalled();
  });
});
