import puppeteer from 'puppeteer';
import fs from 'fs';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  const authCode = fs.readFileSync('C:/Users/Admin/Desktop/SIH/auth-snippet.txt', 'utf8');
  await page.goto('http://localhost:8080');
  await page.evaluate((code) => { eval(code); }, authCode);
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  
  const incidentLinks = await page.$$('a[href^="/incidents/"]');
  if (incidentLinks.length > 0) {
    await incidentLinks[0].click();
    await new Promise(r => setTimeout(r, 2000));
    
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    
    console.log("Check for Intelligence Engine source:", bodyHTML.includes("Intelligence Engine"));
    console.log("Check for GIS mapping (vulnerability factors):", bodyHTML.includes("vulnerability") || bodyHTML.includes("Hospital"));
    console.log("Check for Risk factor labeling:", bodyHTML.includes("Risk Factor 1"));
    
  } else {
    console.log("No incidents found");
  }

  await browser.close();
}

run().catch(console.error);
