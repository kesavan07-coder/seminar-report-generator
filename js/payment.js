/**
 * Payment Module — Razorpay ₹5 Integration
 * Handles: Payment Modal, Order Creation, Razorpay Checkout with UPI / Dynamic QR,
 *          Signature Verification, PDF Download, Transaction Dashboard
 */

'use strict';

// ============================================================
// Payment State Machine
// ============================================================
const PaymentState = {
  IDLE: 'idle',
  PENDING: 'pending',
  CREATED: 'created',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

let paymentState = PaymentState.IDLE;
let currentOrderId = null;
let currentPaymentToken = null;
let pendingFormData = null;     // Saved form data while payment modal is open
let isPayButtonLocked = false;    // Anti-double-click guard
let isCouponButtonLocked = false; // Anti-double-click guard for coupon
let cachedOrderData = null;

// ============================================================
// DOM Helpers
// ============================================================
function getEl(id) { return document.getElementById(id); }

async function showPaymentModal(formData) {
  pendingFormData = { ...formData, _pptOnlyMode: false };

  // Fetch current pricing
  const pricing = await fetchPublicPricing();
  const rpPricing = pricing ? pricing.reportAndPpt : null;

  if (rpPricing && (rpPricing.mode === 'free' || rpPricing.amountPaise === 0)) {
    // Report + PPT is configured as Free — generate directly without payment!
    if (typeof window.generateReportAfterPayment === 'function') {
      window.generateReportAfterPayment(formData, null, null);
    }
    return;
  }

  // Configure modal for Report + PPT with dynamic amount
  const amountRupees = rpPricing ? (rpPricing.amountPaise / 100).toFixed(0) : '5';

  const titleEl = getEl('payment-modal-title');
  if (titleEl) titleEl.textContent = 'Choose Payment Method';

  const subtitleEl = document.querySelector('.payment-subtitle');
  if (subtitleEl) subtitleEl.textContent = 'Official COE/IQAC Format 3-Page Document • Instant Access';

  const feeAmountEl = document.querySelector('#razorpay-option .fee-amount-inline');
  if (feeAmountEl) feeAmountEl.textContent = `₹${amountRupees}`;

  const feeLabelEl = document.querySelector('#razorpay-option .fee-label-inline');
  if (feeLabelEl) feeLabelEl.textContent = 'Report Generation Fee';

  const payBtnText = getEl('pay-btn-text');
  if (payBtnText) payBtnText.textContent = `Pay ₹${amountRupees} & Generate Report`;

  const optionHeaderSpan = document.querySelector('#razorpay-option .access-option-header span');
  if (optionHeaderSpan) optionHeaderSpan.textContent = `Pay ₹${amountRupees} with Razorpay`;

  getEl('pay-student-name').textContent = formData.studentName || '—';
  getEl('pay-topic').textContent        = formData.topic || '—';
  clearPaymentStatus();
  resetPayButton();
  resetCouponSection();

  // Show modal
  getEl('payment-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hidePaymentModal() {
  getEl('payment-modal').classList.add('hidden');
  document.body.style.overflow = '';
  clearPaymentStatus();
  resetPayButton();
  resetCouponSection();
  isPayButtonLocked = false;
  isCouponButtonLocked = false;
}

function clearPaymentStatus() {
  const area = getEl('payment-status-area');
  if (area) area.innerHTML = '';
}

function setPaymentStatus(type, message) {
  // type: 'info' | 'success' | 'error' | 'loading'
  const area = getEl('payment-status-area');
  if (!area) return;

  const icons = {
    info:    '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>',
    success: '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>',
    error:   '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/></svg>',
    loading: '<span class="loader-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;"></span>'
  };

  area.innerHTML = `
    <div class="payment-status payment-status-${type}">
      ${icons[type] || ''}
      <span>${message}</span>
    </div>`;
}

function lockPayButton(loadingText = 'Processing...') {
  isPayButtonLocked = true;
  const btn = getEl('btn-pay');
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add('btn-pay-loading');
  const spinner = getEl('pay-btn-spinner');
  const icon    = getEl('pay-btn-icon');
  const text    = getEl('pay-btn-text');
  if (spinner) spinner.style.display = 'inline-block';
  if (icon)    icon.style.display    = 'none';
  if (text)    text.textContent      = loadingText;
}

function resetPayButton() {
  isPayButtonLocked = false;
  const btn = getEl('btn-pay');
  if (!btn) return;
  btn.disabled = false;
  btn.classList.remove('btn-pay-loading');
  const spinner = getEl('pay-btn-spinner');
  const icon    = getEl('pay-btn-icon');
  const text    = getEl('pay-btn-text');
  if (spinner) spinner.style.display = 'none';
  if (icon)    icon.style.display    = '';
  if (text) {
    if (pendingFormData && pendingFormData._pptOnlyMode) {
      const amt = (adminPricingCache && adminPricingCache.pptOnly && adminPricingCache.pptOnly.amountRupees) || 5;
      text.textContent = `Pay ₹${amt} & Generate PPT`;
    } else {
      const amt = (adminPricingCache && adminPricingCache.reportAndPpt && adminPricingCache.reportAndPpt.amountRupees) || 5;
      text.textContent = `Pay ₹${amt} & Generate Report`;
    }
  }
}

// ============================================================
// Coupon Helpers
// ============================================================
function resetCouponSection() {
  isCouponButtonLocked = false;
  const input = getEl('coupon-code-input');
  const btn   = getEl('btn-apply-coupon');
  const area  = getEl('coupon-status-area');
  if (input)  { input.value = ''; input.disabled = false; }
  if (btn)    { btn.disabled = false; }
  const spinnerEl = getEl('coupon-btn-spinner');
  const textEl    = getEl('coupon-btn-text');
  if (spinnerEl) spinnerEl.style.display = 'none';
  if (textEl)    textEl.textContent = 'Apply Coupon';
  if (area)      area.innerHTML = '';
}

function setCouponStatus(type, message, subMessage = '') {
  const area = getEl('coupon-status-area');
  if (!area) return;
  if (type === 'success') {
    area.innerHTML = `
      <div class="coupon-status-success">
        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16" style="flex-shrink:0;color:#15803d;">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
        </svg>
        <div>
          <div class="coupon-status-success-title">${message}</div>
          ${subMessage ? `<div class="coupon-status-success-sub">${subMessage}</div>` : ''}
        </div>
      </div>`;
  } else if (type === 'error') {
    area.innerHTML = `
      <div class="coupon-status-error">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="flex-shrink:0;">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
        </svg>
        <span>${message}</span>
      </div>`;
  }
}

function lockCouponButton(loadingText = 'Validating...') {
  isCouponButtonLocked = true;
  const btn   = getEl('btn-apply-coupon');
  const input = getEl('coupon-code-input');
  if (btn)   btn.disabled = true;
  if (input) input.disabled = true;
  const spinnerEl = getEl('coupon-btn-spinner');
  const textEl    = getEl('coupon-btn-text');
  if (spinnerEl) spinnerEl.style.display = 'inline-block';
  if (textEl)    textEl.textContent = loadingText;
}

function unlockCouponButton() {
  isCouponButtonLocked = false;
  const btn   = getEl('btn-apply-coupon');
  const input = getEl('coupon-code-input');
  if (btn)   btn.disabled = false;
  if (input) input.disabled = false;
  const spinnerEl = getEl('coupon-btn-spinner');
  const textEl    = getEl('coupon-btn-text');
  if (spinnerEl) spinnerEl.style.display = 'none';
  if (textEl)    textEl.textContent = 'Apply Coupon';
}

// ============================================================
// API Calls
// ============================================================
async function apiCreateOrder(studentName, topic, subject, service = 'reportAndPpt', couponCode = null) {
  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentName, topic, subject, service, couponCode })
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to initialize payment order.');
  }
  return data; // { orderId, amount, amountRupees, currency, keyId, isTestMode, isSimulated, service, appliedCoupon }
}

async function apiVerifyPayment({ razorpay_order_id, razorpay_payment_id, razorpay_signature, isTestMode }) {
  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature, isTestMode })
  });
  const data = await response.json();
  if (!response.ok || !data.verified) {
    throw new Error(data.error || 'Payment verification failed.');
  }
  return data; // { verified: true, paymentToken, orderId, paymentId }
}

async function apiRecordStatus(orderId, status, reason) {
  try {
    await fetch('/api/record-payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status, reason: reason || null })
    });
  } catch (e) {
    // Non-critical — don't throw
    console.warn('[Payment] Failed to record status update:', e.message);
  }
}

async function apiValidateCoupon(couponCode, studentName, topic, subject, service = 'reportAndPpt') {
  const response = await fetch('/api/validate-coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ couponCode, studentName, topic, subject, service })
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || 'Coupon validation failed.');
  }
  return data;
}

// ============================================================
// Coupon Flow & Admin Portal State
// ============================================================
let currentAdminToken = null;
try {
  currentAdminToken = sessionStorage.getItem('mec_admin_token') || null;
} catch (e) {}

async function applyCoupon() {
  if (isCouponButtonLocked) return;
  if (!pendingFormData) return;

  const input = getEl('coupon-code-input');
  const couponCode = input ? input.value.trim() : '';

  if (!couponCode) {
    setCouponStatus('error', 'Please enter a coupon code.');
    return;
  }

  lockCouponButton('Validating...');
  getEl('coupon-status-area').innerHTML = '';

  const service = (pendingFormData && pendingFormData._pptOnlyMode) ? 'pptOnly' : 'reportAndPpt';

  let result;
  try {
    result = await apiValidateCoupon(
      couponCode,
      pendingFormData.studentName,
      pendingFormData.topic,
      pendingFormData.subject,
      service
    );
  } catch (err) {
    setCouponStatus('error', err.message || 'Invalid coupon code.');
    unlockCouponButton();
    return;
  }

  if (!result.valid) {
    setCouponStatus('error', result.error || 'Invalid coupon code.');
    unlockCouponButton();
    return;
  }

  // Case A: 100% Discount / ₹0 payable -> generate directly without payment gateway!
  if (result.isFreeAfterDiscount) {
    currentPaymentToken = result.couponToken;
    paymentState = PaymentState.SUCCESS;

    setCouponStatus('success', 'Coupon Verified ✓', result.message || '100% discount — Generating document...');
    lockCouponButton('Coupon Applied ✓');
    const payBtn = getEl('btn-pay');
    if (payBtn) { payBtn.disabled = true; payBtn.style.opacity = '0.5'; }

    await new Promise(r => setTimeout(r, 900));
    hidePaymentModal();

    if (pendingFormData && pendingFormData._pptOnlyMode && typeof pendingFormData._pptOnlyCallback === 'function') {
      pendingFormData._pptOnlyCallback(currentPaymentToken, null);
    } else if (typeof window.generateReportAfterPayment === 'function') {
      window.generateReportAfterPayment(pendingFormData, currentPaymentToken, null);
    }
    return;
  }

  // Case B: Partial Discount -> user will pay discounted amount via gateway
  pendingFormData._appliedCouponCode = result.couponCode;
  setCouponStatus('success', 'Coupon Applied ✓', result.message);
  lockCouponButton(`Applied: -₹${result.discountRupees}`);

  // Update payment UI with the discounted payable amount
  const payBtnText = getEl('pay-btn-text');
  if (payBtnText) {
    const srvName = (pendingFormData && pendingFormData._pptOnlyMode) ? 'PPT' : 'Report';
    payBtnText.textContent = `Pay ₹${result.finalPayableRupees} & Generate ${srvName}`;
  }
  const feeAmountEl = document.querySelector('#razorpay-option .fee-amount-inline');
  if (feeAmountEl) feeAmountEl.textContent = `₹${result.finalPayableRupees}`;

  const feeLabelEl = document.querySelector('#razorpay-option .fee-label-inline');
  if (feeLabelEl) feeLabelEl.textContent = `Discounted Fee (₹${result.discountRupees} off)`;
}

// ============================================================
// Admin Portal & Generated Reports History & Coupons
// ============================================================
let currentAdminTab = 'overview';
let currentViewingReport = null;

