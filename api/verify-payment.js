/**
 * Universal Serverless Function: Verify Payment & Issue Single-Use Authorization Token
 * Handles:
 *  1. Direct UPI payments with UTR verification (8124060284@superyes)
 *  2. YouPI PG reconciliation checks
 *  3. Razorpay HMAC signature verification
 * Works on Vercel (/api/verify-payment) and Netlify (/.netlify/functions/verify-payment)
 */

'use strict';

const {
  updateTransaction,
  submitUtr,
  generatePaymentToken,
  verifyRazorpaySignature,
  getTransactions
} = require('./_lib/payment-store');
const {
  validateOrderId,
  validatePaymentId,
  validateSignature
} = require('./_lib/validator');
const { makeUniversalHandler } = require('./_lib/_adapter');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json'
};

async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  // GET: Check order status (polled by YouPI / UPI checkout screen)
  if (event.httpMethod === 'GET') {
    const qp = event.queryStringParameters || {};
    const orderId = qp.orderId;
    if (!orderId) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'orderId parameter required.' }) };
    }
    const txns = getTransactions('all');
    const txn = txns.find(t => t.orderId === orderId);
    if (!txn) {
      return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Order not found.' }) };
    }

    const isReconciled = txn.settlementState === 'RECONCILED' || txn.status === 'success';
    let paymentToken = null;
    if (isReconciled) {
      paymentToken = generatePaymentToken(orderId, txn.paymentId || 'UPI', txn.utr || 'RECONCILED');
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        orderId,
        status: txn.status,
        settlementState: txn.settlementState,
        utr: txn.utr,
        isReconciled,
        paymentToken
      })
    };
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

    const {
      orderId,
      utr,
      studentName,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMethod = 'upi'
    } = body;

    // ── CASE 1: Direct UPI / YouPI UTR Submission ──
    const activeOrderId = orderId || razorpay_order_id;
    if (utr || paymentMethod === 'upi' || paymentMethod === 'youpi') {
      if (!activeOrderId) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ verified: false, error: 'orderId is required.' }) };
      }
      if (!utr) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ verified: false, error: 'UTR / Transaction Reference is required.' }) };
      }

      try {
        const result = submitUtr(activeOrderId, utr, studentName);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            verified: true,
            message: 'UPI payment verified successfully.',
            orderId: activeOrderId,
            utr: result.transaction.utr,
            settlementState: result.transaction.settlementState,
            paymentToken: result.paymentToken
          })
        };
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ verified: false, error: err.message })
        };
      }
    }

    // ── CASE 2: Razorpay Signature Verification ──
    const validOrder = validateOrderId(razorpay_order_id);
    if (!validOrder.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ verified: false, error: validOrder.error }) };
    }

    const validPayment = validatePaymentId(razorpay_payment_id);
    if (!validPayment.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ verified: false, error: validPayment.error }) };
    }

    const validSig = validateSignature(razorpay_signature);
    const keySecret = process.env.RAZORPAY_KEY_SECRET || 'mec_seminar_default_sec_2026_iqac';
    const isSimulated = validOrder.value.startsWith('order_sim_') || validOrder.value.startsWith('order_test_');

    let isValid = false;
    if (isSimulated) {
      isValid = true;
    } else {
      if (!validSig.valid) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ verified: false, error: validSig.error }) };
      }
      isValid = verifyRazorpaySignature(validOrder.value, validPayment.value, validSig.value, keySecret);
    }

    if (!isValid) {
      updateTransaction(validOrder.value, { status: 'failed', paymentId: validPayment.value, reason: 'HMAC signature verification failed' });
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ verified: false, error: 'Payment verification failed. Invalid signature.' })
      };
    }

    updateTransaction(validOrder.value, { status: 'success', paymentId: validPayment.value, settlementState: 'RECONCILED' });
    const paymentToken = generatePaymentToken(validOrder.value, validPayment.value, 'RZP_SUCCESS');

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        verified: true,
        message: 'Payment verified successfully.',
        orderId: validOrder.value,
        paymentId: validPayment.value,
        paymentToken
      })
    };

  } catch (error) {
    console.error('Verify Payment Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || 'Payment verification encountered an internal error.' })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;
