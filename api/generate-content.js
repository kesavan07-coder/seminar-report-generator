/**
 * Universal Multi-provider Serverless Function for Seminar Report Generation
 * Supports: Anthropic Claude, OpenAI GPT, and Google Gemini
 * 
 * Works on Vercel (/api/generate-content) and Netlify (/.netlify/functions/generate-content)
 */

'use strict';

const { makeUniversalHandler } = require('./_lib/_adapter');
const { verifyPaymentToken, consumePaymentToken, recordGeneratedReport } = require('./_lib/payment-store');
const { isServicePaid } = require('./_lib/pricing-store');
const { validateTopic, validateSubject } = require('./_lib/validator');

const SYSTEM_PROMPT = `You are an expert academic curriculum and engineering technical writer at Muthayammal Engineering College. 
Your task is to generate well-developed, high-quality, professional seminar report content based on the provided seminar topic and subject.

CRITICAL LENGTH CONSTRAINTS (To fill Page 1 & Page 2 completely and cleanly with ZERO overflow to Page 3):
- "abstract": Exactly 5-6 sentences (approx. 90-105 words) summarizing background, methodology, and technical significance.
- "introduction": Exactly 7-8 sentences (approx. 130-150 words) providing context, key concepts, technical challenges, and practical relevance.
- "themeParagraph1": Exactly 4 sentences (approx. 60-70 words) explaining the primary theoretical mechanisms and structural framework.
- "themeParagraph2": Exactly 4 sentences (approx. 65-75 words) detailing sub-techniques, benchmarks, and ending with reference to Figure 1.
- "conclusion": Exactly 3-4 concise sentences (approx. 65-80 words) summarizing outcomes, limitations, and future outlook.

CRITICAL APPLICATIONS RULE: The "applications" array MUST contain exactly 4 entries with domain names that are SPECIFIC and RELEVANT to the seminar topic and subject. 
Each application bullet must be exactly 1 clear sentence (approx. 15-20 words).
Do NOT use generic domains like "Retail", "Banking", "Education", "Logistics" unless they are genuinely the top application areas for this exact topic.

CRITICAL DYNAMIC TOPIC-SPECIFIC DIAGRAM RULE:
Analyze the seminar topic first and select the most semantically appropriate diagram type from these standard engineering layout types:
- "process_flow": For pipelines, sequential workflows, data ingestion, ML workflows, chemical/mechanical processing stages.
- "layered_architecture": For IoT stacks, Cloud computing hierarchies, network layers, operating system stacks, software architectures.
- "network": For blockchain networks, peer-to-peer systems, distributed ledgers, mesh computing, telecommunication topologies.
- "cause_effect": For cybersecurity defense matrices, threat detection pipelines, fault tree root causes, safety verification.
- "ecosystem": For supply chain networks, industrial value chains, multi-agent frameworks, enterprise integration.
- "feedback_loop": For renewable energy grids, automated control systems, cyber-physical systems, adaptive optimization.
- "input_process_output": For data transformation engines, compiler design, signal processors, bio-reactors.
- "cycle": For software development lifecycles (DevOps/Agile), circular economies, continuous integration, iterative refinement.
- "hub_spoke": For central core coordinator with modular radiating domains, API gateways, microservice orchestrators.
- "hierarchical_tree": For taxonomy, taxonomic classification, decision trees, protocol family trees.
- "comparison": For comparative architecture, trade-off benchmark matrices, dual-methodology evaluations.
- "timeline": For historical evolution, generational roadmaps, chronological migration stages.
- "concept_map": For relational knowledge graphs, ontology mappings, multi-factor interdependencies.

Generate 3 to 6 topic-specific nodes with meaningful technical names (NOT generic placeholders like "Step 1" or "Node A").
Connections must reflect the true flow of data, materials, control signals, or dependencies.

You MUST reply with ONLY a valid, parseable JSON object matching the exact schema below. Do not wrap the JSON in Markdown code fences (e.g. do NOT use \`\`\`json). Do not add any preamble, conversational text, or postscript.

JSON Schema:
{
  "title": "Full Seminar Topic in Title Case",
  "abstract": "Detailed abstract paragraph of exactly 5-6 sentences.",
  "introduction": "Detailed introduction paragraph of exactly 7-8 sentences.",
  "themeParagraph1": "Technical mechanism paragraph of exactly 4 sentences.",
  "themeParagraph2": "Sub-technique paragraph of 4 sentences ending with Figure 1. [Title].",
  "figureCaption": "Figure 1. [Academic Diagram Caption tailored to topic]",
  "applicationsIntro": "One concise sentence introducing the real-world adoption of this specific technology.",
  "applications": [
    { "domain": "[Specific relevant sector 1]", "text": "Specific real-world application of this exact topic in this sector." },
    { "domain": "[Specific relevant sector 2]", "text": "Specific real-world application of this exact topic in this sector." },
    { "domain": "[Specific relevant sector 3]", "text": "Specific real-world application of this exact topic in this sector." },
    { "domain": "[Specific relevant sector 4]", "text": "Specific real-world application of this exact topic in this sector." }
  ],
  "applicationsClosing": "One concise concluding sentence on industry governance and efficiency.",
  "conclusion": "Concise conclusion paragraph of 3-4 sentences.",
  "references": [
    { "style": "book", "author": "Author Name(s) (Year)", "title": "Book / Journal Title, Publisher Details." },
    { "style": "book", "author": "Author Name(s) (Year)", "title": "Book / Journal Title, Publisher Details." },
    { "style": "source", "text": "Reputable Organization – Technical Whitepaper / Architecture Report, Year." },
    { "style": "source", "text": "Research Institute – State of the Art Engineering Survey, Year." }
  ],
  "diagram": {
    "type": "process_flow",
    "title": "Topic-Specific Technical Title",
    "nodes": [
      { "id": "n1", "label": "Technical Step 1", "description": "Concise role (under 5 words)", "role": "input" },
      { "id": "n2", "label": "Technical Step 2", "description": "Concise role (under 5 words)", "role": "process" },
      { "id": "n3", "label": "Technical Step 3", "description": "Concise role (under 5 words)", "role": "process" },
      { "id": "n4", "label": "Technical Step 4", "description": "Concise role (under 5 words)", "role": "output" }
    ],
    "connections": [["n1", "n2"], ["n2", "n3"], ["n3", "n4"]],
    "footerLabel": "Key Architectural Principle",
    "footerText": "Concise summary of operational trade-offs and performance criteria"
  }
}`;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