function showAdminModal() {
  const modal = getEl('admin-modal');
  if (!modal) return;

  if (currentAdminToken) {
    showAdminDashboardView();
  } else {
    showAdminLoginView();
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function hideAdminModal() {
  const modal = getEl('admin-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

function showAdminLoginView() {
  getEl('admin-login-view')?.classList.remove('hidden');
  getEl('admin-dashboard-view')?.classList.add('hidden');
  const status = getEl('admin-login-status');
  if (status) status.innerHTML = '';
  const uInput = getEl('admin-username');
  if (uInput) setTimeout(() => uInput.focus(), 150);
}

function showAdminDashboardView() {
  getEl('admin-login-view')?.classList.add('hidden');
  getEl('admin-dashboard-view')?.classList.remove('hidden');
  switchAdminTab(currentAdminTab || 'overview');
}

function switchAdminTab(tabName) {
  currentAdminTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.admin-tab-btn[data-admin-tab]').forEach(btn => {
    if (btn.dataset.adminTab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update panels
  const panels = {
    'overview': getEl('admin-panel-overview'),
    'reports': getEl('admin-panel-reports'),
    'generate-coupon': getEl('admin-panel-generate-coupon'),
    'coupons-log': getEl('admin-panel-coupons-log'),
    'pricing': getEl('admin-panel-pricing')
  };

  Object.entries(panels).forEach(([key, panel]) => {
    if (!panel) return;
    if (key === tabName) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  });

  if (tabName === 'overview') {
    loadAdminOverview();
  } else if (tabName === 'reports') {
    loadAdminReports();
  } else if (tabName === 'coupons-log') {
    loadAdminCoupons();
  } else if (tabName === 'pricing') {
    loadAdminPricing();
  }
}

async function handleAdminLogin() {
  const uInput = getEl('admin-username');
  const pInput = getEl('admin-password');
  const status = getEl('admin-login-status');
  const spinner = getEl('admin-login-spinner');
  const btnText = getEl('admin-login-text');
  const btn = getEl('btn-admin-login');

  const username = uInput ? uInput.value.trim() : '';
  const password = pInput ? pInput.value : '';

  if (!username || !password) {
    if (status) status.innerHTML = '<div class="payment-status payment-status-error"><span>Please enter username and password.</span></div>';
    return;
  }

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'Authenticating...';
  if (status) status.innerHTML = '';

  try {
    const response = await fetch('/api/admin-coupon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Invalid admin credentials.');
    }

    currentAdminToken = data.adminToken;
    try { sessionStorage.setItem('mec_admin_token', currentAdminToken); } catch (e) {}

    if (pInput) pInput.value = '';
    showAdminDashboardView();

  } catch (err) {
    if (status) status.innerHTML = `<div class="payment-status payment-status-error"><span>${err.message}</span></div>`;
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Login';
  }
}

async function handleAdminLogout() {
  const tokenToRevoke = currentAdminToken;
  currentAdminToken = null;
  currentViewingReport = null;
  try { sessionStorage.removeItem('mec_admin_token'); } catch (e) {}
  getEl('admin-coupon-result')?.classList.add('hidden');
  getEl('admin-report-view-modal')?.classList.add('hidden');
  showAdminLoginView();

  if (tokenToRevoke) {
    try {
      await fetch('/api/admin-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToRevoke}`
        },
        body: JSON.stringify({ action: 'logout', adminToken: tokenToRevoke })
      });
    } catch (e) {
      // Non-fatal
    }
  }
}

// ── Admin Reports History Loading & Filtering ──
async function loadAdminReports() {
  const tbody = getEl('admin-reports-table-body');
  const countEl = getEl('admin-reports-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:24px;"><span class="loader-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Loading generated reports...</td></tr>';

  const search = getEl('admin-reports-search')?.value.trim() || '';
  const paymentMethod = getEl('admin-reports-filter-payment')?.value || 'all';
  const date = getEl('admin-reports-filter-date')?.value || '';

  const queryParams = new URLSearchParams({
    action: 'list',
    search,
    paymentMethod,
    date
  });

  try {
    const response = await fetch(`/api/admin-reports?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        handleAdminLogout();
        alert('Admin session expired. Please log in again.');
        return;
      }
      throw new Error(data.error || 'Failed to load generated reports.');
    }

    const reports = data.reports || [];
    if (countEl) countEl.textContent = reports.length;

    if (reports.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:28px;">No reports found matching your criteria.</td></tr>';
      return;
    }

    const formatDateStr = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN');
    };

    tbody.innerHTML = reports.map(r => {
      const isCoupon = r.paymentMethod === 'Offline Coupon';
      const paymentBadge = isCoupon
        ? '<span class="admin-payment-pill pill-coupon">🎟️ Offline Coupon</span>'
        : '<span class="admin-payment-pill pill-razorpay">⚡ Razorpay</span>';

      const paymentDetails = isCoupon && r.couponCode
        ? `<br><span style="font-family:monospace;font-size:0.75rem;color:#64748b;">${escapeHtml(r.couponCode)}</span>`
        : (r.paymentId ? `<br><span style="font-family:monospace;font-size:0.75rem;color:#64748b;" title="${escapeHtml(r.paymentId)}">${escapeHtml(r.paymentId.substring(0, 14))}...</span>` : '');

      const genDateDisplay = r.generatedDate
        ? `<span style="font-size:0.85rem;font-weight:600;color:#1e293b;">${escapeHtml(r.generatedDate)}</span>`
        : (r.createdAt ? `<span style="font-size:0.85rem;font-weight:600;color:#1e293b;">${formatDateStr(r.createdAt)}</span>` : '—');

      const genTimeDisplay = r.generatedTime
        ? `<br><span style="font-size:0.75rem;color:#64748b;">${escapeHtml(r.generatedTime)}</span>`
        : '';

      return `
        <tr>
          <td>
            <strong style="font-family:monospace;font-size:0.85rem;color:#0f172a;letter-spacing:0.5px;">${escapeHtml(r.reportId)}</strong>
          </td>
          <td>
            <strong style="color:#0f172a;">${escapeHtml(r.studentName)}</strong>
            <div style="font-size:0.78rem;color:#64748b;margin-top:2px;">
              ${escapeHtml(r.registerNo || '—')} &bull; ${escapeHtml(r.department || '—')}
            </div>
          </td>
          <td>
            <div class="txn-topic-cell" title="${escapeHtml(r.topic)}">
              <strong style="color:#0f172a;">${escapeHtml(r.topic)}</strong>
              ${r.subject ? `<div style="font-size:0.78rem;color:#64748b;margin-top:2px;">${escapeHtml(r.subject)}</div>` : ''}
            </div>
          </td>
          <td>
            ${paymentBadge}
            ${paymentDetails}
          </td>
          <td>
            ${genDateDisplay}
            ${genTimeDisplay}
          </td>
          <td style="text-align:center;">
            <div style="display:flex;gap:6px;justify-content:center;align-items:center;">
              <button type="button" class="btn-admin-action btn-admin-view" data-action="view" data-report-id="${escapeHtml(r.reportId)}" title="View Complete 3-Page Report">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
                View
              </button>
              <button type="button" class="btn-admin-action btn-admin-pdf" data-action="pdf" data-report-id="${escapeHtml(r.reportId)}" title="Download Exact Report PDF">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/></svg>
                PDF
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach listeners for View and PDF buttons
    tbody.querySelectorAll('button[data-action="view"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rId = btn.getAttribute('data-report-id');
        if (rId) handleViewReport(rId);
      });
    });

    tbody.querySelectorAll('button[data-action="pdf"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rId = btn.getAttribute('data-report-id');
        if (rId) handleDownloadReportPdf(rId, btn);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:24px;">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ── Admin Report Full Details Modal Viewer ──
async function handleViewReport(reportId) {
  if (!reportId) return;

  const modal = getEl('admin-report-view-modal');
  const metaEl = getEl('report-viewer-meta');
  const contentEl = getEl('report-viewer-content');

  if (!modal) return;

  if (metaEl) {
    metaEl.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding: 20px; color: #64748b;"><span class="loader-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px;"></span> Loading complete seminar report details...</div>';
  }
  if (contentEl) contentEl.innerHTML = '';

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  try {
    const response = await fetch(`/api/admin-reports?action=get&reportId=${encodeURIComponent(reportId)}`, {
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        handleAdminLogout();
        alert('Admin session expired. Please log in again.');
        return;
      }
      throw new Error(data.error || 'Failed to retrieve report details.');
    }

    const r = data.report;
    currentViewingReport = r;

    // Populate Overview Metadata Grid
    if (metaEl) {
      metaEl.innerHTML = `
        <div class="report-viewer-meta-item">
          <label>Report ID</label>
          <span style="font-family:monospace;letter-spacing:0.5px;">${escapeHtml(r.reportId)}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Student Name</label>
          <span>${escapeHtml(r.studentName)}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Register No</label>
          <span>${escapeHtml(r.registerNo || '—')}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Program / Department</label>
          <span>${escapeHtml(r.department || '—')}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Year / Sem / Sec</label>
          <span>${escapeHtml(r.yearSemSec || '—')}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Seminar Topic</label>
          <span>${escapeHtml(r.topic)}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Payment Method</label>
          <span>${r.paymentMethod === 'Offline Coupon' ? '🎟️ Offline Coupon' : '⚡ Razorpay'}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Payment Reference</label>
          <span style="font-family:monospace;">${escapeHtml(r.couponCode || r.paymentId || '—')}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Generated Date & Time</label>
          <span>${escapeHtml(r.generatedDate || '')} ${escapeHtml(r.generatedTime || '')}</span>
        </div>
        <div class="report-viewer-meta-item">
          <label>Course Faculty</label>
          <span>${escapeHtml(r.facultyName || 'Faculty In-Charge')}</span>
        </div>
      `;
    }

    // Generate Diagram if available
    let diagramUri = '';
    if (r.aiContent && r.aiContent.diagram && window.generateDiagramSvg && window.rasterizeSvgToPng) {
      try {
        const svg = window.generateDiagramSvg(r.aiContent.diagram, r.topic);
        diagramUri = await window.rasterizeSvgToPng(svg, r.aiContent.diagram, r.topic, 760, 340);
      } catch (e) {}
    }

    // Render 3 Sheets matching official COE/IQAC layout
    if (contentEl) {
      const headerCode = 'MEC/IQAC/2026-27/COE/136';
      const studentName = escapeHtml(r.studentName);
      const registerNo = escapeHtml(r.registerNo || '7316XXXXXXX');
      const courseCodeName = escapeHtml(r.courseCodeName || 'Course Code & Name');
      const facultyName = escapeHtml(r.facultyName || 'Faculty In-Charge');
      const department = escapeHtml(r.department || 'Computer Science and Engineering');
      const yearSemSec = escapeHtml(r.yearSemSec || 'III / VI / A');
      const academicYear = escapeHtml(r.academicYear || '2026-2027');
      const seminarNo = escapeHtml(r.seminarNo || '01');
      const seminarDate = escapeHtml(r.seminarDate || '');
      const topic = escapeHtml(r.topic);
      const ai = r.aiContent || {};

      const appsList = (Array.isArray(ai.applications) ? ai.applications : []).map(app => {
        return `<li><strong>${escapeHtml(String(app.domain || ''))}:</strong> ${escapeHtml(String(app.text || ''))}</li>`;
      }).join('');

      const refsList = (Array.isArray(ai.references) ? ai.references : []).map(ref => {
        if (ref.style === 'book' || (ref.author && ref.title)) {
          return `<li>${escapeHtml(String(ref.author || ''))}, <em>${escapeHtml(String(ref.title || ''))}</em>.</li>`;
        }
        return `<li>${escapeHtml(String(ref.text || ref.title || 'Institutional Research Report, 2026.'))}</li>`;
      }).join('');

      const letterheadImgSrc = (window.MEC_LETTERHEAD_BASE64 && window.MEC_LETTERHEAD_BASE64.startsWith('data:')) ? window.MEC_LETTERHEAD_BASE64 : 'assets/mec-letterhead.jpeg';

      contentEl.innerHTML = `
        <div class="report-viewer-sheets" style="display:flex;flex-direction:column;gap:24px;align-items:center;">
          <!-- Page 1 Sheet -->
          <div class="sheet-label-tag">PAGE 1 OF 3 (Report Header, Abstract, Introduction &amp; Theme)</div>
          <div class="paper-sheet viewer-page-1" style="box-sizing:border-box;">
            <div class="sheet-header-code">${headerCode}</div>
            <h1 class="sheet-title">${topic}</h1>
            <p class="sheet-byline">${studentName}, ${registerNo}, ${yearSemSec}, ${department}, Muthayammal Engineering College${seminarDate ? `, ${seminarDate}` : ''}</p>

            <div class="sheet-section-title">1.&nbsp;&nbsp;&nbsp;&nbsp;ABSTRACT</div>
            <p class="sheet-p">${escapeHtml(String(ai.abstract || ''))}</p>

            <div class="sheet-section-title">2.&nbsp;&nbsp;&nbsp;&nbsp;INTRODUCTION</div>
            <p class="sheet-p intro-indent">${escapeHtml(String(ai.introduction || ''))}</p>

            <div class="sheet-section-title">3.&nbsp;&nbsp;&nbsp;&nbsp;THEME OF THE SEMINAR</div>
            <p class="sheet-p">${escapeHtml(String(ai.themeParagraph1 || ''))}</p>
            ${ai.themeParagraph2 ? `<p class="sheet-p">${escapeHtml(String(ai.themeParagraph2))}</p>` : ''}
          </div>

          <!-- Page 2 Sheet -->
          <div class="sheet-label-tag">PAGE 2 OF 3 (Architecture Diagram, Applications, Conclusion &amp; References)</div>
          <div class="paper-sheet viewer-page-2" style="box-sizing:border-box;">
            <div class="sheet-header-code">${headerCode}</div>

            <div class="sheet-figure-box" style="margin-top:6pt;margin-bottom:6pt;text-align:center;">
              ${diagramUri ? `<img src="${diagramUri}" alt="Architecture Diagram" class="sheet-diagram-img" style="max-width:560px;max-height:215px;display:block;margin:0 auto;" />` : ''}
              <div class="sheet-figure-caption" style="margin-top:4pt;">${escapeHtml(String(ai.figureCaption || `Figure 1. Architecture of ${topic}`))}</div>
            </div>

            <div class="sheet-section-title">4.&nbsp;&nbsp;&nbsp;&nbsp;APPLICATIONS</div>
            <p class="sheet-p">${escapeHtml(String(ai.applicationsIntro || 'Key applications across diverse sectors include:'))}</p>
            <ul class="sheet-list">
              ${appsList}
            </ul>
            <p class="sheet-p">${escapeHtml(String(ai.applicationsClosing || 'These applications demonstrate the transformational capability of the technology across modern enterprises.'))}</p>

            <div class="sheet-section-title">5.&nbsp;&nbsp;&nbsp;&nbsp;CONCLUSION</div>
            <p class="sheet-p">${escapeHtml(String(ai.conclusion || ''))}</p>

            <div class="sheet-section-title">6.&nbsp;&nbsp;&nbsp;&nbsp;REFERENCES</div>
            <ol class="sheet-num-list">
              ${refsList}
            </ol>
          </div>

          <!-- Page 3 Sheet -->
          <div class="sheet-label-tag">PAGE 3 OF 3 (Letterhead, Details Table, Evaluation Rubric &amp; Notes)</div>
          <div class="paper-sheet viewer-page-3" style="box-sizing:border-box;">
            <div class="sheet-header-code">${headerCode}</div>

            <div class="sheet-letterhead" style="text-align: center; margin-bottom: 8pt;">
              <img src="${letterheadImgSrc}" alt="Muthayammal Engineering College" class="sheet-letterhead-img" width="580" style="width: 6.0in; max-width: 100%; height: auto; display: block; margin: 0 auto;" />
            </div>

            <div class="sheet-page3-title" style="text-align: center; font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; text-decoration: underline; font-size: 16pt; margin-top: 4pt; margin-bottom: 12pt; letter-spacing: 0.5pt;">SEMINAR PRESENTATION</div>

            <table class="sheet-table" border="1" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1pt solid #000000; margin-bottom: 10pt; background-color: #ffffff;">
              <tbody>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', serif); font-size: 12pt;">Name of the Student</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', serif); font-size: 12pt;">${studentName}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Register No.</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${registerNo}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Course Code / Name</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${courseCodeName}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Course Faculty Name</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${facultyName}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Program / Department</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${department}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Year / Semester / Section</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${yearSemSec}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Academic Year</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${academicYear}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Seminar No.</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${seminarNo}</td></tr>
                <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Seminar Date</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">${seminarDate}</td></tr>
              </tbody>
            </table>

            <div class="sheet-eval-title" style="text-align: center; font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 12pt; margin-top: 6pt; margin-bottom: 5pt;">Evaluation</div>

            <table class="sheet-table sheet-eval-table" border="1" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1pt solid #000000; margin-bottom: 10pt; background-color: #ffffff; text-align: center;">
              <thead>
                <tr>
                  <th style="border: 1pt solid #000000; width: 22%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Seminar Report</th>
                  <th style="border: 1pt solid #000000; width: 20%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">PPT<br>[Hand Out]</th>
                  <th style="border: 1pt solid #000000; width: 24%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Presentation<br>[Min. 5 Minutes]</th>
                  <th style="border: 1pt solid #000000; width: 17%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Viva</th>
                  <th style="border: 1pt solid #000000; width: 17%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Total</th>
                </tr>
                <tr>
                  <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(5)</th>
                  <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(5)</th>
                  <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(10)</th>
                  <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(5)</th>
                  <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(25)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
                  <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
                  <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
                  <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
                  <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
                </tr>
              </tbody>
            </table>

            <table class="sheet-sig-table" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: none; margin-top: 4pt; margin-bottom: 8pt; background-color: #ffffff;">
              <tr>
                <td style="border: none; text-align: left; width: 33%; font-weight: bold; font-size: 12pt; font-family: var(--report-font, 'Times New Roman', Times, serif); vertical-align: bottom; padding-top: 30pt;">Student Signature</td>
                <td style="border: none; text-align: center; width: 34%; font-weight: bold; font-size: 12pt; font-family: var(--report-font, 'Times New Roman', Times, serif); vertical-align: bottom; padding-top: 30pt;">Course Faculty Signature</td>
                <td style="border: none; text-align: right; width: 33%; font-weight: bold; font-size: 12pt; font-family: var(--report-font, 'Times New Roman', Times, serif); vertical-align: bottom; padding-top: 30pt;">HOD</td>
              </tr>
            </table>

            <div class="sheet-note-title" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 16pt; margin-top: 6pt; margin-bottom: 4pt; text-align: left;">Note:</div>
            <div class="sheet-note-item" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 11.5pt; line-height: 1.4; margin-bottom: 3pt; text-align: left; margin-left: 6pt;">1.&nbsp;&nbsp;&nbsp;&nbsp;Seminar Presentation : Minimum 5 minutes.</div>
            <div class="sheet-note-item" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 11.5pt; line-height: 1.4; margin-bottom: 3pt; text-align: left; margin-left: 6pt;">2.&nbsp;&nbsp;&nbsp;&nbsp;Student should submit at least 4 PPT slides and 2 pages seminar report.</div>
            <div class="sheet-note-item" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 11.5pt; line-height: 1.4; margin-bottom: 3pt; text-align: left; margin-left: 6pt;">3.&nbsp;&nbsp;&nbsp;&nbsp;Any one of the following shall be used for the seminar presentation:</div>
            <table class="sheet-note-table" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: none; margin-top: 2pt; margin-bottom: 2pt; background-color: #ffffff;">
              <tr>
                <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);">&#x2022;&nbsp;&nbsp;Technical Video</td>
                <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);">&#x2022;&nbsp;&nbsp;Research Work</td>
              </tr>
              <tr>
                <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);">&#x2022;&nbsp;&nbsp;Technical Problem</td>
                <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);">&#x2022;&nbsp;&nbsp;Patent</td>
              </tr>
              <tr>
                <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);">&#x2022;&nbsp;&nbsp;Project Demo</td>
                <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);">&#x2022;&nbsp;&nbsp;Course Topic</td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }

  } catch (err) {
    if (metaEl) metaEl.innerHTML = `<div style="grid-column: 1 / -1; color:#dc2626; padding:16px;">Error: ${escapeHtml(err.message)}</div>`;
  }
}

// ── Shared Font Helpers for Guaranteed Selected-Font PDF Rendering ──
async function ensureTimesFontsLoaded() {
  if (document.fonts) {
    try {
      const selectedFont = window.selectedReportFont || 'Times New Roman';
      const FONT_LOAD_STACKS = {
        'Times New Roman': ['"Times New Roman"', 'Times', 'Tinos'],
        'Arial': ['Arial', '"Helvetica Neue"', 'Arimo'],
        'Calibri': ['Calibri', 'Carlito', '"Segoe UI"'],
        'Georgia': ['Georgia', 'Gelasio', 'Cambria']
      };
      const families = FONT_LOAD_STACKS[selectedFont] || FONT_LOAD_STACKS['Times New Roman'];
      const loadPromises = [];
      for (const fam of families) {
        for (const variant of ['normal 400 12pt', 'normal 700 12pt', 'italic 400 12pt']) {
          loadPromises.push(document.fonts.load(`${variant} ${fam}`).catch(() => {}));
        }
      }
      if (loadPromises.length) await Promise.all(loadPromises);
      if (document.fonts.ready) await document.fonts.ready;
    } catch (e) {
      console.warn('[PDF Font Preload] Warning:', e.message);
    }
  }
}

async function prepareDocumentFontsForCapture(clonedDoc) {
  if (!clonedDoc) return;

  // Determine the active report font (set via applyReportFont)
  const selectedFont = window.selectedReportFont || 'Times New Roman';
  const CAPTURE_FONT_STACKS = {
    'Times New Roman': '"Times New Roman", Times, "Tinos", serif',
    'Arial': 'Arial, "Helvetica Neue", Helvetica, "Arimo", sans-serif',
    'Calibri': 'Calibri, "Carlito", "Segoe UI", Candara, Arial, sans-serif',
    'Georgia': 'Georgia, "Gelasio", Cambria, "Times New Roman", serif'
  };
  const activeFontStack = CAPTURE_FONT_STACKS[selectedFont] || CAPTURE_FONT_STACKS['Times New Roman'];

  // 1. Set --report-font CSS variable on root so var() references resolve correctly in cloned doc
  if (clonedDoc.documentElement) {
    clonedDoc.documentElement.style.setProperty('--report-font', activeFontStack);
  }

  // 2. Transfer loaded FontFace objects from main window into clonedDoc.fonts
  if (document.fonts && clonedDoc.fonts) {
    try {
      for (const font of document.fonts) {
        clonedDoc.fonts.add(font);
      }
    } catch (e) {
      console.warn('[PDF Font Transfer] Warning:', e);
    }
  }

  // 3. Extract all @font-face rules from stylesheets and inject into clonedDoc.head
  if (clonedDoc.head && !clonedDoc.getElementById('pdf-report-font-override')) {
    const fontStyle = clonedDoc.createElement('style');
    fontStyle.id = 'pdf-report-font-override';
    let fontFaceCss = '';
    try {
      for (const sheet of document.styleSheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (const rule of rules) {
              if (rule.type === CSSRule.FONT_FACE_RULE || (rule.cssText && rule.cssText.startsWith('@font-face'))) {
                fontFaceCss += rule.cssText + '\n';
              }
            }
          }
        } catch (csErr) {}
      }
    } catch (e) {}

    // Enforce the selected font on all report elements
    fontStyle.textContent = fontFaceCss + `
      :root { --report-font: ${activeFontStack}; }
      .paper-sheet, .viewer-paper-sheet, .sheet-viewport, .report-viewer-paper,
      .paper-sheet *, .viewer-paper-sheet * {
        font-family: ${activeFontStack} !important;
      }
    `;
    clonedDoc.head.appendChild(fontStyle);
  }

  // 4. Force all report text nodes to use the selected font
  const allText = clonedDoc.querySelectorAll(
    '.paper-sheet, .viewer-paper-sheet, .sheet-viewport, .report-viewer-paper, ' +
    '.paper-sheet *, .viewer-paper-sheet *'
  );
  allText.forEach(el => {
    el.style.setProperty('font-family', activeFontStack, 'important');
    el.style.color = '#000000';
    el.style.textRendering = 'geometricPrecision';
    el.style.webkitTextSizeAdjust = '100%';
    el.style.textSizeAdjust = '100%';
    if (el.tagName === 'P' || el.tagName === 'LI' || el.tagName === 'TD') {
      el.style.webkitTextStroke = '0.22px #000000';
      el.style.paintOrder = 'stroke fill';
    }
  });

  // 5. Await clonedDoc fonts ready so canvas text drawing has rasterized glyphs ready
  if (clonedDoc.fonts) {
    try {
      const FONT_LOAD_STACKS = {
        'Times New Roman': ['"Times New Roman"', 'Times'],
        'Arial': ['Arial', '"Helvetica Neue"'],
        'Calibri': ['Calibri', '"Segoe UI"'],
        'Georgia': ['Georgia', 'Cambria']
      };
      const families = FONT_LOAD_STACKS[selectedFont] || FONT_LOAD_STACKS['Times New Roman'];
      const loadPromises = [];
      for (const fam of families) {
        for (const variant of ['normal 400 12pt', 'normal 700 12pt', 'italic 400 12pt']) {
          loadPromises.push(clonedDoc.fonts.load(`${variant} ${fam}`).catch(() => {}));
        }
      }
      if (loadPromises.length) await Promise.all(loadPromises);
      if (clonedDoc.fonts.ready) await clonedDoc.fonts.ready;
    } catch (e) {}
  }
  await new Promise(r => setTimeout(r, 120));
}

// ── Admin Download PDF from History ──
async function handleDownloadReportPdf(reportId, triggerBtn) {
  if (!reportId) return;

  const originalHtml = triggerBtn ? triggerBtn.innerHTML : '';
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.innerHTML = `<span class="loader-spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:4px;"></span> Generating...`;
  }

  try {
    if (!currentViewingReport || currentViewingReport.reportId !== reportId) {
      await handleViewReport(reportId);
    }

    const report = currentViewingReport;
    if (!report) throw new Error('Report data could not be loaded.');

    const p1 = document.querySelector('.viewer-page-1');
    const p2 = document.querySelector('.viewer-page-2');
    const p3 = document.querySelector('.viewer-page-3');

    if (!p1 || !p2 || !p3) {
      throw new Error('Report sheets not found in viewer.');
    }
 
    const html2canvasFn = window.html2canvas;
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (typeof html2canvasFn !== 'function' || !jsPDFClass) {
      throw new Error('Required PDF rendering libraries (html2canvas or jsPDF) are not available.');
    }

    // Wait for custom fonts (Times New Roman / Tinos) to be fully loaded and rasterized
    await ensureTimesFontsLoaded();

    const captureOptions = {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850, // Fix capture viewport to standard desktop A4 width on mobile
      onclone: async (clonedDoc) => {
        // Enforce exact desktop A4 sheet layout on cloned document regardless of device screen width
        clonedDoc.documentElement.style.width = '850px';
        clonedDoc.body.style.width = '850px';
        clonedDoc.body.style.minWidth = '850px';
        clonedDoc.body.style.margin = '0 auto';
        clonedDoc.documentElement.style.setProperty('--sheet-scale', '1');
        clonedDoc.body.style.webkitTextSizeAdjust = '100%';
        clonedDoc.body.style.textSizeAdjust = '100%';

        const clonedSheets = clonedDoc.querySelectorAll('.paper-sheet, .viewer-paper-sheet, .report-viewer-paper');
        clonedSheets.forEach(sheet => {
          sheet.style.width = '850px';
          sheet.style.minWidth = '850px';
          sheet.style.maxWidth = '850px';
          sheet.style.height = '1202px';
          sheet.style.minHeight = '1202px';
          sheet.style.maxHeight = '1202px';
          sheet.style.padding = '48px 56px';
          sheet.style.boxSizing = 'border-box';
          sheet.style.margin = '0 auto';
          sheet.style.transform = 'none';
          sheet.style.position = 'static';
          sheet.style.left = 'auto';
          sheet.style.top = 'auto';
          sheet.style.overflow = 'visible';
          sheet.style.webkitTextSizeAdjust = '100%';
          sheet.style.textSizeAdjust = '100%';
        });

        // Ensure Times New Roman font is universally applied and rasterized
        await prepareDocumentFontsForCapture(clonedDoc);

        const tables = clonedDoc.querySelectorAll('.sheet-table, .sheet-eval-table');
        tables.forEach(table => {
          table.style.borderCollapse = 'collapse';
          table.style.border = '1px solid #000000';
          table.style.borderSpacing = '0';
          table.style.backgroundColor = '#ffffff';

          const rows = table.querySelectorAll('tr');
          rows.forEach(tr => {
            tr.style.borderTop = '1px solid #000000';
            tr.style.borderBottom = '1px solid #000000';
          });

          const cells = table.querySelectorAll('th, td');
          cells.forEach(cell => {
            cell.style.border = '1px solid #000000';
            cell.style.borderTop = '1px solid #000000';
            cell.style.borderBottom = '1px solid #000000';
            cell.style.borderLeft = '1px solid #000000';
            cell.style.borderRight = '1px solid #000000';
            cell.style.backgroundClip = 'padding-box';
            cell.style.boxSizing = 'border-box';
          });
        });
      }
    };

    // Capture each page
    const canvas1 = await html2canvasFn(p1, captureOptions);
    const canvas2 = await html2canvasFn(p2, captureOptions);
    const canvas3 = await html2canvasFn(p3, captureOptions);

    // Validate that all 3 canvases have non-zero dimensions and rendered content
    if (!canvas1 || canvas1.width === 0 || canvas1.height === 0) throw new Error('Page 1 canvas capture returned empty dimensions.');
    if (!canvas2 || canvas2.width === 0 || canvas2.height === 0) throw new Error('Page 2 canvas capture returned empty dimensions.');
    if (!canvas3 || canvas3.width === 0 || canvas3.height === 0) throw new Error('Page 3 canvas capture returned empty dimensions.');

    const checkCanvasContent = (canvas, pageNum) => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        const sampleW = Math.min(400, w);
        const sampleH = Math.min(400, h);
        const sx = Math.max(0, Math.floor((w - sampleW) / 2));
        const sy = Math.max(0, Math.floor((h - sampleH) / 2));
        const sample = ctx.getImageData(sx, sy, sampleW, sampleH).data;
        let hasInk = false;
        for (let i = 0; i < sample.length; i += 4) {
          if (sample[i] < 245 || sample[i+1] < 245 || sample[i+2] < 245) {
            hasInk = true;
            break;
          }
        }
        if (!hasInk) {
          throw new Error(`Page ${pageNum} rendered content is blank.`);
        }
      } catch (e) {
        if (e.message && e.message.includes('blank')) throw e;
      }
    };

    checkCanvasContent(canvas1, 1);
    checkCanvasContent(canvas2, 2);
    checkCanvasContent(canvas3, 3);

    const imgData1 = canvas1.toDataURL('image/png');
    const imgData2 = canvas2.toDataURL('image/png');
    const imgData3 = canvas3.toDataURL('image/png');

    const pdf = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    pdf.addImage(imgData1, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    pdf.addPage('a4', 'portrait');
    pdf.addImage(imgData2, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
    pdf.addPage('a4', 'portrait');
    pdf.addImage(imgData3, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

    const totalPages = pdf.internal.getNumberOfPages();
    if (totalPages !== 3) {
      throw new Error(`PDF generation validation failed: document has ${totalPages} pages instead of exactly 3.`);
    }

    const cleanTopic = (report.topic || 'Seminar_Report').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const filename = `Seminar_Report_${cleanTopic}.pdf`;
    pdf.save(filename);

  } catch (err) {
    console.error('[Admin PDF Generation Error]', err);
    alert(`Could not download PDF: ${err.message}`);
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.innerHTML = originalHtml;
    }
  }
}

async function handleGenerateOfflineCoupon() {
  const btn = getEl('btn-generate-coupon');
  const spinner = getEl('btn-gen-coupon-spinner');
  const icon = getEl('btn-gen-coupon-icon');
  const text = getEl('btn-gen-coupon-text');

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (icon) icon.style.display = 'none';
  if (text) text.textContent = 'Generating...';

  try {
    const response = await fetch('/api/admin-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ action: 'generate', adminToken: currentAdminToken })
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        handleAdminLogout();
        throw new Error('Admin session expired. Please log in again.');
      }
      throw new Error(data.error || 'Failed to generate offline coupon.');
    }

    // Display result box
    const resultBox = getEl('admin-coupon-result');
    const codeDisplay = getEl('generated-coupon-display');
    const copyBtnText = getEl('copy-btn-text');

    if (codeDisplay) codeDisplay.textContent = data.coupon.coupon_code;
    if (copyBtnText) copyBtnText.textContent = 'Copy Coupon';
    if (resultBox) resultBox.classList.remove('hidden');

    // Refresh log
    loadAdminCoupons();

  } catch (err) {
    alert(`Coupon Generation Error: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (icon) icon.style.display = '';
    if (text) text.textContent = 'Generate Coupon';
  }
}

async function handleCopyCoupon() {
  const codeEl = getEl('generated-coupon-display');
  const copyBtn = getEl('btn-copy-coupon');
  const copyBtnText = getEl('copy-btn-text');
  if (!codeEl) return;

  const code = codeEl.textContent.trim();
  if (!code) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    if (copyBtnText) copyBtnText.textContent = 'Copied! ✓';
    if (copyBtn) copyBtn.classList.add('copied');

    setTimeout(() => {
      if (copyBtnText) copyBtnText.textContent = 'Copy Coupon';
      if (copyBtn) copyBtn.classList.remove('copied');
    }, 2500);

  } catch (err) {
    console.warn('Clipboard copy failed:', err);
  }
}

async function loadAdminCoupons() {
  const tbody = getEl('admin-coupons-table-body');
  const countEl = getEl('admin-coupons-count');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;"><span class="loader-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;"></span> Loading coupons...</td></tr>';

  try {
    const response = await fetch('/api/admin-coupon?action=list', {
      headers: {
        'Authorization': `Bearer ${currentAdminToken}`
      }
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        handleAdminLogout();
        return;
      }
      throw new Error(data.error || 'Failed to load offline coupons.');
    }

    const coupons = data.coupons || [];
    if (countEl) countEl.textContent = coupons.length;

    if (coupons.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">No coupons generated yet. Click "Generate Coupon" above.</td></tr>';
      return;
    }

    const formatDate = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    tbody.innerHTML = coupons.map(c => {
      const isOffline = c.type === 'offline_cash';
      const isCustom = c.type === 'custom';

      // Discount badge
      let discountDisplay = '₹5.00';
      if (isCustom) {
        discountDisplay = c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value}.00 OFF`;
      }

      // Applicable service
      let serviceLabel = 'Both';
      if (c.applicable_service === 'reportAndPpt') serviceLabel = 'Report + PPT';
      else if (c.applicable_service === 'pptOnly') serviceLabel = 'PPT Only';

      // Validity dates
      let validityDisplay = 'Always Active';
      if (c.start_date || c.expiry_date) {
        validityDisplay = `${c.start_date || 'Any'} → ${c.expiry_date || 'No Expiry'}`;
      }

      // Redemptions
      let redemptionsDisplay = '0 / 1';
      if (isOffline) {
        redemptionsDisplay = c.status === 'USED' ? '1 / 1 (Redeemed)' : '0 / 1 (Unused)';
      } else {
        const maxUse = c.usage_limit > 0 ? c.usage_limit : '∞';
        redemptionsDisplay = `${c.used_count || 0} / ${maxUse}`;
      }

      // Status
      let statusBadge;
      if (isOffline) {
        statusBadge = c.status === 'USED'
          ? '<span class="badge-inactive">USED</span>'
          : '<span class="badge-active">UNUSED</span>';
      } else {
        statusBadge = c.is_active !== false && c.status !== 'EXHAUSTED'
          ? '<span class="badge-active">ACTIVE</span>'
          : '<span class="badge-inactive">INACTIVE</span>';
      }

      // Action
      let actionBtn = '—';
      if (isCustom) {
        const newActive = c.is_active === false ? 'true' : 'false';
        const btnClass = c.is_active === false ? 'btn-copy-small' : 'btn-copy-small';
        const btnText = c.is_active === false ? 'Activate' : 'Deactivate';
        actionBtn = `<button type="button" class="${btnClass} btn-toggle-coupon" data-code="${c.coupon_code}" data-set-active="${newActive}">${btnText}</button>`;
      }

      return `
        <tr>
          <td><strong style="font-family:monospace;font-size:0.92rem;letter-spacing:0.5px;color:#1e293b;">${c.coupon_code}</strong></td>
          <td><span style="font-weight:700;color:#1d4ed8;">${discountDisplay}</span></td>
          <td><span class="badge-service-tag">${serviceLabel}</span></td>
          <td style="font-size:0.8rem;color:#64748b;">${validityDisplay}</td>
          <td><span style="font-size:0.84rem;font-weight:600;">${redemptionsDisplay}</span></td>
          <td>${statusBadge}</td>
          <td style="text-align:center;">${actionBtn}</td>
        </tr>
      `;
    }).join('');

    // Attach toggle listeners
    tbody.querySelectorAll('.btn-toggle-coupon').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        const setActive = btn.dataset.setActive === 'true';
        await handleToggleCouponStatus(code, setActive);
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#dc2626;padding:16px;">Error: ${err.message}</td></tr>`;
  }
}

async function handleToggleCouponStatus(code, isActive) {
  try {
    const resp = await fetch('/api/admin-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ action: 'toggle_active', code, isActive })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      alert(`Failed to update coupon status: ${data.error || 'Server error'}`);
      return;
    }
    loadAdminCoupons();
  } catch (err) {
    alert(`Failed to update coupon status: ${err.message}`);
  }
}

// ============================================================
// Core Payment Flow (Razorpay Standard Checkout with UPI QR)
// ============================================================
async function initiatePayment() {
  if (isPayButtonLocked) return;
  if (!pendingFormData) return;

  paymentState = PaymentState.PENDING;
  lockPayButton('Creating order...');
  clearPaymentStatus();
  setPaymentStatus('loading', 'Initializing Razorpay secure order...');

  let orderData;
  const service = (pendingFormData && pendingFormData._pptOnlyMode) ? 'pptOnly' : 'reportAndPpt';
  const appliedCoupon = pendingFormData._appliedCouponCode || null;

  try {
    orderData = await apiCreateOrder(
      pendingFormData.studentName,
      pendingFormData.topic,
      pendingFormData.subject,
      service,
      appliedCoupon
    );
    currentOrderId = orderData.orderId;
    cachedOrderData = orderData;
    paymentState = PaymentState.CREATED;
  } catch (err) {
    paymentState = PaymentState.FAILED;
    setPaymentStatus('error', `Failed to create payment order: ${err.message}`);
    resetPayButton();
    return;
  }

  // Update test mode indicator badge
  const modeBadge = getEl('payment-mode-badge');
  if (modeBadge) {
    if (orderData.isTestMode) {
      modeBadge.textContent = '⚡ RAZORPAY TEST MODE';
      modeBadge.className = 'pay-mode-badge mode-badge-test';
    } else {
      modeBadge.textContent = '🔒 SECURE LIVE PAYMENT';
      modeBadge.className = 'pay-mode-badge mode-badge-live';
    }
  }

  // ---------- Purely Offline Simulation Fallback (only if no keys or network error) ----------
  if (orderData.isSimulated) {
    setPaymentStatus('loading', 'Offline mode — simulating test payment...');
    lockPayButton('Simulating payment...');
    await new Promise(r => setTimeout(r, 1200));
    await handlePaymentSuccess({
      razorpay_order_id:  orderData.orderId,
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_signature:  'test_signature_simulated',
      isTestMode: true
    });
    return;
  }

  // ---------- Official Razorpay Standard Checkout (with UPI / Dynamic QR) ----------
  lockPayButton('Opening UPI Checkout...');
  setPaymentStatus('info', 'Opening Razorpay UPI QR payment window...');
  paymentState = PaymentState.PROCESSING;

  const serviceLabel = (pendingFormData && pendingFormData._pptOnlyMode) ? 'PPT Generation Fee' : 'Report Generation Fee';
  const feeDisplay = `₹${(orderData.amount / 100).toFixed(2)}`;

  // Configure Razorpay Standard Checkout with explicit UPI QR support
  const razorpayOptions = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    name: 'MEC Seminar Report Generator',
    description: `${serviceLabel} (${feeDisplay}) — ${pendingFormData.topic.substring(0, 40)}`,
    image: 'assets/favicon.svg',
    order_id: orderData.orderId,
    prefill: {
      name: pendingFormData.studentName || 'Student',
      email: 'student@mec.edu.in',
      contact: '9876543210'
    },
    notes: {
      studentName: pendingFormData.studentName || 'Student',
      topic: pendingFormData.topic ? pendingFormData.topic.substring(0, 40) : 'Seminar Report',
      subject: pendingFormData.subject ? pendingFormData.subject.substring(0, 40) : 'Engineering',
      institution: 'Muthayammal Engineering College',
      fee: feeDisplay
    },
    theme: {
      color: '#1d4ed8',
      backdrop_color: 'rgba(15, 23, 42, 0.75)'
    },
    // Explicitly configure and prioritize UPI QR and UPI Intent
    config: {
      display: {
        blocks: {
          upi: {
            name: 'Pay using UPI / QR Code (Google Pay, PhonePe, Paytm, BHIM)',
            instruments: [
              {
                method: 'upi',
                flows: ['qr', 'intent']
              }
            ]
          },
          other: {
            name: 'Cards & Other Payment Options',
            instruments: [
              { method: 'card' },
              { method: 'netbanking' },
              { method: 'wallet' }
            ]
          }
        },
        sequence: ['block.upi', 'block.other'],
        preferences: {
          show_default_blocks: true
        }
      }
    },
    modal: {
      confirm_close: true,
      ondismiss: async () => {
        paymentState = PaymentState.CANCELLED;
        await apiRecordStatus(orderData.orderId, 'cancelled', 'User dismissed Razorpay checkout window');
        setPaymentStatus('error', 'Payment was not completed. Please try again.');
        resetPayButton();
      }
    },
    retry: {
      enabled: true
    },
    handler: async function (response) {
      // Called when user successfully pays (via UPI QR scan, UPI app, or card)
      await handlePaymentSuccess({
        razorpay_order_id:  response.razorpay_order_id || orderData.orderId,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature:  response.razorpay_signature,
        isTestMode: orderData.isTestMode
      });
    }
  };

  try {
    if (typeof window.Razorpay !== 'function') {
      throw new Error('Razorpay SDK not loaded. Please check your internet connection.');
    }

    const rzp = new window.Razorpay(razorpayOptions);

    rzp.on('payment.failed', async (response) => {
      paymentState = PaymentState.FAILED;
      const errorMsg = response.error?.description || response.error?.reason || 'Payment failed';
      await apiRecordStatus(orderData.orderId, 'failed', errorMsg);
      setPaymentStatus('error', `Payment was not completed: ${errorMsg}. Please try again.`);
      resetPayButton();
    });

    rzp.open();

  } catch (err) {
    paymentState = PaymentState.FAILED;
    setPaymentStatus('error', `Could not open payment window: ${err.message}`);
    resetPayButton();
  }
}

async function handlePaymentSuccess({ razorpay_order_id, razorpay_payment_id, razorpay_signature, isTestMode }) {
  paymentState = PaymentState.PROCESSING;
  lockPayButton('Verifying payment...');
  setPaymentStatus('loading', 'Verifying payment with Razorpay server...');

  let verifyData;
  try {
    verifyData = await apiVerifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isTestMode
    });
    currentPaymentToken = verifyData.paymentToken;
    paymentState = PaymentState.SUCCESS;
  } catch (err) {
    paymentState = PaymentState.FAILED;
    await apiRecordStatus(razorpay_order_id, 'failed', err.message);
    setPaymentStatus('error', `Payment verification failed: ${err.message}`);
    resetPayButton();
    return;
  }

  // Show success and close modal, then trigger generation
  const successLabel = (pendingFormData && pendingFormData._pptOnlyMode) ? 'Presentation' : 'Seminar Report';
  setPaymentStatus('success', `Payment Successful ✓ — Generating your ${successLabel}...`);
  lockPayButton('Payment Successful ✓');
  getEl('btn-cancel-payment').style.display = 'none';

  await new Promise(r => setTimeout(r, 1200));
  hidePaymentModal();

  // Trigger the actual generation using the verified token
  if (pendingFormData && pendingFormData._pptOnlyMode && typeof pendingFormData._pptOnlyCallback === 'function') {
    pendingFormData._pptOnlyCallback(currentPaymentToken, currentOrderId);
  } else if (typeof window.generateReportAfterPayment === 'function') {
    window.generateReportAfterPayment(pendingFormData, currentPaymentToken, currentOrderId);
  }
}

// ============================================================
// PDF Download
// ============================================================
// ============================================================
// PDF Download — Guaranteed Exact 3 Pages Output
// ============================================================
async function downloadAsPdf() {
  const preview = document.getElementById('preview-container');
  const page1 = document.getElementById('preview-page-1');
  const page2 = document.getElementById('preview-page-2');
  const page3 = document.getElementById('preview-page-3');

  // Verify preview and report content exists
  if (!preview || preview.classList.contains('hidden') || !page1 || !page2 || !page3) {
    alert('Please generate your seminar report first before downloading the PDF.');
    return;
  }

  // Verify report has content rendered
  if (page1.innerHTML.trim().length < 50 || page2.innerHTML.trim().length < 50 || page3.innerHTML.trim().length < 50) {
    alert('Please generate your seminar report first before downloading the PDF.');
    return;
  }

  // Determine topic for filename (Format: Seminar_Report_<Topic>.pdf)
  const topicInput = document.getElementById('topic');
  const topicTitle = page1.querySelector('.sheet-title')?.textContent?.trim() || topicInput?.value?.trim() || 'Seminar_Report';
  const cleanTopic = topicTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const pdfFilename = `Seminar_Report_${cleanTopic}.pdf`;

  // Visual button feedback
  const pdfBtns = [document.getElementById('btn-download-pdf'), document.getElementById('btn-download-pdf-bottom')].filter(Boolean);
  pdfBtns.forEach(btn => {
    btn.disabled = true;
    btn.setAttribute('data-original-text', btn.innerHTML);
    btn.innerHTML = `<span class="loader-spinner" style="width:14px;height:14px;border-width:2px;border-top-color:#fff;display:inline-block;vertical-align:middle;margin-right:6px;"></span> Generating 3-Page PDF...`;
  });

  // Save current preview tab state to restore later
  const activeTabBtn = document.querySelector('.preview-tab-btn.active');
  const savedTab = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'all';

  // Ensure all 3 sheets and cards are visible in the DOM during capture
  const cards = document.querySelectorAll('.sheet-card');
  cards.forEach(c => c.style.display = 'flex');
  page1.classList.remove('hidden');
  page2.classList.remove('hidden');
  page3.classList.remove('hidden');
  page1.style.display = 'block';
  page2.style.display = 'block';
  page3.style.display = 'block';

  // Add temporary PDF capture class to body (hides toolbar buttons, outlines)
  document.body.classList.add('pdf-exporting');

  try {
    // Wait for all images inside the preview sheets to finish loading
    const images = preview.querySelectorAll('img');
    await Promise.all(Array.from(images).map(img => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve; // don't block execution if an image fails
        setTimeout(resolve, 1500); // 1.5s timeout guard
      });
    }));

    // Allow DOM and styles to settle
    await new Promise(r => setTimeout(r, 150));

    // Check if html2canvas and jsPDF are loaded
    const html2canvasFn = window.html2canvas;
    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (typeof html2canvasFn !== 'function' || !jsPDFClass) {
      throw new Error('Required PDF rendering libraries (html2canvas or jsPDF) are not available.');
    }

    // Wait for custom fonts (Times New Roman / Tinos) to be fully loaded and rasterized
    await ensureTimesFontsLoaded();

    const captureOptions = {
      scale: 3, // 3× DPI — publication-quality sharpness matching Times New Roman in Word
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 850, // CRITICAL: locks html2canvas to desktop A4 viewport on mobile phones
      onclone: async (clonedDoc) => {
        // Enforce exact desktop A4 sheet layout on cloned document regardless of device screen width
        clonedDoc.documentElement.style.width = '850px';
        clonedDoc.body.style.width = '850px';
        clonedDoc.body.style.minWidth = '850px';
        clonedDoc.body.style.margin = '0 auto';
        clonedDoc.documentElement.style.setProperty('--sheet-scale', '1');
        clonedDoc.body.style.webkitTextSizeAdjust = '100%';
        clonedDoc.body.style.textSizeAdjust = '100%';

        const viewports = clonedDoc.querySelectorAll('.sheet-viewport');
        viewports.forEach(vp => {
          vp.style.width = '850px';
          vp.style.height = '1202px';
          vp.style.transform = 'none';
          vp.style.position = 'static';
          vp.style.overflow = 'visible';
          vp.style.margin = '0 auto';
        });

        const sheets = clonedDoc.querySelectorAll('.paper-sheet, .viewer-paper-sheet');
        sheets.forEach(s => {
          s.style.width = '850px';
          s.style.minWidth = '850px';
          s.style.maxWidth = '850px';
          s.style.height = '1202px';
          s.style.minHeight = '1202px';
          s.style.maxHeight = '1202px';
          s.style.padding = '48px 56px';
          s.style.boxSizing = 'border-box';
          s.style.margin = '0 auto';
          s.style.transform = 'none';
          s.style.position = 'static';
          s.style.left = 'auto';
          s.style.top = 'auto';
          s.style.overflow = 'visible';
          s.style.webkitTextSizeAdjust = '100%';
          s.style.textSizeAdjust = '100%';
        });

        // Ensure Times New Roman font is universally applied and rasterized
        await prepareDocumentFontsForCapture(clonedDoc);

        // Fix for html2canvas missing horizontal table borders
        // Explicitly format tables and all cells with 4-sided borders and background-clip to guarantee all horizontal row lines render
        const tables = clonedDoc.querySelectorAll('.sheet-table, .sheet-eval-table');
        tables.forEach(table => {
          table.style.borderCollapse = 'collapse';
          table.style.border = '1px solid #000000';
          table.style.borderSpacing = '0';
          table.style.backgroundColor = '#ffffff';

          const rows = table.querySelectorAll('tr');
          rows.forEach(tr => {
            tr.style.borderTop = '1px solid #000000';
            tr.style.borderBottom = '1px solid #000000';
          });

          const cells = table.querySelectorAll('th, td');
          cells.forEach(cell => {
            cell.style.border = '1px solid #000000';
            cell.style.borderTop = '1px solid #000000';
            cell.style.borderBottom = '1px solid #000000';
            cell.style.borderLeft = '1px solid #000000';
            cell.style.borderRight = '1px solid #000000';
            cell.style.backgroundClip = 'padding-box';
            cell.style.boxSizing = 'border-box';
          });
        });
      }
    };

    // Capture each page directly in-place from the live DOM
    const canvas1 = await html2canvasFn(page1, captureOptions);
    const canvas2 = await html2canvasFn(page2, captureOptions);
    const canvas3 = await html2canvasFn(page3, captureOptions);

    // Validate that all 3 canvases have valid non-zero dimensions
    if (!canvas1 || canvas1.width === 0 || canvas1.height === 0) throw new Error('Page 1 canvas capture returned empty dimensions.');
    if (!canvas2 || canvas2.width === 0 || canvas2.height === 0) throw new Error('Page 2 canvas capture returned empty dimensions.');
    if (!canvas3 || canvas3.width === 0 || canvas3.height === 0) throw new Error('Page 3 canvas capture returned empty dimensions.');

    // Content verification: verify each canvas rendered actual visible pixels (not blank white)
    const checkCanvasContent = (canvas, pageNum) => {
      try {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        const sampleW = Math.min(400, w);
        const sampleH = Math.min(400, h);
        const sx = Math.max(0, Math.floor((w - sampleW) / 2));
        const sy = Math.max(0, Math.floor((h - sampleH) / 2));
        const sample = ctx.getImageData(sx, sy, sampleW, sampleH).data;
        let hasInk = false;
        for (let i = 0; i < sample.length; i += 4) {
          if (sample[i] < 245 || sample[i+1] < 245 || sample[i+2] < 245) {
            hasInk = true;
            break;
          }
        }
        if (!hasInk) {
          throw new Error(`Page ${pageNum} rendered content appears blank or corrupted.`);
        }
      } catch (e) {
        if (e.message && e.message.includes('blank')) throw e;
      }
    };

    checkCanvasContent(canvas1, 1);
    checkCanvasContent(canvas2, 2);
    checkCanvasContent(canvas3, 3);

    // Convert canvases to PNG (lossless — no compression artifacts on text/table lines unlike JPEG)
    const imgData1 = canvas1.toDataURL('image/png');
    const imgData2 = canvas2.toDataURL('image/png');
    const imgData3 = canvas3.toDataURL('image/png');

    // Validate data URLs
    if (!imgData1 || imgData1.length < 1000) throw new Error('Page 1 image data is empty.');
    if (!imgData2 || imgData2.length < 1000) throw new Error('Page 2 image data is empty.');
    if (!imgData3 || imgData3.length < 1000) throw new Error('Page 3 image data is empty.');

    // Initialize A4 Portrait jsPDF (210mm x 297mm)
    const pdf = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Page 1 — Cover Page / Abstract & Introduction
    pdf.addImage(imgData1, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

    // Page 2 — Seminar Report Content (Theme, Vector Diagram, Applications, Conclusion & References)
    pdf.addPage('a4', 'portrait');
    pdf.addImage(imgData2, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

    // Page 3 — Student Details Table, Evaluation Rubric & Signatures
    pdf.addPage('a4', 'portrait');
    pdf.addImage(imgData3, 'PNG', 0, 0, 210, 297, undefined, 'FAST');

    // Ensure strictly 3 pages in output
    const totalPages = pdf.internal.getNumberOfPages();
    if (totalPages !== 3) {
      throw new Error(`PDF generation validation failed: document contains ${totalPages} pages instead of exactly 3.`);
    }

    // Verify blob size is valid (>10KB) before saving
    const pdfBlob = pdf.output('blob');
    if (!pdfBlob || pdfBlob.size < 10000) {
      throw new Error(`Generated PDF blob is invalid or too small (${pdfBlob ? pdfBlob.size : 0} bytes).`);
    }

    // Trigger download
    pdf.save(pdfFilename);

  } catch (err) {
    console.error('[PDF Generation Error]', err);
    alert('PDF Generation Failed: ' + (err.message || 'Unable to generate PDF. Please try again.'));
  } finally {
    // Clean up temporary capture state
    document.body.classList.remove('pdf-exporting');

    // Restore tab view and cards
    const restoreCards = document.querySelectorAll('.sheet-card');
    if (restoreCards.length >= 3) {
      if (savedTab === '1') {
        restoreCards[0].style.display = 'flex';
        restoreCards[1].style.display = 'none';
        restoreCards[2].style.display = 'none';
      } else if (savedTab === '2') {
        restoreCards[0].style.display = 'none';
        restoreCards[1].style.display = 'flex';
        restoreCards[2].style.display = 'none';
      } else if (savedTab === '3') {
        restoreCards[0].style.display = 'none';
        restoreCards[1].style.display = 'none';
        restoreCards[2].style.display = 'flex';
      } else {
        restoreCards.forEach(c => c.style.display = 'flex');
      }
    }

    if (savedTab === '1') {
      page2.classList.add('hidden');
      page3.classList.add('hidden');
      page2.style.display = 'none';
      page3.style.display = 'none';
    } else if (savedTab === '2') {
      page1.classList.add('hidden');
      page3.classList.add('hidden');
      page1.style.display = 'none';
      page3.style.display = 'none';
    } else if (savedTab === '3') {
      page1.classList.add('hidden');
      page2.classList.add('hidden');
      page1.style.display = 'none';
      page2.style.display = 'none';
    }

    // Restore button states
    pdfBtns.forEach(btn => {
      btn.disabled = false;
      const orig = btn.getAttribute('data-original-text');
      if (orig) btn.innerHTML = orig;
    });
  }
}

// ============================================================
// Transaction Dashboard
// ============================================================
async function loadTransactions(filter = 'all') {
  const tbody = getEl('txn-table-body');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="txn-empty"><span class="loader-spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;"></span> Loading...</td></tr>';

  try {
    const response = await fetch(`/api/transactions?status=${filter}`);
    const data = await response.json();

    if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load transactions.');

    // Update summary
    const s = data.summary;
    if (getEl('txn-total'))   getEl('txn-total').textContent   = s.total;
    if (getEl('txn-success')) getEl('txn-success').textContent = s.byStatus.success;
    if (getEl('txn-failed'))  getEl('txn-failed').textContent  = s.byStatus.failed;
    if (getEl('txn-pending')) getEl('txn-pending').textContent = s.byStatus.pending;
    if (getEl('txn-revenue')) getEl('txn-revenue').textContent = `₹${s.totalRevenue.toFixed(2)}`;

    // Render rows
    const txns = data.transactions;
    if (!txns || txns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="txn-empty">No transactions found for the selected filter.</td></tr>';
      return;
    }

    const statusPill = (status) => {
      const map = {
        success:   'badge-success',
        failed:    'badge-failed',
        cancelled: 'badge-cancelled',
        pending:   'badge-pending',
        created:   'badge-pending'
      };
      return `<span class="txn-status-pill ${map[status] || 'badge-pending'}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
    };

    const shortId = (id) => id ? `<span title="${id}">${id.substring(0, 16)}...</span>` : '—';
    const formatDate = (iso) => {
      if (!iso) return '—';
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    tbody.innerHTML = txns.map(t => `
      <tr>
        <td><strong>${t.studentName || '—'}</strong></td>
        <td class="txn-topic-cell">${t.topic || '—'}</td>
        <td>₹${(t.amount || 0).toFixed(2)}</td>
        <td>${statusPill(t.status)}</td>
        <td class="txn-id-cell">${shortId(t.orderId)}</td>
        <td class="txn-id-cell">${shortId(t.paymentId)}</td>
        <td>${formatDate(t.createdAt)}</td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="txn-empty" style="color:#dc2626;">Error: ${err.message}</td></tr>`;
  }
}

// ============================================================
// ============================================================
// Pricing & Payments Admin Panel
// ============================================================

let adminPricingCache = null; // cached pricing from API

async function fetchPublicPricing() {
  try {
    const resp = await fetch('/api/admin-pricing?action=public');
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data.success) {
      adminPricingCache = data;
      return data;
    }
  } catch (e) {
    // Non-fatal
  }
  return null;
}

async function loadAdminOverview() {
  const tbody = getEl('overview-txns-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;"><span class="loader-spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;"></span> Loading overview...</td></tr>';
  }

  try {
    const resp = await fetch('/api/admin-pricing?action=overview', {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      if (resp.status === 401) { handleAdminLogout(); return; }
      throw new Error(data.error || 'Failed to load overview.');
    }

    const ov = data.overview;
    if (!ov) return;

    // Report + PPT Card
    const rpPriceEl = getEl('ov-rp-price');
    const rpModeEl = getEl('ov-rp-mode');
    if (rpPriceEl) rpPriceEl.textContent = ov.reportAndPpt.mode === 'free' ? 'Free' : `₹${(ov.reportAndPpt.amountPaise / 100).toFixed(2)}`;
    if (rpModeEl) {
      rpModeEl.innerHTML = ov.reportAndPpt.mode === 'free'
        ? '<span class="badge-active">Free Mode</span>'
        : '<span class="badge-active" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;">Paid Mode</span>';
    }

    // PPT Only Card
    const poPriceEl = getEl('ov-po-price');
    const poModeEl = getEl('ov-po-mode');
    if (poPriceEl) poPriceEl.textContent = ov.pptOnly.mode === 'free' ? 'Free' : `₹${(ov.pptOnly.amountPaise / 100).toFixed(2)}`;
    if (poModeEl) {
      poModeEl.innerHTML = ov.pptOnly.mode === 'free'
        ? '<span class="badge-active">Free Mode</span>'
        : '<span class="badge-active" style="background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;">Paid Mode</span>';
    }

    // Gateway Card
    const gwBadge = getEl('ov-gateway-badge');
    const methodsStatus = getEl('ov-methods-status');
    if (gwBadge) {
      if (ov.isGatewayConfigured) {
        gwBadge.className = 'badge-active';
        gwBadge.textContent = 'Razorpay Active';
      } else {
        gwBadge.className = 'badge-inactive';
        gwBadge.textContent = 'Gateway Not Configured (Simulated)';
      }
    }
    if (methodsStatus) {
      const upiText = ov.paymentMethods.upi ? 'UPI: Enabled' : 'UPI: Disabled';
      const rzpText = ov.paymentMethods.razorpay ? 'Cards: Enabled' : 'Cards: Disabled';
      methodsStatus.textContent = `${upiText} · ${rzpText}`;
    }

    // Coupons Card
    const couponsActiveEl = getEl('ov-coupons-active');
    const couponsTotalEl = getEl('ov-coupons-total');
    if (couponsActiveEl) couponsActiveEl.textContent = ov.couponStats.activeCount;
    if (couponsTotalEl) couponsTotalEl.textContent = `Total coupons: ${ov.couponStats.totalCount}`;

    // Revenue Card
    const revEl = getEl('ov-total-revenue');
    const breakdownEl = getEl('ov-txn-breakdown');
    if (revEl) revEl.textContent = `₹${(Number(ov.transactionStats.totalRevenue) / 100).toFixed(2)}`;
    if (breakdownEl) {
      breakdownEl.textContent = `${ov.transactionStats.successCount} Success · ${ov.transactionStats.pendingCount} Pending · ${ov.transactionStats.failedCount} Failed`;
    }

    // Recent Transactions Table
    if (tbody) {
      const txns = ov.recentTransactions || [];
      if (txns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#64748b;padding:16px;">No recent transactions.</td></tr>';
      } else {
        const formatDate = (iso) => {
          if (!iso) return '—';
          const d = new Date(iso);
          return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        };
        tbody.innerHTML = txns.map(t => {
          const statusClass = t.status === 'success' ? 'badge-active' : t.status === 'failed' ? 'badge-inactive' : 'badge-service-tag';
          return `
            <tr>
              <td><span style="font-family:monospace;font-size:0.8rem;color:#64748b;">${t.orderId}</span></td>
              <td><strong>${escapeHtml(t.studentName || '—')}</strong></td>
              <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(t.topic || '—')}</td>
              <td><strong>₹${(Number(t.amount) / 100).toFixed(2)}</strong></td>
              <td><span class="${statusClass}">${(t.status || 'unknown').toUpperCase()}</span></td>
              <td style="font-size:0.8rem;color:#64748b;">${formatDate(t.createdAt)}</td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#dc2626;padding:16px;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

async function loadAdminPricing() {
  const rpStatus = getEl('pricing-rp-status');
  const poStatus = getEl('pricing-po-status');
  if (rpStatus) rpStatus.innerHTML = '<span style="color:#64748b;font-size:0.82rem;">Loading…</span>';
  if (poStatus) poStatus.innerHTML = '';

  try {
    const resp = await fetch('/api/admin-pricing?action=get', {
      headers: { 'Authorization': `Bearer ${currentAdminToken}` }
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      if (resp.status === 401) { handleAdminLogout(); return; }
      throw new Error(data.error || 'Failed to load pricing.');
    }

    updatePricingUI(data.pricing);

    // Payment methods & gateway alert
    if (data.paymentMethods) {
      const upiCb = getEl('method-enable-upi');
      const rzpCb = getEl('method-enable-razorpay');
      if (upiCb) upiCb.checked = Boolean(data.paymentMethods.upi);
      if (rzpCb) rzpCb.checked = Boolean(data.paymentMethods.razorpay);
    }

    const alertEl = getEl('gateway-status-alert');
    const alertText = getEl('gateway-status-text');
    if (alertEl && alertText) {
      if (data.isGatewayConfigured) {
        alertEl.className = 'gateway-alert gateway-alert-success';
        alertText.textContent = 'Razorpay Gateway credentials configured and active on server.';
      } else {
        alertEl.className = 'gateway-alert gateway-alert-warning';
        alertText.textContent = '⚠️ Razorpay credentials (RAZORPAY_KEY_ID / SECRET) are not configured on server. Gateway will run in test simulation mode.';
      }
    }

    if (rpStatus) rpStatus.innerHTML = '';

  } catch (err) {
    if (rpStatus) rpStatus.innerHTML = `<span style="color:#dc2626;font-size:0.82rem;">Error: ${escapeHtml(err.message)}</span>`;
  }
}

async function savePaymentMethods() {
  const upi = getEl('method-enable-upi')?.checked;
  const razorpay = getEl('method-enable-razorpay')?.checked;

  const btn = getEl('btn-save-payment-methods');
  const spinner = getEl('save-methods-spinner');
  const btnText = getEl('save-methods-text');
  const statusEl = getEl('save-methods-status');

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'Saving…';
  if (statusEl) statusEl.innerHTML = '';

  try {
    const resp = await fetch('/api/admin-pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({ action: 'update_payment_methods', upi, razorpay })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      if (resp.status === 401) { handleAdminLogout(); return; }
      throw new Error(data.error || 'Failed to save payment settings.');
    }

    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#15803d;font-size:0.83rem;">✓ Payment settings saved.</span>';
      setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
    }
  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626;font-size:0.83rem;">Error: ${escapeHtml(err.message)}</span>`;
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Save Payment Settings';
  }
}

async function handleCreateCustomCoupon() {
  const code = getEl('new-coupon-code')?.value?.trim();
  const discountType = getEl('new-coupon-type')?.value;
  const discountVal = parseFloat(getEl('new-coupon-val')?.value || '0');
  const service = getEl('new-coupon-service')?.value;
  const startDate = getEl('new-coupon-start')?.value || null;
  const expiryDate = getEl('new-coupon-expiry')?.value || null;
  const usageLimit = parseInt(getEl('new-coupon-usage-limit')?.value || '0', 10);
  const userLimit = parseInt(getEl('new-coupon-user-limit')?.value || '1', 10);

  const statusEl = getEl('create-coupon-status');
  const btn = getEl('btn-create-custom-coupon');
  const spinner = getEl('btn-custom-coupon-spinner');
  const btnText = getEl('btn-custom-coupon-text');

  if (!code || code.length < 2) {
    if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626;font-size:0.83rem;">⚠ Please enter a valid coupon code (min 2 characters).</span>';
    return;
  }
  if (!discountVal || discountVal <= 0) {
    if (statusEl) statusEl.innerHTML = '<span style="color:#dc2626;font-size:0.83rem;">⚠ Please enter a positive discount value.</span>';
    return;
  }

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'Creating…';
  if (statusEl) statusEl.innerHTML = '';

  try {
    const resp = await fetch('/api/admin-coupon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({
        action: 'create_custom',
        code,
        discountType,
        discountValue: discountVal,
        applicableService: service,
        startDate,
        expiryDate,
        usageLimit,
        perUserLimit: userLimit
      })
    });
    const data = await resp.json();
    if (!resp.ok || !data.success) {
      throw new Error(data.error || 'Failed to create coupon.');
    }

    if (statusEl) {
      statusEl.innerHTML = `<span style="color:#15803d;font-size:0.83rem;">✓ Coupon ${escapeHtml(data.coupon.coupon_code)} created successfully.</span>`;
      setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3500);
    }

    // Reset code input
    if (getEl('new-coupon-code')) getEl('new-coupon-code').value = '';

    // Refresh coupons table
    loadAdminCoupons();

  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626;font-size:0.83rem;">Error: ${escapeHtml(err.message)}</span>`;
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Create Coupon';
  }
}

