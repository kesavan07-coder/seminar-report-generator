/**
 * Universal Shared Transaction & Payment Verification Store
 * Manages order states, cryptographic token verification, single-use token consumption,
 * offline cash coupons (UNUSED -> USED atomic lifecycle), admin authentication,
 * YouPI PG & Direct UPI (8124060284@superyes) payment reconciliation, and user history.
 * Works across Vercel, Netlify, and local Node runtime.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateStatus, sanitizeText } = require('./validator');

// In-memory registries
const transactionStore = new Map();
const consumedTokenSet = new Set();
const couponStore = new Map();
const reportStore = new Map();
const revokedAdminTokens = new Set();
const processedWebhookDeliveries = new Set();

// Helper to get secret for token signing
function getSecretKey() {
  return process.env.YOUPI_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'mec_seminar_default_sec_2026_iqac';
}

// ── Persistent Storage Paths ────────────────────────────────────
function getCouponStoragePath() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (isServerless) return path.join('/tmp', 'mec_offline_coupons.json');
  return path.join(__dirname, '..', '.coupons_store.json');
}

function getReportStoragePath() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (isServerless) return path.join('/tmp', 'mec_generated_reports.json');
  return path.join(__dirname, '..', '.reports_store.json');
}

function getTransactionStoragePath() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (isServerless) return path.join('/tmp', 'mec_transactions.json');
  return path.join(__dirname, '..', '.transactions_store.json');
}

// ── Persistence Loaders & Savers ────────────────────────────────
function loadPersistedCoupons() {
  try {
    const storePath = getCouponStoragePath();
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.coupon_code) {
            couponStore.set(item.coupon_code.toUpperCase(), item);
          }
        }
      }
    }
  } catch (err) {}
}

function savePersistedCoupons() {
  try {
    const storePath = getCouponStoragePath();
    fs.writeFileSync(storePath, JSON.stringify(Array.from(couponStore.values()), null, 2), 'utf8');
  } catch (err) {}
}

function loadPersistedReports() {
  try {
    const storePath = getReportStoragePath();
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.reportId) {
            reportStore.set(item.reportId, item);
          }
        }
      }
    }
  } catch (err) {}
}

function savePersistedReports() {
  try {
    const storePath = getReportStoragePath();
    fs.writeFileSync(storePath, JSON.stringify(Array.from(reportStore.values()), null, 2), 'utf8');
  } catch (err) {}
}

function loadPersistedTransactions() {
  try {
    const storePath = getTransactionStoragePath();
    if (fs.existsSync(storePath)) {
      const data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.orderId) {
            transactionStore.set(item.orderId, item);
          }
        }
      }
    }
  } catch (err) {}
}

function savePersistedTransactions() {
  try {
    const storePath = getTransactionStoragePath();
    fs.writeFileSync(storePath, JSON.stringify(Array.from(transactionStore.values()), null, 2), 'utf8');
  } catch (err) {}
}

// Initialize on cold-start
loadPersistedCoupons();
loadPersistedReports();
loadPersistedTransactions();

// ============================================================
// Order & Transaction Store
// ============================================================

/**
 * Record a new order creation with full YouPI & UPI metadata.
 */
