import { expect, test } from '@playwright/test';

function answerFor(expression: string) {
  const match = expression.match(/^(-?[\d.]+)\s*([+−×÷])\s*(-?[\d.]+)\s*=$/);
  if (!match) throw new Error(`Unexpected equation: ${expression}`);
  const first = Number(match[1]);
  const second = Number(match[3]);
  switch (match[2]) {
    case '+': return String(first + second);
    case '−': return String(first - second);
    case '×': return String(first * second);
    case '÷': return String(first / second);
    default: throw new Error('Unknown operation');
  }
}

test('worksheet correction, completion, and PNG sharing', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveTitle('NUMO — חשבון בכיף');
  await expect(page.getByRole('heading', { name: 'חשבון בכיף' })).toBeVisible();
  await page.getByRole('button', { name: /בואו נתחיל/ }).click();
  await expect(page.getByRole('heading', { name: 'בוחרים תרגול' })).toBeVisible();
  await page.getByRole('button', { name: /התחילו לתרגל/ }).click();
  await expect(page.getByRole('heading', { name: 'פותרים תרגילים' })).toBeVisible();
  const rows = page.locator('.exercise-row');
  await expect(rows).toHaveCount(25);
  const inputs = page.getByRole('textbox');

  for (let index = 0; index < 25; index += 1) {
    const expression = await rows.nth(index).locator('.equation').innerText();
    await inputs.nth(index).fill(index === 0 ? '999999' : answerFor(expression));
  }

  await expect(page.locator('.progress-label')).toHaveText('ענית על 25 מתוך 25 תרגילים');
  await page.locator('.submit').click();
  await expect(page.getByText('יש כמה תרגילים שצריך לתקן. נסו שוב!')).toBeVisible();
  await expect(inputs.nth(0)).toHaveAttribute('aria-invalid', 'true');
  await expect(inputs.nth(1)).toBeDisabled();
  const firstAnswer = answerFor(await rows.nth(0).locator('.equation').innerText());
  await inputs.nth(0).fill(firstAnswer);
  await page.getByRole('button', { name: 'סיום והצגת ציון' }).click();
  await expect(page.getByRole('heading', { name: 'כל הכבוד!' })).toBeVisible();
  await expect(page.getByText('100%')).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'הורדת PDF' }).click();
  const pdfWindow = await popupPromise;
  await expect(pdfWindow).toHaveTitle('דף התרגול שלי — NUMO');
  await expect(pdfWindow.locator('table tr')).toHaveCount(25);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /שתף להורה/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('numo-worksheet.png');
  await page.getByRole('button', { name: 'תרגילים חדשים' }).click();
  await expect(page.getByRole('heading', { name: 'פותרים תרגילים' })).toBeVisible();
  await expect(page.getByRole('textbox')).toHaveCount(25);
});

test('unfinished session recovers after refresh and new worksheet needs confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: /בואו נתחיל/ }).click();
  await page.getByRole('button', { name: /התחילו לתרגל/ }).click();
  const inputs = page.getByRole('textbox');
  await inputs.first().fill('17');
  await expect(page.locator('.submit')).toHaveCSS('position', 'sticky');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'פותרים תרגילים' })).toBeVisible();
  await expect(page.getByRole('textbox').first()).toHaveValue('17');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'חזרה' }).click();
  await page.getByRole('button', { name: /בואו נתחיל/ }).click();
  await expect(page.getByRole('dialog')).toContainText('ההתקדמות הנוכחית תימחק.');
  await page.getByRole('button', { name: 'ביטול' }).click();
  await expect(page.getByRole('button', { name: /המשך תרגול שמור/ })).toBeVisible();
});

test('grade and difficulty selection survive a refresh', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /בואו נתחיל/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'בוחרים תרגול' })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('בחרו כיתה')).toBeFocused();
  await page.getByLabel('בחרו כיתה').selectOption('5');
  await page.getByLabel('בחרו רמה').selectOption('hard');
  await page.getByLabel('כמה תרגילים?').selectOption('10');
  await page.reload();
  await expect(page.getByLabel('בחרו כיתה')).toHaveValue('5');
  await expect(page.getByLabel('בחרו רמה')).toHaveValue('hard');
  await expect(page.getByLabel('כמה תרגילים?')).toHaveValue('10');
});

test('phone and tablet layouts stay within the viewport', async ({ page }) => {
  for (const width of [320, 390, 600, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'חשבון בכיף' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
