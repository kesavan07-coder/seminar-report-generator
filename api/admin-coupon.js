/**
 * Universal Serverless Function: Admin Authentication & Offline Cash Coupon Generator
 * Works on Vercel (/api/admin-coupon) and Netlify (/.netlify/functions/admin-coupon)
 */

'use strict';

const {
  verifyAdminCredentials,
  generateAdminToken,
  verifyAdminToken,
  invalidateAdminToken,
  createOfflineCoupon,
  createCustomCoupon,
  updateCustomCoupon,
  toggleCouponStatus,
  deleteCoupon,
  listCoupons,
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

    const action = body.action || (event.queryStringParameters && event.queryStringParameters.action) || 'list';
    const authHeader = event.headers && (event.headers['authorization'] || event.headers['Authorization']);
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const token = body.adminToken || bearerToken;

    // 1. Action: LOGIN
    if (action === 'login') {
      const { username, password } = body;
      if (!username || !password) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Username and password are required.' })
        };
      }

      const isValid = verifyAdminCredentials(username, password);
      if (!isValid) {
        return {
          statusCode: 401,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Invalid admin username or password.' })
        };
      }

      const adminToken = generateAdminToken(username);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          adminToken,
          message: 'Admin authenticated successfully.'
        })
      };
    }

    // Auth verification for protected actions (generate & list)
    const isTokenValid = verifyAdminToken(token);
    const isCredsValid = body.username && body.password && verifyAdminCredentials(body.username, body.password);

    if (!isTokenValid && !isCredsValid) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: 'Unauthorized. Admin session invalid or expired.' })
      };
    }

    // 2. Action: LOGOUT
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

    // 3. Action: LIST_REPORTS
    if (action === 'list_reports') {
      const qParams = event.queryStringParameters || {};
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

    // 4. Action: GET_REPORT
    if (action === 'get_report') {
      const qParams = event.queryStringParameters || {};
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
        body: JSON.stringify({ success: true, report })
      };
    }

    // 5. Action: GENERATE OFFLINE COUPON
    if (action === 'generate') {
      const coupon = createOfflineCoupon({ createdBy: 'admin' });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          coupon,
          message: 'Offline cash coupon generated successfully.'
        })
      };
    }

    // 5B. Action: CREATE CUSTOM COUPON
    if (action === 'create_custom') {
      const {
        code,
        discountType = 'fixed',
        discountValue = 5,
        startDate = null,
        expiryDate = null,
        usageLimit = 0,
        perUserLimit = 1,
        applicableService = 'both'
      } = body;

      try {
        const coupon = createCustomCoupon({
          code,
          discountType,
          discountValue,
          startDate,
          expiryDate,
          usageLimit,
          perUserLimit,
          applicableService,
          createdBy: 'admin'
        });
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            coupon,
            message: `Coupon ${coupon.coupon_code} created successfully.`
          })
        };
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: err.message })
        };
      }
    }

    // 5C. Action: UPDATE CUSTOM COUPON
    if (action === 'update_custom') {
      const { code, updates } = body;
      try {
        const updated = updateCustomCoupon(code, updates, 'admin');
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            coupon: updated,
            message: `Coupon ${updated.coupon_code} updated successfully.`
          })
        };
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: err.message })
        };
      }
    }

    // 5D. Action: TOGGLE ACTIVE STATUS
    if (action === 'toggle_active') {
      const { code, isActive } = body;
      try {
        const updated = toggleCouponStatus(code, isActive, 'admin');
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            coupon: updated,
            message: `Coupon ${updated.coupon_code} is now ${updated.is_active ? 'Active' : 'Deactivated'}.`
          })
        };
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: err.message })
        };
      }
    }

    // 5E. Action: DELETE COUPON
    if (action === 'delete') {
      const { code } = body;
      try {
        const deleted = deleteCoupon(code);
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: true,
            deleted,
            message: `Coupon ${code} deleted.`
          })
        };
      } catch (err) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: err.message })
        };
      }
    }

    // 6. Action: LIST COUPONS
    if (action === 'list' || (event.httpMethod === 'GET' && action !== 'list_reports' && action !== 'get_report')) {
      const coupons = listCoupons();
      const total = coupons.length;
      const unused = coupons.filter(c => c.status === 'UNUSED').length;
      const used = coupons.filter(c => c.status === 'USED').length;
      const totalCash = total * 5;

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          coupons,
          stats: { total, unused, used, totalCash }
        })
      };
    }

    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: `Unknown action: ${action}` })
    };

  } catch (err) {
    console.error('[Admin Coupon] Error:', err);
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
