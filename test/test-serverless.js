/**
 * Unit tests for Serverless Function handler & JSON resilience
 */

const assert = require('assert');
const path = require('path');

const functionPath = path.join(__dirname, '..', 'netlify', 'functions', 'generate-content.js');
const { handler } = require(functionPath);

async function runServerlessTests() {
  console.log('🧪 Testing Serverless Handler & Parser Resilience...\n');

  // Test 1: OPTIONS Preflight
  const optionsRes = await handler({ httpMethod: 'OPTIONS' }, {});
  assert.strictEqual(optionsRes.statusCode, 200);
  assert.strictEqual(optionsRes.headers['Access-Control-Allow-Origin'], '*');
  console.log('✅ OPTIONS CORS Preflight test passed.');

  // Test 2: Method Not Allowed (GET)
  const getRes = await handler({ httpMethod: 'GET' }, {});
  assert.strictEqual(getRes.statusCode, 405);
  console.log('✅ 405 Method Not Allowed test passed.');

  // Test 3: Missing Topic
  const noTopicRes = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ topic: '', subject: 'Computer Science' })
  }, {});
  assert.strictEqual(noTopicRes.statusCode, 400);
  assert.ok(JSON.parse(noTopicRes.body).error.includes('topic'));
  console.log('✅ 400 Bad Request (Missing topic) test passed.');

  // Test 4: Missing Provider Key error handling
  const originalEnv = { ...process.env };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.LLM_PROVIDER;

  const noProviderRes = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ topic: 'Quantum Computing', subject: 'Physics' })
  }, {});
  assert.strictEqual(noProviderRes.statusCode, 500);
  assert.ok(JSON.parse(noProviderRes.body).error.includes('No AI Provider configured'));
  console.log('✅ Missing Provider key guidance test passed.');

  // Restore env
  process.env = originalEnv;

  console.log('\n🎉 All Serverless handler tests passed successfully!\n');
}

runServerlessTests().catch(err => {
  console.error('Test failure:', err);
  process.exit(1);
});
