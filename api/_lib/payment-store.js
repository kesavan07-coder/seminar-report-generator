/**
 * Universal Shared Transaction & Payment Verification Store
 * Manages order states, cryptographic token verification, single-use token consumption,
 * offline cash coupons (UNUSED -> USED atomic lifecycle), and admin authentication.
 * Works across Vercel, Netlify, and local Node runtime.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { validateStatus, sanitizeText } = require('./validator');

// In-memory transaction registry (persists across warm serverless/Node lifecycle)
const transactionStore = new Map();
// Set of consumed tokens to enforce single-use protection
const consumedTokenSet = new Set();
// Offline cash coupon registry: Map<coupon_code, CouponObject>
const couponStore = new Map();
// Generated seminar reports registry: Map<reportId, ReportObject>
const reportStore = new Map();
// Set of invalidated admin tokens (for logout)
const revokedAdminTokens = new Set();

// Helper to get secret for token signing
function getSecretKey() {
  return process.env.RAZORPAY_KEY_SECRET || 'mec_seminar_default_sec_2026_iqac';
}

// Persistent coupon storage path (uses /tmp on serverless or local dir)
function getCouponStoragePath() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (isServerless) {
    return path.join('/tmp', 'mec_offline_coupons.json');
  }
  return path.join(__dirname, '..', '.coupons_store.json');
}

// Persistent reports storage path (uses /tmp on serverless or local dir)
function getReportStoragePath() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (isServerless) {
    return path.join('/tmp', 'mec_generated_reports.json');
  }
  return path.join(__dirname, '..', '.reports_store.json');
}

// Load persisted coupons from disk on cold start
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
  } catch (err) {
    // Non-fatal fallback to in-memory store
  }
}

// Save coupons to disk
function savePersistedCoupons() {
  try {
    const storePath = getCouponStoragePath();
    const list = Array.from(couponStore.values());
    fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal
  }
}

// Load persisted reports from disk on cold start
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
  } catch (err) {
    // Non-fatal fallback to in-memory store
  }
}

// Save reports to disk
function savePersistedReports() {
  try {
    const storePath = getReportStoragePath();
    const list = Array.from(reportStore.values());
    fs.writeFileSync(storePath, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    // Non-fatal
  }
}

// Initialize coupons and reports
loadPersistedCoupons();
loadPersistedReports();

// ============================================================
// Order & Transaction Store
// ============================================================

/**
 * Record a new order creation
 */
function recordOrder({ orderId, studentName, topic, amount = 500, currency = 'INR', status = 'created' }) {
  const transaction = {
    orderId,
    paymentId: null,
    studentName: sanitizeText(studentName || 'Student', 100),
    topic: sanitizeText(topic || 'Seminar Report', 300),
    amount: amount / 100, // stored as ₹5.00
    amountPaise: amount,
    currency,
    status, // 'created' | 'pending' | 'success' | 'failed' | 'cancelled'
    consumed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  transactionStore.set(orderId, transaction);
  return transaction;
}

/**
 * Update transaction status
 */
function updateTransaction(orderId, { status, paymentId = null, reason = null }) {
  const existing = transactionStore.get(orderId);
  if (!existing) {
    const entry = {
      orderId,
      paymentId,
      studentName: 'Student',
      topic: 'Seminar Report',
      amount: 5.00,
      amountPaise: 500,
      currency: 'INR',
      status: status || 'pending',
      reason: reason ? sanitizeText(reason, 200) : null,
      consumed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    transactionStore.set(orderId, entry);
    return entry;
  }

  existing.status = status || existing.status;
  if (paymentId) existing.paymentId = paymentId;
  if (reason) existing.reason = sanitizeText(reason, 200);
  existing.updatedAt = new Date().toISOString();

  transactionStore.set(orderId, existing);
  return existing;
}

/**
 * Retrieve all transactions with optional filtering
 */
function getTransactions(filterStatus = null) {
  const validFilter = validateStatus(filterStatus);
  const statusFilter = validFilter.valid ? validFilter.value : 'all';

  const all = Array.from(transactionStore.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (statusFilter === 'all') {
    return all;
  }

  return all.filter(t => t.status === statusFilter.toLowerCase());
}

// ============================================================
// One-Time Offline Cash Coupon Generator & Manager
// ============================================================

const CLEAN_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous 32-character set

/**
 * Compute cryptographic HMAC signature for coupon block1
 */
function computeCouponSignature(block1, secret = getSecretKey()) {
  const hmac = crypto.createHmac('sha256', secret).update(`OFFLINE_CASH_V1:${block1.toUpperCase()}:500`).digest();
  let sig = '';
  for (let i = 0; i < 4; i++) {
    sig += CLEAN_CHARSET[hmac[i] % CLEAN_CHARSET.length];
  }
  return sig;
}

/**
 * Verify cryptographic signature of an offline coupon code
 */
function verifyOfflineCouponSignature(code) {
  if (!code || typeof code !== 'string') return false;
  const match = code.trim().toUpperCase().match(/^OFF-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4})-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4})$/);
  if (!match) return false;
  const [, block1, block2] = match;
  const expectedBlock2 = computeCouponSignature(block1, getSecretKey());
  return constantTimeEqual(block2, expectedBlock2);
}

