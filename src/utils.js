const { CONFIG } = require("./config");

async function closePopup(page) {
  try {
    const closeButton = await page.$(".si-popup__close");
    if (closeButton) {
      await closeButton.click();
      await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
      return;
    }
  } catch (e) {}
  await page.keyboard.press("Escape");
  await page.waitForTimeout(CONFIG.DELAYS.POPUP_CLOSE);
}

async function emergencyClosePopup(page) {
  try {
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);
  } catch (e) {}
}

module.exports = { closePopup, emergencyClosePopup };
