/**
 * Universal Serverless Function: Admin Pricing, UPI & Payment Settings Management
 * Handles GET/SET pricing for:
 *   - Service A: Seminar Report + PPT (Default ₹15)
 *   - Service B: Seminar Report PDF Only (Default ₹10)
 *   - Service C: Seminar Presentation PPT Only (Default ₹5)
 *   - Merchant UPI ID: 8124060284@superyes
 * Works on Vercel (/api/admin-pricing) and Netlify (/.netlify/functions/admin-pricing)
 */

'use strict';

const { verifyAdminToken, getTransactions, listCoupons } = require('./_lib/payment-store');
const {
  getPricing,
  updateServicePricing,
  getUpiConfig,
  updateUpiConfig,
  getPaymentMethods,
  updatePaymentMethods,
  isGatewayConfigured,
  isYoupiConfigured
} = require('./_lib/pricing-store');
const { makeUniversalHandler } = require('./_lib/_adapter');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  try {
    const qp = event.queryStringParameters || {};
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch (e) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
      }
    }

    const action = body.action || qp.action || 'get';

    // ── PUBLIC action: frontend reads pricing & upiConfig without auth ──
    if (action === 'public') {
      const pricing = getPricing();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          reportAndPpt: {
            mode: pricing.reportAndPpt.mode,
            amountPaise: pricing.reportAndPpt.amountPaise,
            amountRupees: pricing.reportAndPpt.amountPaise / 100,
            currency: pricing.reportAndPpt.currency
          },
          reportOnly: {
            mode: pricing.reportOnly ? pricing.reportOnly.mode : 'paid',
            amountPaise: pricing.reportOnly ? pricing.reportOnly.amountPaise : 1000,
            amountRupees: pricing.reportOnly ? pricing.reportOnly.amountPaise / 100 : 10,
            currency: pricing.reportOnly ? pricing.reportOnly.currency : 'INR'
          },
          pptOnly: {
            mode: pricing.pptOnly.mode,
            amountPaise: pricing.pptOnly.amountPaise,
            amountRupees: pricing.pptOnly.amountPaise / 100,
            currency: pricing.pptOnly.currency
          },
          upiConfig: getUpiConfig(),
          paymentMethods: getPaymentMethods(),
          isGatewayConfigured: isGatewayConfigured(),
          isYoupiConfigured: isYoupiConfigured()
        })
      };
    }

    // ── Admin Auth required for all other actions ──
    const authHeader = event.headers && (event.headers['authorization'] || event.headers['Authorization']);
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = body.adminToken || bearerToken;

    if (!verifyAdminToken(token)) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Unauthorized. Admin session invalid or expired.' })
      };
    }

    // ── GET: return full pricing & payment config to admin ──
    if (action === 'get') {
      const pricing = getPricing();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          pricing,
          upiConfig: getUpiConfig(),
          paymentMethods: getPaymentMethods(),
          isGatewayConfigured: isGatewayConfigured(),
          isYoupiConfigured: isYoupiConfigured()
        })
      };
    }

    // ── OVERVIEW: summary panel data for admin dashboard ──
    if (action === 'overview') {
      const pricing = getPricing();
      const paymentMethods = getPaymentMethods();
      const gatewayConfigured = isGatewayConfigured();
      const allCoupons = listCoupons();
      const activeCoupons = allCoupons.filter(c => {
        if (c.type === 'offline_cash') return c.status === 'UNUSED';
        return c.is_active !== false && c.status !== 'EXHAUSTED';
      });

      const transactions = getTransactions('all');
      const successfulTxns = transactions.filter(t => t.status === 'success' || t.settlementState === 'RECONCILED');
      const pendingTxns = transactions.filter(t => t.status === 'pending' || t.status === 'created' || t.status === 'OBSERVED_SUCCESS');
      const failedTxns = transactions.filter(t => t.status === 'failed' || t.status === 'cancelled');
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const recentTransactions = transactions.slice(0, 10).map(t => ({
        orderId: t.orderId,
        paymentId: t.paymentId,
        utr: t.utr,
        studentName: t.studentName,
        topic: t.topic,
        productType: t.productType || 'both',
        amount: t.amount,
        currency: t.currency || 'INR',
        status: t.status,
        settlementState: t.settlementState || (t.status === 'success' ? 'RECONCILED' : 'NOT_RECONCILED'),
        createdAt: t.createdAt
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          overview: {
            reportAndPpt: pricing.reportAndPpt,
            reportOnly: pricing.reportOnly,
            pptOnly: pricing.pptOnly,
            upiConfig: getUpiConfig(),
            paymentMethods,
            isGatewayConfigured: gatewayConfigured,
            isYoupiConfigured: isYoupiConfigured(),
            couponStats: {
              activeCount: activeCoupons.length,
              totalCount: allCoupons.length
            },
            transactionStats: {
              total: transactions.length,
              successCount: successfulTxns.length,
              pendingCount: pendingTxns.length,
              failedCount: failedTxns.length,
              totalRevenue: totalRevenue.toFixed(2)
            },
            recentTransactions
          }
        })
      };
    }

    // ── UPDATE UPI CONFIG ──
    if (action === 'update_upi') {
      const { upiId, merchantName } = body;
      if (!upiId || typeof upiId !== 'string' || !upiId.includes('@')) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Valid UPI ID (e.g. 8124060284@superyes) is required.' })
        };
      }

      const updated = updateUpiConfig({ upiId, merchantName }, 'admin');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'UPI details updated successfully.',
          upiConfig: updated
        })
      };
    }

    // ── UPDATE PAYMENT METHODS ──
    if (action === 'update_payment_methods') {
      const { upi, youpi, razorpay } = body;
      const updated = updatePaymentMethods({ upi, youpi, razorpay }, 'admin');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Payment methods updated successfully.',
          paymentMethods: updated,
          isGatewayConfigured: isGatewayConfigured(),
          isYoupiConfigured: isYoupiConfigured()
        })
      };
    }

    // ── UPDATE: set pricing for a service ──
    if (action === 'update') {
      const { service, mode, amountPaise, currency } = body;

      if (!service || !['reportAndPpt', 'reportOnly', 'pptOnly'].includes(service)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'service must be "reportAndPpt", "reportOnly", or "pptOnly".' })
        };
      }

      if (!mode || !['free', 'paid'].includes(mode)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'mode must be "free" or "paid".' })
        };
      }

      const parsedAmount = mode === 'free' ? 0 : Math.round(Number(amountPaise) || 0);
      if (mode === 'paid' && parsedAmount <= 0) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Paid services require a positive amount.' })
        };
      }

      let updated;
      try {
        updated = updateServicePricing(service, { mode, amountPaise: parsedAmount, currency }, 'admin');
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: err.message })
        };
      }

      const serviceLabel = service === 'reportAndPpt' ? 'Seminar Report + PPT' : (service === 'reportOnly' ? 'Report PDF Only' : 'PPT Only');
      const modeLabel = mode === 'free' ? 'Free' : `Paid — ₹${(parsedAmount / 100).toFixed(2)}`;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: `${serviceLabel} pricing updated to ${modeLabel}.`,
          pricing: updated
        })
      };
    }

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
    };

  } catch (err) {
    console.error('[Admin Pricing] Error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Internal server error.' })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;
