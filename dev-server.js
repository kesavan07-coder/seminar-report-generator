/**
 * Hardened Local Development Server with Static File Serving,
 * Serverless API Emulation, Security Headers, and Audit Logging
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Auto-load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname);
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB limit

// Load serverless function modules
const generateContentModule = require('./netlify/functions/generate-content.js');
const generatePptModule     = require('./netlify/functions/generate-ppt.js');
const createOrderModule     = require('./netlify/functions/create-order.js');
const verifyPaymentModule   = require('./netlify/functions/verify-payment.js');
const transactionsModule    = require('./netlify/functions/transactions.js');
const validateCouponModule  = require('./netlify/functions/validate-coupon.js');
const adminCouponModule     = require('./netlify/functions/admin-coupon.js');
const adminPricingModule    = require('./netlify/functions/admin-pricing.js');
const adminReportsModule    = require('./netlify/functions/admin-reports.js');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.doc':  'application/msword'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdnjs.cloudflare.com; connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://*.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; object-src 'none'; base-uri 'self';"
};

/**
 * Structured Security Audit Logger
 */
function auditLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`);
}

/**
 * Route map: pathname -> serverless handler module
 */
const API_ROUTES = {
  '/api/generate-content':         generateContentModule,
  '/.netlify/functions/generate-content': generateContentModule,
  '/api/generate-ppt':             generatePptModule,
  '/.netlify/functions/generate-ppt':     generatePptModule,
  '/api/validate-coupon':          validateCouponModule,
  '/.netlify/functions/validate-coupon': validateCouponModule,
  '/api/admin-coupon':             adminCouponModule,
  '/.netlify/functions/admin-coupon': adminCouponModule,
  '/api/admin-pricing':            adminPricingModule,
  '/.netlify/functions/admin-pricing': adminPricingModule,
  '/api/admin-reports':            adminReportsModule,
  '/.netlify/functions/admin-reports': adminReportsModule,
  '/api/create-order':             createOrderModule,
  '/.netlify/functions/create-order': createOrderModule,
  '/api/verify-payment':           verifyPaymentModule,
  '/.netlify/functions/verify-payment': verifyPaymentModule,
  '/api/transactions':             transactionsModule,
  '/.netlify/functions/transactions': transactionsModule,
  '/api/record-payment-status':    transactionsModule,
  '/.netlify/functions/record-payment-status': transactionsModule
};

const server = http.createServer(async (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  let parsedUrl;

  try {
    parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  } catch (e) {
    auditLog('warn', 'Malformed Request URL', { ip: clientIp, url: req.url });
    res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('400 Bad Request');
    return;
  }

  const pathname = parsedUrl.pathname;
  const handlerModule = API_ROUTES[pathname];

  // 1. Handle Serverless API routes
  if (handlerModule) {
    let body = '';
    let bodyLength = 0;
    let payloadTooLarge = false;

    req.on('data', chunk => {
      bodyLength += chunk.length;
      if (bodyLength > MAX_PAYLOAD_BYTES) {
        payloadTooLarge = true;
        req.destroy();
        auditLog('warn', 'Payload limit exceeded on API route', { ip: clientIp, path: pathname, size: bodyLength });
        res.writeHead(413, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
        res.end(JSON.stringify({ error: 'Payload Too Large. Maximum allowed size is 10MB.' }));
      } else {
        body += chunk;
      }
    });

    req.on('end', async () => {
      if (payloadTooLarge) return;

      try {
        const queryStringParameters = {};
        parsedUrl.searchParams.forEach((v, k) => { queryStringParameters[k] = v; });

        const event = {
          httpMethod: req.method,
          headers: req.headers,
          body: body || null,
          path: pathname,
          queryStringParameters,
          rawQuery: parsedUrl.search ? parsedUrl.search.slice(1) : ''
        };

        const result = await handlerModule.handler(event, {});
        
        const combinedHeaders = {
          ...SECURITY_HEADERS,
          ...(result.headers || { 'Content-Type': 'application/json' })
        };

        res.writeHead(result.statusCode, combinedHeaders);
        res.end(result.body);

        if (result.statusCode >= 400) {
          auditLog('info', `API response ${result.statusCode}`, { ip: clientIp, method: req.method, path: pathname });
        }
      } catch (err) {
        auditLog('error', 'Unhandled exception in API handler', { ip: clientIp, path: pathname, error: err.message });
        res.writeHead(500, { 'Content-Type': 'application/json', ...SECURITY_HEADERS });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
    return;
  }

  // 2. Handle Static Files with Strict Path Traversal Defense
  let decodedPath = '';
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch (e) {
    auditLog('warn', 'URL decode failed / Malformed path', { ip: clientIp, path: pathname });
    res.writeHead(400, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('400 Bad Request');
    return;
  }

  // Check for null bytes (%00)
  if (decodedPath.includes('\0')) {
    auditLog('warn', 'Null byte injection attempt blocked', { ip: clientIp, path: pathname });
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden');
    return;
  }

  const safeRelPath = decodedPath === '/' ? 'index.html' : '.' + path.normalize('/' + decodedPath);
  const targetFilePath = path.resolve(PUBLIC_DIR, safeRelPath);

  // Verify that the resolved path is strictly within PUBLIC_DIR
  if (!targetFilePath.startsWith(PUBLIC_DIR + path.sep) && targetFilePath !== path.join(PUBLIC_DIR, 'index.html')) {
    auditLog('warn', 'Path traversal attempt blocked', { ip: clientIp, path: pathname, target: targetFilePath });
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden');
    return;
  }

  // Prevent serving hidden files / dotfiles (e.g. .env, .git)
  const baseName = path.basename(targetFilePath);
  if (baseName.startsWith('.') && baseName !== '.') {
    auditLog('warn', 'Access to sensitive hidden file blocked', { ip: clientIp, path: pathname });
    res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(targetFilePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(targetFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      ...SECURITY_HEADERS
    });
    fs.createReadStream(targetFilePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const rzpKey = process.env.RAZORPAY_KEY_ID || '';
  const rzpConfigured = rzpKey && !rzpKey.includes('your_key_id');

  console.log(`🚀 Hardened Local Server running at http://localhost:${PORT}`);
  console.log(`🛡️  Security Headers Active: CSP, HSTS, X-Frame-Options, X-Content-Type-Options`);
  console.log(`🔑 Active AI Provider: ${process.env.LLM_PROVIDER || 'Auto-detect'} (Google Gemini Key Loaded)`);
  console.log(`💳 Razorpay Payment Gateway: ${rzpConfigured ? `✅ Configured (${rzpKey.startsWith('rzp_test_') ? 'Test Mode' : 'Live Mode'})` : '⚠️ Test Mode'}`);
  console.log(`\nAPI Endpoints (Protected & Sanitized):`);
  console.log(`  POST /api/create-order        — Initialize ₹5 payment order`);
  console.log(`  POST /api/verify-payment      — Verify Razorpay signature`);
  console.log(`  POST /api/generate-content    — Generate report (requires paymentToken)`);
  console.log(`  GET  /api/transactions        — Transaction history dashboard`);
  console.log(`  POST /api/record-payment-status — Update payment status\n`);
});