function updatePricingUI(pricing) {
  if (!pricing) return;

  // Report + PPT card
  const rp = pricing.reportAndPpt;
  if (rp) {
    const rpModeFreeEl = getEl('rp-mode-free');
    const rpModePaidEl = getEl('rp-mode-paid');
    const rpAmountEl = getEl('pricing-amount-rp');
    const rpAmountGroup = getEl('pricing-amount-group-rp');
    const rpStatusBadge = getEl('pricing-status-report-ppt');
    const rpLastUpdated = getEl('pricing-last-updated-rp');
    const rpPaiseHint = getEl('pricing-paise-hint-rp');

    if (rpModeFreeEl) rpModeFreeEl.checked = rp.mode === 'free';
    if (rpModePaidEl) rpModePaidEl.checked = rp.mode === 'paid';
    if (rpAmountEl && rp.mode === 'paid') rpAmountEl.value = (rp.amountPaise / 100).toFixed(0);
    if (rpAmountGroup) rpAmountGroup.style.display = rp.mode === 'paid' ? 'flex' : 'none';
    if (rpPaiseHint) rpPaiseHint.textContent = `= ${rp.amountPaise} paise`;
    if (rpStatusBadge) {
      if (rp.mode === 'free') {
        rpStatusBadge.className = 'pricing-status-badge pricing-badge-free';
        rpStatusBadge.textContent = 'Free';
      } else {
        rpStatusBadge.className = 'pricing-status-badge pricing-badge-paid';
        rpStatusBadge.textContent = `₹${(rp.amountPaise / 100).toFixed(0)} · Paid`;
      }
    }
    if (rpLastUpdated && rp.lastUpdatedAt) {
      const d = new Date(rp.lastUpdatedAt);
      rpLastUpdated.textContent = `Last updated: ${d.toLocaleString('en-IN')} by ${rp.lastUpdatedBy || 'admin'}`;
    }
  }

  // PPT Only card
  const po = pricing.pptOnly;
  if (po) {
    const poModeFreeEl = getEl('po-mode-free');
    const poModePaidEl = getEl('po-mode-paid');
    const poAmountEl = getEl('pricing-amount-po');
    const poAmountGroup = getEl('pricing-amount-group-po');
    const poStatusBadge = getEl('pricing-status-ppt-only');
    const poLastUpdated = getEl('pricing-last-updated-po');
    const poPaiseHint = getEl('pricing-paise-hint-po');

    if (poModeFreeEl) poModeFreeEl.checked = po.mode === 'free';
    if (poModePaidEl) poModePaidEl.checked = po.mode === 'paid';
    if (poAmountEl && po.mode === 'paid') poAmountEl.value = (po.amountPaise / 100).toFixed(0);
    if (poAmountGroup) poAmountGroup.style.display = po.mode === 'paid' ? 'flex' : 'none';
    if (poPaiseHint) poPaiseHint.textContent = `= ${po.amountPaise} paise`;
    if (poStatusBadge) {
      if (po.mode === 'free') {
        poStatusBadge.className = 'pricing-status-badge pricing-badge-free';
        poStatusBadge.textContent = 'Free';
      } else {
        poStatusBadge.className = 'pricing-status-badge pricing-badge-paid';
        poStatusBadge.textContent = `₹${(po.amountPaise / 100).toFixed(0)} · Paid`;
      }
    }
    if (poLastUpdated && po.lastUpdatedAt) {
      const d = new Date(po.lastUpdatedAt);
      poLastUpdated.textContent = `Last updated: ${d.toLocaleString('en-IN')} by ${po.lastUpdatedBy || 'admin'}`;
    }
  }
}

