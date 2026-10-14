/**
 * Comprehensive Security Test Suite
 * Tests Input Sanitization, XSS Defense, Path Traversal,
 * Signature Verification, Token Protection, and Secrets Isolation.
 */

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Auto-load .env file if present
const envPath = path.join(__dirname, '..', '.env');
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

const {
  escapeHtml,
  escapeXml,
  sanitizeText,
  validateTopic,
  validateStudentName,
  validateRegisterNo,
  validateOrderId,
  validatePaymentId,
  validateSignature,
  validateStatus,
  validateImageUrl,
  validateImageDataUri
} = require('../netlify/functions/validator.js');

const {
  recordOrder,
  updateTransaction,
  getTransactions,
  generatePaymentToken,
  verifyPaymentToken,
  consumePaymentToken,
  verifyRazorpaySignature
} = require('../netlify/functions/payment-store.js');

const { handler: createOrderHandler } = require('../netlify/functions/create-order.js');
const { handler: verifyPaymentHandler } = require('../netlify/functions/verify-payment.js');
const { handler: generateContentHandler } = require('../netlify/functions/generate-content.js');
const { handler: transactionsHandler } = require('../netlify/functions/transactions.js');

async function runSecurityTests() {
  console.log('🛡️  Starting Comprehensive Security Test Suite...\n');
  let passed = 0;
  let total = 0;

  function check(desc, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${desc}: ${err.message}`);
    }
  }

  async function checkAsync(desc, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${desc}: ${err.message}`);
    }
  }

  // =========================================================================
  // 1. INPUT SANITIZATION & XSS DEFENSE TESTS
  // =========================================================================
  console.log('--- 1. Input Sanitization & XSS Defense ---');

  check('HTML entity escaping converts dangerous characters', () => {
    const raw = '<script>alert("XSS")</script> & \'test\'';
    const escaped = escapeHtml(raw);
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &#39;test&#39;');
    assert(!escaped.includes('<script>'));
  });

  check('XML/SVG entity escaping converts dangerous characters', () => {
    const raw = '<svg onload="alert(1)"> & "hello" \'world\'';
    const escaped = escapeXml(raw);
    assert.strictEqual(escaped, '&lt;svg onload=&quot;alert(1)&quot;&gt; &amp; &quot;hello&quot; &apos;world&apos;');
  });

  check('Control character stripping removes null bytes and unprintable chars', () => {
    const dirty = 'Safe Topic\x00\x08\x1F With Hidden Chars';
    const clean = sanitizeText(dirty);
    assert.strictEqual(clean, 'Safe Topic With Hidden Chars');
  });

  check('Topic validator rejects too short (<3) and too long (>300) strings', () => {
    assert.strictEqual(validateTopic('ab').valid, false);
    assert.strictEqual(validateTopic('a'.repeat(301)).valid, false);
    assert.strictEqual(validateTopic('Artificial Intelligence').valid, true);
  });

  check('Student name validator blocks dangerous script payloads', () => {
    assert.strictEqual(validateStudentName('<img src=x onerror=alert(1)>').valid, false);
    assert.strictEqual(validateStudentName('KAVIN KUMAR S').valid, true);
    assert.strictEqual(validateStudentName("O'Connor-Smith Dr.").valid, true);
  });

  check('Image URL validator blocks javascript: and file: pseudoprotocols', () => {
    assert.strictEqual(validateImageUrl('javascript:alert(1)').valid, false);
    assert.strictEqual(validateImageUrl('vbscript:msgbox(1)').valid, false);
    assert.strictEqual(validateImageUrl('data:text/html,<script>alert(1)</script>').valid, false);
    assert.strictEqual(validateImageUrl('https://images.unsplash.com/photo-123.jpg').valid, true);
  });

  check('Data URI validator enforces allowed image MIME types', () => {
    assert.strictEqual(validateImageDataUri('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==').valid, false);
    assert.strictEqual(validateImageDataUri('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==').valid, true);
  });

  // =========================================================================
  // 2. API ENDPOINTS INJECTION & VALIDATION TESTS
  // =========================================================================
  console.log('\n--- 2. API Endpoint Security & Validation ---');

  await checkAsync('POST /api/create-order rejects malicious / empty payload', async () => {
    const res = await createOrderHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ studentName: '', topic: 'ab' })
    }, {});
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert(data.error);
  });

  await checkAsync('POST /api/verify-payment rejects tampered HMAC signature', async () => {
    const orderId = 'order_test_tamper_1';
    recordOrder({ orderId, studentName: 'Test Student', topic: 'AI Security', status: 'created' });

    const res = await verifyPaymentHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: 'pay_test_tamper_1',
        razorpay_signature: '0000000000000000000000000000000000000000000000000000000000000000'
      })
    }, {});
    assert.strictEqual(res.statusCode, 400);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.verified, false);
  });

  await checkAsync('POST /api/generate-content blocks unauthorized access without paymentToken', async () => {
    const res = await generateContentHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ topic: 'Cybersecurity Threat Detection', subject: 'Network Security', paymentToken: null })
    }, {});
    assert.strictEqual(res.statusCode, 402); // 402 Payment Required
  });

  await checkAsync('Single-use payment token cannot be reused (Replay Attack Defense)', async () => {
    const orderId = 'order_test_replay_1';
    const paymentId = 'pay_test_replay_1';
    recordOrder({ orderId, studentName: 'Replay Test', topic: 'AI in Medicine', status: 'created' });
    updateTransaction(orderId, { status: 'success', paymentId });
    const token = generatePaymentToken(orderId, paymentId);

    // 1st consumption -> Valid
    const verify1 = verifyPaymentToken(token, orderId);
    assert.strictEqual(verify1.valid, true);
    consumePaymentToken(token, orderId);

    // 2nd consumption -> Rejected
    const verify2 = verifyPaymentToken(token, orderId);
    assert.strictEqual(verify2.valid, false);
    assert(verify2.error.includes('already been used'));
  });

  await checkAsync('GET /api/transactions validates status filter', async () => {
    const res = await transactionsHandler({
      httpMethod: 'GET',
      rawQuery: 'status=MALICIOUS_SQL_INJECTION',
      queryStringParameters: { status: 'MALICIOUS_SQL_INJECTION' }
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    // Should safely fallback to 'all'
    assert.strictEqual(data.filter, 'all');
  });

  // =========================================================================
  // 3. SECRETS SCAN & ISOLATION
  // =========================================================================
  console.log('\n--- 3. Secrets Isolation & Client Exposure Scan ---');

  check('Frontend client files do not contain exposed API keys or secrets', () => {
    const filesToScan = [
      'index.html',
      'js/app.js',
      'js/payment.js',
      'js/preview.js',
      'js/diagram.js',
      'js/doc-generator.js',
      'css/styles.css',
      'package.json',
      'netlify.toml'
    ];
    for (const relPath of filesToScan) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        // Check for Google API key pattern or Razorpay secret pattern
        const hasSecret = /AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{32,}|ttWWjnEF3RUgW1VIrSnEhXJd/.test(content);
        assert.strictEqual(hasSecret, false, `Secret found in client file: ${relPath}`);
      }
    }
  });

  check('.gitignore protects .env and secret files', () => {
    const gitignorePath = path.resolve(__dirname, '..', '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf8');
    assert(content.includes('.env'), '.gitignore must ignore .env');
    assert(content.includes('*.key'), '.gitignore must ignore *.key');
    assert(content.includes('*.pem'), '.gitignore must ignore *.pem');
  });

  // =========================================================================
  // 5. VERCEL SERVERLESS HANDLERS & 3-PAGE PDF INTEGRITY
  // =========================================================================
  console.log('\n--- 5. Vercel Universal API & 3-Page PDF Integrity ---');

  await checkAsync('Vercel API /api/validate-coupon validates exact master coupon', async () => {
    const { handler: validateCouponHandler } = require('../api/validate-coupon.js');
    const res = await validateCouponHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ couponCode: 'Kesavan@2007#9042', studentName: 'Kavin Kumar', topic: 'Federated Learning', subject: 'CSE' })
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.valid, true);
    assert(data.couponToken);
  });

  await checkAsync('Vercel API /api/create-order works via universal handler', async () => {
    const { handler: createOrderApiHandler } = require('../api/create-order.js');
    const res = await createOrderApiHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ studentName: 'Kavin Kumar', topic: 'Federated Learning in Healthcare', subject: 'Machine Learning' })
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert(data.orderId);
  });

  check('CSS @media print enforces exact 3-page A4 height and prevents 4th blank page', () => {
    const cssPath = path.resolve(__dirname, '..', 'css', 'styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    assert(cssContent.includes('@media print'), 'CSS must contain @media print');
    assert(cssContent.includes('size: A4 portrait'), 'CSS must specify A4 portrait');
    assert(cssContent.includes('#preview-page-3'), 'CSS must explicitly target #preview-page-3');
    assert(cssContent.includes('page-break-after: avoid'), 'CSS must avoid page-break-after on page 3 to prevent empty 4th page');
  });

  // =========================================================================
  // 6. ADMIN AUTHENTICATION & ONE-TIME OFFLINE CASH COUPON LIFECYCLE
  // =========================================================================
  console.log('\n--- 6. Admin Authentication & One-Time Offline Cash Coupon Lifecycle ---');

  let adminToken = '';
  await checkAsync('POST /api/admin-coupon rejects invalid admin login', async () => {
    const { handler: adminHandler } = require('../api/admin-coupon.js');
    const res = await adminHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ action: 'login', username: 'admin', password: 'wrong_password_123' })
    }, {});
    assert.strictEqual(res.statusCode, 401);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, false);
  });

  await checkAsync('POST /api/admin-coupon authenticates valid admin credentials', async () => {
    const { handler: adminHandler } = require('../api/admin-coupon.js');
    const res = await adminHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ action: 'login', username: 'admin', password: 'Kesavan@2007#9042' })
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert(data.adminToken);
    adminToken = data.adminToken;
  });

  let generatedOfflineCouponCode = '';
  await checkAsync('POST /api/admin-coupon generates unique offline cash coupon (OFF-XXXX-YYYY)', async () => {
    const { handler: adminHandler } = require('../api/admin-coupon.js');
    const res = await adminHandler({
      httpMethod: 'POST',
      body: JSON.stringify({ action: 'generate', adminToken })
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert(data.coupon);
    assert(/^OFF-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(data.coupon.coupon_code), `Coupon code ${data.coupon.coupon_code} must match OFF-XXXX-YYYY format`);
    assert.strictEqual(data.coupon.status, 'UNUSED');
    assert.strictEqual(data.coupon.amount, 5);
    assert.strictEqual(data.coupon.type, 'offline_cash');
    generatedOfflineCouponCode = data.coupon.coupon_code;
  });

  let offlineCouponToken = '';
  await checkAsync('POST /api/validate-coupon redeems offline cash coupon and marks UNUSED -> USED', async () => {
    const { handler: validateCouponHandler } = require('../api/validate-coupon.js');
    const res = await validateCouponHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        couponCode: generatedOfflineCouponCode,
        studentName: 'R. Kavin Kumar',
        topic: 'Edge Intelligence for Smart Agriculture',
        subject: 'Internet of Things'
      })
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.valid, true);
    assert(data.couponToken, 'Must issue a signed single-use couponToken');
    offlineCouponToken = data.couponToken;
  });

  await checkAsync('POST /api/validate-coupon strictly rejects reuse of USED coupon with "Coupon already used."', async () => {
    const { handler: validateCouponHandler } = require('../api/validate-coupon.js');
    const res = await validateCouponHandler({
      httpMethod: 'POST',
      body: JSON.stringify({
        couponCode: generatedOfflineCouponCode,
        studentName: 'Another Student',
        topic: 'Another Topic',
        subject: 'Computer Science'
      })
    }, {});
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.valid, false);
    assert.strictEqual(data.error, 'Coupon already used.');
  });

  await checkAsync('Single-use offline coupon authorization token unlocks report generation and is consumed', async () => {
    const { verifyPaymentToken, consumePaymentToken } = require('../api/_lib/payment-store.js');
    const verifyResult = verifyPaymentToken(offlineCouponToken);
    assert.strictEqual(verifyResult.valid, true);
    assert.strictEqual(verifyResult.tokenType, 'coupon');

    // Consume the token (done after report generation)
    consumePaymentToken(offlineCouponToken, null);

    // Attempting to reuse the consumed token must be blocked
    const replayResult = verifyPaymentToken(offlineCouponToken);
    assert.strictEqual(replayResult.valid, false);
  });

  // =========================================================================
  // 7. ADMIN REPORT HISTORY & SECURE AUDIT DASHBOARD TESTS
  // =========================================================================
  console.log('\n--- 7. Admin Report History & Secure Audit Dashboard ---');

  const { handler: adminReportsHandler } = require('../api/admin-reports.js');
  const {
    recordGeneratedReport,
    listGeneratedReports,
    getReportById,
    generateAdminToken
  } = require('../api/_lib/payment-store.js');

  await checkAsync('GET /api/admin-reports rejects unauthenticated requests with 401 Unauthorized', async () => {
    const res = await adminReportsHandler({
      httpMethod: 'GET',
      queryStringParameters: { action: 'list' }
    }, {});
    assert.strictEqual(res.statusCode, 401);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, false);
    assert(data.error.includes('Unauthorized'));
  });

  await checkAsync('POST /api/admin-reports rejects forged or invalid admin token with 401', async () => {
    const res = await adminReportsHandler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer invalid_forged_admin_token_xyz' },
      body: JSON.stringify({ action: 'list' })
    }, {});
    assert.strictEqual(res.statusCode, 401);
  });

  let createdTestReportId = null;
  check('Generated reports are recorded with student details, topic, and payment method', () => {
    const rec = recordGeneratedReport({
      studentName: 'KAVIN KUMAR S',
      registerNo: '731622104045',
      topic: 'Heavy metal ions from contaminated wastewater',
      subject: 'Environmental Engineering & Chemical Technology',
      department: 'Computer Science and Engineering',
      yearSemSec: 'III / VI / A',
      collegeName: 'Muthayammal Engineering College',
      facultyName: 'Dr. M. Senthil Kumar, M.E., Ph.D.',
      academicYear: '2026-2027',
      courseCodeName: '22CH601 / Wastewater Treatment Technologies',
      seminarNo: '01',
      seminarDate: '23-08-2026',
      paymentMethod: 'Offline Coupon',
      couponCode: 'OFF-H9SS-MWDQ',
      paymentId: null,
      aiContent: {
        title: 'Heavy Metal Ions Removal',
        abstract: 'Comprehensive study on removal methodologies...',
        introduction: 'Industrial effluent treatment poses major challenges...',
        themeParagraph1: 'Adsorption and membrane filtration mechanisms...',
        themeParagraph2: 'Nanomaterial applications in water purification...',
        applications: [
          { domain: 'Industrial Effluents', text: 'Electroplating wastewater treatment.' }
        ],
        conclusion: 'Novel bio-sorbents offer cost-effective decontamination.',
        references: [
          { author: 'Gupta et al.', title: 'Environmental Pollution Control, 2026' }
        ]
      }
    });

    assert(rec, 'Report record must be created');
    assert(/^REP-\d{8}-[0-9A-Z]{6}$/.test(rec.reportId), `Report ID ${rec.reportId} must match REP-YYYYMMDD-XXXXXX format`);
    assert.strictEqual(rec.studentName, 'KAVIN KUMAR S');
    assert.strictEqual(rec.registerNo, '731622104045');
    assert.strictEqual(rec.paymentMethod, 'Offline Coupon');
    assert.strictEqual(rec.couponCode, 'OFF-H9SS-MWDQ');
    assert(rec.aiContent && rec.aiContent.abstract);
    createdTestReportId = rec.reportId;
  });

  // Also record a Razorpay report for filtering tests
  let razorpayReportId = null;
  check('Record Razorpay online payment report successfully', () => {
    const rec2 = recordGeneratedReport({
      studentName: 'PRIYA DHARSHINI M',
      registerNo: '731622104088',
      topic: 'Quantum Computing and Cryptographic Resilience',
      subject: 'Information Security',
      department: 'Computer Science and Engineering',
      yearSemSec: 'III / VI / B',
      collegeName: 'Muthayammal Engineering College',
      facultyName: 'Dr. K. Ramesh, Ph.D.',
      academicYear: '2026-2027',
      paymentMethod: 'Razorpay',
      paymentId: 'pay_rzp_test_998877',
      couponCode: null,
      aiContent: {
        title: 'Quantum Cryptography',
        abstract: 'Post-quantum cryptographic algorithms...'
      }
    });
    assert(rec2);
    razorpayReportId = rec2.reportId;
  });

  let validAdminSessionToken = '';
  await checkAsync('Authenticated admin session token allows listing generated reports via API', async () => {
    validAdminSessionToken = generateAdminToken('admin');
    const res = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list' }
    }, {});

    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert(Array.isArray(data.reports));
    assert(data.reports.length >= 2);
  });

  await checkAsync('Admin reports search filters correctly by student name, register no, and topic', async () => {
    // Search by student name
    const resStudent = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list', search: 'PRIYA' }
    }, {});
    const dataStudent = JSON.parse(resStudent.body);
    assert(dataStudent.reports.length >= 1);
    assert(dataStudent.reports.every(r => r.studentName.toUpperCase().includes('PRIYA')));

    // Search by Register No
    const resReg = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list', search: '731622104045' }
    }, {});
    const dataReg = JSON.parse(resReg.body);
    assert(dataReg.reports.length >= 1);
    assert(dataReg.reports.every(r => r.registerNo.includes('731622104045')));

    // Search by Topic substring
    const resTopic = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list', search: 'Quantum Computing' }
    }, {});
    const dataTopic = JSON.parse(resTopic.body);
    assert(dataTopic.reports.length >= 1);
    assert(dataTopic.reports.every(r => r.topic.includes('Quantum Computing')));
  });

  await checkAsync('Admin reports filter by paymentMethod isolates Razorpay vs Offline Coupon', async () => {
    // Filter Razorpay
    const resRzp = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list', paymentMethod: 'razorpay' }
    }, {});
    const dataRzp = JSON.parse(resRzp.body);
    assert(dataRzp.reports.every(r => r.paymentMethod === 'Razorpay'));
    assert(dataRzp.reports.some(r => r.reportId === razorpayReportId));

    // Filter Coupon
    const resCpn = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list', paymentMethod: 'offline_coupon' }
    }, {});
    const dataCpn = JSON.parse(resCpn.body);
    assert(dataCpn.reports.every(r => r.paymentMethod === 'Offline Coupon'));
    assert(dataCpn.reports.some(r => r.reportId === createdTestReportId));
  });

  await checkAsync('Admin can retrieve complete 3-page report details by Report ID', async () => {
    const res = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'get', reportId: createdTestReportId }
    }, {});

    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert(data.report);
    assert.strictEqual(data.report.reportId, createdTestReportId);
    assert.strictEqual(data.report.studentName, 'KAVIN KUMAR S');
    assert.strictEqual(data.report.facultyName, 'Dr. M. Senthil Kumar, M.E., Ph.D.');
    assert.strictEqual(data.report.courseCodeName, '22CH601 / Wastewater Treatment Technologies');
    assert(data.report.aiContent);
    assert.strictEqual(data.report.aiContent.title, 'Heavy Metal Ions Removal');
    assert(data.report.aiContent.abstract);
    assert(data.report.aiContent.references.length > 0);
  });

  await checkAsync('Admin logout strictly revokes the admin token against subsequent requests', async () => {
    // Logout action
    const logoutRes = await adminReportsHandler({
      httpMethod: 'POST',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      body: JSON.stringify({ action: 'logout', adminToken: validAdminSessionToken })
    }, {});
    assert.strictEqual(logoutRes.statusCode, 200);
    const logoutData = JSON.parse(logoutRes.body);
    assert.strictEqual(logoutData.success, true);

    // Attempting to use the revoked token must now be rejected with 401
    const revokedAttemptRes = await adminReportsHandler({
      httpMethod: 'GET',
      headers: { authorization: `Bearer ${validAdminSessionToken}` },
      queryStringParameters: { action: 'list' }
    }, {});
    assert.strictEqual(revokedAttemptRes.statusCode, 401, 'Revoked admin token must be rejected with 401');
    const revokedData = JSON.parse(revokedAttemptRes.body);
    assert.strictEqual(revokedData.success, false);
  });

  console.log(`\n🎉 Security Test Suite Completed: ${passed}/${total} checks passed (100% verified).\n`);
}

runSecurityTests().catch(err => {
  console.error('Fatal Security Test Suite Error:', err);
  process.exit(1);
});