/**
 * Generate a clean, human-readable, cryptographically verifiable coupon code.
 * Example: OFF-X7K9-P2QM
 */
function generateOfflineCouponCode() {
  const bytes = crypto.randomBytes(4);
  let block1 = '';
  for (let i = 0; i < 4; i++) {
    block1 += CLEAN_CHARSET[bytes[i] % CLEAN_CHARSET.length];
  }
  const block2 = computeCouponSignature(block1, getSecretKey());
  return `OFF-${block1}-${block2}`;
}

/**
 * Create a new one-time offline cash coupon
 * Status: UNUSED, amount: ₹5, type: 'offline_cash'
 */
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
    status: 'UNUSED', // 'UNUSED' | 'USED'
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

/**
 * Look up a coupon by code (case-insensitive & cryptographically verified across serverless containers)
 */
function getCoupon(code) {
  if (!code || typeof code !== 'string') return null;
  loadPersistedCoupons();
  const normalizedCode = code.trim().toUpperCase();
  
  if (couponStore.has(normalizedCode)) {
    return couponStore.get(normalizedCode);
  }

  // If not in local in-memory map (e.g. separate serverless container), verify cryptographic signature
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

/**
 * Atomically redeem an offline cash coupon (UNUSED -> USED).
 * Returns { success: true, coupon } or { success: false, reason: 'NOT_FOUND' | 'ALREADY_USED', coupon }
 */
/**
 * Atomically redeem a coupon (offline cash or custom).
 * Returns { success: true, coupon } or { success: false, reason, coupon }
 */
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
    // Atomic state change: UNUSED -> USED
    coupon.status = 'USED';
    coupon.used_at = new Date().toISOString();
    coupon.used_by_student = sanitizeText(studentName || 'Student', 100);
    coupon.used_for_topic = sanitizeText(topic || 'Seminar Report', 300);

    couponStore.set(coupon.coupon_code, coupon);
    savePersistedCoupons();
    return { success: true, coupon };
  }

  // Custom coupon redemption
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

/**
 * Create a new custom admin-managed coupon
 */
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
  if (isNaN(numDiscount) || numDiscount <= 0) {
    throw new Error('Discount value must be greater than 0.');
  }
  if (discountType === 'percentage' && numDiscount > 100) {
    throw new Error('Percentage discount cannot exceed 100%.');
  }

  const coupon = {
    coupon_code: normalizedCode,
    type: 'custom',
    discount_type: discountType === 'percentage' ? 'percentage' : 'fixed',
    discount_value: numDiscount,
    start_date: startDate ? startDate.trim() : null,
    expiry_date: expiryDate ? expiryDate.trim() : null,
    usage_limit: Math.max(0, parseInt(usageLimit, 10) || 0),
    per_user_limit: Math.max(1, parseInt(perUserLimit, 10) || 1),
    applicable_service: ['both', 'reportAndPpt', 'pptOnly'].includes(applicableService) ? applicableService : 'both',
    status: 'ACTIVE',
    is_active: true,
    used_count: 0,
    redemptions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    createdBy: sanitizeText(createdBy, 50)
  };

  couponStore.set(normalizedCode, coupon);
  savePersistedCoupons();
  return coupon;
}

