/**
 * VCET-IT Leave & OD Portal — Shared Utilities
 * Include this file in every portal page AFTER setting GAS_URL
 */

'use strict';

/* ══════════════════════════════════════════
   CONFIG — override in each page if needed
══════════════════════════════════════════ */
if (typeof GAS_URL === 'undefined') {
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbzaqKnt-wRgVRJP8IJXIPIEWZPLtbOi7CvoYnDCMhoyP6z7QlVYOqmCD5TOwpCrxXkE9Q/exec';
}

/* ══════════════════════════════════════════
   API
══════════════════════════════════════════ */
async function api(action, data = {}) {
  if (!GAS_URL || GAS_URL.includes('YOUR_GOOGLE'))
    throw new Error('GAS_URL not configured.');
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, data })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.msg || 'API error');
  return json;
}

/* ══════════════════════════════════════════
   DOM / TOAST / LOADER
══════════════════════════════════════════ */
const $ = id => document.getElementById(id);

function showG(txt = 'Loading…') { $('gLoader').style.display = 'flex'; $('gLoaderTxt').textContent = txt; }
function hideG() { $('gLoader').style.display = 'none'; }

function toast(msg, type = 'inf') {
  const icons = { suc: 'fa-check-circle', err: 'fa-times-circle', inf: 'fa-info-circle', war: 'fa-exclamation-triangle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i><span>${msg}</span>`;
  $('toastZone').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function openModal(id)  { $(id).classList.add('show'); }
function closeModal(id) { $(id).classList.remove('show'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-bg')) e.target.classList.remove('show');
});

/* ══════════════════════════════════════════
   FORMATTERS / BADGES
══════════════════════════════════════════ */
function statusBadge(s) {
  const map = {
    Pending: 'badge-pending', Approved: 'badge-approved',
    Rejected: 'badge-rejected', Forwarded: 'badge-forwarded',
    'HoD Review': 'badge-hodreview'
  };
  return `<span class="badge ${map[s] || 'badge-pending'}">${s || 'Pending'}</span>`;
}
function typeBadge(t) {
  const map = { Leave: 'badge-leave', OD: 'badge-od', Medical: 'badge-medical', Emergency: 'badge-emergency' };
  return `<span class="badge ${map[t] || 'badge-leave'}">${t}</span>`;
}
function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return d; }
}
function todayISO() { return new Date().toISOString().split('T')[0]; }
function getInitials(name) {
  return (name || '').split(' ').slice(0, 2).map(n => n[0] || '').join('').toUpperCase() || '?';
}

/* ══════════════════════════════════════════
   CHARTS
══════════════════════════════════════════ */
let charts = {};
function destroyCharts() {
  Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) {} });
  charts = {};
}
function chartDefaultOpts() {
  const tc = getComputedStyle(document.documentElement).getPropertyValue('--txt2').trim() || '#4a6080';
  const gc = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#dde6f0';
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: tc, boxWidth: 12, padding: 12 } } },
    scales: {
      x: { grid: { color: gc }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: tc } },
      y: { grid: { color: gc }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: tc }, beginAtZero: true }
    }
  };
}
function doughnutOpts() {
  const tc = getComputedStyle(document.documentElement).getPropertyValue('--txt2').trim() || '#4a6080';
  return { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: tc, boxWidth: 12, padding: 10 } } } };
}

