/**
 * Universal Serverless Function: Initialize Payment Order (YouPI, Direct UPI, Razorpay)
 * Works on Vercel (/api/create-order) and Netlify (/.netlify/functions/create-order)
 * Dynamic backend-controlled pricing:
 *   - reportAndPpt: ₹15 (1500 paise)
 *   - reportOnly:   ₹10 (1000 paise)
 *   - pptOnly:      ₹5  (500 paise)
 * UPI ID: 8124060284@superyes
 */

'use strict';

const https = require('https');
const http = require('http');
const { recordOrder, getCoupon, generateCouponToken } = require('./payment-store');
const { getServicePricing, getUpiConfig, isYoupiConfigured, isGatewayConfigured } = require('./pricing-store');
const { validateTopic, validateStudentName, validateSubject, sanitizeText } = require('./validator');
const { makeUniversalHandler } = require('./_adapter');


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

const CURRENCY = 'INR';

/**
 * Call YouPI Gateway POST /api/v1/payments
 */
function createYoupiPaymentHttps(apiUrl, merchantId, payload) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL('/api/v1/payments', apiUrl);
      const postData = JSON.stringify(payload);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId,
          'X-Merchant-Key': process.env.YOUPI_MERCHANT_KEY || 'youpi_live_sec_8124060284_2026',
          'Content-Length': Buffer.byteLength(postData)
        },

        timeout: 6000
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(parsed.message || `YouPI API HTTP ${res.statusCode}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse YouPI response: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('YouPI API timeout'));
      });

      req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
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

    // ── Determine Service & Product Type ────────────────────────
    let serviceKey = 'reportAndPpt';
    let productType = 'both';
    if (service === 'pptOnly' || service === 'ppt') {
      serviceKey = 'pptOnly';
      productType = 'ppt';
    } else if (service === 'reportOnly' || service === 'pdf') {
      serviceKey = 'reportOnly';
      productType = 'pdf';
    }

    const servicePricing = getServicePricing(serviceKey);
    const originalFeePaise = servicePricing ? servicePricing.amountPaise : (serviceKey === 'reportOnly' ? 1000 : (serviceKey === 'pptOnly' ? 500 : 1500));
    let payableFeePaise = servicePricing && servicePricing.mode === 'free' ? 0 : originalFeePaise;

    // ── Apply Coupon Discounts ───────────────────────────────────
    let appliedCoupon = null;
    let discountPaise = 0;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const c = getCoupon(couponCode.trim());
      if (c && c.is_active !== false) {
        if (c.discount_type === 'percentage') {
          discountPaise = Math.round((originalFeePaise * c.discount_value) / 100);
        } else {
          discountPaise = Math.round((c.discount_value || 0) * 100);
        }
        discountPaise = Math.min(discountPaise, originalFeePaise);
        payableFeePaise = Math.max(0, originalFeePaise - discountPaise);
        appliedCoupon = c.coupon_code;
      }
    }

    const orderId = `mec_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const upiConfig = getUpiConfig();
    const upiId = upiConfig.upiId || '8124060284@superyes';
    const merchantName = upiConfig.merchantName || 'Seminar Report Generator';

    // If completely free after discount or free service mode
    if (payableFeePaise === 0) {
      const freeToken = generateCouponToken(cleanStudentName, cleanTopic, appliedCoupon || 'FREE_PROMO');
      recordOrder({
        orderId,
        studentName: cleanStudentName,
        topic: cleanTopic,
        amount: 0,
        originalAmountPaise: originalFeePaise,
        discountPaise,
        couponCode: appliedCoupon,
        service: serviceKey,
        productType,
        status: 'success',
        settlementState: 'RECONCILED'
      });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          orderId,
          isFree: true,
          isFreeAfterDiscount: Boolean(appliedCoupon),
          amount: 0,
          amountRupees: 0,
          originalAmountRupees: originalFeePaise / 100,
          discountRupees: discountPaise / 100,
          appliedCoupon,
          paymentToken: freeToken,
          service: serviceKey,
          productType
        })
      };
    }

    // ── Generate Dynamic UPI Intent & QR Data ───────────────────
    const amountRupees = (payableFeePaise / 100).toFixed(2);
    const sanitizedTopicNote = cleanTopic.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 30);
    const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amountRupees}&cu=INR&tn=${encodeURIComponent(sanitizedTopicNote)}&tr=${orderId}`;

    let youpiData = null;
    let isYoupiActive = false;

    // Check if external YouPI gateway is configured
    if (isYoupiConfigured()) {
      try {
        const youpiResp = await createYoupiPaymentHttps(
          process.env.YOUPI_API_URL,
          process.env.YOUPI_MERCHANT_ID,
          {
            orderId,
            amount: (payableFeePaise / 100).toFixed(2),
            currency: 'INR',

            customer: { name: cleanStudentName },
            notes: { topic: cleanTopic, service: serviceKey }
          }
        );
        youpiData = youpiResp;
        isYoupiActive = true;
      } catch (err) {
        console.warn('[YouPI Gateway Notice] External gateway call skipped/failed, using direct UPI fallback:', err.message);
      }
    }

    recordOrder({
      orderId,
      studentName: cleanStudentName,
      topic: cleanTopic,
      amount: payableFeePaise,
      originalAmountPaise: originalFeePaise,
      discountPaise,
      couponCode: appliedCoupon,
      service: serviceKey,
      productType,
      status: 'pending',
      settlementState: 'NOT_RECONCILED'
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        orderId,
        service: serviceKey,
        productType,
        amount: payableFeePaise,
        amountRupees: payableFeePaise / 100,
        originalAmountRupees: originalFeePaise / 100,
        discountRupees: discountPaise / 100,
        currency: CURRENCY,
        appliedCoupon,
        upiConfig: {
          upiId,
          merchantName,
          upiIntentUri,
          amountRupees: payableFeePaise / 100
        },
        youpi: {
          isActive: isYoupiActive,
          data: youpiData
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_simulation'
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