async function saveAdminPricing(service) {
  const suffix = service === 'reportAndPpt' ? 'rp' : 'po';
  const modeRadios = document.querySelectorAll(`input[name="pricing-mode-${suffix}"]`);
  let selectedMode = 'paid';
  modeRadios.forEach(r => { if (r.checked) selectedMode = r.value; });

  const amountEl = getEl(`pricing-amount-${suffix}`);
  const amountRupees = parseFloat(amountEl?.value || '0');
  const amountPaise = Math.round(amountRupees * 100);

  if (selectedMode === 'paid' && amountPaise <= 0) {
    const st = getEl(`pricing-${suffix}-status`);
    if (st) st.innerHTML = '<span style="color:#dc2626;font-size:0.83rem;">⚠ Please enter a valid amount greater than ₹0.</span>';
    return;
  }

  const spinner = getEl(`pricing-${suffix}-spinner`);
  const btnText = getEl(`pricing-${suffix}-text`);
  const btn = getEl(`btn-save-pricing-${suffix}`);
  const statusEl = getEl(`pricing-${suffix}-status`);

  if (btn) btn.disabled = true;
  if (spinner) spinner.style.display = 'inline-block';
  if (btnText) btnText.textContent = 'Saving…';
  if (statusEl) statusEl.innerHTML = '';

  try {
    const resp = await fetch('/api/admin-pricing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentAdminToken}`
      },
      body: JSON.stringify({
        action: 'update',
        service,
        mode: selectedMode,
        amountPaise: selectedMode === 'free' ? 0 : amountPaise,
        currency: 'INR'
      })
    });
    const data = await resp.json();

    if (!resp.ok || !data.success) {
      if (resp.status === 401) { handleAdminLogout(); return; }
      throw new Error(data.error || 'Failed to save pricing.');
    }

    // Update UI badge + last updated
    const updatedPricing = {};
    updatedPricing[service] = data.pricing;
    updatePricingUI(updatedPricing);

    if (statusEl) {
      statusEl.innerHTML = '<span style="color:#15803d;font-size:0.83rem;">✓ Saved successfully.</span>';
      setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
    }

  } catch (err) {
    if (statusEl) statusEl.innerHTML = `<span style="color:#dc2626;font-size:0.83rem;">Error: ${escapeHtml(err.message)}</span>`;
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.style.display = 'none';
    if (btnText) btnText.textContent = 'Save Changes';
  }
}

