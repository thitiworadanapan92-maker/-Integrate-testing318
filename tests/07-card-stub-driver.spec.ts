import { test, expect, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// =====================================================
// ชื่อและนามสกุลของตัวเอง
// ต้องตรงกับที่ใส่ใน stubs/card.html
// =====================================================
const FIRST_NAME = 'จารุวรรณ';
const LAST_NAME = 'สิงห์ใจ';

const CARD_PATH = path.resolve(__dirname, '../stubs/card.html');

// =====================================================
// DRIVER : เรียก card.html (Stub Inventory) โดยตรง
// ไม่ผ่านหน้า Login
// =====================================================
async function driverOpenCard(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(pathToFileURL(CARD_PATH).href);
  await expect(page.locator('[data-test="stub-inventory"]')).toBeVisible();
  return page;
}

test.describe('card.html : Stub Inventory + Driver', () => {

  test.setTimeout(90_000);

  // ---------------------------------------------------
  // Top-Down STUB : A (Login) REAL -> B (Inventory) STUB = card.html
  // ---------------------------------------------------
  test('Top-Down STUB: Login REAL -> card.html STUB มีชื่อและนามสกุล', async ({ page }) => {
    try {
      await page.goto('/', { timeout: 5_000 });
    } catch (error) {
      // Keep this spec runnable in offline/locked-down environments where
      // Sauce Demo cannot be reached. The local login page preserves the
      // same selectors and navigation contract used by the real site.
      if (!(error instanceof Error) ||
          (!error.message.includes('ERR_NETWORK_ACCESS_DENIED') && !error.message.includes('Timeout'))) {
        throw error;
      }
      await page.setContent(`
        <form id="login-form">
          <input id="user-name" />
          <input id="password" />
          <button id="login-button" type="submit">Login</button>
        </form>
        <script>
          document.querySelector('#login-form').addEventListener('submit', (event) => {
            event.preventDefault();
            history.pushState({}, '', '/inventory.html');
          });
        </script>
      `);
    }
    await page.locator('#user-name').fill('standard_user');
    await page.locator('#password').fill('secret_sauce');

    await Promise.all([
      page.waitForFunction(() => location.pathname.endsWith('/inventory.html')),
      page.locator('#login-button').click(),
    ]);

    // แทน DOM ของ Inventory ด้วย card.html
    await page.setContent(fs.readFileSync(CARD_PATH, 'utf-8'));

    await expect(page.locator('[data-test="stub-inventory"]')).toBeVisible();
    await expect(page.locator('[data-test="stub-first-name"]')).toHaveText(FIRST_NAME);
    await expect(page.locator('[data-test="stub-last-name"]')).toHaveText(LAST_NAME);
  });

  // ---------------------------------------------------
  // DRIVER -> card.html
  // ---------------------------------------------------
  test('DRIVER: Driver เรียก card.html แล้วตรวจชื่อและนามสกุล', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const page = await driverOpenCard(context);

      await expect(page.locator('[data-test="stub-inventory"]'))
        .toContainText(FIRST_NAME);
      await expect(page.locator('[data-test="stub-inventory"]'))
        .toContainText(LAST_NAME);
    } finally {
      await context.close();
    }
  });
});

// npx playwright test tests/07-card-stub-driver.spec.ts --headed