/**
 * Update an existing custom coupon
 */
function updateCustomCoupon(code, updates = {}, updatedBy = 'admin') {
  if (!code) throw new Error('Coupon code is required.');
  loadPersistedCoupons();
  const normalizedCode = code.trim().toUpperCase();
  const coupon = couponStore.get(normalizedCode);
  if (!coupon) throw new Error(`Coupon "${normalizedCode}" not found.`);

  if (updates.discountType) {
    coupon.discount_type = updates.discountType === 'percentage' ? 'percentage' : 'fixed';
  }
  if (updates.discountValue !== undefined) {
    const num = Number(updates.discountValue);
    if (isNaN(num) || num <= 0) throw new Error('Discount value must be positive.');
    if (coupon.discount_type === 'percentage' && num > 100) throw new Error('Percentage discount cannot exceed 100%.');
    coupon.discount_value = num;
  }
  if (updates.startDate !== undefined) coupon.start_date = updates.startDate || null;
  if (updates.expiryDate !== undefined) coupon.expiry_date = updates.expiryDate || null;
  if (updates.usageLimit !== undefined) coupon.usage_limit = Math.max(0, parseInt(updates.usageLimit, 10) || 0);
  if (updates.perUserLimit !== undefined) coupon.per_user_limit = Math.max(1, parseInt(updates.perUserLimit, 10) || 1);
  if (updates.applicableService) {
    coupon.applicable_service = ['both', 'reportAndPpt', 'pptOnly'].includes(updates.applicableService) ? updates.applicableService : 'both';
  }
  if (updates.isActive !== undefined) {
    coupon.is_active = Boolean(updates.isActive);
    coupon.status = coupon.is_active ? 'ACTIVE' : 'INACTIVE';
  }

  coupon.updated_at = new Date().toISOString();
  coupon.updatedBy = sanitizeText(updatedBy, 50);

  couponStore.set(normalizedCode, coupon);
  savePersistedCoupons();
  return coupon;
}

/**
 * Toggle coupon active status
 */
function toggleCouponStatus(code, isActive, updatedBy = 'admin') {
  return updateCustomCoupon(code, { isActive }, updatedBy);
}

/**
 * Delete a coupon
 */
function deleteCoupon(code) {
  if (!code) return false;
  loadPersistedCoupons();
  const normalizedCode = code.trim().toUpperCase();
  const deleted = couponStore.delete(normalizedCode);
  if (deleted) {
    savePersistedCoupons();
  }
  return deleted;
}

/**
 * List all coupons for admin dashboard
 */
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
    // Token valid for 24 hours
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

/**
 * Persistently records a generated report upon verified payment/coupon
 */
function recordGeneratedReport(reportData) {
  loadPersistedReports();
  const now = new Date();
  const reportId = reportData.reportId || generateReportId();

  const dateFormatted = now.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const timeFormatted = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const record = {
    reportId,
    studentName: sanitizeText(reportData.studentName || 'Student', 100),
    registerNo: sanitizeText(reportData.registerNo || '7316XXXXXXX', 50),
    topic: sanitizeText(reportData.topic || 'Seminar Topic', 300),
    department: sanitizeText(reportData.department || 'Computer Science and Engineering', 150),
    yearSemSec: sanitizeText(reportData.yearSemSec || 'III / VI / A', 50),
    collegeName: sanitizeText(reportData.collegeName || 'Muthayammal Engineering College', 150),
    subject: sanitizeText(reportData.subject || 'Engineering & Technology', 150),
    facultyName: sanitizeText(reportData.facultyName || 'Faculty In-Charge', 100),
    academicYear: sanitizeText(reportData.academicYear || '2026-2027', 50),
    courseCodeName: sanitizeText(reportData.courseCodeName || '', 150),
    seminarNo: sanitizeText(reportData.seminarNo || '01', 50),
    seminarDate: sanitizeText(reportData.seminarDate || '', 50),
    paymentMethod: (reportData.paymentMethod === 'offline_coupon' || reportData.paymentMethod === 'Offline Coupon') ? 'Offline Coupon' : 'Razorpay',
    paymentId: reportData.paymentId ? sanitizeText(reportData.paymentId, 100) : null,
    couponCode: reportData.couponCode ? sanitizeText(reportData.couponCode, 100) : null,
    generatedDate: dateFormatted,
    generatedTime: timeFormatted,
    status: 'completed',
    createdAt: now.toISOString(),
    aiContent: reportData.aiContent || null,
    diagramPngDataUri: reportData.diagramPngDataUri || null
  };

  reportStore.set(reportId, record);
  savePersistedReports();
  return record;
}