function initPricingTab() {
  // Report + PPT: toggle amount group visibility
  document.querySelectorAll('input[name="pricing-mode-rp"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isPaid = getEl('rp-mode-paid')?.checked;
      const group = getEl('pricing-amount-group-rp');
      if (group) group.style.display = isPaid ? 'flex' : 'none';
    });
  });

  // PPT Only: toggle amount group visibility
  document.querySelectorAll('input[name="pricing-mode-po"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const isPaid = getEl('po-mode-paid')?.checked;
      const group = getEl('pricing-amount-group-po');
      if (group) group.style.display = isPaid ? 'flex' : 'none';
    });
  });

  // Report + PPT: update paise hint on amount change
  getEl('pricing-amount-rp')?.addEventListener('input', () => {
    const v = parseFloat(getEl('pricing-amount-rp').value || '0');
    const hint = getEl('pricing-paise-hint-rp');
    if (hint) hint.textContent = `= ${Math.round(v * 100)} paise`;
  });

  // PPT Only: update paise hint on amount change
  getEl('pricing-amount-po')?.addEventListener('input', () => {
    const v = parseFloat(getEl('pricing-amount-po').value || '0');
    const hint = getEl('pricing-paise-hint-po');
    if (hint) hint.textContent = `= ${Math.round(v * 100)} paise`;
  });

  // Save pricing buttons
  getEl('btn-save-pricing-rp')?.addEventListener('click', () => saveAdminPricing('reportAndPpt'));
  getEl('btn-save-pricing-po')?.addEventListener('click', () => saveAdminPricing('pptOnly'));

  // Save payment methods button
  getEl('btn-save-payment-methods')?.addEventListener('click', savePaymentMethods);

  // Overview refresh button
  getEl('btn-refresh-overview')?.addEventListener('click', loadAdminOverview);

  // Create custom coupon button
  getEl('btn-create-custom-coupon')?.addEventListener('click', handleCreateCustomCoupon);
}

