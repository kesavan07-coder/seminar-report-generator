/**
 * Universal Serverless Function: YouPI PG Webhook Handler
 * Verifies HMAC-SHA256 signature using X-Gateway-Signature against YOUPI_WEBHOOK_SECRET.
 * Enforces two-phase settlement: OBSERVED_SUCCESS -> RECONCILED.
 * Works on Vercel (/api/youpi-webhook) and Netlify (/.netlify/functions/youpi-webhook)
 */

'use strict';

const crypto = require('crypto');
const { processYoupiWebhookEvent } = require('./_lib/payment-store');
const { makeUniversalHandler } = require('./_lib/_adapter');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Gateway-Signature, X-Delivery-Id, X-Merchant-Id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

function getWebhookSecret() {
  return process.env.YOUPI_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || 'mec_seminar_default_sec_2026_iqac';
}

function verifyHmacSignature(rawBody, signature, secret) {
  if (!rawBody || !signature || !secret) return false;
  try {
    const cleanSig = signature.startsWith('sha256=') ? signature.slice(7) : signature;
    const computed = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (computed.length !== cleanSig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(computed, 'utf8'), Buffer.from(cleanSig, 'utf8'));
  } catch (e) {
    return false;
  }
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
    const headers = event.headers || {};
    const signature = headers['x-gateway-signature'] || headers['X-Gateway-Signature'] || headers['x-hub-signature'] || '';
    const deliveryId = headers['x-delivery-id'] || headers['X-Delivery-Id'] || null;

    const rawBody = event.body || '';
    const secret = getWebhookSecret();

    // Verify HMAC Signature (Skip verification only in test mode if secret is unconfigured)
    const isTestMode = !process.env.YOUPI_WEBHOOK_SECRET && !signature;
    if (!isTestMode && !verifyHmacSignature(rawBody, signature, secret)) {
      console.warn('[YouPI Webhook Security] Invalid webhook signature detected.');
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid HMAC signature.' })
      };
    }

    let payload = {};
    try {
      payload = JSON.parse(rawBody || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON payload.' })
      };
    }

    const result = processYoupiWebhookEvent(payload, signature, secret, deliveryId);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        received: true,
        orderId: result.orderId,
        eventType: result.eventType,
        settlementState: result.settlementState,
        deduplicated: Boolean(result.deduplicated)
      })
    };

  } catch (err) {
    console.error('[YouPI Webhook Error]:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: err.message || 'Internal server error processing webhook.' })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;
