/**
 * Pricing & Payment Settings Store
 * Persists admin-configured pricing for Report+PPT and PPT-Only services.
 * Storage: /tmp/mec_pricing.json on Vercel, .pricing_store.json locally.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Storage Path ──────────────────────────────────────────────
function getPricingStoragePath() {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  if (isServerless) {
    return path.join('/tmp', 'mec_pricing.json');
  }
  return path.join(__dirname, '..', '.pricing_store.json');
}

// ── Default Pricing & Payment Methods Configuration ──────────
function getDefaultPricing() {
  return {
    reportAndPpt: {
      mode: 'paid',               // 'free' | 'paid'
      amountPaise: 500,           // 500 paise = ₹5
      currency: 'INR',
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    },
    pptOnly: {
      mode: 'free',               // 'free' | 'paid'
      amountPaise: 0,
      currency: 'INR',
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    },
    paymentMethods: {
      upi: true,
      razorpay: true,
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    }
  };
}

// ── In-Memory Cache ───────────────────────────────────────────
let pricingCache = null;

// ── Load Pricing from Disk ─────────────────────────────────────
function loadPricing() {
  if (pricingCache) return pricingCache;

  try {
    const p = getPricingStoragePath();
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw);
      const defaults = getDefaultPricing();
      // Merge with defaults to ensure all keys exist
      pricingCache = {
        reportAndPpt:   { ...defaults.reportAndPpt,   ...((parsed && parsed.reportAndPpt)   || {}) },
        pptOnly:        { ...defaults.pptOnly,        ...((parsed && parsed.pptOnly)        || {}) },
        paymentMethods: { ...defaults.paymentMethods, ...((parsed && parsed.paymentMethods) || {}) }
      };
    } else {
      pricingCache = getDefaultPricing();
    }
  } catch (err) {
    console.warn('[Pricing] Failed to load persisted pricing, using defaults:', err.message);
    pricingCache = getDefaultPricing();
  }
  return pricingCache;
}

// ── Save Pricing to Disk ──────────────────────────────────────
function savePricing(data) {
  try {
    const p = getPricingStoragePath();
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Pricing] Failed to persist pricing config:', err.message);
  }
}

// ── Public API ────────────────────────────────────────────────

/**
 * Get current pricing for both services.
 * @returns {{ reportAndPpt: ServicePricing, pptOnly: ServicePricing }}
 */
function getPricing() {
  return loadPricing();
}

/**
 * Get pricing for a specific service.
 * @param {'reportAndPpt'|'pptOnly'} service
 * @returns {ServicePricing}
 */
function getServicePricing(service) {
  const p = loadPricing();
  if (service === 'reportAndPpt') return p.reportAndPpt;
  if (service === 'pptOnly') return p.pptOnly;
  return null;
}

/**
 * Update pricing for a service. Called by admin API.
 * @param {'reportAndPpt'|'pptOnly'} service
 * @param {{ mode: 'free'|'paid', amountPaise: number, currency?: string }} config
 * @param {string} updatedBy - admin username
 */
function updateServicePricing(service, config, updatedBy = 'admin') {
  if (service !== 'reportAndPpt' && service !== 'pptOnly') {
    throw new Error(`Unknown service: ${service}`);
  }

  const mode = config.mode === 'free' ? 'free' : 'paid';
  const amountPaise = mode === 'free' ? 0 : Math.round(Number(config.amountPaise) || 0);

  if (mode === 'paid' && amountPaise <= 0) {
    throw new Error('Paid services must have a positive amount.');
  }
  if (amountPaise > 100000) {
    throw new Error('Amount exceeds maximum allowed value (₹1000).');
  }

  const p = loadPricing();
  p[service] = {
    ...p[service],
    mode,
    amountPaise,
    currency: config.currency || 'INR',
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: updatedBy
  };

  pricingCache = p;
  savePricing(p);
  return p[service];
}

/**
 * Check if a service requires payment.
 * @param {'reportAndPpt'|'pptOnly'} service
 * @returns {boolean}
 */
function isServicePaid(service) {
  const sp = getServicePricing(service);
  if (!sp) return false;
  return sp.mode === 'paid' && sp.amountPaise > 0;
}

/**
 * Get enabled payment methods.
 */
function getPaymentMethods() {
  const p = loadPricing();
  return p.paymentMethods || { upi: true, razorpay: true };
}

/**
 * Update enabled payment methods.
 */
function updatePaymentMethods({ upi, razorpay }, updatedBy = 'admin') {
  const p = loadPricing();
  p.paymentMethods = {
    upi: Boolean(upi),
    razorpay: Boolean(razorpay),
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: updatedBy
  };
  pricingCache = p;
  savePricing(p);
  return p.paymentMethods;
}

/**
 * Check if Razorpay credentials are configured in server environment.
 */
function isGatewayConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(keyId && keySecret && !keyId.includes('your_key_id') && keyId.length > 5);
}

module.exports = {
  getPricing,
  getServicePricing,
  updateServicePricing,
  isServicePaid,
  getPaymentMethods,
  updatePaymentMethods,
  isGatewayConfigured
};
