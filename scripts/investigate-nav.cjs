const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pages = ["/", "/opportunities", "/services", "/developer-services", "/content", "/employers"];
  for (const path of pages) {
    await page.goto(`http://localhost:5391${path}`, { waitUntil: "domcontentloaded" });
    try {
      await page.locator("html[data-hydrated='true']").waitFor({ state: "attached", timeout: 30000 });
    } catch (e) {
      console.log(`${path}: hydration timeout`);
    }
    // Primary nav visibility
    const navInfo = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Primary"]');
      const burger = document.querySelector('button[aria-label="Open menu"], button[aria-label="Close menu"]');
      const links = nav ? Array.from(nav.querySelectorAll("a")).map((a) => a.textContent?.trim()) : [];
      return {
        navExists: !!nav,
        navVisible: nav ? nav.offsetParent !== null : false,
        navDisplay: nav ? getComputedStyle(nav).display : null,
        navLinks: links,
        burgerVisible: burger ? burger.offsetParent !== null : false,
      };
    });
    console.log(path, JSON.stringify(navInfo));
  }
  await browser.close();
})();
