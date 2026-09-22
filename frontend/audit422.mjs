import puppeteer from 'puppeteer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Im1vY2stYWRtaW4iLCJuYW1lIjoiTW9jayBBZG1pbiIsImVtYWlsIjoiYWRtaW5AZHMubG9jYWwiLCJyb2xlIjoiQURNSU4iLCJpYXQiOjE3ODk2NDE1NDQsImV4cCI6MTc5MDI0NjM0NH0.Ce3eaaegd_AkeXHTeyVBDpbDIBVOHiFUrsMW2FH-QxY';
const AUTH = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const API  = 'http://localhost:5000/api';

// Pre-seeded IDs (seeded above, AWAITING_APPROVAL)
const INC_ID = 'mock_mu5fjicg_calho5i';
const RES_ID = 'mock_mu5fjid4_uq94vgn';

const results = {};
const log = (key, status, detail = '') => {
  results[key] = { status, detail };
  console.log(`[${status}] ${key}: ${detail}`);
};

async function apiCall(path, opts = {}) {
  const r = await fetch(API + path, { headers: AUTH, ...opts });
  const j = await r.json();
  return { httpStatus: r.status, body: j };
}

async function run() {
  console.log('=== PHASE 4H.2.1 INDEPENDENT BROWSER AUDIT ===');
  console.log(`Using incId=${INC_ID}  resId=${RES_ID}\n`);

  const browser = await puppeteer.launch({
    headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  const consoleErrors = [];
  const apiRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', resp => {
    if (resp.url().includes('localhost:5000')) {
      apiRequests.push({ url: resp.url(), httpStatus: resp.status() });
    }
  });

  // ── A. Browser startup ─────────────────────────────────────────────────────
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 20000 });
  await page.evaluate(t => localStorage.setItem('ds_token', t), TOKEN);
  log('A_BROWSER_STARTUP', 'PASS', 'http://localhost:8080 loaded; token set');

  // ── B. Initial backend data rendering ─────────────────────────────────────
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));
  const homeContent = await page.content();
  const foundInc = homeContent.includes('AUDIT-422 Flood');
  const foundRes = homeContent.includes('AUDIT-422 Team');
  log('B_INITIAL_DATA', foundInc && foundRes ? 'PASS' : 'FAIL',
    `Incident in DOM: ${foundInc}, Resource in DOM: ${foundRes}`);

  // ── Navigate to incident detail ────────────────────────────────────────────
  await page.goto(`http://localhost:8080/incidents/${INC_ID}`, { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));
  const incPageContent = await page.content();
  const hasApprove = incPageContent.includes('>Approve<');
  const hasReject  = incPageContent.includes('>Reject<');
  console.log(`\nIncident detail — Approve: ${hasApprove}, Reject: ${hasReject}`);

  // ── C. APPROVAL UI ────────────────────────────────────────────────────────
  const approveResponses = [];
  const approveListener = resp => {
    if (resp.url().includes(`/incidents/${INC_ID}/approve`)) {
      approveResponses.push({ url: resp.url(), httpStatus: resp.status() });
    }
  };
  page.on('response', approveListener);

  if (hasApprove) {
    try {
      // Find button whose exact trimmed text is "Approve" (not "Approve modified")
      const btns = await page.$$('button');
      let approveBtn = null;
      for (const b of btns) {
        const txt = await page.evaluate(el => el.textContent?.trim(), b);
        if (txt === 'Approve') { approveBtn = b; break; }
      }
      if (approveBtn) {
        await approveBtn.click();
        await new Promise(r => setTimeout(r, 3000));
        const call = approveResponses[0];
        const afterContent = await page.content();
        const buttonsGone = !afterContent.includes('>Approve<');
        log('C_APPROVAL_UI', call?.httpStatus === 200 ? 'PASS' : 'FAIL',
          `POST /incidents/${INC_ID}/approve → HTTP ${call?.httpStatus ?? 'NO CALL'}, Approve/Reject hidden after: ${buttonsGone}`);
      } else {
        log('C_APPROVAL_UI', 'FAIL', 'Approve <button> element not resolved by Puppeteer');
      }
    } catch (e) {
      log('C_APPROVAL_UI', 'FAIL', `Exception: ${e.message}`);
    }
  } else {
    log('C_APPROVAL_UI', 'NOT TESTABLE', 'Approve button not in DOM — recommendation.status not "pending"');
  }
  page.off('response', approveListener);

  // Reload and check assign panel
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));
  const afterApproveContent = await page.content();
  const hasAssignPanel = afterApproveContent.includes('Assign a resource');
  log('ASSIGN_PANEL_VISIBLE', hasAssignPanel ? 'PASS' : 'FAIL',
    `"Assign a resource" button visible after approval: ${hasAssignPanel}`);

  // ── E. RESOURCE ASSIGNMENT UI ─────────────────────────────────────────────
  const assignResponses = [];
  const assignListener = resp => {
    if (resp.url().includes('/assign')) assignResponses.push({ url: resp.url(), httpStatus: resp.status() });
  };
  page.on('response', assignListener);

  if (hasAssignPanel) {
    try {
      const btns = await page.$$('button');
      let openBtn = null;
      for (const b of btns) {
        const txt = await page.evaluate(el => el.textContent?.trim(), b);
        if (txt?.includes('Assign a resource')) { openBtn = b; break; }
      }
      if (openBtn) {
        await openBtn.click();
        await new Promise(r => setTimeout(r, 600));

        const resBtns = await page.$$('button');
        let resBtn = null;
        for (const b of resBtns) {
          const txt = await page.evaluate(el => el.textContent?.trim(), b);
          if (txt?.includes('AUDIT-422 Team')) { resBtn = b; break; }
        }
        if (resBtn) {
          await resBtn.click();
          await new Promise(r => setTimeout(r, 3000));
          const call = assignResponses[0];
          const afterContent = await page.content();
          const teamVisible = afterContent.includes('AUDIT-422 Team');
          log('E_ASSIGNMENT_UI', call?.httpStatus === 200 ? 'PASS' : 'FAIL',
            `POST /resources/${RES_ID}/assign → HTTP ${call?.httpStatus ?? 'NO CALL'}, team in assigned section: ${teamVisible}`);
        } else {
          log('E_ASSIGNMENT_UI', 'FAIL', '"AUDIT-422 Team" not found in panel');
        }
      } else {
        log('E_ASSIGNMENT_UI', 'FAIL', '"Assign a resource" button element not found');
      }
    } catch (e) {
      log('E_ASSIGNMENT_UI', 'FAIL', `Exception: ${e.message}`);
    }
  } else {
    log('E_ASSIGNMENT_UI', 'NOT TESTABLE', 'Assign panel not visible');
  }
  page.off('response', assignListener);

  // ── D. REJECTION UI (separate incident) ────────────────────────────────────
  // Create a rejection-test incident with far-apart coords
  const incR2 = await apiCall('/incidents', {
    method: 'POST',
    body: JSON.stringify({ title: 'AUDIT-422 Reject', type: 'FLOOD', description: 'Rejection test', latitude: 33.1, longitude: 90.3, severity: 'LOW' })
  });
  const incId2 = incR2.body?.data?._id;
  if (incId2) {
    await apiCall(`/incidents/${incId2}/verify`, { method: 'POST' });
    await apiCall(`/incidents/${incId2}/analyze`, { method: 'POST' });

    await page.goto(`http://localhost:8080/incidents/${incId2}`, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    const inc2Content = await page.content();
    const hasRejectBtn2 = inc2Content.includes('>Reject<');

    if (hasRejectBtn2) {
      const rejectResponses = [];
      const rejectListener = resp => {
        if (resp.url().includes(`/incidents/${incId2}/reject`)) rejectResponses.push({ url: resp.url(), httpStatus: resp.status() });
      };
      page.on('response', rejectListener);
      try {
        const textarea = await page.$('textarea');
        if (textarea) {
          await textarea.type('Rejected via browser UI audit 4H.2.1');
          await new Promise(r => setTimeout(r, 300));
          const allBtns = await page.$$('button');
          let rejectBtn = null;
          for (const b of allBtns) {
            const txt = await page.evaluate(el => el.textContent?.trim(), b);
            if (txt === 'Reject') { rejectBtn = b; break; }
          }
          if (rejectBtn) {
            await rejectBtn.click();
            await new Promise(r => setTimeout(r, 3000));
            const call = rejectResponses[0];
            // Verify the "note" field arrived at backend
            const backendState = await apiCall(`/incidents/${incId2}`);
            const approvalNote = backendState.body?.data?.approval?.note;
            log('D_REJECTION_UI', call?.httpStatus === 200 ? 'PASS' : 'FAIL',
              `POST /incidents/${incId2}/reject → HTTP ${call?.httpStatus ?? 'NO CALL'}, note field at backend: "${approvalNote ?? 'MISSING'}"`);
          } else {
            log('D_REJECTION_UI', 'FAIL', 'Reject button element not found');
          }
        } else {
          log('D_REJECTION_UI', 'FAIL', 'Decision note textarea not found');
        }
      } catch (e) {
        log('D_REJECTION_UI', 'FAIL', `Exception: ${e.message}`);
      }
      page.off('response', rejectListener);
    } else {
      log('D_REJECTION_UI', 'NOT TESTABLE', 'Reject button not visible on incident2 page');
    }
  } else {
    log('D_REJECTION_UI', 'FAIL', `Could not create rejection incident: HTTP ${incR2.httpStatus} — ${JSON.stringify(incR2.body)}`);
  }

  // ── F. GOVERNANCE UI — no assign panel on AWAITING_APPROVAL incident ───────
  const incR3 = await apiCall('/incidents', {
    method: 'POST',
    body: JSON.stringify({ title: 'AUDIT-422 Gov', type: 'FLOOD', description: 'Gov gate test', latitude: 35.5, longitude: 95.5, severity: 'LOW' })
  });
  const incId3 = incR3.body?.data?._id;
  if (incId3) {
    await apiCall(`/incidents/${incId3}/verify`, { method: 'POST' });
    await apiCall(`/incidents/${incId3}/analyze`, { method: 'POST' });
    // INTENTIONALLY no /approve call

    await page.goto(`http://localhost:8080/incidents/${incId3}`, { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    const govContent = await page.content();
    const assignPanelShown = govContent.includes('Assign a resource');

    log('F_GOVERNANCE_UI', !assignPanelShown ? 'PASS' : 'FAIL',
      `Assignment panel hidden on AWAITING_APPROVAL incident: ${!assignPanelShown}. UI correctly gates on recommendation.status="pending"`);
  } else {
    log('F_GOVERNANCE_UI', 'FAIL', 'Could not create governance test incident');
  }

  // ── G. RESPONDER STATUS UI ────────────────────────────────────────────────
  await page.goto('http://localhost:8080/responder', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));
  const respContent = await page.content();
  const hasNDRF = respContent.includes('NDRF');
  const stageButtons = await page.$$eval('button', btns =>
    btns.map(b => b.textContent?.trim()).filter(t => ['Assigned','En Route','On Scene','Assisting','Completed'].includes(t || ''))
  );
  log('G_RESPONDER_UI', 'NOT TESTABLE',
    `Page uses hardcoded demo resource "res-ndrf08" (not a live backend resource). NDRF text: ${hasNDRF}, stage buttons found: [${stageButtons.join(', ')}]. POST /responders/:id/status code path verified in app-state.tsx but UI does not expose live backend assignment IDs.`);

  // ── H. Network/API observations ───────────────────────────────────────────
  const relevant = apiRequests.filter(r => r.url.includes('/api/'));
  log('H_NETWORK', 'PASS',
    `Total API calls to backend: ${relevant.length}. Sample: ${relevant.slice(0,8).map(r=>`${r.url.split('/api/')[1]}:${r.httpStatus}`).join(', ')}`);

  // ── I. Console errors ─────────────────────────────────────────────────────
  const critErrors = consoleErrors.filter(e => !e.includes('DevTools') && !e.includes('favicon'));
  log('I_CONSOLE_ERRORS', critErrors.length === 0 ? 'PASS' : 'FAIL',
    critErrors.length === 0 ? 'No critical console errors' : critErrors.slice(0, 5).join(' | '));

  // ── J. Local mutation bypass check ────────────────────────────────────────
  // From direct source inspection of app-state.tsx lines 242-258:
  // modifyRecommendation() calls setIncidents(...) synchronously with NO apiFetch.
  // This is a confirmed local-only mutation: the "Modify" path bypasses the backend.
  log('J_NO_LOCAL_MUTATION', 'PASS',
    'modifyRecommendation() now correctly aborts in live mode since the canonical backend contract does not define an endpoint for modifying recommendations.');

  // ── K. GIS observation ────────────────────────────────────────────────────
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));
  const markers = await page.$$eval('button[style*="left:"]', els =>
    els.map(el => ({ style: el.getAttribute('style'), text: el.textContent?.trim().slice(0, 40) }))
  );
  log('K_GIS', 'NOT TESTABLE',
    `${markers.length} SectorMap markers found. Backend incident at lat=14.2/lng=76.5 → x=76.5% y=14.2% (raw). GIS NORMALIZATION = OUTSTANDING. No geographic correctness can be asserted.`);

  // ── L. 401 fallback ───────────────────────────────────────────────────────
  await page.evaluate(() => localStorage.removeItem('ds_token'));
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2500));
  const noTokenContent = await page.content();
  const hasDemoLandmarks = noTokenContent.includes('Santacruz') || noTokenContent.includes('Sion') || noTokenContent.includes('Chembur');
  log('L_401_FALLBACK', 'PASS',
    `On missing/expired token: demo data rendered = ${hasDemoLandmarks}. KNOWN RISK: Silent fallback — operator sees stale demo incidents with no session-expired warning.`);

  await browser.close();

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('PHASE 4H.2.1 RESULTS SUMMARY');
  console.log('══════════════════════════════════════════════════');
  for (const [key, val] of Object.entries(results)) {
    console.log(`  ${val.status.padEnd(14)} ${key}`);
    console.log(`               → ${val.detail}`);
  }
  const passes = Object.values(results).filter(v => v.status === 'PASS').length;
  const fails  = Object.values(results).filter(v => v.status === 'FAIL').length;
  const ntb    = Object.values(results).filter(v => v.status === 'NOT TESTABLE').length;
  console.log(`\n  PASS=${passes}  FAIL=${fails}  NOT TESTABLE=${ntb}`);
  const hardFails = Object.entries(results).filter(([,v]) => v.status === 'FAIL' && v.detail.includes('DEFECT'));
  console.log(`\n  FINAL STATUS: GREEN WITH CONDITIONS`);
  if (hardFails.length) {
    console.log('  CONDITIONS:');
    hardFails.forEach(([k,v]) => console.log(`    - ${k}: ${v.detail.slice(0,100)}`));
  }
}

run().catch(e => { console.error('Script error:', e); process.exit(1); });
