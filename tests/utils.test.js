/* eslint-env jest */
/* global jest, describe, test, expect */
const {
  closePopup,
  emergencyClosePopup,
  handleCookieConsent,
} = require("../src/utils");
const { CONFIG } = require("../src/config");

describe("handleCookieConsent", () => {
  test("clicks essential only cookies button in iframe", async () => {
    const iframe = { click: jest.fn().mockResolvedValue() };
    const iframeElement = {
      contentFrame: jest.fn().mockResolvedValue(iframe),
    };
    const page = {
      $: jest.fn().mockResolvedValue(iframeElement),
      waitForTimeout: jest.fn(),
    };

    await handleCookieConsent(page);

    expect(page.$).toHaveBeenCalledWith("#sp_message_iframe_1336275");
    expect(iframeElement.contentFrame).toHaveBeenCalled();
    expect(iframe.click).toHaveBeenCalledWith(
      'button:has-text("Essential only cookies")',
      { timeout: 3000 },
    );
    expect(page.waitForTimeout).toHaveBeenCalledWith(2000);
  });

  test("does nothing if iframe is missing", async () => {
    const page = {
      $: jest.fn().mockResolvedValue(null),
      waitForTimeout: jest.fn(),
    };

    await handleCookieConsent(page);

    expect(page.$).toHaveBeenCalledWith("#sp_message_iframe_1336275");
    expect(page.waitForTimeout).not.toHaveBeenCalled();
  });
});

describe("closePopup", () => {
  test("clicks reject in Sourcepoint frame when available", async () => {
    const button = {
      waitFor: jest.fn().mockResolvedValue(),
      click: jest.fn().mockResolvedValue(),
    };
    const spFrame = {
      getByRole: jest.fn().mockReturnValue({ first: () => button }),
    };
    const page = {
      frameLocator: jest.fn().mockReturnValueOnce(spFrame),
      waitForTimeout: jest.fn(),
      keyboard: { press: jest.fn() },
      locator: jest.fn(),
      getByRole: jest.fn(),
    };

    await closePopup(page);

    expect(page.frameLocator).toHaveBeenCalled();
    expect(button.click).toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });

  test("clicks accessible reject button when no iframe matches", async () => {
    const failingButton = {
      waitFor: jest.fn().mockRejectedValue(new Error("no")),
      click: jest.fn(),
    };
    const spFrame = {
      getByRole: jest.fn().mockReturnValue({ first: () => failingButton }),
    };
    const otFrame = {
      locator: jest.fn().mockReturnValue({
        first: () => ({ isVisible: jest.fn().mockResolvedValue(false) }),
      }),
    };
    const genericButton = {
      waitFor: jest.fn().mockResolvedValue(),
      click: jest.fn().mockResolvedValue(),
    };
    const page = {
      frameLocator: jest
        .fn()
        .mockReturnValueOnce(spFrame)
        .mockReturnValueOnce(otFrame),
      locator: jest.fn().mockReturnValue({
        first: () => ({ isVisible: jest.fn().mockResolvedValue(false) }),
      }),
      getByRole: jest.fn().mockReturnValue({ first: () => genericButton }),
      waitForTimeout: jest.fn(),
      keyboard: { press: jest.fn() },
    };

    await closePopup(page);

    expect(page.getByRole).toHaveBeenCalled();
    expect(genericButton.click).toHaveBeenCalled();
    expect(page.keyboard.press).not.toHaveBeenCalled();
    expect(page.waitForTimeout).toHaveBeenCalledWith(CONFIG.DELAYS.POPUP_CLOSE);
  });

  test("presses escape when no buttons are found", async () => {
    const failingButton = {
      waitFor: jest.fn().mockRejectedValue(new Error("no")),
      click: jest.fn(),
    };
    const spFrame = {
      getByRole: jest.fn().mockReturnValue({ first: () => failingButton }),
    };
    const otFrame = {
      locator: jest.fn().mockReturnValue({
        first: () => ({ isVisible: jest.fn().mockResolvedValue(false) }),
      }),
    };
    const page = {
      frameLocator: jest
        .fn()
        .mockReturnValueOnce(spFrame)
        .mockReturnValueOnce(otFrame),
      locator: jest.fn().mockReturnValue({
        first: () => ({ isVisible: jest.fn().mockResolvedValue(false) }),
      }),
      getByRole: jest.fn().mockReturnValue({ first: () => failingButton }),
      waitForTimeout: jest.fn(),
      keyboard: { press: jest.fn() },
    };

    await closePopup(page);

    expect(page.keyboard.press).toHaveBeenCalledTimes(2);
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