/* ══════════════════════════════════════════
   SKELETONS / ERROR
══════════════════════════════════════════ */
function skeleton(rows = 3) {
  return `<div style="padding:16px;display:flex;flex-direction:column;gap:10px">${
    Array(rows).fill(0).map(() => `<div class="sk-line" style="width:${60 + (Math.random() * 35 | 0)}%"></div>`).join('')
  }</div>`;
}
function errBlock(msg) {
  return `<div style="max-width:480px;margin:0 auto">
    <div style="background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);border-radius:var(--r);padding:24px;text-align:center">
      <i class="fas fa-exclamation-triangle" style="font-size:32px;color:var(--dan);display:block;margin-bottom:12px"></i>
      <div style="font-weight:700;color:var(--dan);margin-bottom:6px">Failed to load data</div>
      <div style="font-size:13px;color:var(--txt2);margin-bottom:16px">${msg}</div>
      <button class="btn btn-pri" onclick="loadPage(currentPage)"><i class="fas fa-sync-alt"></i> Try Again</button>
    </div>
  </div>`;
}
function sCard(label, val, icon, cls) {
  return `<div class="stat-card ${cls}"><div class="stat-icon"><i class="fas ${icon}"></i></div><div class="stat-val">${val}</div><div class="stat-lbl">${label}</div></div>`;
}

/* ══════════════════════════════════════════
   TABLE FILTER / SEARCH
══════════════════════════════════════════ */
function filterTbl(val, tblId) {
  document.querySelectorAll(`#${tblId} tbody tr`).forEach(r => {
    r.style.display = (!val || r.textContent.toLowerCase().includes(val.toLowerCase())) ? '' : 'none';
  });
}
function searchTbl(val, tblId) {
  document.querySelectorAll(`#${tblId} tbody tr`).forEach(r => {
    r.style.display = (!val || r.textContent.toLowerCase().includes(val.toLowerCase())) ? '' : 'none';
  });
}

/* ══════════════════════════════════════════
   THEME
══════════════════════════════════════════ */
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  localStorage.setItem('vcet_theme', isDark ? 'light' : 'dark');
  updateThemeUI();
  destroyCharts();
  setTimeout(() => { if (typeof loadPage === 'function') loadPage(currentPage); }, 50);
}
function updateThemeUI() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const ico = $('themeIco'), txt = $('themeTxt');
  if (ico) ico.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  if (txt) txt.textContent = isDark ? 'Light' : 'Dark';
}
(function initTheme() {
  const saved = localStorage.getItem('vcet_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  updateThemeUI();
})();

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
function toggleSidebar() {
  const sb = $('sidebar'), ov = $('sbOverlay');
  if (window.innerWidth <= 768) { sb.classList.toggle('open'); ov.classList.toggle('show'); }
}
function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sbOverlay').classList.remove('show');
}

function buildSidebar(items, roleName, user, pendingCount = 0) {
  $('sbAvatar').textContent = getInitials(user.name);
  $('sbName').textContent   = user.name;
  $('sbRole').textContent   = user.role;
  let html = `<div class="nav-sec-label">${roleName} Portal</div>`;
  items.forEach(item => {
    const showBadge = ['pending', 'forwarded', 'hodApprove'].includes(item.id) && pendingCount > 0;
    const badge = showBadge ? `<span class="nav-badge">${pendingCount}</span>` : '';
    html += `<button class="nav-link" id="nl_${item.id}" onclick="nav('${item.id}')">
      <i class="fas ${item.icon}"></i><span>${item.label}</span>${badge}
    </button>`;
  });
  $('sidebarNav').innerHTML = html;
}

/* ══════════════════════════════════════════
   REVIEW MODAL (shared)
══════════════════════════════════════════ */
let _reviewCache = null;