// ============================================================
// Mode B PPT-Only Payment Flow
// ============================================================

async function showPptPaymentModal(formData, onSuccess) {
  // Fetch current PPT pricing
  const pricing = await fetchPublicPricing();
  const pptPricing = pricing ? pricing.pptOnly : null;

  if (!pptPricing || pptPricing.mode === 'free' || pptPricing.amountPaise === 0) {
    // PPT is free — call success directly
    if (typeof onSuccess === 'function') onSuccess(null, null);
    return;
  }

  // PPT is paid — reuse existing payment modal with modified label
  pendingFormData = { ...formData, _pptOnlyMode: true, _pptOnlyCallback: onSuccess };

  // Update the modal title and amount display for PPT Only
  const titleEl = getEl('payment-modal-title');
  if (titleEl) titleEl.textContent = 'Pay & Generate PPT';

  const feeAmountEl = document.querySelector('#razorpay-option .fee-amount-inline');
  if (feeAmountEl) feeAmountEl.textContent = `₹${(pptPricing.amountPaise / 100).toFixed(0)}`;

  const feeLabelEl = document.querySelector('#razorpay-option .fee-label-inline');
  if (feeLabelEl) feeLabelEl.textContent = 'PPT Generation Fee';

  const payBtnText = getEl('pay-btn-text');
  if (payBtnText) payBtnText.textContent = `Pay ₹${(pptPricing.amountPaise / 100).toFixed(0)} & Generate PPT`;

  const subtitleEl = document.querySelector('.payment-subtitle');
  if (subtitleEl) subtitleEl.textContent = 'PowerPoint Presentation · Instant Download';

  getEl('pay-student-name').textContent = formData.pptStudentName || formData.studentName || '—';
  getEl('pay-topic').textContent = formData.topic || '—';

  clearPaymentStatus();
  resetPayButton();
  resetCouponSection();

  getEl('payment-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// ============================================================
// DOMContentLoaded — Wire Everything Up
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Pay button
  getEl('btn-pay')?.addEventListener('click', () => {
    if (!isPayButtonLocked) initiatePayment();
  });

  // Apply Coupon button
  getEl('btn-apply-coupon')?.addEventListener('click', () => {
    if (!isCouponButtonLocked) applyCoupon();
  });

  // Allow pressing Enter in the coupon input field
  getEl('coupon-code-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isCouponButtonLocked) applyCoupon();
  });

  // Cancel payment
  getEl('btn-cancel-payment')?.addEventListener('click', async () => {
    if (paymentState === PaymentState.PROCESSING) return; // Prevent cancel during verification
    if (currentOrderId && paymentState !== PaymentState.IDLE) {
      await apiRecordStatus(currentOrderId, 'cancelled', 'User cancelled payment modal');
    }
    paymentState = PaymentState.IDLE;
    currentOrderId = null;
    currentPaymentToken = null;
    pendingFormData = null;
    hidePaymentModal();
  });

  // Close modal on backdrop click
  getEl('payment-modal')?.addEventListener('click', (e) => {
    if (e.target === getEl('payment-modal') && paymentState !== PaymentState.PROCESSING) {
      getEl('btn-cancel-payment')?.click();
    }
  });

  // PDF download buttons (top banner and preview toolbar)
  getEl('btn-download-pdf')?.addEventListener('click', downloadAsPdf);
  getEl('btn-download-pdf-bottom')?.addEventListener('click', downloadAsPdf);

  // Native Vector PDF Print / Save buttons (100% vector Times New Roman text output)
  const triggerPrint = () => {
    // Ensure all 3 pages are active and visible in the preview before triggering print
    const allTabBtn = document.querySelector('.preview-tab-btn[data-tab="all"]');
    if (allTabBtn && !allTabBtn.classList.contains('active')) {
      allTabBtn.click();
    }
    window.print();
  };
  getEl('btn-print-pdf')?.addEventListener('click', triggerPrint);
  getEl('btn-print-pdf-bottom')?.addEventListener('click', triggerPrint);

  // Transactions modal open
  getEl('btn-open-transactions')?.addEventListener('click', () => {
    getEl('transactions-modal')?.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    loadTransactions('all');
  });

  // Transactions modal close
  getEl('btn-close-txn')?.addEventListener('click', () => {
    getEl('transactions-modal')?.classList.add('hidden');
    document.body.style.overflow = '';
  });

  // Close transactions modal on backdrop click
  getEl('transactions-modal')?.addEventListener('click', (e) => {
    if (e.target === getEl('transactions-modal')) {
      getEl('btn-close-txn')?.click();
    }
  });

  // Hidden Admin entry point: College Circular Logo click
  const logoBtn = getEl('college-logo-btn') || document.querySelector('.college-logo');
  logoBtn?.addEventListener('click', () => {
    showAdminModal();
  });

  // Admin modal close
  getEl('btn-close-admin')?.addEventListener('click', hideAdminModal);

  // Close admin modal on backdrop click
  getEl('admin-modal')?.addEventListener('click', (e) => {
    if (e.target === getEl('admin-modal')) {
      hideAdminModal();
    }
  });

  // Admin login button & Enter key
  getEl('btn-admin-login')?.addEventListener('click', handleAdminLogin);
  getEl('admin-password')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdminLogin();
  });
  getEl('admin-username')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') getEl('admin-password')?.focus();
  });

  // Admin logout
  getEl('btn-admin-logout')?.addEventListener('click', handleAdminLogout);

  // Admin generate offline cash coupon
  getEl('btn-generate-coupon')?.addEventListener('click', handleGenerateOfflineCoupon);

  // Admin copy coupon code button
  getEl('btn-copy-coupon')?.addEventListener('click', handleCopyCoupon);

  // Admin refresh coupons log
  getEl('btn-refresh-admin-coupons')?.addEventListener('click', loadAdminCoupons);

  // Transaction filter buttons
  document.querySelectorAll('.txn-filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.txn-filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTransactions(btn.dataset.filter);
    });
  });

  // Refresh button
  getEl('btn-refresh-txn')?.addEventListener('click', () => {
    const activeFilter = document.querySelector('.txn-filter-btn.active')?.dataset.filter || 'all';
    loadTransactions(activeFilter);
  });

  // Admin Navigation Tabs
  document.querySelectorAll('.admin-tab-btn[data-admin-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchAdminTab(btn.dataset.adminTab);
    });
  });

  // Initialize pricing tab interactions
  initPricingTab();

  // Admin Reports Search Input (with debounce)
  let adminSearchTimer = null;
  getEl('admin-reports-search')?.addEventListener('input', () => {
    clearTimeout(adminSearchTimer);
    adminSearchTimer = setTimeout(() => {
      loadAdminReports();
    }, 250);
  });

  // Admin Reports Filter: Payment Method
  getEl('admin-reports-filter-payment')?.addEventListener('change', () => {
    loadAdminReports();
  });

  // Admin Reports Filter: Date
  getEl('admin-reports-filter-date')?.addEventListener('change', () => {
    loadAdminReports();
  });

  // Admin Reports Filters Reset
  getEl('btn-admin-reports-reset')?.addEventListener('click', () => {
    if (getEl('admin-reports-search')) getEl('admin-reports-search').value = '';
    if (getEl('admin-reports-filter-payment')) getEl('admin-reports-filter-payment').value = 'all';
    if (getEl('admin-reports-filter-date')) getEl('admin-reports-filter-date').value = '';
    loadAdminReports();
  });

  // Admin Reports Refresh Button
  getEl('btn-refresh-admin-reports')?.addEventListener('click', () => {
    loadAdminReports();
  });

  // Admin Report View Modal Close Buttons
  const closeReportViewModal = () => {
    getEl('admin-report-view-modal')?.classList.add('hidden');
    document.body.style.overflow = getEl('admin-modal')?.classList.contains('hidden') ? '' : 'hidden';
  };
  getEl('btn-close-report-view')?.addEventListener('click', closeReportViewModal);
  getEl('btn-viewer-close')?.addEventListener('click', closeReportViewModal);

  // Close Report View Modal on Backdrop Click
  getEl('admin-report-view-modal')?.addEventListener('click', (e) => {
    if (e.target === getEl('admin-report-view-modal')) {
      closeReportViewModal();
    }
  });

  // Admin Report View Modal: Download PDF Button
  getEl('btn-viewer-download-pdf')?.addEventListener('click', () => {
    if (currentViewingReport && currentViewingReport.reportId) {
      handleDownloadReportPdf(currentViewingReport.reportId, getEl('btn-viewer-download-pdf'));
    }
  });

  // Keyboard escape to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!getEl('admin-report-view-modal')?.classList.contains('hidden')) {
        closeReportViewModal();
      } else if (!getEl('admin-modal')?.classList.contains('hidden')) {
        hideAdminModal();
      } else if (!getEl('transactions-modal')?.classList.contains('hidden')) {
        getEl('btn-close-txn')?.click();
      } else if (!getEl('payment-modal')?.classList.contains('hidden') && paymentState !== PaymentState.PROCESSING) {
        getEl('btn-cancel-payment')?.click();
      }
    }
  });
});

// ============================================================
// Global API exposed to app.js
// ============================================================
window.showPaymentModal = showPaymentModal;
window.showPptPaymentModal = showPptPaymentModal;
window.fetchPublicPricing = fetchPublicPricing;
window.downloadAsPdf   = downloadAsPdf;
window.getPaymentToken = () => currentPaymentToken;
window.getPaymentOrderId = () => currentOrderId;
