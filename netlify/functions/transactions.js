/**
 * Universal Serverless Function: Transaction History, User Payment History & Admin Reconciliation
 * Works on Vercel (/api/transactions and /api/record-payment-status) and Netlify
 */

'use strict';

const {
  getTransactions,
  getUserPaymentHistory,
  updateTransaction,
  reconcilePayment,
  verifyAdminToken
} = require('./payment-store');
const { validateOrderId, validateStatus, sanitizeText } = require('./validator');
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

  const qp = event.queryStringParameters || {};

  // GET: Return transaction history (either User Payment History or Admin Overview)
  if (event.httpMethod === 'GET') {
    try {
      const mode = qp.mode || qp.type;

      // ── USER PAYMENT HISTORY ──
      if (mode === 'user') {
        const query = qp.query || qp.studentName || '';
        const userHistory = getUserPaymentHistory(query);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: true, history: userHistory })
        };
      }

      // ── GENERAL / ADMIN TRANSACTIONS ──
      const rawFilter = qp.status || 'all';
      const validFilter = validateStatus(rawFilter);
      const statusFilter = validFilter.valid ? validFilter.value : 'all';

      const transactions = getTransactions(statusFilter);

      const summary = {
        total: transactions.length,
        totalRevenue: transactions
          .filter(t => t.settlementState === 'RECONCILED' || t.status === 'success')
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0),
        byStatus: {
          success: transactions.filter(t => t.status === 'success' || t.settlementState === 'RECONCILED').length,
          failed: transactions.filter(t => t.status === 'failed').length,
          cancelled: transactions.filter(t => t.status === 'cancelled').length,
          pending: transactions.filter(t => t.status === 'pending' || t.status === 'created' || t.status === 'OBSERVED_SUCCESS').length
        }
      };

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, transactions, summary, filter: statusFilter })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: error.message || 'Failed to fetch transactions.' })
      };
    }
  }

  // POST: Admin Reconcile or Status Update
  if (event.httpMethod === 'POST') {
    try {
      let body = {};
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
      }

      const action = body.action || 'status';

      // ── ACTION: Admin Manual Reconciliation with Audit Log ──
      if (action === 'reconcile') {
        const authHeader = event.headers && (event.headers['authorization'] || event.headers['Authorization']);
        const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
        const token = body.adminToken || bearerToken;

        if (!verifyAdminToken(token)) {
          return {
            statusCode: 401,
            headers: CORS_HEADERS,
            body: JSON.stringify({ success: false, error: 'Unauthorized. Admin session invalid.' })
          };
        }

        const { orderId, utr, reason = 'Admin manual verification' } = body;
        if (!orderId) {
          return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'orderId is required.' }) };
        }

        const reconciled = reconcilePayment(orderId, { utr, adminUser: 'admin', reason });
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            message: 'Payment verified and reconciled successfully.',
            transaction: reconciled.transaction,
            paymentToken: reconciled.paymentToken
          })
        };
      }

      // ── ACTION: Status update (cancellation / failure) ──
      const { orderId, status, reason } = body;
      const validOrder = validateOrderId(orderId);
      if (!validOrder.valid) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validOrder.error }) };
      }

      const cleanReason = reason ? sanitizeText(reason, 200) : null;
      const updated = updateTransaction(validOrder.value, { status, reason: cleanReason });

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, transaction: updated })
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: error.message || 'Failed to update transaction.' })
      };
    }
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;