async function openReview(reqId, role, fetchFn) {
  let req = null;
  // Search all cached datasets
  const caches = [window._allData, window._hodAllData, window._hodPendingData, window._pendingData]
    .filter(Boolean).flatMap(a => Array.isArray(a) ? a : []);
  req = caches.find(r => r.RequestID === reqId);

  if (!req && typeof fetchFn === 'function') {
    try { req = await fetchFn(reqId); } catch (e) { toast('Could not load request details', 'err'); return; }
  }
  if (!req) { toast('Request not found', 'err'); return; }
  _reviewCache = req;

  const hodSt  = req.HoDStatus || 'Pending';
  const hodCls = hodSt.toLowerCase().replace(/\s+/g, '');

  $('mReviewBody').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div>
        <div style="font-size:10px;color:var(--txt3);text-transform:uppercase;letter-spacing:.8px;font-weight:700">Request ID</div>
        <div style="font-size:22px;font-weight:800;color:var(--pri)">${req.RequestID}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${typeBadge(req.LeaveType)} ${statusBadge(req.FinalStatus)}</div>
    </div>
    <div class="info-grid" style="margin-bottom:14px">
      <div class="info-item"><label>Student Name</label><p>${req.StudentName}</p></div>
      <div class="info-item"><label>Reg. No</label><p>${req.RegNo}</p></div>
      <div class="info-item"><label>Year / Section</label><p>${req.Year || '—'} / ${req.Section || '—'}</p></div>
      <div class="info-item"><label>Leave Type</label><p>${req.LeaveType}</p></div>
      <div class="info-item"><label>From Date</label><p>${fmtDate(req.FromDate)}</p></div>
      <div class="info-item"><label>To Date</label><p>${fmtDate(req.ToDate)}</p></div>
      <div class="info-item"><label>Total Days</label><p>${req.TotalDays} day(s)</p></div>
      <div class="info-item"><label>Applied On</label><p>${fmtDate(req.ApplyDate)}</p></div>
    </div>
    <div style="margin-bottom:14px">
      <div class="flbl" style="margin-bottom:5px">Reason</div>
      <div style="background:var(--surface2);border-radius:var(--r-sm);padding:11px;font-size:13px;border:1px solid var(--border)">${req.Reason}</div>
    </div>
    ${req.ODEvent ? `<div style="margin-bottom:14px"><div class="flbl">Event / Venue</div><div style="font-size:13px;color:var(--txt2)">${req.ODEvent} — ${req.ODVenue || ''}</div></div>` : ''}
    <div class="divider"></div>
    <div style="font-size:11px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:10px">Approval Trail</div>
    <div class="timeline">
      <div class="tl-item ${(req.MentorStatus || 'pending').toLowerCase()}">
        <div class="tl-date">Step 1 — Mentor Review ${req.MentorActionDate ? '• ' + fmtDate(req.MentorActionDate) : ''}</div>
        <div class="tl-text">${req.MentorStatus || 'Pending'}${req.MentorRemarks ? ' — ' + req.MentorRemarks : ''}</div>
      </div>
      <div class="tl-item ${(req.ChairpersonStatus || 'pending').toLowerCase()}">
        <div class="tl-date">Step 2 — Chairperson Review ${req.ChairpersonActionDate ? '• ' + fmtDate(req.ChairpersonActionDate) : ''}</div>
        <div class="tl-text">${req.ChairpersonStatus || 'Pending'}${req.ChairpersonRemarks ? ' — ' + req.ChairpersonRemarks : ''}</div>
      </div>
      <div class="tl-item ${hodCls}">
        <div class="tl-date">Step 3 — HoD Final Approval ${req.HoDActionDate ? '• ' + fmtDate(req.HoDActionDate) : ''}</div>
        <div class="tl-text">${hodSt}${req.HoDRemarks ? ' — ' + req.HoDRemarks : ''}</div>
      </div>
    </div>
    ${role !== 'view' ? `<div class="divider"></div><div class="fgrp"><label class="flbl">Remarks</label><textarea class="ftxt" id="reviewRemark" style="min-height:60px" placeholder="Add remarks (optional)…"></textarea></div>` : ''}`;

  const foot = $('mReviewFoot');
  if (role === 'mentor') {
    foot.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('mReview')">Close</button>
      <button class="btn btn-dan" onclick="actFromReview('Rejected','mentor')"><i class="fas fa-times"></i> Reject</button>
      <button class="btn btn-suc" onclick="actFromReview('Approved','mentor')"><i class="fas fa-check"></i> Approve → Chairperson</button>`;
  } else if (role === 'chair') {
    foot.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('mReview')">Close</button>
      <button class="btn btn-dan" onclick="actFromReview('Rejected','chair')"><i class="fas fa-times"></i> Reject</button>
      <button class="btn btn-hod" onclick="actFromReview('Approved','chair')"><i class="fas fa-arrow-up"></i> Approve → HoD</button>`;
  } else if (role === 'hod') {
    foot.innerHTML = `
      <button class="btn btn-ghost" onclick="closeModal('mReview')">Close</button>
      <button class="btn btn-dan" onclick="actFromReview('Rejected','hod')"><i class="fas fa-times"></i> Final Reject</button>
      <button class="btn btn-suc" onclick="actFromReview('Approved','hod')"><i class="fas fa-stamp"></i> Final Approve</button>`;
  } else {
    foot.innerHTML = `<button class="btn btn-ghost" onclick="closeModal('mReview')">Close</button>`;
  }
  openModal('mReview');
}

async function actFromReview(action, role) {
  if (!_reviewCache) return;
  const remarks = ($('reviewRemark') || {}).value || '';
  closeModal('mReview');
  await doAct(_reviewCache.RequestID, action, role, remarks);
}
async function quickAct(reqId, action, role) {
  await doAct(reqId, action, role, action === 'Approved' ? 'Approved' : 'Rejected');
}

/* ══════════════════════════════════════════
   PDF GENERATION (shared)
══════════════════════════════════════════ */
function generatePDF(data, reportType = 'all', userName = 'User', userRole = '') {
  if (!data || !data.length) { toast('No data for selected filters', 'war'); return; }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 39, 68); doc.rect(0, 0, pw, 28, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.text('VELAMMAL COLLEGE OF ENGINEERING AND TECHNOLOGY', pw / 2, 9, { align: 'center' });
  doc.setFontSize(9); doc.text('Department of Information Technology — Leave & OD Sanction Report', pw / 2, 16, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')} | By: ${userName} (${userRole}) | Records: ${data.length}`, pw / 2, 22, { align: 'center' });

  doc.setTextColor(15, 39, 68); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  const sy = 33;
  [
    `Total: ${data.length}`,
    `Approved: ${data.filter(r => r.FinalStatus === 'Approved').length}`,
    `HoD Review: ${data.filter(r => r.FinalStatus === 'HoD Review').length}`,
    `Rejected: ${data.filter(r => r.FinalStatus === 'Rejected').length}`,
    `Leave: ${data.filter(r => r.LeaveType === 'Leave').length}`,
    `OD: ${data.filter(r => r.LeaveType === 'OD').length}`
  ].forEach((s, i) => doc.text(s, 14 + i * 44, sy));

  doc.autoTable({
    startY: sy + 5,
    head: [['Req ID', 'Reg No', 'Student', 'Yr/Sec', 'Type', 'From', 'To', 'Days', 'Reason', 'Mentor', 'Chair', 'HoD', 'Status']],
    body: data.map(r => [
      r.RequestID, r.RegNo, r.StudentName,
      (r.Year || '?') + '-' + (r.Section || '?'),
      r.LeaveType, r.FromDate, r.ToDate, r.TotalDays,
      r.Reason ? r.Reason.slice(0, 30) : '—',
      r.MentorStatus, r.ChairpersonStatus, r.HoDStatus || 'Pending', r.FinalStatus
    ]),
    styles: { fontSize: 7, cellPadding: 2.2, font: 'helvetica', overflow: 'linebreak' },
    headStyles: { fillColor: [224, 92, 26], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [240, 247, 255] },
    didDrawCell: (d) => {
      if (d.section === 'body' && d.column.index === 12) {
        const v = d.cell.raw;
        const clr = v === 'Approved' ? [5, 150, 105] : v === 'Rejected' ? [220, 38, 38] : v === 'HoD Review' ? [124, 58, 237] : [217, 119, 6];
        doc.setTextColor(...clr); doc.setFontSize(7);
        doc.text(v, d.cell.x + d.cell.padding('left'), d.cell.y + d.cell.height / 2 + 2);
        doc.setTextColor(0, 0, 0);
      }
    }
  });

  const pc = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pc; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
    doc.text(`Page ${i} of ${pc} | VCET-IT Leave Management System | Confidential`, pw / 2, doc.internal.pageSize.getHeight() - 4, { align: 'center' });
  }
  doc.save(`VCET_IT_Leave_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  toast('PDF downloaded!', 'suc');
}

/* ══════════════════════════════════════════
   SHARED MODAL HTML FRAGMENTS
══════════════════════════════════════════ */
function getReviewModalHTML() {
  return `
  <div class="modal-bg" id="mReview">
    <div class="modal-box">
      <div class="modal-head">
        <div class="modal-title"><i class="fas fa-clipboard-check text-acc"></i> Review Request</div>
        <button class="modal-close" onclick="closeModal('mReview')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" id="mReviewBody"></div>
      <div class="modal-foot" id="mReviewFoot"></div>
    </div>
  </div>`;
}
function getReportModalHTML() {
  return `
  <div class="modal-bg" id="mReport">
    <div class="modal-box">
      <div class="modal-head">
        <div class="modal-title"><i class="fas fa-file-pdf text-dan"></i> Generate PDF Report</div>
        <button class="modal-close" onclick="closeModal('mReport')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="fgrp"><label class="flbl">Report Type</label>
          <select class="fsel" id="rType" onchange="onReportTypeChange()">
            <option value="all">All Requests</option>
            <option value="daywise">Day Wise</option>
            <option value="daterange">Date Range</option>
            <option value="monthwise">Month Wise</option>
            <option value="studentwise">Student Wise</option>
            <option value="yearwise">Year Wise</option>
          </select>
        </div>
        <div id="rDayField"     class="fgrp" style="display:none"><label class="flbl">Date</label><input type="date" class="finp" id="rDay"></div>
        <div id="rRangeField"   style="display:none">
          <div class="fcols2">
            <div class="fgrp"><label class="flbl">From</label><input type="date" class="finp" id="rFrom"></div>
            <div class="fgrp"><label class="flbl">To</label><input type="date" class="finp" id="rTo"></div>
          </div>
        </div>
        <div id="rMonthField"   class="fgrp" style="display:none"><label class="flbl">Month &amp; Year</label><input type="month" class="finp" id="rMonth"></div>
        <div id="rStudentField" class="fgrp" style="display:none"><label class="flbl">Reg No / Name</label><input type="text" class="finp" id="rStudent" placeholder="Reg. No or Name"></div>
        <div id="rYearField"    style="display:none">
          <div class="fcols2">
            <div class="fgrp"><label class="flbl">Year</label><select class="fsel" id="rYear"><option value="">All</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></div>
            <div class="fgrp"><label class="flbl">Section</label><select class="fsel" id="rSection"><option value="">All</option><option>A</option><option>B</option></select></div>
          </div>
        </div>
        <div class="fgrp"><label class="flbl">Status Filter</label>
          <select class="fsel" id="rStatus">
            <option value="">All Status</option>
            <option>Approved</option><option>Rejected</option><option>Pending</option><option>Forwarded</option><option>HoD Review</option>
          </select>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="closeModal('mReport')">Cancel</button>
        <button class="btn btn-acc" onclick="generateReport()"><i class="fas fa-file-download"></i> Generate &amp; Download</button>
      </div>
    </div>
  </div>`;
}

function onReportTypeChange() {
  const t = $('rType').value;
  $('rDayField').style.display     = t === 'daywise'     ? 'block' : 'none';
  $('rRangeField').style.display   = t === 'daterange'   ? 'block' : 'none';
  $('rMonthField').style.display   = t === 'monthwise'   ? 'block' : 'none';
  $('rStudentField').style.display = t === 'studentwise' ? 'block' : 'none';
  $('rYearField').style.display    = ['yearwise', 'studentwise'].includes(t) ? 'block' : 'none';
}
