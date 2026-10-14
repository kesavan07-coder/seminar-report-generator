/**
 * Universal Serverless Function: Admin Reports History & Details Endpoint
 * Works on Vercel (/api/admin-reports) and Netlify (/.netlify/functions/admin-reports)
 */

'use strict';

const {
  verifyAdminToken,
  verifyAdminCredentials,
  invalidateAdminToken,
  listGeneratedReports,
  getReportById
} = require('./_lib/payment-store');
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
    let body = {};
    if (event.body) {
      try {
        body = JSON.parse(event.body);
      } catch (e) {
        return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
      }
    }

    const qParams = event.queryStringParameters || {};
    const action = body.action || qParams.action || 'list';
    const authHeader = event.headers && (event.headers['authorization'] || event.headers['Authorization']);
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = body.adminToken || bearerToken;

    // Strict Admin Authorization Check
    const isTokenValid = verifyAdminToken(token);
    const isCredsValid = body.username && body.password && verifyAdminCredentials(body.username, body.password);

    if (!isTokenValid && !isCredsValid) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Unauthorized. Admin session invalid or expired.' })
      };
    }

    // 1. Action: LIST REPORTS
    if (action === 'list' || action === 'list_reports') {
      const search = body.search || qParams.search || '';
      const paymentMethod = body.paymentMethod || qParams.paymentMethod || 'all';
      const date = body.date || qParams.date || '';

      const reports = listGeneratedReports({ search, paymentMethod, date });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          reports,
          total: reports.length
        })
      };
    }

    // 2. Action: GET REPORT DETAILS
    if (action === 'get' || action === 'get_report') {
      const reportId = body.reportId || qParams.reportId;
      if (!reportId) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Report ID is required.' })
        };
      }

      const report = getReportById(reportId);
      if (!report) {
        return {
          statusCode: 404,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Report not found.' })
        };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          report
        })
      };
    }

    // 3. Action: LOGOUT
    if (action === 'logout') {
      if (token) {
        invalidateAdminToken(token);
      }
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, message: 'Admin logged out successfully.' })
      };
    }

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
    };

  } catch (err) {
    console.error('[Admin Reports] Error:', err);
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
