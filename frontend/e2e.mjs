import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8080');
  await page.evaluate(() => {
    localStorage.setItem('ds_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1vY2stYWRtaW4iLCJuYW1lIjoiTW9jayBBZG1pbiIsImVtYWlsIjoiYWRtaW5AZHMubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODk1NTMwNzksImV4cCI6MTc4OTYzOTQ3OX0.uh2_G8u3efpjiTy0F2ntNqpFbpw0OtvmXoVWX46LUD0');
  });
  
  await page.goto('http://localhost:8080');
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.content();
  console.log(content.includes('Test Flood') ? 'Test Flood found!' : 'Not found');
  console.log(content.includes('Test Res') ? 'Test Res found!' : 'Not found');
  
  const markers = await page.$$('button[style*="left:"]');
  console.log(`Found ${markers.length} markers`);
  
  for (const m of markers) {
     const style = await page.evaluate(el => el.getAttribute('style'), m);
     console.log('Marker style:', style);
  }

  await browser.close();
}

run().catch(console.error);
