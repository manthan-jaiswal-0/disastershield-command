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
  
  const incidentLinks = await page.$$('a[href^="/incidents/"]');
  if (incidentLinks.length > 0) {
    const href = await page.evaluate(el => el.getAttribute('href'), incidentLinks[0]);
    const id = href.split('/').pop();
    console.log('Incident ID:', id);
    
    // Trigger backend analysis
    const token = authCode.match(/'([^']+)'/g)[1].replace(/'/g, ''); // Extract JWT token from snippet
    const analyzeRes = await page.evaluate(async (id, token) => {
       const res = await fetch('http://localhost:5000/api/incidents/' + id + '/analyze', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token }
       });
       return await res.json();
    }, id, token);
    
    console.log('Analysis Triggered.');
    console.log('Has gisImpact:', !!analyzeRes.data?.gisImpact);
    console.log('Has riskReasons:', !!analyzeRes.data?.riskReasons);
    console.log('Has recommendation:', !!analyzeRes.data?.recommendation);
    
    // Now reload the page so the frontend fetches the freshly populated incident
    await page.goto('http://localhost:8080' + href, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    
    // Check if the frontend properly mapped these fields onto the screen!
    console.log("Check for Intelligence Engine source:", bodyHTML.includes("Intelligence Engine"));
    console.log("Check for Risk factor labeling:", bodyHTML.includes("Risk Factor 1"));
    
  } else {
    console.log("No incidents found");
  }

  await browser.close();
}

run().catch(console.error);
