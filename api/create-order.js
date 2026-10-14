/**
 * Universal Serverless Function: Initialize Razorpay Order (Dynamic Pricing)
 * Works on Vercel (/api/create-order) and Netlify (/.netlify/functions/create-order)
 * Accepts optional `service` field: 'reportAndPpt' (default) | 'pptOnly'
 */

'use strict';

const https = require('https');
const { recordOrder, getCoupon } = require('./_lib/payment-store');
const { getServicePricing } = require('./_lib/pricing-store');
const { validateTopic, validateStudentName, validateSubject, sanitizeText } = require('./_lib/validator');
const { makeUniversalHandler } = require('./_lib/_adapter');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const CURRENCY = 'INR';

function createRazorpayOrderHttps(keyId, keySecret, amountPaise, receipt, notes) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      amount: amountPaise,
      currency: CURRENCY,
      receipt,
      notes,
      payment_capture: 1
    });

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const options = {
      hostname: 'api.razorpay.com',
      port: 443,
      path: '/v1/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error?.description || `Razorpay API error: HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse Razorpay API response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Razorpay order creation timed out.'));
    });

    req.write(postData);
    req.end();
  });
}

async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed. Send POST.' })
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON payload.' })
      };
    }

    const { studentName, topic, subject, service = 'reportAndPpt', couponCode = null } = body;

    const validName = validateStudentName(studentName);
    if (!validName.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validName.error }) };
    }

    const validTopic = validateTopic(topic);
    if (!validTopic.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validTopic.error }) };
    }

    const validSubj = validateSubject(subject);
    if (!validSubj.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validSubj.error }) };
    }

    const cleanStudentName = validName.value;
    const cleanTopic = validTopic.value;
    const cleanSubject = validSubj.value;

    // ── Dynamic Pricing Lookup ──────────────────────────────────
    const serviceKey = service === 'pptOnly' ? 'pptOnly' : 'reportAndPpt';
    const servicePricing = getServicePricing(serviceKey);
    let REPORT_FEE_PAISE = servicePricing ? servicePricing.amountPaise : 500;
    const serviceLabel = serviceKey === 'pptOnly' ? 'PPT Only' : 'Seminar Report + PPT';

    // Server-side coupon verification and discount application
    let appliedCoupon = null;
    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const c = getCoupon(couponCode.trim());
      if (c && c.is_active !== false) {
        let discountPaise = 0;
        if (c.discount_type === 'percentage') {
          discountPaise = Math.round((REPORT_FEE_PAISE * c.discount_value) / 100);
        } else {
          discountPaise = Math.round((c.discount_value || 0) * 100);
        }
        discountPaise = Math.min(discountPaise, REPORT_FEE_PAISE);
        REPORT_FEE_PAISE = Math.max(0, REPORT_FEE_PAISE - discountPaise);
        appliedCoupon = c.coupon_code;
      }
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const isConfigured = keyId && keySecret && !keyId.includes('your_key_id');

    const receipt = `mec_sem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const notes = {
      studentName: cleanStudentName,
      topic: cleanTopic.substring(0, 40),
      subject: cleanSubject.substring(0, 40),
      institution: 'Muthayammal Engineering College',
      service: `${serviceLabel} (₹${(REPORT_FEE_PAISE / 100).toFixed(2)})`,
      coupon: appliedCoupon || 'none'
    };

    let orderId;
    let isSimulated = false;

    if (isConfigured) {
      try {
        const rzpOrder = await createRazorpayOrderHttps(keyId, keySecret, REPORT_FEE_PAISE, receipt, notes);
        orderId = rzpOrder.id;
      } catch (apiError) {
        console.warn('[Razorpay API Warning] Direct API failed, creating test order ID:', apiError.message);
        orderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        isSimulated = true;
      }
    } else {
      orderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      isSimulated = true;
    }

    recordOrder({
      orderId,
      studentName: cleanStudentName,
      topic: cleanTopic,
      amount: REPORT_FEE_PAISE,
      currency: CURRENCY,
      status: 'created'
    });

    const isTestMode = !keyId || keyId.startsWith('rzp_test_');

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        orderId,
        amount: REPORT_FEE_PAISE,
        amountRupees: REPORT_FEE_PAISE / 100,
        currency: CURRENCY,
        keyId: isConfigured ? keyId : 'rzp_test_simulation',
        isTestMode,
        isSimulated,
        receipt,
        service: serviceKey,
        appliedCoupon
      })
    };

  } catch (error) {
    console.error('Create Order Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || 'Failed to initialize payment order.' })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;

