/**
 * Universal Serverless Function for AI PowerPoint Presentation Generation
 * Supports: Anthropic Claude, OpenAI GPT, Google Gemini, and Academic Synthesis Engine
 * Works on Vercel (/api/generate-ppt) and Netlify (/.netlify/functions/generate-ppt)
 */

'use strict';

const { makeUniversalHandler } = require('./_adapter');
const { validateTopic } = require('./validator');
const { synthesizeTopicDeck, toUpperCaseTitle } = require('./ppt-content');
const { verifyPaymentToken, consumePaymentToken } = require('./payment-store');
const { isServicePaid } = require('./pricing-store');

function isPaymentEnforced() {
  if (process.env.PAYMENT_ENFORCEMENT === 'false') return false;
  return true;
}


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

const PPT_SYSTEM_PROMPT = `You are an expert academic presentation designer and professor.
Your task is to generate a comprehensive, highly technical, presentation-ready PowerPoint deck structure for the given seminar topic.
The presentation must match an academic seminar standard with exact structure:
- Slide 1: Topic Overview (Title in UPPERCASE followed by ' :', a concise subtitle definition ending with ' :', and 5-7 concise, highly informative bullet points).
- Slide 2: Introduction (Title: 'INTRODUCTION :', 5-7 structured introductory bullet points).
- Slide 3: Process Analysis & Flowchart (Title: '[TOPIC] ANALYSIS PROCESS :', Left Heading: 'FLOW CHART EXPLANATION :', Left Bullets: 5-6 points explaining each step; Right Heading: 'SIMPLE FLOW CHART :', Flowchart: Array of 5-6 short uppercase step labels like 'DATA INGESTION', 'MODEL TRAINING', etc.).
- Slide 4: Conclusion (Title: 'CONCLUSION :', 5-7 concluding takeaways).

Return ONLY a valid, parseable JSON object matching this schema. Do not wrap in markdown fences.
Schema:
{
  "topic": "Topic Name",
  "title": "TOPIC NAME :",
  "slides": [
    {
      "type": "overview",
      "title": "FULL TOPIC IN CAPS :",
      "subtitle": "Clear 1-sentence definition of the topic ending with :",
      "bullets": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5"]
    },
    {
      "type": "introduction",
      "title": "INTRODUCTION :",
      "bullets": ["Intro 1", "Intro 2", "Intro 3", "Intro 4", "Intro 5"]
    },
    {
      "type": "process",
      "title": "TOPIC ANALYSIS PROCESS :",
      "leftHeading": "FLOW CHART EXPLANATION :",
      "leftBullets": ["Step 1 explanation", "Step 2 explanation", "Step 3 explanation", "Step 4 explanation", "Step 5 explanation"],
      "rightHeading": "SIMPLE FLOW CHART :",
      "flowchart": ["STEP 1", "STEP 2", "STEP 3", "STEP 4", "STEP 5"]
    },
    {
      "type": "conclusion",
      "title": "CONCLUSION :",
      "bullets": ["Concl 1", "Concl 2", "Concl 3", "Concl 4", "Concl 5"]
    }
  ]
}`;

function resolveProvider() {
  const explicit = (process.env.LLM_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'anthropic' || explicit === 'openai' || explicit === 'google') {
    return explicit;
  }
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) return 'google';
  return null;
}

async function callAnthropicPpt(apiKey, topic, subject) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const userContent = `Topic: "${topic}"\nSubject: "${subject}"\nGenerate the complete technical PowerPoint deck structure matching the schema. Return ONLY valid JSON.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      system: PPT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const textContent = (data.content || []).find(c => c.type === 'text');
  return textContent ? textContent.text : '';
}

async function callOpenAIPpt(apiKey, topic, subject) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o';
  const userContent = `Topic: "${topic}"\nSubject: "${subject}"\nGenerate the complete technical PowerPoint deck structure matching the schema. Return ONLY valid JSON.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: PPT_SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callGooglePpt(apiKey, topic, subject) {
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const userContent = `${PPT_SYSTEM_PROMPT}\n\nTopic: "${topic}"\nSubject: "${subject}"\nGenerate the complete technical PowerPoint deck structure matching the schema. Return ONLY valid JSON.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ message: 'Preflight OK' }) };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed. Please send a POST request.' })
    };
  }

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON payload received in request body.' })
      };
    }

    const { topic, subject = '', reportContent = null, templateId = 'template-academic-flowchart',
            paymentToken = null, orderId = null, service = 'pptOnly' } = body;

    const validTopic = validateTopic(topic);
    if (!validTopic.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validTopic.error }) };
    }

    // ── Payment Enforcement for PPT Only ──────────────────────────────────
    if (isPaymentEnforced() && isServicePaid('pptOnly')) {
      const tokenVerification = verifyPaymentToken(paymentToken, orderId || null);
      if (!tokenVerification.valid) {
        return {
          statusCode: 402,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Payment Required. ' + (tokenVerification.error || 'Please complete payment before generating PPT.'),
            paymentRequired: true,
            service: 'pptOnly'
          })
        };
      }
    }

    const cleanTopic = validTopic.value;
    const cleanSubject = String(subject || 'Engineering & Technology').trim();
    const cleanTemplateId = (templateId === 'template-executive-grid')
      ? 'template-executive-grid'
      : 'template-academic-flowchart';

    let provider = resolveProvider();
    let deckData = null;

    if (provider && cleanTemplateId === 'template-academic-flowchart') {
      try {
        let rawOutput = '';
        if (provider === 'anthropic') {
          rawOutput = await callAnthropicPpt(process.env.ANTHROPIC_API_KEY, cleanTopic, cleanSubject);
        } else if (provider === 'openai') {
          rawOutput = await callOpenAIPpt(process.env.OPENAI_API_KEY, cleanTopic, cleanSubject);
        } else if (provider === 'google') {
          const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
          rawOutput = await callGooglePpt(key, cleanTopic, cleanSubject);
        }

        const cleaned = rawOutput.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length >= 3) {
          deckData = parsed;
          deckData.topic = cleanTopic;
          deckData.title = toUpperCaseTitle(cleanTopic);
          deckData.templateId = cleanTemplateId;
        }
      } catch (llmErr) {
        console.warn('[PPT AI Generation] LLM call failed. Falling back to academic synthesis engine:', llmErr.message);
      }
    }

    if (!deckData) {
      provider = 'academic-synthesis';
      deckData = synthesizeTopicDeck(cleanTopic, cleanSubject, reportContent, cleanTemplateId);
    }

    // Consume payment token to prevent reuse
    if (isPaymentEnforced() && paymentToken && isServicePaid('pptOnly')) {
      consumePaymentToken(paymentToken, orderId || null);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        provider,
        topic: cleanTopic,
        templateId: cleanTemplateId,
        data: deckData
      })
    };
  } catch (err) {
    console.error('PPT handler error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: err.message || 'Internal server error while generating PowerPoint presentation.'
      })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;
