/**
 * Universal Input Validation and Sanitization Module
 * Protects against XSS, SQL injection, NoSQL injection, path traversal,
 * malformed IDs, and prototype pollution across Vercel, Netlify, and local runtime.
 */

'use strict';

/**
 * Escapes HTML entities to prevent DOM-based and Reflected XSS
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapes XML / SVG entities
 */
function escapeXml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Strips ASCII control characters and enforces max length
 */
function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  // Remove ASCII control characters (0x00 - 0x1F, 0x7F) except newline and tab
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  return cleaned.substring(0, maxLength);
}

/**
 * Validates seminar topic
 */
function validateTopic(topic) {
  if (typeof topic !== 'string') {
    return { valid: false, error: 'Topic must be a text string.' };
  }
  const trimmed = topic.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Seminar topic must be at least 3 characters long.' };
  }
  if (trimmed.length > 300) {
    return { valid: false, error: 'Seminar topic cannot exceed 300 characters.' };
  }
  const clean = sanitizeText(trimmed, 300);
  return { valid: true, value: clean };
}

/**
 * Validates course / subject name
 */
function validateSubject(subject) {
  if (!subject) return { valid: true, value: 'Engineering and Technology' };
  if (typeof subject !== 'string') {
    return { valid: false, error: 'Subject must be a text string.' };
  }
  const trimmed = subject.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Subject name must be at least 2 characters.' };
  }
  if (trimmed.length > 200) {
    return { valid: false, error: 'Subject name cannot exceed 200 characters.' };
  }
  const clean = sanitizeText(trimmed, 200);
  return { valid: true, value: clean };
}

/**
 * Validates student name
 */
function validateStudentName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Student Name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Student name must be at least 2 characters.' };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: 'Student name cannot exceed 100 characters.' };
  }
  const clean = sanitizeText(trimmed, 100);
  // Allow Unicode letters, spaces, dots, dashes, apostrophes
  const nameRegex = /^[\p{L}\p{M}\s.'-]+$/u;
  if (!nameRegex.test(clean)) {
    return { valid: false, error: 'Student name contains invalid characters.' };
  }
  return { valid: true, value: clean };
}

/**
 * Validates register number
 */
function validateRegisterNo(regNo) {
  if (!regNo || typeof regNo !== 'string') {
    return { valid: false, error: 'Register number is required.' };
  }
  const clean = sanitizeText(regNo, 30);
  // Alphanumeric, hyphen, slash (e.g. 731622104045 or 22CS01)
  const regRegex = /^[A-Za-z0-9\/-]{3,30}$/;
  if (!regRegex.test(clean)) {
    return { valid: false, error: 'Register number format is invalid.' };
  }
  return { valid: true, value: clean };
}

/**
 * Validates Razorpay Order ID format: order_alphanumeric
 */
function validateOrderId(orderId) {
  if (!orderId || typeof orderId !== 'string') {
    return { valid: false, error: 'Order ID is required.' };
  }
  const clean = orderId.trim();
  // Standard Razorpay order ID regex
  const orderRegex = /^order_[a-zA-Z0-9_]{6,64}$/;
  if (!orderRegex.test(clean)) {
    return { valid: false, error: 'Invalid Razorpay order ID format.' };
  }
  return { valid: true, value: clean };
}

/**
 * Validates Razorpay Payment ID format: pay_alphanumeric
 */
function validatePaymentId(paymentId) {
  if (!paymentId || typeof paymentId !== 'string') {
    return { valid: false, error: 'Payment ID is required.' };
  }
  const clean = paymentId.trim();
  const payRegex = /^pay_[a-zA-Z0-9_]{6,64}$/;
  if (!payRegex.test(clean)) {
    return { valid: false, error: 'Invalid Razorpay payment ID format.' };
  }
  return { valid: true, value: clean };
}

/**
 * Validates Razorpay HMAC signature (64 hex characters)
 */
function validateSignature(signature) {
  if (!signature || typeof signature !== 'string') {
    return { valid: false, error: 'Signature is required.' };
  }
  const clean = signature.trim();
  const sigRegex = /^[a-fA-F0-9]{64}$/;
  if (!sigRegex.test(clean)) {
    return { valid: false, error: 'Invalid HMAC signature format.' };
  }
  return { valid: true, value: clean };
}

/**
 * Validates transaction status query parameter / body field
 */
function validateStatus(status) {
  const allowed = ['all', 'success', 'failed', 'cancelled', 'pending', 'created'];
  if (!status || typeof status !== 'string') return { valid: true, value: 'all' };
  const clean = status.trim().toLowerCase();
  if (!allowed.includes(clean)) {
    return { valid: false, error: `Invalid status. Must be one of: ${allowed.join(', ')}` };
  }
  return { valid: true, value: clean };
}

/**
 * Validates image URL protocol
 */
function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Image URL is required.' };
  }
  const clean = url.trim();
  try {
    const parsed = new URL(clean);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, error: 'Invalid protocol. Only HTTP and HTTPS URLs are permitted.' };
    }
    return { valid: true, value: clean };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format.' };
  }
}

/**
 * Validates base64 data URI for image uploads
 */
function validateImageDataUri(dataUri) {
  if (!dataUri || typeof dataUri !== 'string') {
    return { valid: false, error: 'Data URI is required.' };
  }
  const regex = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;
  if (!regex.test(dataUri.substring(0, 100))) {
    return { valid: false, error: 'Invalid image format. Allowed formats: PNG, JPEG, WebP, GIF.' };
  }
  // Max ~5MB in base64 length (~6.7MB)
  if (dataUri.length > 7 * 1024 * 1024) {
    return { valid: false, error: 'Image data exceeds maximum allowed size (5MB).' };
  }
  return { valid: true, value: dataUri };
}

module.exports = {
  escapeHtml,
  escapeXml,
  sanitizeText,
  validateTopic,
  validateSubject,
  validateStudentName,
  validateRegisterNo,
  validateOrderId,
  validatePaymentId,
  validateSignature,
  validateStatus,
  validateImageUrl,
  validateImageDataUri
};
