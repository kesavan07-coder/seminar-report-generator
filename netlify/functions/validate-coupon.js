/**
 * Universal Serverless Function: Server-Side Coupon Validation & Redemption
 * Supports one-time offline cash coupons (UNUSED -> USED) & master coupon code.
 * Works on Vercel (/api/validate-coupon) and Netlify (/.netlify/functions/validate-coupon)
 */

'use strict';

const { validateTopic, validateStudentName } = require('./validator');
const {
  generateCouponToken,
  getCoupon,
  redeemCoupon
} = require('./payment-store');
const { getServicePricing } = require('./pricing-store');
const { makeUniversalHandler } = require('./_adapter');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function getValidCoupon() {
  return process.env.VALID_COUPON_CODE || 'Kesavan@2007#9042';
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed.' })
    };
  }

  try {
    let body = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
    }

    const { couponCode, studentName, topic, service = 'reportAndPpt' } = body;

    if (!couponCode || typeof couponCode !== 'string' || !couponCode.trim()) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ valid: false, error: 'Coupon code is required.' })
      };
    }

    const validTopic = validateTopic(topic);
    if (!validTopic.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validTopic.error }) };
    }
    const validName = validateStudentName(studentName);
    if (!validName.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validName.error }) };
    }

    const trimmedCode = couponCode.trim();
    const serviceKey = service === 'pptOnly' ? 'pptOnly' : 'reportAndPpt';
    const servicePricing = getServicePricing(serviceKey);
    const originalPricePaise = servicePricing ? servicePricing.amountPaise : 500;
    const now = new Date();

    // 1. Check Coupon Store (Offline Cash or Admin-Managed Custom Coupon)
    const existingCoupon = getCoupon(trimmedCode);
    if (existingCoupon) {
      // 1A. Offline Cash Coupon
      if (existingCoupon.type === 'offline_cash') {
        if (existingCoupon.status === 'USED') {
          console.warn(`[Coupon] Replay attempt for USED coupon ${trimmedCode} by ${validName.value}`);
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, error: 'Coupon already used.' })
          };
        }

        const redemption = redeemCoupon(trimmedCode, validName.value, validTopic.value);
        if (!redemption.success) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              valid: false,
              error: redemption.reason === 'ALREADY_USED' ? 'Coupon already used.' : 'Invalid coupon code.'
            })
          };
        }

        const couponToken = generateCouponToken(validName.value, validTopic.value, existingCoupon.coupon_code);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            valid: true,
            couponToken,
            couponCode: existingCoupon.coupon_code,
            discountPaise: originalPricePaise,
            discountRupees: originalPricePaise / 100,
            finalPayablePaise: 0,
            finalPayableRupees: 0,
            isFreeAfterDiscount: true,
            message: 'Offline Cash Coupon verified ✓ Payment waived.'
          })
        };
      }

      // 1B. Custom Admin-Managed Coupon
      if (existingCoupon.is_active === false || existingCoupon.status === 'INACTIVE') {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ valid: false, error: 'This coupon is currently inactive or disabled.' })
        };
      }

      // Start Date check
      if (existingCoupon.start_date) {
        const start = new Date(existingCoupon.start_date);
        if (now < start) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, error: `This coupon is not active yet (starts on ${existingCoupon.start_date}).` })
          };
        }
      }

      // Expiry Date check
      if (existingCoupon.expiry_date) {
        const expiry = new Date(existingCoupon.expiry_date);
        // Expiry at end of specified day
        expiry.setHours(23, 59, 59, 999);
        if (now > expiry) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, error: 'This coupon has expired.' })
          };
        }
      }

      // Service Compatibility check
      if (existingCoupon.applicable_service && existingCoupon.applicable_service !== 'both') {
        if (existingCoupon.applicable_service === 'reportAndPpt' && serviceKey === 'pptOnly') {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, error: 'This coupon is valid only for Seminar Report + PPT generation.' })
          };
        }
        if (existingCoupon.applicable_service === 'pptOnly' && serviceKey === 'reportAndPpt') {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, error: 'This coupon is valid only for PPT Only presentations.' })
          };
        }
      }

      // Total Usage Limit check
      if (existingCoupon.usage_limit > 0 && (existingCoupon.used_count || 0) >= existingCoupon.usage_limit) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ valid: false, error: 'This coupon has reached its maximum usage limit.' })
        };
      }

      // Per-User Limit check
      if (existingCoupon.redemptions && Array.isArray(existingCoupon.redemptions)) {
        const userRedemptions = existingCoupon.redemptions.filter(
          r => r.studentName && r.studentName.toLowerCase() === validName.value.toLowerCase()
        ).length;
        const maxPerUser = existingCoupon.per_user_limit || 1;
        if (userRedemptions >= maxPerUser) {
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ valid: false, error: `You have already redeemed this coupon the maximum allowed times (${maxPerUser}).` })
          };
        }
      }

      // Calculate discount amount
      let discountPaise = 0;
      if (existingCoupon.discount_type === 'percentage') {
        discountPaise = Math.round((originalPricePaise * existingCoupon.discount_value) / 100);
      } else {
        discountPaise = Math.round((existingCoupon.discount_value || 0) * 100);
      }
      discountPaise = Math.min(discountPaise, originalPricePaise);
      const finalPayablePaise = Math.max(0, originalPricePaise - discountPaise);
      const finalPayableRupees = finalPayablePaise / 100;

      // 100% Discount or ₹0 payable -> generate couponToken directly
      if (finalPayablePaise === 0) {
        redeemCoupon(trimmedCode, validName.value, validTopic.value);
        const couponToken = generateCouponToken(validName.value, validTopic.value, existingCoupon.coupon_code);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            valid: true,
            couponToken,
            couponCode: existingCoupon.coupon_code,
            discountPaise,
            discountRupees: discountPaise / 100,
            finalPayablePaise: 0,
            finalPayableRupees: 0,
            isFreeAfterDiscount: true,
            message: `Coupon applied: 100% discount (₹${(discountPaise / 100).toFixed(0)} waived). No payment required!`
          })
        };
      }

      // Partial discount: user will pay discounted amount via gateway
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          valid: true,
          couponToken: null,
          couponCode: existingCoupon.coupon_code,
          discountPaise,
          discountRupees: discountPaise / 100,
          finalPayablePaise,
          finalPayableRupees,
          isFreeAfterDiscount: false,
          message: `Coupon applied: ₹${(discountPaise / 100).toFixed(0)} discount. Final amount: ₹${finalPayableRupees.toFixed(0)}.`
        })
      };
    }

    // 2. Check Master Coupon fallback (e.g. Kesavan@2007#9042)
    const masterCoupon = getValidCoupon();
    const isMasterValid = constantTimeEqual(trimmedCode, masterCoupon);

    if (isMasterValid) {
      const couponToken = generateCouponToken(validName.value, validTopic.value, 'MASTER');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          valid: true,
          couponToken,
          couponCode: 'MASTER',
          discountPaise: originalPricePaise,
          discountRupees: originalPricePaise / 100,
          finalPayablePaise: 0,
          finalPayableRupees: 0,
          isFreeAfterDiscount: true,
          message: 'Master coupon verified ✓ Payment waived.'
        })
      };
    }

    console.warn(`[Coupon] Invalid coupon attempt: "${trimmedCode}" by student: ${validName.value}`);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        valid: false,
        error: 'Invalid coupon code. Please check and try again.'
      })
    };

  } catch (error) {
    console.error('[Coupon] Handler error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error.' })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;