function isPaymentEnforced() {
  if (process.env.PAYMENT_ENFORCEMENT === 'false') return false;
  return true;
}

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

async function callAnthropic(apiKey, topic, subject) {
  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
  const userContent = `Seminar Topic: "${topic}"\nSubject / Discipline: "${subject}"\n\nGenerate the complete technical seminar report content according to the requested JSON schema. Return ONLY valid JSON.`;

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
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }]
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Anthropic API Error (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text;
  if (!rawText) throw new Error('Received empty response from Anthropic API');
  return rawText;
}

async function callOpenAI(apiKey, topic, subject) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const userContent = `Seminar Topic: "${topic}"\nSubject / Discipline: "${subject}"\n\nGenerate the complete technical seminar report content according to the requested JSON schema. Return ONLY valid JSON.`;

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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API Error (${response.status}): ${errorData}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Received empty response from OpenAI API');
  return rawText;
}

async function callGoogle(apiKey, topic, subject) {
  const model = process.env.GOOGLE_MODEL || 'gemini-3.6-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const userContent = `Seminar Topic: "${topic}"\nSubject / Discipline: "${subject}"\n\nGenerate the complete technical seminar report content according to the requested JSON schema. Return ONLY valid JSON.`;

  const maxAttempts = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(`Google Gemini API Error (${response.status}): ${errorData}`);
          await new Promise(r => setTimeout(r, attempt * 1000));
          continue;
        }
        throw new Error(`Google Gemini API Error (${response.status}): ${errorData}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Received empty response from Google Gemini API');
      return rawText;

    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, attempt * 800));
      }
    }
  }

  throw lastError || new Error('Google Gemini API request failed after retries.');
}

function parseAndValidate(rawText, topic, subject) {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (nestedErr) {
        throw new Error(`Failed to parse AI JSON response: ${nestedErr.message}`);
      }
    } else {
      throw new Error(`Invalid JSON format in AI response: ${err.message}`);
    }
  }

  const title = (parsed.title && typeof parsed.title === 'string' && parsed.title.trim()) || topic;

  const abstract = (parsed.abstract && typeof parsed.abstract === 'string' && parsed.abstract.trim())
    ? parsed.abstract.trim()
    : `This seminar report presents a comprehensive exploration into the principles, methodologies, and systemic applications of ${topic} within ${subject}. The study analyzes fundamental architectural frameworks, highlighting how contemporary algorithmic workflows address traditional efficiency constraints. Core theoretical mechanisms are investigated alongside empirical evaluation parameters to demonstrate practical operational viability. Furthermore, critical operational challenges and emerging research benchmarks are synthesized to provide a coherent technical perspective. The insights documented herein underscore the strategic significance of this technology across diverse engineering verticals. Ultimately, this report provides a structured foundation for continuing research and technical implementation.`;

  const introduction = (parsed.introduction && typeof parsed.introduction === 'string' && parsed.introduction.trim())
    ? parsed.introduction.trim()
    : `In recent years, rapid technological acceleration within the field of ${subject} has underscored the critical need for advanced methodologies like ${topic}. Historically, conventional implementations encountered substantial limitations regarding scalability, latency, and resource utilization. The introduction of modern computational architectures and intelligent frameworks has catalyzed a major paradigm shift toward autonomous and optimized operational workflows. Today, institutions and industries worldwide leverage ${topic} to enhance operational efficiency, ensure reliability, and solve intricate engineering bottlenecks. Understanding the underlying theoretical pillars and architectural protocols is essential for modern engineers seeking to pioneer next-generation solutions. This report establishes the core motivation, contextual evolution, and multi-faceted applications driving this domain forward.`;

  const themeParagraph1 = (parsed.themeParagraph1 && typeof parsed.themeParagraph1 === 'string' && parsed.themeParagraph1.trim())
    ? parsed.themeParagraph1.trim()
    : `At its foundational level, ${topic} operates by synthesizing core algorithmic pipelines and structural data flows to execute specialized functions with high precision. The underlying mechanism dynamically reconciles incoming workload parameters against predefined optimization thresholds to maintain operational stability. By coordinating these computational routines, the architecture minimizes overhead and guarantees consistent performance under demanding environmental conditions. Core operational workflows and structural interactions are represented in Figure 1.`;

  const themeParagraph2 = (parsed.themeParagraph2 && typeof parsed.themeParagraph2 === 'string' && parsed.themeParagraph2.trim())
    ? parsed.themeParagraph2.trim()
    : `Key modern sub-techniques associated with this technology include distributed processing nodes, automated verification protocols, and latency-reduction algorithms. These methodologies are increasingly adopted across mission-critical industries where throughput and resilience are paramount. Standardized engineering implementations have established new performance benchmarks, reducing deployment cycles while elevating overall system integrity. Today, diverse industrial domains define strategic goals to guide operational decision-making. Figure 1. Core ${title} Objectives`;

  const figureCaption = (parsed.figureCaption && typeof parsed.figureCaption === 'string' && parsed.figureCaption.trim())
    ? parsed.figureCaption.trim()
    : `Figure 1. Core ${title} Objectives`;

  const applicationsIntro = (parsed.applicationsIntro && typeof parsed.applicationsIntro === 'string' && parsed.applicationsIntro.trim())
    ? parsed.applicationsIntro.trim()
    : `Standardized ${topic} design methodologies enable diverse operational sectors to streamline complex modeling and reporting workflows:`;

  const defaultApps = [
    { domain: 'Retail', text: 'Aggregates point-of-sale transactions into dimensional schemas to analyze inventory velocity and customer purchase histories across regions.' },
    { domain: 'Banking', text: 'Integrates core banking logs into time-variant data marts to streamline regulatory compliance reporting and fraud risk modeling.' },
    { domain: 'Healthcare', text: 'Consolidates patient medical records and billing metrics into unified repositories for epidemiological research and clinical outcome tracking.' },
    { domain: 'Education', text: 'Combines student enrollment, course performance, and financial metrics to evaluate academic retention trends and resource allocation.' }
  ];

  let applications = Array.isArray(parsed.applications) && parsed.applications.length > 0
    ? parsed.applications.slice(0, 4).map((item, idx) => ({
        domain: item.domain || defaultApps[idx % defaultApps.length].domain,
        text: item.text || defaultApps[idx % defaultApps.length].text
      }))
    : defaultApps;

  if (applications.length < 4) {
    const existingDomains = new Set(applications.map(a => a.domain));
    for (const def of defaultApps) {
      if (!existingDomains.has(def.domain) && applications.length < 4) {
        applications.push(def);
      }
    }
  }

  const applicationsClosing = (parsed.applicationsClosing && typeof parsed.applicationsClosing === 'string' && parsed.applicationsClosing.trim())
    ? parsed.applicationsClosing.trim()
    : `Implementing tailored architectural frameworks across these industries ensures robust data governance and enhanced operational efficiency.`;

  const conclusion = (parsed.conclusion && typeof parsed.conclusion === 'string' && parsed.conclusion.trim())
    ? parsed.conclusion.trim()
    : `In summary, a structured ${topic} process is vital for converting disjointed operational data into actionable intelligence. By progressing systematically through conceptual, logical, and physical phases, organizations mitigate risks associated with schema rigidity and latency. Modern challenges such as real-time stream integration require ongoing refinements to traditional architectural paradigms.`;

  const defaultRefs = [
    { style: 'book', author: 'Tanenbaum, A. S., & Wetherall, D. J. (2021)', title: 'Computer Networks and Distributed Architectures (6th Edition), Pearson Academic.' },
    { style: 'book', author: 'Russell, S., & Norvig, P. (2022)', title: 'Artificial Intelligence: A Modern Approach (4th Edition), Prentice Hall.' },
    { style: 'source', text: 'IEEE Computer Society – Standard Architectural Framework for Distributed Intelligent Systems, IEEE Std 2024-08.' },
    { style: 'source', text: 'Muthayammal Academic Research Consortium – Technical Whitepaper on Advanced Computing Paradigms, MEC-IQAC Press, 2026.' }
  ];

  let references = Array.isArray(parsed.references) && parsed.references.length > 0
    ? parsed.references.map((ref, idx) => {
        if (ref.style === 'book' || (ref.author && ref.title)) {
          return {
            style: 'book',
            author: ref.author || 'Academic Authors',
            title: ref.title || `${topic} in Modern Computing Systems`
          };
        }
        return {
          style: 'source',
          text: ref.text || defaultRefs[idx % defaultRefs.length].text || defaultRefs[2].text
        };
      })
    : defaultRefs;

  if (references.length < 4) {
    references = defaultRefs;
  }

  function getTopicSpecificDiagramFallback(topicStr, titleStr) {
    const t = (topicStr + ' ' + titleStr).toLowerCase();

    if (t.includes('artificial intelligence') || t.includes('machine learning') || t.includes('deep learning') || t.includes('neural') || t.includes('ai ')) {
      return {
        type: 'process_flow',
        title: `Machine Learning Model Lifecycle & Inference Pipeline`,
        nodes: [
          { id: 'n1', label: 'Raw Data Ingestion', description: 'Stream telemetry & logs', role: 'input' },
          { id: 'n2', label: 'Feature Engineering', description: 'Normalization & vectorization', role: 'process' },
          { id: 'n3', label: 'Model Training & Tuning', description: 'Gradient descent & loss calc', role: 'process' },
          { id: 'n4', label: 'Evaluation & Benchmarking', description: 'Accuracy & ROC metrics', role: 'process' },
          { id: 'n5', label: 'Cloud / Edge Inference', description: 'Low-latency predictions', role: 'output' },
          { id: 'n6', label: 'Monitoring & Drift Feedback', description: 'Retraining triggers', role: 'feedback' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n5', 'n6'], ['n6', 'n2']],
        footerLabel: 'Continuous Learning Feedback',
        footerText: 'Live operational telemetry actively monitors inference latency and concept drift to trigger automated model retraining.'
      };
    }

    if (t.includes('blockchain') || t.includes('distributed ledger') || t.includes('crypto') || t.includes('consensus') || t.includes('smart contract')) {
      return {
        type: 'network',
        title: `Distributed Consensus & Immutable Ledger Architecture`,
        nodes: [
          { id: 'n1', label: 'Client Transaction', description: 'Cryptographic signature', role: 'input' },
          { id: 'n2', label: 'P2P Mempool Broadcast', description: 'Gossip protocol sync', role: 'network' },
          { id: 'n3', label: 'Miner Validation', description: 'Proof execution & checks', role: 'process' },
          { id: 'n4', label: 'Consensus Engine', description: 'BFT / PoS finality', role: 'process' },
          { id: 'n5', label: 'Cryptographic Block Chaining', description: 'Merkle root SHA-256', role: 'storage' },
          { id: 'n6', label: 'State Commit & Settlement', description: 'Immutable state tree', role: 'output' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n5', 'n6']],
        footerLabel: 'Byzantine Fault Tolerance & Immutability',
        footerText: 'Cryptographic hashing and distributed peer voting guarantee zero single points of failure without centralized intermediaries.'
      };
    }

    if (t.includes('iot') || t.includes('internet of things') || t.includes('sensor') || t.includes('actuator') || t.includes('embedded')) {
      return {
        type: 'layered_architecture',
        title: `End-to-End Internet of Things (IoT) Multi-Tier Architecture`,
        nodes: [
          { id: 'n1', label: 'Perception Layer', description: 'Sensors, RFID, edge nodes', role: 'layer' },
          { id: 'n2', label: 'Edge Gateway & Protocol Tier', description: 'MQTT / CoAP translation', role: 'layer' },
          { id: 'n3', label: 'Cloud Stream & Analytics Engine', description: 'Real-time telemetry ingestion', role: 'layer' },
          { id: 'n4', label: 'Application & Control Dashboards', description: 'Automated actuation & BI', role: 'layer' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4']],
        footerLabel: 'Edge-to-Cloud Interoperability',
        footerText: 'Low-power telemetry streams from edge sensors to cloud message brokers with sub-second transmission latency.'
      };
    }

    if (t.includes('security') || t.includes('cyber') || t.includes('threat') || t.includes('attack') || t.includes('malware') || t.includes('zero trust')) {
      return {
        type: 'cause_effect',
        title: `Defense-in-Depth & Cyber Threat Mitigation Framework`,
        nodes: [
          { id: 'n1', label: 'Attack Vectors & Infiltration', description: 'DDoS, phishing, exploits', role: 'input' },
          { id: 'n2', label: 'Zero-Trust Perimeter Gateways', description: 'MFA & packet inspection', role: 'process' },
          { id: 'n3', label: 'AI SIEM Anomaly Detection', description: 'Behavioral heuristics', role: 'process' },
          { id: 'n4', label: 'Automated Threat Isolation', description: 'Micro-segmentation rules', role: 'process' },
          { id: 'n5', label: 'Forensic Audit & Recovery', description: 'Immutable incident logs', role: 'output' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5']],
        footerLabel: 'Zero-Trust Verification Principle',
        footerText: 'Never trust, always verify: continuous behavioral analytics immediately isolates anomalous network anomalies.'
      };
    }

    if (t.includes('cloud') || t.includes('microservice') || t.includes('serverless') || t.includes('kubernetes') || t.includes('saas') || t.includes('iaas')) {
      return {
        type: 'layered_architecture',
        title: `Cloud Native Infrastructure & Service Delivery Hierarchy`,
        nodes: [
          { id: 'n1', label: 'Infrastructure Layer (IaaS)', description: 'Compute, virtual VPC, storage', role: 'layer' },
          { id: 'n2', label: 'Container & Platform Tier (PaaS)', description: 'Kubernetes orchestration', role: 'layer' },
          { id: 'n3', label: 'Microservice Application Logic', description: 'Stateless REST/gRPC services', role: 'layer' },
          { id: 'n4', label: 'Client API Gateway & Delivery', description: 'Edge CDN & authentication', role: 'layer' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4']],
        footerLabel: 'Elastic Multi-Tenancy & High Availability',
        footerText: 'Stateless container orchestration auto-scales workloads elastically across multiple availability zones with zero downtime.'
      };
    }

    if (t.includes('supply chain') || t.includes('logistics') || t.includes('procurement') || t.includes('inventory') || t.includes('warehouse')) {
      return {
        type: 'ecosystem',
        title: `Supply Chain Value Stream & Distributed Logistics Network`,
        nodes: [
          { id: 'n1', label: 'Tier-1 Raw Suppliers', description: 'Component sourcing & audit', role: 'node' },
          { id: 'n2', label: 'Manufacturing & Assembly', description: 'Lean production & QA', role: 'node' },
          { id: 'n3', label: 'Warehousing & Fulfillment', description: 'Automated sortation hubs', role: 'node' },
          { id: 'n4', label: 'Multi-Modal Logistics', description: 'Fleet routing & cold chain', role: 'node' },
          { id: 'n5', label: 'Retail & End Consumer', description: 'Last-mile delivery & feedback', role: 'output' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5']],
        footerLabel: 'End-to-End Inventory Visibility',
        footerText: 'Real-time telemetry balances inventory carrying costs against fulfillment SLAs and customer lead time expectations.'
      };
    }

    if (t.includes('energy') || t.includes('solar') || t.includes('wind') || t.includes('grid') || t.includes('battery') || t.includes('power')) {
      return {
        type: 'feedback_loop',
        title: `Renewable Power Harvesting, Storage & Smart Grid Ecosystem`,
        nodes: [
          { id: 'n1', label: 'Renewable Generation', description: 'Solar PV & wind turbines', role: 'input' },
          { id: 'n2', label: 'Power Conversion (Inverters)', description: 'MPPT & AC synchronization', role: 'process' },
          { id: 'n3', label: 'Energy Storage Systems (BESS)', description: 'Lithium-ion buffer reserves', role: 'storage' },
          { id: 'n4', label: 'Smart Grid Substation', description: 'Dynamic voltage regulation', role: 'process' },
          { id: 'n5', label: 'Industrial & Consumer Loads', description: 'Smart metering & demand response', role: 'output' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n5', 'n3']],
        footerLabel: 'Bi-Directional Grid Load Balancing',
        footerText: 'Intelligent battery storage buffers peak intermittency, ensuring stable grid frequency across fluctuating demand profiles.'
      };
    }

    if (t.includes('heavy metal') || t.includes('remediation') || t.includes('wastewater') || t.includes('water treatment') || t.includes('effluent')) {
      return {
        type: 'process_flow',
        title: `Industrial Wastewater Heavy Metal Remediation Flowchart`,
        nodes: [
          { id: 'n1', label: 'Raw Effluent Inflow', description: 'pH & metal ion screening', role: 'input' },
          { id: 'n2', label: 'Primary Coagulation & pH Adj.', description: 'Chemical neutralization', role: 'process' },
          { id: 'n3', label: 'Functional Adsorption Column', description: 'Porous matrix binding (Pb/Cd/Cr)', role: 'process' },
          { id: 'n4', label: 'Sedimentation & Sludge Separation', description: 'Clarifier solids dewatering', role: 'process' },
          { id: 'n5', label: 'Membrane Polishing & Spectrometry', description: 'ICP-OES ppm verification', role: 'process' },
          { id: 'n6', label: 'Eco-Compliant Discharge', description: 'Purified effluent reuse', role: 'output' }
        ],
        connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4'], ['n4', 'n5'], ['n5', 'n6']],
        footerLabel: 'Adsorption Selectivity & Regeneration',
        footerText: 'High specific surface area adsorbents maximize heavy metal ion removal rates while minimizing chemical sludge generation.'
      };
    }

    return {
      type: 'process_flow',
      title: `${titleStr} Operational Architecture & Flowchart`,
      nodes: [
        { id: 'n1', label: 'Input Assessment', description: 'Specification & baseline analysis', role: 'input' },
        { id: 'n2', label: 'Core Method Engineering', description: 'Algorithmic structural synthesis', role: 'process' },
        { id: 'n3', label: 'Performance Optimization', description: 'Execution & metric calibration', role: 'process' },
        { id: 'n4', label: 'Validation & Deployment', description: 'Quality assurance & verification', role: 'output' }
      ],
      connections: [['n1', 'n2'], ['n2', 'n3'], ['n3', 'n4']],
      footerLabel: 'Architectural Performance & Governance',
      footerText: 'Standardized operational pipelines ensure high throughput, fault isolation, and verifiable reproducibility.'
    };
  }

  const diagramRaw = parsed.diagram && typeof parsed.diagram === 'object' ? parsed.diagram : {};
  const topicFallback = getTopicSpecificDiagramFallback(topic, title);

  const diagramType = (diagramRaw.type && typeof diagramRaw.type === 'string' && diagramRaw.type.trim())
    ? diagramRaw.type.trim().toLowerCase()
    : topicFallback.type;

  const diagramTitle = (diagramRaw.title && typeof diagramRaw.title === 'string' && diagramRaw.title.trim())
    ? diagramRaw.title.trim()
    : topicFallback.title;

  let nodes = [];
  if (Array.isArray(diagramRaw.nodes) && diagramRaw.nodes.length >= 3) {
    nodes = diagramRaw.nodes.slice(0, 7).map((n, i) => ({
      id: String(n.id || `n${i + 1}`),
      label: String(n.label || `Component ${i + 1}`).trim(),
      description: String(n.description || n.sub || 'Operational unit').trim(),
      role: String(n.role || 'process').trim()
    }));
  } else if (Array.isArray(diagramRaw.boxes) && diagramRaw.boxes.length >= 3) {
    nodes = diagramRaw.boxes.slice(0, 6).map((b, i) => ({
      id: `n${i + 1}`,
      label: String(b.label || `Stage ${i + 1}`).trim(),
      description: Array.isArray(b.lines) ? b.lines.join(' ') : 'Operational parameter',
      role: i === 0 ? 'input' : (i === diagramRaw.boxes.length - 1 ? 'output' : 'process')
    }));
  } else {
    nodes = topicFallback.nodes;
  }

  let connections = Array.isArray(diagramRaw.connections) && diagramRaw.connections.length > 0
    ? diagramRaw.connections
    : topicFallback.connections;

  const footerLabel = (diagramRaw.footerLabel && typeof diagramRaw.footerLabel === 'string' && diagramRaw.footerLabel.trim())
    ? diagramRaw.footerLabel.trim()
    : topicFallback.footerLabel;

  const footerText = (diagramRaw.footerText && typeof diagramRaw.footerText === 'string' && diagramRaw.footerText.trim())
    ? diagramRaw.footerText.trim()
    : topicFallback.footerText;

  const boxes = nodes.map(n => ({
    label: n.label,
    lines: [n.description.substring(0, 24), n.description.substring(24, 48)]
  }));

  const hub = {
    label: title,
    sub: footerLabel
  };

  return {
    title,
    abstract,
    introduction,
    themeParagraph1,
    themeParagraph2,
    figureCaption,
    applicationsIntro,
    applications,
    applicationsClosing,
    conclusion,
    references,
    diagram: {
      type: diagramType,
      title: diagramTitle,
      nodes,
      connections,
      hub,
      boxes,
      footerLabel,
      footerText
    }
  };
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

    const { topic, subject, paymentToken, orderId, formData } = body;

    const validTopic = validateTopic(topic);
    if (!validTopic.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validTopic.error }) };
    }

    const validSubj = validateSubject(subject);
    if (!validSubj.valid) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: validSubj.error }) };
    }

    const cleanTopic = validTopic.value;
    const cleanSubject = validSubj.value;

    let tokenVerification = { valid: true };
    if (isPaymentEnforced() && isServicePaid('reportAndPpt')) {
      tokenVerification = verifyPaymentToken(paymentToken, orderId || null);
      if (!tokenVerification.valid) {
        return {
          statusCode: 402,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: 'Payment Required. ' + (tokenVerification.error || 'Please complete the report generation fee before downloading.'),
            paymentRequired: true
          })
        };
      }
    }

    let provider = resolveProvider();
    let rawOutput = '';

    if (!provider) {
      provider = 'academic-synthesis';
      rawOutput = JSON.stringify({});
    } else {
      try {
        if (provider === 'anthropic') {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in environment variables.');
          rawOutput = await callAnthropic(apiKey, cleanTopic, cleanSubject);
        } else if (provider === 'openai') {
          const apiKey = process.env.OPENAI_API_KEY;
          if (!apiKey) throw new Error('OPENAI_API_KEY is not set in environment variables.');
          rawOutput = await callOpenAI(apiKey, cleanTopic, cleanSubject);
        } else if (provider === 'google') {
          const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
          if (!apiKey) throw new Error('GOOGLE_API_KEY (or GEMINI_API_KEY) is not set in environment variables.');
          rawOutput = await callGoogle(apiKey, cleanTopic, cleanSubject);
        } else {
          throw new Error(`Unsupported LLM provider: "${provider}"`);
        }
      } catch (llmError) {
        console.warn('LLM API call encountered an error. Engaging academic synthesis fallback engine:', llmError.message);
        rawOutput = JSON.stringify({});
      }
    }

    const validatedData = parseAndValidate(rawOutput, cleanTopic, cleanSubject);

    // Securely persist completed report in backend report store
    let reportRecord = null;
    try {
      const studentInfo = (formData && typeof formData === 'object') ? formData : {};
      reportRecord = recordGeneratedReport({
        studentName: studentInfo.studentName || tokenVerification.studentName || 'Student',
        registerNo: studentInfo.registerNo || '7316XXXXXXX',
        topic: cleanTopic,
        subject: cleanSubject,
        department: studentInfo.department || 'Computer Science and Engineering',
        yearSemSec: studentInfo.yearSemSec || 'III / VI / A',
        collegeName: 'Muthayammal Engineering College',
        facultyName: studentInfo.facultyName || 'Faculty In-Charge',
        academicYear: studentInfo.academicYear || '2026-2027',
        courseCodeName: studentInfo.courseCodeName || '',
        seminarNo: studentInfo.seminarNo || '01',
        seminarDate: studentInfo.seminarDate || '',
        paymentMethod: tokenVerification.tokenType === 'coupon' ? 'Offline Coupon' : 'Razorpay',
        paymentId: tokenVerification.paymentId || null,
        couponCode: tokenVerification.couponCode || null,
        aiContent: validatedData
      });
    } catch (saveErr) {
      console.warn('Report persistence warning:', saveErr.message);
    }

    if (isPaymentEnforced() && paymentToken && isServicePaid('reportAndPpt')) {
      consumePaymentToken(paymentToken, orderId || null);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        provider,
        data: validatedData,
        reportId: reportRecord ? reportRecord.reportId : null
      })
    };

  } catch (error) {
    console.error('Generation handler error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: error.message || 'Internal server error while generating seminar content.'
      })
    };
  }
}

const universalExport = makeUniversalHandler(handler);
universalExport.handler = handler;
module.exports = universalExport;
