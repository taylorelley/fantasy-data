/* eslint-env jest */
/* global jest, describe, test, expect */
const { closePopup, emergencyClosePopup } = require("../src/utils");
const { CONFIG } = require("../src/config");

describe("closePopup", () => {
  test("handles manage settings cookie modal", async () => {
    const manageClick = jest.fn();
    const rejectClick = jest.fn();
    const page = {
      $$: jest.fn().mockResolvedValue([]),
      $: jest.fn().mockImplementation((selector) => {
        if (
          selector ===
          'h2:has-text("YOUR CHOICES REGARDING COOKIES ON THIS SITE")'
        ) {
          return Promise.resolve({});
        }
        if (selector === 'button[aria-label="No, manage settings"]') {
          return Promise.resolve({ click: manageClick });
        }
        if (selector === 'button[aria-label="Reject all"]') {
          return Promise.resolve({ click: rejectClick });
        }
        if (selector === ".si-popup__close") {
          return Promise.resolve(null);
        }
        return Promise.resolve(null);
      }),
      waitForSelector: jest.fn().mockResolvedValue(),
      keyboard: { press: jest.fn() },
      waitForTimeout: jest.fn(),
    };

    await closePopup(page);

    expect(page.$).toHaveBeenCalledWith(
      'h2:has-text("YOUR CHOICES REGARDING COOKIES ON THIS SITE")',
    );
    expect(manageClick).toHaveBeenCalled();
    expect(page.waitForSelector).toHaveBeenCalledWith(
      'h2:has-text("MANAGE YOUR CHOICES")',
      { timeout: CONFIG.DELAYS.POPUP_WAIT },
    );
    expect(rejectClick).toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });
  test("clicks essential cookies button when available", async () => {
    const click = jest.fn();
    const page = {
      $$: jest.fn().mockResolvedValue([
        {
          textContent: jest
            .fn()
            .mockResolvedValue("Use essential cookies only"),
          click,
        },
      ]),
      $: jest.fn().mockResolvedValue(null),
      keyboard: { press: jest.fn() },
      waitForTimeout: jest.fn(),
    };

    await closePopup(page);

    expect(page.$$).toHaveBeenCalledWith("button");
    expect(click).toHaveBeenCalled();
    expect(page.keyboard.press).not.toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });

  test("clicks close button when available", async () => {
    const click = jest.fn();
    const page = {
      $$: jest.fn().mockResolvedValue([]),
      $: jest.fn().mockImplementation((selector) => {
        if (selector === ".si-popup__close") {
          return Promise.resolve({ click });
        }
        return Promise.resolve(null);
      }),
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
      $$: jest.fn().mockResolvedValue([]),
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
      $$: jest.fn().mockResolvedValue([]),
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