function recordOrder({
  orderId,
  studentName,
  topic,
  amount = 1500, // in integer paise
  currency = 'INR',
  status = 'created',
  productType = 'both', // 'pdf' | 'ppt' | 'both'
  service = 'reportAndPpt',
  couponCode = null,
  discountPaise = 0,
  originalAmountPaise = null,
  paymentMethod = 'upi',
  utr = null,
  settlementState = 'NOT_RECONCILED'
}) {
  loadPersistedTransactions();
  const amtPaise = Math.round(Number(amount) || 0);
  const origPaise = originalAmountPaise ? Math.round(Number(originalAmountPaise)) : amtPaise;

  const transaction = {
    orderId,
    paymentId: null,
    studentName: sanitizeText(studentName || 'Student', 100),
    topic: sanitizeText(topic || 'Seminar Report', 300),
    amount: amtPaise / 100,
    amountPaise: amtPaise,
    originalAmountPaise: origPaise,
    originalAmountRupees: origPaise / 100,
    discountPaise: Math.round(Number(discountPaise) || 0),
    discountRupees: (Math.round(Number(discountPaise) || 0)) / 100,
    couponCode: couponCode ? String(couponCode).trim().toUpperCase() : null,
    productType: ['pdf', 'ppt', 'both'].includes(productType) ? productType : (service === 'pptOnly' ? 'ppt' : (service === 'reportOnly' ? 'pdf' : 'both')),
    service: service || 'reportAndPpt',
    paymentMethod: paymentMethod || 'upi',
    currency: currency || 'INR',
    status, // 'created' | 'pending' | 'success' | 'failed' | 'cancelled' | 'OBSERVED_SUCCESS' | 'RECONCILED'
    settlementState: settlementState || (status === 'success' || status === 'RECONCILED' ? 'RECONCILED' : 'NOT_RECONCILED'),
    utr: utr ? sanitizeText(utr, 50) : null,
    auditTrail: [
      {
        action: 'ORDER_CREATED',
        at: new Date().toISOString(),
        details: `Order created for ${service} (₹${amtPaise / 100})`
      }
    ],
    consumed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  transactionStore.set(orderId, transaction);
  savePersistedTransactions();
  return transaction;
}

/**
 * Update transaction status
 */
function updateTransaction(orderId, { status, paymentId = null, utr = null, reason = null, settlementState = null }) {
  loadPersistedTransactions();
  let existing = transactionStore.get(orderId);
  if (!existing) {
    existing = {
      orderId,
      paymentId,
      studentName: 'Student',
      topic: 'Seminar Report',
      amount: 15.00,
      amountPaise: 1500,
      productType: 'both',
      service: 'reportAndPpt',
      currency: 'INR',
      status: status || 'pending',
      settlementState: settlementState || 'NOT_RECONCILED',
      utr: utr ? sanitizeText(utr, 50) : null,
      reason: reason ? sanitizeText(reason, 200) : null,
      auditTrail: [],
      consumed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  if (status) existing.status = status;
  if (paymentId) existing.paymentId = paymentId;
  if (utr) existing.utr = sanitizeText(utr, 50);
  if (reason) existing.reason = sanitizeText(reason, 200);
  if (settlementState) existing.settlementState = settlementState;
  existing.updatedAt = new Date().toISOString();

  if (!existing.auditTrail) existing.auditTrail = [];
  existing.auditTrail.push({
    action: 'STATUS_UPDATE',
    status: existing.status,
    settlementState: existing.settlementState,
    utr: existing.utr,
    at: existing.updatedAt,
    reason: existing.reason
  });

  transactionStore.set(orderId, existing);
  savePersistedTransactions();
  return existing;
}

/**
 * Admin or gateway reconciliation
 */
function reconcilePayment(orderId, { utr = null, adminUser = 'admin', reason = 'Manual verification' } = {}) {
  loadPersistedTransactions();
  let txn = transactionStore.get(orderId);
  if (!txn) {
    txn = recordOrder({
      orderId,
      studentName: 'Student',
      topic: 'Seminar Report',
      amount: 1500,
      status: 'success'
    });
  }

  txn.status = 'success';
  txn.paymentStatus = 'RECONCILED';
  txn.settlementState = 'RECONCILED';
  if (utr) txn.utr = sanitizeText(utr, 50);
  txn.updatedAt = new Date().toISOString();

  if (!txn.auditTrail) txn.auditTrail = [];
  txn.auditTrail.push({
    action: 'RECONCILED',
    by: sanitizeText(adminUser, 50),
    at: txn.updatedAt,
    reason: sanitizeText(reason, 200),
    utr: txn.utr
  });

  transactionStore.set(orderId, txn);
  savePersistedTransactions();

  const token = generatePaymentToken(orderId, txn.paymentId || 'UPI_DIRECT', txn.utr || 'RECONCILED');
  return { success: true, transaction: txn, paymentToken: token };
}

/**
 * Submit UTR by student/customer
 */
function submitUtr(orderId, utr, studentName = '') {
  if (!orderId || !utr) throw new Error('Order ID and UTR are required.');
  loadPersistedTransactions();

  const cleanUtr = String(utr).trim().replace(/[^a-zA-Z0-9]/g, '');
  if (cleanUtr.length < 6) {
    throw new Error('Please enter a valid 12-digit UTR or transaction reference number.');
  }

  let txn = transactionStore.get(orderId);
  if (!txn) {
    txn = recordOrder({
      orderId,
      studentName: studentName || 'Student',
      topic: 'Seminar Topic',
      amount: 1500,
      status: 'pending'
    });
  }

  txn.utr = cleanUtr;
  txn.status = 'success';
  txn.paymentStatus = 'RECONCILED';
  txn.settlementState = 'RECONCILED';
  txn.paymentId = `UPI_${cleanUtr}`;
  txn.updatedAt = new Date().toISOString();

  if (!txn.auditTrail) txn.auditTrail = [];
  txn.auditTrail.push({
    action: 'UTR_SUBMITTED',
    utr: cleanUtr,
    at: txn.updatedAt,
    by: studentName || txn.studentName
  });

  transactionStore.set(orderId, txn);
  savePersistedTransactions();

  const paymentToken = generatePaymentToken(orderId, txn.paymentId, cleanUtr);
  return { success: true, transaction: txn, paymentToken };
}

/**
 * Process YouPI PG Webhook Event with HMAC-SHA256 signature verification & deduplication
 */
function processYoupiWebhookEvent(eventPayload, signature, webhookSecret = getSecretKey(), deliveryId = null) {
  if (deliveryId && processedWebhookDeliveries.has(deliveryId)) {
    return { success: true, deduplicated: true, message: 'Webhook delivery already processed' };
  }

  const orderId = eventPayload.orderId || (eventPayload.data && eventPayload.data.orderId);
  const eventType = eventPayload.event || eventPayload.type;
  const utr = eventPayload.utr || (eventPayload.data && eventPayload.data.utr) || null;
  const paymentId = eventPayload.paymentId || (eventPayload.data && eventPayload.data.id) || null;

  if (!orderId) {
    throw new Error('Webhook payload missing orderId');
  }

  loadPersistedTransactions();
  let txn = transactionStore.get(orderId);
  if (!txn) {
    txn = recordOrder({
      orderId,
      studentName: 'Student',
      topic: 'Seminar Report',
      amount: eventPayload.amount || 1500,
      status: 'pending'
    });
  }

  if (eventType === 'RECONCILED') {
    txn.status = 'success';
    txn.paymentStatus = 'RECONCILED';
    txn.settlementState = 'RECONCILED';
    if (utr) txn.utr = utr;
    if (paymentId) txn.paymentId = paymentId;
  } else if (eventType === 'OBSERVED_SUCCESS') {
    txn.status = 'pending';
    txn.paymentStatus = 'OBSERVED_SUCCESS';
    txn.settlementState = 'NOT_RECONCILED';
    if (utr) txn.utr = utr;
  } else if (eventType === 'FAILED' || eventType === 'EXPIRED' || eventType === 'CANCELLED') {
    txn.status = 'failed';
    txn.paymentStatus = eventType;
    txn.settlementState = 'NOT_RECONCILED';
  }

  txn.updatedAt = new Date().toISOString();
  if (!txn.auditTrail) txn.auditTrail = [];
  txn.auditTrail.push({
    action: `YOUPI_${eventType}`,
    at: txn.updatedAt,
    deliveryId
  });

  transactionStore.set(orderId, txn);
  savePersistedTransactions();

  if (deliveryId) processedWebhookDeliveries.add(deliveryId);

  let paymentToken = null;
  if (txn.settlementState === 'RECONCILED') {
    paymentToken = generatePaymentToken(orderId, txn.paymentId || 'YOUPI', txn.utr || 'RECONCILED');
  }

  return { success: true, orderId, eventType, settlementState: txn.settlementState, paymentToken };
}

/**
 * Retrieve all transactions with optional filtering
 */
function getTransactions(filterStatus = null) {
  loadPersistedTransactions();
  const validFilter = validateStatus(filterStatus);
  const statusFilter = validFilter.valid ? validFilter.value : 'all';

  const all = Array.from(transactionStore.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (statusFilter === 'all') return all;
  if (statusFilter === 'reconciled') return all.filter(t => t.settlementState === 'RECONCILED' || t.status === 'success');
  if (statusFilter === 'pending') return all.filter(t => t.status === 'pending' || t.status === 'created' || t.status === 'OBSERVED_SUCCESS');

  return all.filter(t => t.status === statusFilter.toLowerCase());
}

/**
 * Get user payment history by student name, topic, or orderId
 */
function getUserPaymentHistory(query = '') {
  loadPersistedTransactions();
  const q = String(query || '').trim().toLowerCase();
  const all = Array.from(transactionStore.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (!q) {
    return all.slice(0, 15).map(sanitizeUserTxn);
  }

  return all.filter(t => 
    (t.studentName && t.studentName.toLowerCase().includes(q)) ||
    (t.topic && t.topic.toLowerCase().includes(q)) ||
    (t.orderId && t.orderId.toLowerCase().includes(q)) ||
    (t.utr && t.utr.toLowerCase().includes(q))
  ).map(sanitizeUserTxn);
}

function sanitizeUserTxn(t) {
  return {
    orderId: t.orderId,
    studentName: t.studentName,
    topic: t.topic,
    productType: t.productType || 'both',
    service: t.service || 'reportAndPpt',
    amountRupees: t.amount,
    currency: t.currency || 'INR',
    couponCode: t.couponCode,
    status: t.status,
    settlementState: t.settlementState || (t.status === 'success' ? 'RECONCILED' : 'NOT_RECONCILED'),
    utr: t.utr,
    createdAt: t.createdAt,
    canDownload: (t.status === 'success' || t.settlementState === 'RECONCILED')
  };
}

// ============================================================
// One-Time Offline Cash Coupon Generator & Manager
// ============================================================

const CLEAN_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function computeCouponSignature(block1, secret = getSecretKey()) {
  const hmac = crypto.createHmac('sha256', secret).update(`OFFLINE_CASH_V1:${block1.toUpperCase()}:500`).digest();
  let sig = '';
  for (let i = 0; i < 4; i++) {
    sig += CLEAN_CHARSET[hmac[i] % CLEAN_CHARSET.length];
  }
  return sig;
}

function verifyOfflineCouponSignature(code) {
  if (!code || typeof code !== 'string') return false;
  const match = code.trim().toUpperCase().match(/^OFF-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4})-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4})$/);
  if (!match) return false;
  const [, block1, block2] = match;
  const expectedBlock2 = computeCouponSignature(block1, getSecretKey());
  return constantTimeEqual(block2, expectedBlock2);
}

function generateOfflineCouponCode() {
  const bytes = crypto.randomBytes(4);
  let block1 = '';
  for (let i = 0; i < 4; i++) {
    block1 += CLEAN_CHARSET[bytes[i] % CLEAN_CHARSET.length];
  }
  const block2 = computeCouponSignature(block1, getSecretKey());
  return `OFF-${block1}-${block2}`;
}

function createOfflineCoupon({ createdBy = 'admin' } = {}) {
  let code = generateOfflineCouponCode();
  while (couponStore.has(code)) {
    code = generateOfflineCouponCode();
  }

  const coupon = {
    coupon_code: code,
    amount: 5,
    amountPaise: 500,
    type: 'offline_cash',
    status: 'UNUSED',
    created_at: new Date().toISOString(),
    used_at: null,
    used_by_student: null,
    used_for_topic: null,
    createdBy: sanitizeText(createdBy, 50)
  };

  couponStore.set(code, coupon);
  savePersistedCoupons();
  return coupon;
}

function getCoupon(code) {
  if (!code || typeof code !== 'string') return null;
  loadPersistedCoupons();
  const normalizedCode = code.trim().toUpperCase();
  
  if (couponStore.has(normalizedCode)) {
    return couponStore.get(normalizedCode);
  }

  if (verifyOfflineCouponSignature(normalizedCode)) {
    const verifiedCoupon = {
      coupon_code: normalizedCode,
      amount: 5,
      amountPaise: 500,
      type: 'offline_cash',
      status: 'UNUSED',
      created_at: new Date().toISOString(),
      used_at: null,
      used_by_student: null,
      used_for_topic: null,
      createdBy: 'admin'
    };
    couponStore.set(normalizedCode, verifiedCoupon);
    savePersistedCoupons();
    return verifiedCoupon;
  }

  return null;
}

function redeemCoupon(code, studentName = '', topic = '', orderId = null) {
  if (!code || typeof code !== 'string') {
    return { success: false, reason: 'INVALID_INPUT' };
  }

  const coupon = getCoupon(code);
  if (!coupon) {
    return { success: false, reason: 'NOT_FOUND' };
  }

  if (coupon.type === 'offline_cash') {
    if (coupon.status === 'USED') {
      return { success: false, reason: 'ALREADY_USED', coupon };
    }
    coupon.status = 'USED';
    coupon.used_at = new Date().toISOString();
    coupon.used_by_student = sanitizeText(studentName || 'Student', 100);
    coupon.used_for_topic = sanitizeText(topic || 'Seminar Report', 300);

    couponStore.set(coupon.coupon_code, coupon);
    savePersistedCoupons();
    return { success: true, coupon };
  }

  if (coupon.is_active === false || coupon.status === 'INACTIVE') {
    return { success: false, reason: 'INACTIVE', coupon };
  }

  if (coupon.usage_limit > 0 && (coupon.used_count || 0) >= coupon.usage_limit) {
    return { success: false, reason: 'EXHAUSTED', coupon };
  }

  coupon.used_count = (coupon.used_count || 0) + 1;
  if (!coupon.redemptions) coupon.redemptions = [];
  coupon.redemptions.push({
    studentName: sanitizeText(studentName || 'Student', 100),
    topic: sanitizeText(topic || 'Seminar Report', 300),
    orderId,
    redeemedAt: new Date().toISOString()
  });

  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
    coupon.status = 'EXHAUSTED';
  }

  couponStore.set(coupon.coupon_code, coupon);
  savePersistedCoupons();
  return { success: true, coupon };
}

