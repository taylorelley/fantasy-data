const { CONFIG } = require("./config");

async function closePopup(page) {
  try {
    const buttons = await page.$$("button");
    for (const button of buttons) {
      try {
        const text = (await button.textContent())?.trim();
        if (
          /use essential cookies only/i.test(text) ||
          /reject all/i.test(text)
        ) {
          await button.click();
          await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
          return;
        }
      } catch (e) {
        // Ignore errors while checking cookie buttons
      }
    }
  } catch (e) {
    // Ignore errors when searching for cookie banner
  }

  try {
    const closeButton = await page.$(".si-popup__close");
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
      return;
    }
  } catch (e) {
    // Ignore errors when attempting to close the popup via button
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
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
