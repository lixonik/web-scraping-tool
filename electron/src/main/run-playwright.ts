import { chromium } from 'playwright-core';

export async function runPlaywrightToolWindow() {
  const browser = await chromium.connectOverCDP('http://localhost:9222', {});

  const electronPageContext = browser.contexts()[0];
  const angularPage = electronPageContext.pages().find((page) => {
    return page.url().includes('localhost');
  })!;
  console.log('----------- page url', angularPage.url());
  angularPage?.on('console', async (data) => {
    if (data.type() === 'dirxml') {
      if (data.text().includes('screen')) {
        const buffer = await angularPage.screenshot();
        console.log('+++++++++++++ screen', buffer.toString('base64'));
      }
    }
  });

  await angularPage.route(
    (url) => url.toString().includes('test-http'),
    async (route, request) => {
      await route.fulfill({
        body: 'from playwright',
      });
    },
  );

  return angularPage;
}

export async function runPlaywrightHandledPageData(url: string) {
  const browser = await chromium.connectOverCDP('http://localhost:9222', {});

  const electronPageContext = browser.contexts()[0];
  const handledPage = electronPageContext.pages().find((page) => {
    return page.url().includes(url);
  })!;
  console.log('----------- page url', handledPage.url());
  return {handledPage, browser};
}