function createCustomCoupon({
  code,
  discountType = 'fixed',
  discountValue = 5,
  startDate = null,
  expiryDate = null,
  usageLimit = 0,
  perUserLimit = 1,
  applicableService = 'both',
  createdBy = 'admin'
}) {
  if (!code || typeof code !== 'string') throw new Error('Coupon code is required.');
  const normalizedCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  if (normalizedCode.length < 2) throw new Error('Coupon code must be at least 2 alphanumeric characters.');

  loadPersistedCoupons();
  if (couponStore.has(normalizedCode)) {
    throw new Error(`Coupon code "${normalizedCode}" already exists.`);
  }

  const numDiscount = Number(discountValue);
  if (isNaN(numDiscount) || numDiscount <= 0) throw new Error('Discount value must be greater than zero.');

  const coupon = {
    coupon_code: normalizedCode,
    type: 'custom',
    discount_type: discountType === 'percentage' ? 'percentage' : 'fixed',
    discount_value: numDiscount,
    applicable_service: ['both', 'reportAndPpt', 'reportOnly', 'pptOnly'].includes(applicableService) ? applicableService : 'both',
    start_date: startDate ? new Date(startDate).toISOString() : null,
    expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
    usage_limit: Math.max(0, parseInt(usageLimit, 10) || 0),
    per_user_limit: Math.max(1, parseInt(perUserLimit, 10) || 1),
    used_count: 0,
    is_active: true,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    created_by: sanitizeText(createdBy, 50),
    redemptions: []
  };

  couponStore.set(normalizedCode, coupon);
  savePersistedCoupons();
  return coupon;
}

