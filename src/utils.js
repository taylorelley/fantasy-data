// utils.js
const DEFAULTS = {
  POPUP_WAIT: 8000,
  POPUP_CLOSE: 500, // small settle delay after click
};

async function closeCookieBanner(page, delays = DEFAULTS) {
  // Helper to try clicking a visible button by accessible name (case-insensitive)
  const clickByRole = async (scope, nameRe, timeout = 2000) => {
    const btn = scope
      .getByRole("button", { name: nameRe, exact: false })
      .first();
    await btn.waitFor({ state: "visible", timeout });
    await btn.click();
    await page.waitForTimeout(delays.POPUP_CLOSE);
    return true;
  };

  // 1) Try Sourcepoint iframe (very common on media/fantasy sites)
  try {
    // Wait briefly for any SP iframe to appear
    const spFrame = page.frameLocator(
      'iframe[title*="SP Consent" i], iframe[id^="sp_message_iframe"]',
    );
    // Try the most privacy-friendly options first
    if (
      await clickByRole(
        spFrame,
        /reject.*all|only.*essential|essential.*only/i,
        3000,
      )
    )
      return;
    // Sometimes you must open settings, then reject
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

  // 2) Try OneTrust patterns (no iframe on many sites, but sometimes is)
  try {
    // If there is an OT iframe, enter it
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
    // Top-level OneTrust buttons (no iframe)
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

  // 3) Generic, accessible fallback (top-level or any visible frame)
  try {
    // Prefer accessible names; avoids hidden or decorative buttons.
    if (
      await clickByRole(
        page,
        /reject.*all|only.*essential|essential.*only/i,
        1500,
      )
    )
      return;

    // If there’s only a settings path:
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

  // 4) Last resort: ESC twice (sometimes closes overlays) — won’t dismiss real CMPs usually
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
  } catch (_) {
    /* ignore */
  }
}

module.exports = { closeCookieBanner: closeCookieBanner, emergencyClosePopup };
