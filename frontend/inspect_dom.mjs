import puppeteer from 'puppeteer';

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1vY2stYWRtaW4iLCJuYW1lIjoiTW9jayBBZG1pbiIsImVtYWlsIjoiYWRtaW5AZHMubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODk2NDE1NDQsImV4cCI6MTc5MDI0NjM0NH0.Ce3eaaegd_AkeXHTeyVBDpbDIBVOHiFUrsMW2FH-QxY';
const INC = 'mock_mu5ej7g2_botg3cx';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', m => console.log('PAGE:', m.text()));
  
  await page.goto('http://localhost:8080');
  await page.evaluate(t => localStorage.setItem('ds_token', t), TOKEN);
  await page.goto('http://localhost:8080/incidents/' + INC, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 4000));

  // Get all button texts (raw)
  const btns = await page.$$eval('button', bs => bs.map(b => JSON.stringify(b.textContent?.trim().slice(0, 60))));
  console.log('ALL BUTTON TEXTS:');
  btns.forEach((t, i) => console.log(`  [${i}] ${t}`));
  
  // Get visible text snippets around "pending" / "Approve"
  const html = await page.content();
  const idx = html.indexOf('pending');
  if (idx > -1) console.log('\nContext around "pending":\n', html.slice(Math.max(0,idx-100), idx+200));
  
  const idx2 = html.indexOf('Approve');
  if (idx2 > -1) console.log('\nContext around "Approve":\n', html.slice(Math.max(0,idx2-100), idx2+300));

  // Check incidentStatus value in DOM somewhere
  const awaiting = html.includes('Awaiting Approval') || html.includes('awaiting_approval') || html.includes('AWAITING_APPROVAL');
  console.log('\nAWAITING_APPROVAL in DOM:', awaiting);
  
  await browser.close();
}

run().catch(console.error);