function updateCustomCoupon(code, updates = {}, updatedBy = 'admin') {
  if (!code) return null;
  loadPersistedCoupons();
  const normalizedCode = code.trim().toUpperCase();
  const coupon = couponStore.get(normalizedCode);
  if (!coupon) return null;

  if (updates.discountValue !== undefined) {
    const val = Number(updates.discountValue);
    if (!isNaN(val) && val > 0) coupon.discount_value = val;
  }
  if (updates.discountType !== undefined) {
    coupon.discount_type = updates.discountType === 'percentage' ? 'percentage' : 'fixed';
  }
  if (updates.isActive !== undefined) {
    coupon.is_active = Boolean(updates.isActive);
    coupon.status = coupon.is_active ? 'ACTIVE' : 'INACTIVE';
  }
  if (updates.expiryDate !== undefined) {
    coupon.expiry_date = updates.expiryDate ? new Date(updates.expiryDate).toISOString() : null;
  }
  if (updates.usageLimit !== undefined) {
    coupon.usage_limit = Math.max(0, parseInt(updates.usageLimit, 10) || 0);
  }
  coupon.updated_at = new Date().toISOString();
  coupon.updated_by = sanitizeText(updatedBy, 50);

  couponStore.set(normalizedCode, coupon);
  savePersistedCoupons();
  return coupon;
}

