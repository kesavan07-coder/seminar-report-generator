/**
 * Universal Serverless Function: Transaction History & Payment Status Management
 * Works on Vercel (/api/transactions and /api/record-payment-status) and Netlify
 */

'use strict';

const { getTransactions, updateTransaction } = require('./payment-store');
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

  // GET: Return filtered transaction history
  if (event.httpMethod === 'GET') {
    try {
      const params = new URLSearchParams(event.rawQuery || (event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : ''));
      const rawFilter = params.get('status') || 'all';
      const validFilter = validateStatus(rawFilter);
      const statusFilter = validFilter.valid ? validFilter.value : 'all';

      const transactions = getTransactions(statusFilter);

      const summary = {
        total: transactions.length,
        totalRevenue: transactions.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0),
        byStatus: {
          success: transactions.filter(t => t.status === 'success').length,
          failed: transactions.filter(t => t.status === 'failed').length,
          cancelled: transactions.filter(t => t.status === 'cancelled').length,
          pending: transactions.filter(t => t.status === 'pending' || t.status === 'created').length
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

  // POST: Record payment status update (cancellation / failure)
  if (event.httpMethod === 'POST') {
    try {
      let body = {};
      try {
        body = JSON.parse(event.body || '{}');
      } catch (e) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
      }

      const { orderId, status, reason } = body;

      const validOrder = validateOrderId(orderId);
      if (!validOrder.valid) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validOrder.error }) };
      }

      const validStatus = validateStatus(status);
      if (!validStatus.valid || validStatus.value === 'all') {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Invalid status value.' })
        };
      }

      const cleanReason = reason ? sanitizeText(reason, 200) : null;
      const updated = updateTransaction(validOrder.value, { status: validStatus.value, reason: cleanReason });

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

  return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed.' }) };
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;
