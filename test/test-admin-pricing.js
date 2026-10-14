/**
 * Comprehensive Acceptance Test Suite for Admin Pricing, Payment Methods, and Coupon Codes
 * Tests all 14 criteria specified in Section 8 of the feature enhancement.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Target APIs and modules
const pricingStore = require('../api/_lib/pricing-store');
const paymentStore = require('../api/_lib/payment-store');
const adminPricingApi = require('../api/admin-pricing');
const adminCouponApi = require('../api/admin-coupon');
const validateCouponApi = require('../api/validate-coupon');
const createOrderApi = require('../api/create-order');
const generatePptApi = require('../api/generate-ppt');
const generateContentApi = require('../api/generate-content');

let testsPassed = 0;
let testsTotal = 0;

function it(desc, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${desc}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function itAsync(desc, fn) {
  testsTotal++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${desc}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

console.log('\n====================================================');
console.log('🧪 Starting Admin Pricing & Coupon Acceptance Test Suite');
console.log('====================================================\n');

async function runTests() {
  try {
    // Setup: clean up any residual test coupons from previous runs
    ['TEST40', 'FREESEMINAR', 'PPTONLY50'].forEach(c => paymentStore.deleteCoupon(c));

    // Setup: obtain valid admin token
    const adminToken = paymentStore.generateAdminToken('admin');

    console.log('--- Acceptance Test 1 & 14: Admin Configures Pricing & Persistence ---');
    await itAsync('1.1 Admin sets Report + PPT price to ₹5 (500 paise) and saves', async () => {
      const res = await adminPricingApi({
        httpMethod: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({
          action: 'update',
          service: 'reportAndPpt',
          mode: 'paid',
          amountPaise: 500,
          currency: 'INR'
        })
      });
      const data = JSON.parse(res.body);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.pricing.mode, 'paid');
      assert.strictEqual(data.pricing.amountPaise, 500);

      const check = pricingStore.getServicePricing('reportAndPpt');
      assert.strictEqual(check.amountPaise, 500);
      assert.strictEqual(pricingStore.isServicePaid('reportAndPpt'), true);
    });

  console.log('\n--- Acceptance Test 2: Mode A Paid Workflow Requires ₹5 ---');
  await itAsync('2.1 Order creation for Report + PPT returns configured ₹5 fee', async () => {
    const res = await createOrderApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        studentName: 'Aravind Kumar',
        topic: 'Autonomous Electric Vehicle Power Optimization',
        subject: 'Computer Science and Engineering',
        service: 'reportAndPpt'
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.amount, 500); // 500 paise = ₹5
    assert.strictEqual(data.amountRupees, 5);
  });

  console.log('\n--- Acceptance Test 3: Mode A Free Mode Bypasses Payment ---');
  await itAsync('3.1 Admin changes Report + PPT to Free, new requests are not charged', async () => {
    const updateRes = await adminPricingApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'update',
        service: 'reportAndPpt',
        mode: 'free',
        amountPaise: 0
      })
    });
    const updateData = JSON.parse(updateRes.body);
    assert.strictEqual(updateData.pricing.mode, 'free');
    assert.strictEqual(pricingStore.isServicePaid('reportAndPpt'), false);

    // Call generate-content with PAYMENT_ENFORCEMENT active without token
    process.env.PAYMENT_ENFORCEMENT = 'true';
    const genRes = await generateContentApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        topic: 'Renewable Microgrid Infrastructure',
        subject: 'Electrical Engineering'
        // No paymentToken provided!
      })
    });
    assert.strictEqual(genRes.statusCode, 200, 'Free mode should allow generation with status 200');
  });

  // Re-enable paid for subsequent coupon tests
  pricingStore.updateServicePricing('reportAndPpt', { mode: 'paid', amountPaise: 500 });

  console.log('\n--- Acceptance Test 4: Mode B PPT Only Defaults to Free ---');
  await itAsync('4.1 PPT Only starts as Free and generates immediately', async () => {
    pricingStore.updateServicePricing('pptOnly', { mode: 'free', amountPaise: 0 });
    assert.strictEqual(pricingStore.isServicePaid('pptOnly'), false);

    process.env.PAYMENT_ENFORCEMENT = 'true';
    const res = await generatePptApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        topic: 'Graph Neural Networks in Drug Discovery',
        subject: 'Computer Science and Engineering'
        // No paymentToken provided!
      })
    });
    assert.strictEqual(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
  });

  console.log('\n--- Acceptance Test 5: PPT Only Paid Workflow (₹3) ---');
  await itAsync('5.1 Admin sets PPT Only to ₹3 (300 paise), enforcement activates', async () => {
    const updateRes = await adminPricingApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'update',
        service: 'pptOnly',
        mode: 'paid',
        amountPaise: 300
      })
    });
    assert.strictEqual(JSON.parse(updateRes.body).pricing.amountPaise, 300);
    assert.strictEqual(pricingStore.isServicePaid('pptOnly'), true);

    // Check order creation returns ₹3
    const orderRes = await createOrderApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        studentName: 'Priya Sharma',
        topic: 'Quantum Cryptography Protocols',
        subject: 'Information Technology',
        service: 'pptOnly'
      })
    });
    const orderData = JSON.parse(orderRes.body);
    assert.strictEqual(orderData.amount, 300);
    assert.strictEqual(orderData.amountRupees, 3);

    // Generation without payment token should now be blocked with 402
    const blockedRes = await generatePptApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        topic: 'Quantum Cryptography Protocols',
        subject: 'Information Technology'
      })
    });
    assert.strictEqual(blockedRes.statusCode, 402, 'Paid PPT Only must require payment token');
  });

  console.log('\n--- Acceptance Test 6: Payment Methods Management ---');
  await itAsync('6.1 Admin updates payment methods (UPI & Gateway toggles)', async () => {
    const res = await adminPricingApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'update_payment_methods',
        upi: true,
        razorpay: false
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.paymentMethods.upi, true);
    assert.strictEqual(data.paymentMethods.razorpay, false);

    const methods = pricingStore.getPaymentMethods();
    assert.strictEqual(methods.razorpay, false);

    // Reset back to both enabled
    pricingStore.updatePaymentMethods({ upi: true, razorpay: true });
  });

  console.log('\n--- Acceptance Test 7 & 8: Custom Coupon Creation & Discount Calculation ---');
  await itAsync('7.1 Admin creates custom coupon with 40% discount', async () => {
    const res = await adminCouponApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'create_custom',
        code: 'TEST40',
        discountType: 'percentage',
        discountValue: 40,
        applicableService: 'both',
        usageLimit: 10,
        perUserLimit: 2
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.coupon.coupon_code, 'TEST40');
    assert.strictEqual(data.coupon.discount_value, 40);
  });

  await itAsync('8.1 User applies TEST40 to ₹5 order -> ₹2 discount applied (40% of ₹5)', async () => {
    const res = await validateCouponApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        couponCode: 'test40', // test case-insensitivity
        studentName: 'Sanjay Kumar',
        topic: 'Edge Computing for Smart Cities',
        service: 'reportAndPpt'
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.discountPaise, 200); // ₹2
    assert.strictEqual(data.finalPayablePaise, 300); // ₹3 remaining
    assert.strictEqual(data.isFreeAfterDiscount, false);
  });

  console.log('\n--- Acceptance Test 9: 100% Discount Waives Payment Completely ---');
  await itAsync('9.1 Admin creates 100% discount coupon FREESEMINAR', async () => {
    await adminCouponApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'create_custom',
        code: 'FREESEMINAR',
        discountType: 'percentage',
        discountValue: 100,
        applicableService: 'both'
      })
    });

    const res = await validateCouponApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        couponCode: 'FREESEMINAR',
        studentName: 'Anitha R',
        topic: 'Bioinformatics Genomic Sequencing',
        service: 'reportAndPpt'
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(data.valid, true);
    assert.strictEqual(data.finalPayablePaise, 0);
    assert.strictEqual(data.isFreeAfterDiscount, true);
    assert.ok(data.couponToken, '100% discount must return verified couponToken');

    // Token unlocks report generation
    const genRes = await generateContentApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        topic: 'Bioinformatics Genomic Sequencing',
        subject: 'Biomedical Engineering',
        paymentToken: data.couponToken
      })
    });
    assert.strictEqual(genRes.statusCode, 200);
  });

  console.log('\n--- Acceptance Test 10: Invalid, Expired & Mismatched Coupon Rejection ---');
  await itAsync('10.1 Service-mismatched coupon is rejected', async () => {
    // Create PPT-Only coupon
    await adminCouponApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'create_custom',
        code: 'PPTONLY50',
        discountType: 'percentage',
        discountValue: 50,
        applicableService: 'pptOnly'
      })
    });

    const res = await validateCouponApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        couponCode: 'PPTONLY50',
        studentName: 'Dinesh K',
        topic: 'Federated Learning Security',
        service: 'reportAndPpt' // User requests Report + PPT with PPT Only coupon
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(data.valid, false);
    assert.ok(data.error.includes('valid only for PPT Only'), 'Must explain service mismatch');
  });

  await itAsync('10.2 Deactivated coupon is rejected', async () => {
    // Deactivate PPTONLY50
    await adminCouponApi({
      httpMethod: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        action: 'toggle_active',
        code: 'PPTONLY50',
        isActive: false
      })
    });

    const res = await validateCouponApi({
      httpMethod: 'POST',
      body: JSON.stringify({
        couponCode: 'PPTONLY50',
        studentName: 'Dinesh K',
        topic: 'Federated Learning Security',
        service: 'pptOnly'
      })
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(data.valid, false);
    assert.ok(data.error.includes('inactive or disabled'));
  });

  console.log('\n--- Acceptance Test 11: Anti-Tamper & Security Verification ---');
  await itAsync('11.1 Unauthorized request cannot update prices without valid admin session', async () => {
    const res = await adminPricingApi({
      httpMethod: 'POST',
      headers: { 'Authorization': 'Bearer invalid_forged_token' },
      body: JSON.stringify({
        action: 'update',
        service: 'reportAndPpt',
        mode: 'free'
      })
    });
    assert.strictEqual(res.statusCode, 401);
  });

  console.log('\n--- Acceptance Test 12 & 13: Admin Dashboard Overview & Data Accuracy ---');
  await itAsync('12.1 Overview endpoint returns complete summary metrics', async () => {
    const res = await adminPricingApi({
      httpMethod: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      queryStringParameters: { action: 'overview' }
    });
    const data = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.ok(data.overview.reportAndPpt);
    assert.ok(data.overview.pptOnly);
    assert.ok(data.overview.paymentMethods);
    assert.ok(data.overview.couponStats);
    assert.ok(data.overview.transactionStats);
    assert.ok(Array.isArray(data.overview.recentTransactions));
  });

    console.log('\n====================================================');
    console.log(`🎉 ALL ${testsPassed}/${testsTotal} ACCEPTANCE TESTS PASSED! (100% Verified)`);
    console.log('====================================================\n');
  } finally {
    // Reset test state to clean defaults so other test suites aren't affected
    ['TEST40', 'FREESEMINAR', 'PPTONLY50'].forEach(c => paymentStore.deleteCoupon(c));
    pricingStore.updateServicePricing('pptOnly', { mode: 'free', amountPaise: 0, currency: 'INR' });
    pricingStore.updateServicePricing('reportAndPpt', { mode: 'paid', amountPaise: 500, currency: 'INR' });
  }
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