/**
 * List generated reports for admin view with optional search and filters
 */
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
    }
  }

  if (date && typeof date === 'string' && date.trim()) {
    const d = date.trim();
    reports = reports.filter(r => 
      (r.createdAt && r.createdAt.startsWith(d)) ||
      (r.generatedDate && r.generatedDate.includes(d))
    );
  }

  // Return clean list view summaries
  return reports.map(r => ({
    reportId: r.reportId,
    studentName: r.studentName,
    registerNo: r.registerNo,
    topic: r.topic,
    department: r.department,
    yearSemSec: r.yearSemSec,
    collegeName: r.collegeName,
    subject: r.subject,
    facultyName: r.facultyName,
    academicYear: r.academicYear,
    courseCodeName: r.courseCodeName,
    seminarNo: r.seminarNo,
    seminarDate: r.seminarDate,
    paymentMethod: r.paymentMethod,
    paymentId: r.paymentId,
    couponCode: r.couponCode,
    generatedDate: r.generatedDate,
    generatedTime: r.generatedTime,
    status: r.status,
    createdAt: r.createdAt
  }));
}

/**
 * Retrieve a specific report by reportId with full content for admin View
 */
function getReportById(reportId) {
  if (!reportId || typeof reportId !== 'string') return null;
  loadPersistedReports();
  const normalized = reportId.trim();
  return reportStore.get(normalized) || reportStore.get(normalized.toUpperCase()) || null;
}

// ============================================================
// Cryptographic Token Signing & Verification
// ============================================================

/**
 * Generate a cryptographically signed single-use verification token (Razorpay)
 */
function generatePaymentToken(orderId, paymentId) {
  const payload = `rzp:${orderId}:${paymentId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

/**
 * Generate a cryptographically signed single-use coupon authorization token.
 */
function generateCouponToken(studentName, topic, couponCode = 'COUPON') {
  const payload = `coupon:${studentName}:${topic.substring(0, 80)}:${couponCode}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', getSecretKey()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, hmac })).toString('base64');
}

/**
 * Verify a payment token (Razorpay) or coupon token and ensure it is valid and unused.
 */
function verifyPaymentToken(token, expectedOrderId = null) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing payment token.' };
  }

  // Check if token has already been consumed
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

    // ---- Coupon token: payload starts with 'coupon:' ----
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

    // ---- Razorpay token: payload starts with 'rzp:' ----
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
    if (txn && txn.status !== 'success') {
      return { valid: false, error: `Transaction status is '${txn.status}' (expected 'success').` };
    }

    return { valid: true, tokenType: 'razorpay', orderId, paymentId, studentName: txn ? txn.studentName : null };
  } catch (err) {
    return { valid: false, error: 'Malformed payment token.' };
  }
}

/**
 * Consumes a payment token once report generation succeeds
 */
function consumePaymentToken(token, orderId) {
  if (token) {
    consumedTokenSet.add(token);
  }
  if (orderId && transactionStore.has(orderId)) {
    const txn = transactionStore.get(orderId);
    txn.consumed = true;
    txn.consumedAt = new Date().toISOString();
  }
}

/**
 * Verify Razorpay HMAC-SHA256 signature
 */
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
  getTransactions,
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
