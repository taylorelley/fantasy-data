const { CONFIG } = require("./config");

async function closePopup(page, delays = CONFIG.DELAYS) {
  // Helper to click a visible button by accessible name
  const clickByRole = async (scope, nameRe, timeout = 2000) => {
    const btn = scope
      .getByRole("button", { name: nameRe, exact: false })
      .first();
    await btn.waitFor({ state: "visible", timeout });
    await btn.click();
    await page.waitForTimeout(delays.POPUP_CLOSE);
    return true;
  };

  // 1) Sourcepoint iframe
  try {
    const spFrame = page.frameLocator(
      'iframe[title*="SP Consent" i], iframe[id^="sp_message_iframe"]',
    );
    if (
      await clickByRole(
        spFrame,
        /reject.*all|only.*essential|essential.*only/i,
        3000,
      )
    )
      return;
    if (await clickByRole(spFrame, /manage|settings|options/i, 1500)) {
      await clickByRole(
        spFrame,
        /reject.*all|save.*without.*consent|confirm choices/i,
        3000,
      );
      return;
    }
  } catch (_) {
    /* ignore */
  }

  // 2) OneTrust patterns
  try {
    const otFrame = page.frameLocator(
      'iframe[title*="OneTrust" i], iframe[id^="ot-sdk-ui"]',
    );
    const otSelectors = [
      "#onetrust-reject-all-handler",
      'button[aria-label*="Reject" i]',
      'button:has-text("Reject All")',
      'button:has-text("Use essential cookies only")',
    ].join(", ");
    const otInFrame = otFrame.locator(otSelectors).first();
    if (await otInFrame.isVisible({ timeout: 2000 })) {
      await otInFrame.click();
      await page.waitForTimeout(delays.POPUP_CLOSE);
      return;
    }
  } catch (_) {
    /* ignore */
  }
  try {
    const otTop = page
      .locator(
        [
          "#onetrust-reject-all-handler",
          'button[aria-label*="Reject" i]',
          'button:has-text("Reject All")',
          'button:has-text("Use essential cookies only")',
        ].join(", "),
      )
      .first();
    if (await otTop.isVisible({ timeout: 2000 })) {
      await otTop.click();
      await page.waitForTimeout(delays.POPUP_CLOSE);
      return;
    }
  } catch (_) {
    /* ignore */
  }

  // 3) Generic accessible fallback
  try {
    if (
      await clickByRole(
        page,
        /reject.*all|only.*essential|essential.*only/i,
        1500,
      )
    )
      return;

    if (await clickByRole(page, /manage|settings|options/i, 1500)) {
      await clickByRole(
        page,
        /reject.*all|save.*without.*consent|confirm choices/i,
        3000,
      );
      return;
    }
  } catch (_) {
    /* ignore */
  }

  // 4) Last resort: ESC twice
  try {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(delays.POPUP_CLOSE);
  } catch (_) {
    /* ignore */
  }
}

async function emergencyClosePopup(page) {
  try {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);
  } catch (e) {
    // Ignore errors when attempting emergency close
  }
}

module.exports = { closePopup, emergencyClosePopup };
