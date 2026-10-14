/**
 * Universal Serverless Function: Admin Pricing & Payment Settings Management
 * Handles GET/SET pricing for Report+PPT and PPT-Only services.
 * GET /api/admin-pricing?action=get — returns current pricing (admin-only)
 * POST /api/admin-pricing { action: 'update', service, mode, amountPaise, currency } — updates pricing (admin-only)
 * GET /api/admin-pricing?action=public — returns pricing without auth (used by frontend checkout)
 */

'use strict';

const { verifyAdminToken, getTransactions, listCoupons } = require('./payment-store');
const {
  getPricing,
  updateServicePricing,
  getPaymentMethods,
  updatePaymentMethods,
  isGatewayConfigured
} = require('./pricing-store');
const { makeUniversalHandler } = require('./_adapter');

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

    // ── PUBLIC action: frontend reads pricing to show correct amount ──
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
          pptOnly: {
            mode: pricing.pptOnly.mode,
            amountPaise: pricing.pptOnly.amountPaise,
            amountRupees: pricing.pptOnly.amountPaise / 100,
            currency: pricing.pptOnly.currency
          },
          paymentMethods: getPaymentMethods(),
          isGatewayConfigured: isGatewayConfigured()
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
          paymentMethods: getPaymentMethods(),
          isGatewayConfigured: isGatewayConfigured()
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
      const successfulTxns = transactions.filter(t => t.status === 'success');
      const pendingTxns = transactions.filter(t => t.status === 'pending' || t.status === 'created');
      const failedTxns = transactions.filter(t => t.status === 'failed' || t.status === 'cancelled');
      const totalRevenue = successfulTxns.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      // Recent 8 transactions sanitized (no internal tokens or secrets)
      const recentTransactions = transactions.slice(0, 8).map(t => ({
        orderId: t.orderId,
        paymentId: t.paymentId,
        studentName: t.studentName,
        topic: t.topic,
        amount: t.amount,
        currency: t.currency || 'INR',
        status: t.status,
        createdAt: t.createdAt
      }));

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          overview: {
            reportAndPpt: pricing.reportAndPpt,
            pptOnly: pricing.pptOnly,
            paymentMethods,
            isGatewayConfigured: gatewayConfigured,
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

    // ── UPDATE PAYMENT METHODS ──
    if (action === 'update_payment_methods') {
      const { upi, razorpay } = body;
      const updated = updatePaymentMethods({ upi, razorpay }, 'admin');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Payment methods updated successfully.',
          paymentMethods: updated,
          isGatewayConfigured: isGatewayConfigured()
        })
      };
    }

    // ── UPDATE: set pricing for a service ──
    if (action === 'update') {
      const { service, mode, amountPaise, currency } = body;

      if (!service || !['reportAndPpt', 'pptOnly'].includes(service)) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'service must be "reportAndPpt" or "pptOnly".' })
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
          body: JSON.stringify({ success: false, error: 'Paid services require a positive amountPaise.' })
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

      const serviceLabel = service === 'reportAndPpt' ? 'Seminar Report + PPT' : 'PPT Only';
      const modeLabel = mode === 'free' ? 'Free' : `Paid — ₹${(parsedAmount / 100).toFixed(2)}`;
      console.log(`[Pricing] ${serviceLabel} updated to ${modeLabel} by admin at ${updated.lastUpdatedAt}`);

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