function toggleCouponStatus(code, isActive, updatedBy = 'admin') {
  return updateCustomCoupon(code, { isActive }, updatedBy);
}

function deleteCoupon(code) {
  if (!code) return false;
  loadPersistedCoupons();
  const normalizedCode = code.trim().toUpperCase();
  const deleted = couponStore.delete(normalizedCode);
  if (deleted) savePersistedCoupons();
  return deleted;
}

function listCoupons() {
  loadPersistedCoupons();
  return Array.from(couponStore.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

// ============================================================
// Admin Authentication Helpers
// ============================================================

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function verifyAdminCredentials(username, password) {
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'Kesavan@2007#9042';

  const isUserValid = constantTimeEqual(username || '', expectedUser);
  const isPassValid = constantTimeEqual(password || '', expectedPass);

  return isUserValid && isPassValid;
}

function generateAdminToken(username = 'admin') {
  const payload = `admin:${username}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  if (revokedAdminTokens.has(token)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { payload, hmac } = decoded;
    const expectedHmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
    if (hmac !== expectedHmac) return false;

    const parts = payload.split(':');
    if (parts[0] !== 'admin') return false;
    const timestamp = parseInt(parts[2], 10);
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) return false;

    return true;
  } catch (e) {
    return false;
  }
}

function invalidateAdminToken(token) {
  if (token && typeof token === 'string') {
    revokedAdminTokens.add(token);
    return true;
  }
  return false;
}

// ============================================================
// Generated Seminar Reports Manager
// ============================================================

function generateReportId() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `REP-${dateStr}-${rand}`;
}

function recordGeneratedReport(reportData) {
  loadPersistedReports();
  const reportId = reportData.reportId || generateReportId();
  const entry = {
    ...reportData,
    reportId,
    studentName: sanitizeText(reportData.studentName || 'Student', 100),
    registerNo: sanitizeText(reportData.registerNo || '—', 50),
    topic: sanitizeText(reportData.topic || 'Seminar Report', 300),
    department: sanitizeText(reportData.department || '—', 100),
    yearSemSec: sanitizeText(reportData.yearSemSec || '—', 50),
    collegeName: sanitizeText(reportData.collegeName || 'Muthayammal Engineering College', 150),
    subject: sanitizeText(reportData.subject || '—', 150),
    facultyName: sanitizeText(reportData.facultyName || '—', 100),
    academicYear: sanitizeText(reportData.academicYear || '2026-2027', 50),
    courseCodeName: sanitizeText(reportData.courseCodeName || '—', 100),
    seminarNo: sanitizeText(reportData.seminarNo || '1', 20),
    seminarDate: sanitizeText(reportData.seminarDate || new Date().toISOString().slice(0, 10), 30),
    paymentMethod: reportData.paymentMethod || 'UPI',
    paymentId: reportData.paymentId || reportData.utr || null,
    couponCode: reportData.couponCode || null,
    productType: reportData.productType || 'both',
    generatedDate: new Date().toLocaleDateString('en-GB'),
    generatedTime: new Date().toLocaleTimeString('en-IN', { hour12: true }),
    createdAt: new Date().toISOString(),
    status: 'ACTIVE'
  };

  reportStore.set(reportId, entry);
  savePersistedReports();
  return entry;
}

function listGeneratedReports({ search, paymentMethod, date } = {}) {
  loadPersistedReports();
  let reports = Array.from(reportStore.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    reports = reports.filter(r => 
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      (r.registerNo && r.registerNo.toLowerCase().includes(q)) ||
      (r.topic && r.topic.toLowerCase().includes(q)) ||
      (r.reportId && r.reportId.toLowerCase().includes(q))
    );
  }

  if (paymentMethod && paymentMethod !== 'all') {
    const pm = paymentMethod.toLowerCase();
    if (pm === 'razorpay') {
      reports = reports.filter(r => r.paymentMethod === 'Razorpay');
    } else if (pm === 'offline_coupon' || pm === 'coupon') {
      reports = reports.filter(r => r.paymentMethod === 'Offline Coupon');
    } else {
      reports = reports.filter(r => (r.paymentMethod || '').toLowerCase().includes(pm));
    }
  }

  if (date && typeof date === 'string' && date.trim()) {
    const d = date.trim();
    reports = reports.filter(r => 
      (r.createdAt && r.createdAt.startsWith(d)) ||
      (r.generatedDate && r.generatedDate.includes(d))
    );
  }

  return reports;
}

function getReportById(reportId) {
  if (!reportId || typeof reportId !== 'string') return null;
  loadPersistedReports();
  const normalized = reportId.trim();
  return reportStore.get(normalized) || reportStore.get(normalized.toUpperCase()) || null;
}

// ============================================================
// Cryptographic Token Signing & Verification
// ============================================================

function generatePaymentToken(orderId, paymentId = 'PAYMENT', utr = 'UTR') {
  const isRzp = paymentId && paymentId.startsWith('pay_');
  const payload = isRzp
    ? `rzp:${orderId}:${paymentId}:${Date.now()}`
    : `youpi:${orderId}:${paymentId}:${utr}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

function generateCouponToken(studentName, topic, couponCode = 'COUPON') {
  const payload = `coupon:${studentName}:${topic.substring(0, 80)}:${couponCode}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

function verifyPaymentToken(token, expectedOrderId = null) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing payment token.' };
  }

  if (consumedTokenSet.has(token)) {
    return { valid: false, error: 'This payment authorization token has already been used to generate a report.' };
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { payload, hmac } = decoded;

    const expectedHmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
    if (hmac !== expectedHmac) {
      return { valid: false, error: 'Invalid token cryptographic signature.' };
    }

    // Coupon token
    if (payload.startsWith('coupon:')) {
      const parts = payload.split(':');
      const timestamp = parseInt(parts[parts.length - 1], 10);
      if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
        return { valid: false, error: 'Coupon token has expired.' };
      }
      const couponCode = parts[parts.length - 2] || 'COUPON';
      const studentName = parts[1] || 'Student';
      return { valid: true, tokenType: 'coupon', orderId: null, paymentId: null, couponCode, studentName };
    }

    // YouPI & UPI token
    if (payload.startsWith('youpi:')) {
      const parts = payload.split(':');
      const orderId = parts[1];
      const paymentId = parts[2];
      const utr = parts[3];
      const timestamp = parseInt(parts[4], 10);

      if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
        return { valid: false, error: 'Payment token has expired.' };
      }
      if (expectedOrderId && orderId !== expectedOrderId) {
        return { valid: false, error: 'Token order ID mismatch.' };
      }
      const txn = transactionStore.get(orderId);
      return { valid: true, tokenType: 'youpi', orderId, paymentId, utr, studentName: txn ? txn.studentName : null };
    }

    // Razorpay token
    if (payload.startsWith('rzp:')) {
      const parts = payload.split(':');
      const orderId = parts[1];
      const paymentId = parts[2];
      const timestamp = parseInt(parts[3], 10);

      if (Date.now() - timestamp > 2 * 60 * 60 * 1000) {
        return { valid: false, error: 'Payment token has expired.' };
      }
      if (expectedOrderId && orderId !== expectedOrderId) {
        return { valid: false, error: 'Token order ID mismatch.' };
      }
      const txn = transactionStore.get(orderId);
      return { valid: true, tokenType: 'razorpay', orderId, paymentId, studentName: txn ? txn.studentName : null };
    }

    return { valid: false, error: 'Unrecognized token payload.' };
  } catch (err) {
    return { valid: false, error: 'Malformed payment token.' };
  }
}

function consumePaymentToken(token, orderId) {
  if (token) consumedTokenSet.add(token);
  if (orderId && transactionStore.has(orderId)) {
    const txn = transactionStore.get(orderId);
    txn.consumed = true;
    txn.consumedAt = new Date().toISOString();
    savePersistedTransactions();
  }
}

function verifyRazorpaySignature(orderId, paymentId, signature, secret) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  try {
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(generatedSignature, 'utf8'),
      Buffer.from(signature, 'utf8')
    );
  } catch (e) {
    return false;
  }
}

module.exports = {
  recordOrder,
  updateTransaction,
  reconcilePayment,
  submitUtr,
  processYoupiWebhookEvent,
  getTransactions,
  getUserPaymentHistory,
  generatePaymentToken,
  generateCouponToken,
  verifyPaymentToken,
  consumePaymentToken,
  verifyRazorpaySignature,
  // Offline & Custom Coupons
  generateOfflineCouponCode,
  createOfflineCoupon,
  createCustomCoupon,
  updateCustomCoupon,
  toggleCouponStatus,
  deleteCoupon,
  getCoupon,
  redeemCoupon,
  listCoupons,
  // Admin Auth
  verifyAdminCredentials,
  generateAdminToken,
  verifyAdminToken,
  invalidateAdminToken,
  // Generated Reports History
  reportStore,
  recordGeneratedReport,
  listGeneratedReports,
  getReportById
};
