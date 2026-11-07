/**
 * Pricing & Payment Settings Store
 * Persists admin-configured pricing for Report+PPT, Report-Only, and PPT-Only services,
 * as well as Merchant UPI ID (8124060284@superyes) and payment gateway settings.
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
      amountPaise: 1500,          // 1500 paise = ₹15 (PDF + PPT)
      currency: 'INR',
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    },
    reportOnly: {
      mode: 'paid',               // 'free' | 'paid'
      amountPaise: 1000,          // 1000 paise = ₹10 (PDF Report Only)
      currency: 'INR',
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    },
    pptOnly: {
      mode: 'paid',               // 'free' | 'paid'
      amountPaise: 500,           // 500 paise = ₹5 (PPT Presentation Only)
      currency: 'INR',
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    },
    upiConfig: {
      upiId: process.env.MERCHANT_UPI_ID || '8124060284@superyes',
      merchantName: process.env.MERCHANT_NAME || 'Seminar Report Generator',
      lastUpdatedAt: null,
      lastUpdatedBy: 'system'
    },
    paymentMethods: {
      upi: true,
      youpi: true,
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
        reportOnly:     { ...defaults.reportOnly,     ...((parsed && parsed.reportOnly)     || {}) },
        pptOnly:        { ...defaults.pptOnly,        ...((parsed && parsed.pptOnly)        || {}) },
        upiConfig:      { ...defaults.upiConfig,      ...((parsed && parsed.upiConfig)      || {}) },
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
 * Get current pricing for all services.
 */
function getPricing() {
  return loadPricing();
}

/**
 * Get pricing for a specific service.
 * @param {'reportAndPpt'|'reportOnly'|'pptOnly'} service
 */
function getServicePricing(service) {
  const p = loadPricing();
  if (service === 'reportAndPpt') return p.reportAndPpt;
  if (service === 'reportOnly') return p.reportOnly;
  if (service === 'pptOnly') return p.pptOnly;
  return p.reportAndPpt;
}

/**
 * Update pricing for a service. Called by admin API.
 * @param {'reportAndPpt'|'reportOnly'|'pptOnly'} service
 * @param {{ mode: 'free'|'paid', amountPaise: number, currency?: string }} config
 * @param {string} updatedBy - admin username
 */
function updateServicePricing(service, config, updatedBy = 'admin') {
  if (service !== 'reportAndPpt' && service !== 'reportOnly' && service !== 'pptOnly') {
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
 * @param {'reportAndPpt'|'reportOnly'|'pptOnly'} service
 * @returns {boolean}
 */
function isServicePaid(service) {
  const sp = getServicePricing(service);
  if (!sp) return false;
  return sp.mode === 'paid' && sp.amountPaise > 0;
}

/**
 * Get Merchant UPI Configuration (UPI ID & Business Name)
 */
function getUpiConfig() {
  const p = loadPricing();
  return p.upiConfig || {
    upiId: process.env.MERCHANT_UPI_ID || '8124060284@superyes',
    merchantName: process.env.MERCHANT_NAME || 'Seminar Report Generator'
  };
}

/**
 * Update Merchant UPI Configuration (Admin editable)
 */
function updateUpiConfig({ upiId, merchantName }, updatedBy = 'admin') {
  const p = loadPricing();
  p.upiConfig = {
    upiId: (upiId || '8124060284@superyes').trim(),
    merchantName: (merchantName || 'Seminar Report Generator').trim(),
    lastUpdatedAt: new Date().toISOString(),
    lastUpdatedBy: updatedBy
  };
  pricingCache = p;
  savePricing(p);
  return p.upiConfig;
}

/**
 * Get enabled payment methods.
 */
function getPaymentMethods() {
  const p = loadPricing();
  return p.paymentMethods || { upi: true, youpi: true, razorpay: true };
}

/**
 * Update enabled payment methods.
 */
function updatePaymentMethods({ upi, youpi, razorpay }, updatedBy = 'admin') {
  const p = loadPricing();
  p.paymentMethods = {
    upi: upi !== undefined ? Boolean(upi) : true,
    youpi: youpi !== undefined ? Boolean(youpi) : true,
    razorpay: razorpay !== undefined ? Boolean(razorpay) : true,
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

/**
 * Check if YouPI PG credentials are configured in server environment.
 */
function isYoupiConfigured() {
  const apiUrl = process.env.YOUPI_API_URL;
  const merchantId = process.env.YOUPI_MERCHANT_ID;
  return Boolean(apiUrl && merchantId && !apiUrl.includes('your_youpi_instance'));
}

module.exports = {
  getPricing,
  getServicePricing,
  updateServicePricing,
  isServicePaid,
  getUpiConfig,
  updateUpiConfig,
  getPaymentMethods,
  updatePaymentMethods,
  isGatewayConfigured,
  isYoupiConfigured
};
