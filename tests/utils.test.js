/* eslint-env jest */
/* global jest, describe, test, expect */
const { closeCookieBanner, emergencyClosePopup } = require("../src/utils");

describe("closeCookieBanner", () => {
  test("clicks reject button in Sourcepoint iframe", async () => {
    const click = jest.fn();
    const btn = { waitFor: jest.fn().mockResolvedValue(), click };
    const locator = { first: jest.fn(() => btn) };
    const spFrame = { getByRole: jest.fn(() => locator) };
    const page = {
      frameLocator: jest.fn().mockReturnValue(spFrame),
      waitForTimeout: jest.fn(),
      keyboard: { press: jest.fn() },
    };

    await closeCookieBanner(page);

    expect(page.frameLocator).toHaveBeenCalledWith(
      'iframe[title*="SP Consent" i], iframe[id^="sp_message_iframe"]',
    );
    expect(spFrame.getByRole).toHaveBeenCalledWith(
      "button",
      expect.objectContaining({ name: expect.any(RegExp), exact: false }),
    );
    expect(btn.waitFor).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalled();
    expect(page.keyboard.press).not.toHaveBeenCalled();
  });

  test("presses escape twice when no banner found", async () => {
    const failingBtn = {
      waitFor: jest.fn().mockRejectedValue(new Error("nope")),
      click: jest.fn(),
    };
    const failingLocator = {
      first: jest.fn(() => failingBtn),
      isVisible: jest.fn().mockRejectedValue(new Error("no")),
    };
    const failingFrame = {
      getByRole: jest.fn(() => failingLocator),
      locator: jest.fn(() => ({
        first: () => ({
          isVisible: jest.fn().mockRejectedValue(new Error("no")),
        }),
      })),
    };
    const page = {
      frameLocator: jest.fn().mockReturnValue(failingFrame),
      locator: jest.fn(() => ({
        first: () => ({
          isVisible: jest.fn().mockRejectedValue(new Error("no")),
        }),
      })),
      getByRole: jest.fn(() => failingLocator),
      waitForTimeout: jest.fn(),
      keyboard: { press: jest.fn() },
    };

    await closeCookieBanner(page);

    expect(page.keyboard.press).toHaveBeenCalledTimes(2);
    expect(page.keyboard.press).toHaveBeenCalledWith("Escape");
    expect(page.waitForTimeout).toHaveBeenCalled();
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
