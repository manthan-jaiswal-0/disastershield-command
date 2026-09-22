import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const authCode = fs.readFileSync('C:/Users/Admin/Desktop/SIH/auth-snippet.txt', 'utf8');
  await page.goto('http://localhost:8080');
  await page.evaluate((code) => { eval(code); }, authCode);
  
  // Reload to ensure token is active
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('Is LIVE?', html.includes('LIVE / OPERATIONAL MODE'));
  
  const incidentLinks = await page.$$('a[href^="/incidents/"]');
  if (incidentLinks.length > 0) {
    const href = await page.evaluate(el => el.getAttribute('href'), incidentLinks[0]);
    console.log('Incident ID:', href.split('/').pop());
  } else {
    console.log("No incidents found");
  }

  await browser.close();
}

run().catch(console.error);
