/**
 * Dynamic Topic-Specific Diagram Generation Engine
 * Supports 14 academic and engineering architectural layout paradigms:
 * 1. Process Flow / Pipeline ('process_flow', 'process', 'pipeline')
 * 2. Layered Architecture Stack ('layered_architecture', 'layers')
 * 3. Distributed Network / Consensus Mesh ('network', 'blockchain')
 * 4. Cause-Effect / Threat Mitigation Matrix ('cause_effect', 'cybersecurity')
 * 5. Value Stream & Logistics Ecosystem ('ecosystem', 'supply_chain')
 * 6. Feedback Loop / Grid Balancing ('feedback_loop', 'energy')
 * 7. Input-Process-Output Framework ('input_process_output', 'ipo')
 * 8. Closed-Loop Lifecycle ('cycle')
 * 9. Hub & Spoke Core Coordinator ('hub_spoke', 'hub')
 * 10. Hierarchical Taxonomy Tree ('hierarchical_tree', 'tree')
 * 11. Comparative Architecture Matrix ('comparison')
 * 12. Generational Evolution Timeline ('timeline')
 */

// 5 Academic & Technical Color Presets
const DIAGRAM_STYLE_PRESETS = [
  // Style 0: Classic Navy / Ocean
  {
    name: 'classic',
    bannerBg: '#1e293b', bannerText: '#ffffff',
    hubFill: '#f1f5f9', hubStroke: '#475569', hubTextMain: '#0f172a', hubTextSub: '#475569',
    footerFill: '#f8fafc', footerStroke: '#cbd5e1', footerTextMain: '#0f172a', footerTextSub: '#475569',
    connectorColor: '#64748b',
    cards: [
      { headerBg: '#e0f2fe', headerText: '#0369a1', border: '#7dd3fc', dot: '#0284c7' },
      { headerBg: '#dcfce7', headerText: '#15803d', border: '#86efac', dot: '#16a34a' },
      { headerBg: '#fef3c7', headerText: '#b45309', border: '#fcd34d', dot: '#d97706' },
      { headerBg: '#ffe4e6', headerText: '#be123c', border: '#fda4af', dot: '#e11d48' },
      { headerBg: '#ede9fe', headerText: '#6d28d9', border: '#c4b5fd', dot: '#7c3aed' },
      { headerBg: '#f1f5f9', headerText: '#334155', border: '#cbd5e1', dot: '#475569' }
    ]
  },
  // Style 1: Modern Teal / Forest
  {
    name: 'modern',
    bannerBg: '#134e4a', bannerText: '#f0fdfa',
    hubFill: '#f0fdfa', hubStroke: '#0d9488', hubTextMain: '#134e4a', hubTextSub: '#0f766e',
    footerFill: '#fff7ed', footerStroke: '#fb923c', footerTextMain: '#1c1917', footerTextSub: '#57534e',
    connectorColor: '#0d9488',
    cards: [
      { headerBg: '#ccfbf1', headerText: '#0f766e', border: '#5eead4', dot: '#14b8a6' },
      { headerBg: '#fed7aa', headerText: '#c2410c', border: '#fb923c', dot: '#ea580c' },
      { headerBg: '#ddd6fe', headerText: '#5b21b6', border: '#a78bfa', dot: '#7c3aed' },
      { headerBg: '#d1fae5', headerText: '#065f46', border: '#6ee7b7', dot: '#10b981' },
      { headerBg: '#fce7f3', headerText: '#9d174d', border: '#f9a8d4', dot: '#db2777' },
      { headerBg: '#e0f2fe', headerText: '#0369a1', border: '#7dd3fc', dot: '#0284c7' }
    ]
  },
  // Style 2: Slate Professional
  {
    name: 'professional',
    bannerBg: '#0f172a', bannerText: '#f8fafc',
    hubFill: '#f8fafc', hubStroke: '#334155', hubTextMain: '#0f172a', hubTextSub: '#64748b',
    footerFill: '#f1f5f9', footerStroke: '#94a3b8', footerTextMain: '#1e293b', footerTextSub: '#475569',
    connectorColor: '#475569',
    cards: [
      { headerBg: '#bfdbfe', headerText: '#1d4ed8', border: '#93c5fd', dot: '#2563eb' },
      { headerBg: '#bbf7d0', headerText: '#15803d', border: '#86efac', dot: '#22c55e' },
      { headerBg: '#fef08a', headerText: '#a16207', border: '#fde047', dot: '#ca8a04' },
      { headerBg: '#fecaca', headerText: '#b91c1c', border: '#fca5a5', dot: '#ef4444' },
      { headerBg: '#e9d5ff', headerText: '#7e22ce', border: '#d8b4fe', dot: '#9333ea' },
      { headerBg: '#fed7aa', headerText: '#c2410c', border: '#fb923c', dot: '#ea580c' }
    ]
  },
  // Style 3: Academic Crimson
  {
    name: 'academic',
    bannerBg: '#7f1d1d', bannerText: '#fef2f2',
    hubFill: '#fff5f5', hubStroke: '#ef4444', hubTextMain: '#7f1d1d', hubTextSub: '#b91c1c',
    footerFill: '#fff7f7', footerStroke: '#fca5a5', footerTextMain: '#450a0a', footerTextSub: '#991b1b',
    connectorColor: '#f87171',
    cards: [
      { headerBg: '#fef2f2', headerText: '#9b1c1c', border: '#fca5a5', dot: '#dc2626' },
      { headerBg: '#fffbeb', headerText: '#92400e', border: '#fcd34d', dot: '#d97706' },
      { headerBg: '#ecfdf5', headerText: '#065f46', border: '#6ee7b7', dot: '#10b981' },
      { headerBg: '#eff6ff', headerText: '#1e40af', border: '#93c5fd', dot: '#3b82f6' },
      { headerBg: '#f5f3ff', headerText: '#4c1d95', border: '#c4b5fd', dot: '#7c3aed' },
      { headerBg: '#fef3c7', headerText: '#b45309', border: '#fcd34d', dot: '#d97706' }
    ]
  },
  // Style 4: Tech Indigo / Cyan
  {
    name: 'tech',
    bannerBg: '#312e81', bannerText: '#e0e7ff',
    hubFill: '#eef2ff', hubStroke: '#6366f1', hubTextMain: '#1e1b4b', hubTextSub: '#4338ca',
    footerFill: '#f0f9ff', footerStroke: '#38bdf8', footerTextMain: '#0c4a6e', footerTextSub: '#0369a1',
    connectorColor: '#6366f1',
    cards: [
      { headerBg: '#e0e7ff', headerText: '#3730a3', border: '#a5b4fc', dot: '#4f46e5' },
      { headerBg: '#cffafe', headerText: '#155e75', border: '#67e8f9', dot: '#06b6d4' },
      { headerBg: '#d1fae5', headerText: '#065f46', border: '#6ee7b7', dot: '#10b981' },
      { headerBg: '#fce7f3', headerText: '#831843', border: '#f9a8d4', dot: '#ec4899' },
      { headerBg: '#fef9c3', headerText: '#713f12', border: '#fde68a', dot: '#f59e0b' },
      { headerBg: '#bfdbfe', headerText: '#1d4ed8', border: '#93c5fd', dot: '#2563eb' }
    ]
  }
];

function truncateText(str, maxLen = 30) {
  if (!str) return '';
  const s = String(str).trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2026]/g, '...');
  return s.length > maxLen ? s.substring(0, maxLen - 3) + '...' : s;
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function pickStylePreset(topic, styleIndex = -1) {
  if (styleIndex >= 0 && styleIndex < DIAGRAM_STYLE_PRESETS.length) {
    return DIAGRAM_STYLE_PRESETS[styleIndex];
  }
  if (!topic) return DIAGRAM_STYLE_PRESETS[0];
  let hash = 0;
  for (let i = 0; i < topic.length; i++) {
    hash = ((hash << 5) - hash) + topic.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DIAGRAM_STYLE_PRESETS.length;
  return DIAGRAM_STYLE_PRESETS[idx];
}

/**
 * 50+ Pattern Automatic Topic Analyzer & Layout Resolver
 */
function resolveLayoutType(diagramData, topic = '') {
  if (diagramData && diagramData.type) {
    const t = diagramData.type.toLowerCase().trim();
    if (['process_flow', 'process', 'pipeline'].includes(t)) return 'process_flow';
    if (['layered_architecture', 'layers', 'stack'].includes(t)) return 'layered_architecture';
    if (['network', 'blockchain', 'mesh', 'p2p'].includes(t)) return 'network';
    if (['cause_effect', 'cybersecurity', 'security', 'threat'].includes(t)) return 'cause_effect';
    if (['ecosystem', 'supply_chain', 'logistics', 'value_stream'].includes(t)) return 'ecosystem';
    if (['feedback_loop', 'energy', 'grid', 'control_system'].includes(t)) return 'feedback_loop';
    if (['input_process_output', 'ipo'].includes(t)) return 'input_process_output';
    if (['cycle', 'lifecycle', 'circular'].includes(t)) return 'cycle';
    if (['hub_spoke', 'hub', 'coordinator'].includes(t)) return 'hub_spoke';
    if (['hierarchical_tree', 'tree', 'taxonomy'].includes(t)) return 'hierarchical_tree';
    if (['comparison', 'matrix', 'tradeoff'].includes(t)) return 'comparison';
    if (['timeline', 'roadmap', 'evolution'].includes(t)) return 'timeline';
  }

  const str = (topic || '').toLowerCase();

  // 1. Artificial Intelligence / Machine Learning / Deep Learning
  if (str.includes('artificial intelligence') || str.includes('machine learning') || str.includes('deep learning') || 
      str.includes('neural') || str.includes('nlp') || str.includes('computer vision') || str.includes('transformer') ||
      str.includes('llm') || str.includes('reinforcement learning') || str.includes('ai ')) {
    return 'process_flow';
  }

  // 2. Blockchain & Cryptography
  if (str.includes('blockchain') || str.includes('crypto') || str.includes('distributed ledger') || 
      str.includes('consensus') || str.includes('smart contract') || str.includes('ethereum') || str.includes('bitcoin') || str.includes('p2p')) {
    return 'network';
  }

  // 3. IoT & Embedded Systems
  if (str.includes('iot') || str.includes('internet of things') || str.includes('sensor') || 
      str.includes('actuator') || str.includes('smart city') || str.includes('embedded') || str.includes('wearable')) {
    return 'layered_architecture';
  }

  // 4. Cybersecurity & Defense
  if (str.includes('security') || str.includes('cyber') || str.includes('threat') || 
      str.includes('attack') || str.includes('malware') || str.includes('zero trust') || str.includes('firewall') || str.includes('intrusion')) {
    return 'cause_effect';
  }

  // 5. Cloud Computing & Microservices
  if (str.includes('cloud') || str.includes('microservice') || str.includes('serverless') || 
      str.includes('kubernetes') || str.includes('docker') || str.includes('saas') || str.includes('paas') || str.includes('iaas') || str.includes('virtualization')) {
    return 'layered_architecture';
  }

  // 6. Supply Chain & Logistics
  if (str.includes('supply chain') || str.includes('logistics') || str.includes('procurement') || 
      str.includes('inventory') || str.includes('warehouse') || str.includes('distribution') || str.includes('freight')) {
    return 'ecosystem';
  }

  // 7. Renewable Energy & Smart Grid
  if (str.includes('energy') || str.includes('solar') || str.includes('wind') || 
      str.includes('grid') || str.includes('battery') || str.includes('power') || str.includes('photovoltaic') || str.includes('microgrid')) {
    return 'feedback_loop';
  }

  // 8. Environmental / Chemical / Wastewater Remediation
  if (str.includes('heavy metal') || str.includes('remediation') || str.includes('wastewater') || 
      str.includes('water treatment') || str.includes('effluent') || str.includes('adsorption') || str.includes('catalyst')) {
    return 'process_flow';
  }

  // 9. Lifecycles & Methodologies
  if (str.includes('lifecycle') || str.includes('agile') || str.includes('scrum') || str.includes('devops') || str.includes('continuous')) {
    return 'cycle';
  }

  // 10. Historical Roadmaps
  if (str.includes('timeline') || str.includes('evolution') || str.includes('history') || str.includes('roadmap') || str.includes('generations')) {
    return 'timeline';
  }

  // 11. Comparative Studies
  if (str.includes('vs') || str.includes('comparison') || str.includes('comparative') || str.includes('trade-off') || str.includes('evaluation')) {
    return 'comparison';
  }

  // Default fallback
  return 'process_flow';
}

function extractNodesFromData(diagramData, fallbackNodes = []) {
  if (diagramData && Array.isArray(diagramData.nodes) && diagramData.nodes.length >= 3) {
    return diagramData.nodes.map(n => ({
      label: n.label || 'Component',
      sub: n.description || n.sub || 'Operational unit',
      role: n.role || 'process'
    }));
  }
  if (diagramData && Array.isArray(diagramData.boxes) && diagramData.boxes.length >= 3) {
    return diagramData.boxes.map(b => ({
      label: b.label || 'Stage',
      sub: Array.isArray(b.lines) ? b.lines.join(' ') : 'Operational parameter',
      role: 'process'
    }));
  }
  return fallbackNodes;
}

/**
 * 1. PROCESS FLOW / PIPELINE RENDERER (Sequential Chevrons with Verified Stages)
 */
function renderProcessFlowDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `End-to-End ${topic || 'Process'} Pipeline`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Data Ingestion', sub: 'Capture & stream inputs' },
    { label: 'Feature Extraction', sub: 'Normalize & vectorize' },
    { label: 'Model Execution', sub: 'Algorithmic computation' },
    { label: 'Validation & Evaluation', sub: 'Quality verification' },
    { label: 'Inference Delivery', sub: 'Serve end outputs' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 6);
  const count = nodes.length;

  const marginX = 18;
  const arrowGap = 14;
  const totalGaps = (count - 1) * arrowGap;
  const availableWidth = width - (marginX * 2) - totalGaps;
  const boxWidth = Math.floor(availableWidth / count);
  const boxHeight = 150;
  const boxY = 80;

  let boxesSvg = '';

  nodes.forEach((node, i) => {
    const x = marginX + i * (boxWidth + arrowGap);
    const color = style.cards[i % style.cards.length];
    const stepNum = `0${i + 1}`;
    const label = escapeXml(truncateText(node.label, 17));
    const sub = escapeXml(truncateText(node.sub, 28));

    boxesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="32" rx="10" fill="${color.headerBg}" />
        <rect x="0" y="20" width="${boxWidth}" height="12" fill="${color.headerBg}" />
        <line x1="0" y1="32" x2="${boxWidth}" y2="32" stroke="${color.border}" stroke-width="1" />
        
        <circle cx="16" cy="16" r="10" fill="${color.dot}" />
        <text x="16" y="20" font-family="Arial, sans-serif" font-size="9.5" font-weight="bold" fill="#ffffff" text-anchor="middle">${stepNum}</text>
        
        <text x="${boxWidth / 2 + 8}" y="20" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="${color.headerText}" text-anchor="middle">${label}</text>
        
        <text x="${boxWidth / 2}" y="65" font-family="Arial, sans-serif" font-size="9" fill="#334155" text-anchor="middle">${escapeXml(truncateText(sub.split(' ').slice(0, 3).join(' '), 20))}</text>
        <text x="${boxWidth / 2}" y="82" font-family="Arial, sans-serif" font-size="8.5" fill="#64748b" text-anchor="middle">${escapeXml(truncateText(sub.split(' ').slice(3).join(' ') || 'Operational Stage', 20))}</text>
        
        <rect x="8" y="115" width="${boxWidth - 16}" height="20" rx="5" fill="${color.headerBg}" opacity="0.7" />
        <text x="${boxWidth / 2}" y="129" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Stage ${stepNum} Verified</text>
      </g>
    `;

    if (i < count - 1) {
      const arrowX = x + boxWidth + 2;
      const arrowY = boxY + boxHeight / 2;
      boxesSvg += `
        <g transform="translate(${arrowX}, ${arrowY})">
          <line x1="0" y1="0" x2="8" y2="0" stroke="${style.connectorColor}" stroke-width="2.5" />
          <polygon points="8,-4 13,0 8,4" fill="${style.connectorColor}" />
        </g>
      `;
    }
  });

  const footerLabel = escapeXml(truncateText((diagramData && diagramData.footerLabel) || 'Sequential Operational Control', 40));
  const footerText = escapeXml(truncateText((diagramData && diagramData.footerText) || 'Each stage validates throughput metrics before delegating state to downstream subscribers.', 95));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${boxesSvg}
    <g transform="translate(40, 265)">
      <rect x="0" y="0" width="${width - 80}" height="85" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 80) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">${footerLabel}</text>
      <text x="${(width - 80) / 2}" y="50" font-family="Arial, sans-serif" font-size="9.5" fill="${style.footerTextSub}" text-anchor="middle">${footerText}</text>
      <text x="${(width - 80) / 2}" y="68" font-family="Arial, sans-serif" font-size="8.5" font-style="italic" fill="${style.footerTextSub}" text-anchor="middle">Guarantees deterministic end-to-end latency and verifiable execution integrity</text>
    </g>
  `;
}

/**
 * 2. LAYERED ARCHITECTURE STACK RENDERER (Multi-Tier Isolation Framework)
 */
function renderLayersDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `${topic || 'System'} Layered Architecture Framework`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Presentation & Interface Tier', sub: 'Client Dashboards, Visual Interfaces & API Endpoints' },
    { label: 'Application & Core Logic Tier', sub: 'Domain Services, Rule Engines & Processing Nodes' },
    { label: 'Integration & Middleware Tier', sub: 'Message Brokers, ETL Pipelines & Event Streams' },
    { label: 'Storage & Persistence Tier', sub: 'Relational Schemas, Columnar Repositories & Distributed Marts' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 5);
  const count = nodes.length;

  const startY = 70;
  const layerHeight = Math.floor(210 / count) - 8;
  const gap = 8;
  let layersSvg = '';

  nodes.forEach((layer, i) => {
    const y = startY + i * (layerHeight + gap);
    const color = style.cards[i % style.cards.length];
    const layerNum = `L${count - i}`;
    const label = escapeXml(truncateText(layer.label, 28));
    const sub = escapeXml(truncateText(layer.sub, 55));

    layersSvg += `
      <g transform="translate(24, ${y})">
        <rect x="0" y="0" width="${width - 48}" height="${layerHeight}" rx="8" fill="#ffffff" stroke="${color.border}" stroke-width="1.8" />
        <rect x="0" y="0" width="180" height="${layerHeight}" rx="8" fill="${color.headerBg}" />
        <rect x="170" y="0" width="10" height="${layerHeight}" fill="${color.headerBg}" />
        <line x1="180" y1="0" x2="180" y2="${layerHeight}" stroke="${color.border}" stroke-width="1.2" />
        
        <circle cx="20" cy="${layerHeight / 2}" r="10" fill="${color.dot}" />
        <text x="20" y="${layerHeight / 2 + 4}" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">${layerNum}</text>
        
        <text x="100" y="${layerHeight / 2 + 4}" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">${label}</text>
        
        <text x="195" y="${layerHeight / 2 + 4}" font-family="Arial, sans-serif" font-size="9.5" fill="#334155" text-anchor="start">${sub}</text>
      </g>
    `;
  });

  const footerLabel = escapeXml(truncateText((diagramData && diagramData.footerLabel) || 'Modular Tier Isolation Principle', 45));
  const footerText = escapeXml(truncateText((diagramData && diagramData.footerText) || 'Strict separation between tiers minimizes component coupling while facilitating elastic horizontal scalability.', 100));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${layersSvg}
    <g transform="translate(30, 290)">
      <rect x="0" y="0" width="${width - 60}" height="65" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="24" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">${footerLabel}</text>
      <text x="${(width - 60) / 2}" y="44" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">${footerText}</text>
    </g>
  `;
}

/**
 * 3. DISTRIBUTED NETWORK / BLOCKCHAIN CONSENSUS MESH RENDERER
 */
function renderNetworkDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Distributed Peer-to-Peer Consensus Mesh`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Client Tx', sub: 'Signed payload' },
    { label: 'P2P Gossip', sub: 'Peer broadcast' },
    { label: 'Validation', sub: 'Rule verification' },
    { label: 'Consensus', sub: 'BFT / PoS engine' },
    { label: 'Block Chaining', sub: 'Merkle hash tree' },
    { label: 'Ledger Commit', sub: 'Immutable state' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 6);
  const count = nodes.length;

  const marginX = 20;
  const colGap = 12;
  const totalGaps = (count - 1) * colGap;
  const boxWidth = Math.floor((width - (marginX * 2) - totalGaps) / count);
  const boxHeight = 135;
  const boxY = 90;

  let nodesSvg = '';

  nodes.forEach((n, i) => {
    const x = marginX + i * (boxWidth + colGap);
    const color = style.cards[i % style.cards.length];
    const label = escapeXml(truncateText(n.label, 15));
    const sub = escapeXml(truncateText(n.sub, 22));

    nodesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="28" rx="10" fill="${color.headerBg}" />
        <rect x="0" y="16" width="${boxWidth}" height="12" fill="${color.headerBg}" />
        <line x1="0" y1="28" x2="${boxWidth}" y2="28" stroke="${color.border}" stroke-width="1" />
        
        <text x="${boxWidth / 2}" y="19" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Node 0${i + 1}</text>
        <text x="${boxWidth / 2}" y="52" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">${label}</text>
        <text x="${boxWidth / 2}" y="70" font-family="Arial, sans-serif" font-size="8" fill="#475569" text-anchor="middle">${sub}</text>
        
        <rect x="6" y="95" width="${boxWidth - 12}" height="22" rx="4" fill="${color.headerBg}" opacity="0.8" />
        <text x="${boxWidth / 2}" y="110" font-family="Courier, monospace" font-size="7.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">#0x${(i + 1) * 23}FA..7</text>
      </g>
    `;

    if (i < count - 1) {
      const nextX = x + boxWidth;
      const midY = boxY + boxHeight / 2;
      nodesSvg += `
        <line x1="${nextX}" y1="${midY - 8}" x2="${nextX + colGap}" y2="${midY - 8}" stroke="${style.connectorColor}" stroke-width="1.8" stroke-dasharray="2 2" />
        <line x1="${nextX + colGap}" y1="${midY + 8}" x2="${nextX}" y2="${midY + 8}" stroke="${style.connectorColor}" stroke-width="1.8" stroke-dasharray="2 2" />
        <polygon points="${nextX + colGap},${midY - 8} ${nextX + colGap - 4},${midY - 11} ${nextX + colGap - 4},${midY - 5}" fill="${style.connectorColor}" />
        <polygon points="${nextX},${midY + 8} ${nextX + 4},${midY + 5} ${nextX + 4},${midY + 11}" fill="${style.connectorColor}" />
      `;
    }
  });

  const footerLabel = escapeXml(truncateText((diagramData && diagramData.footerLabel) || 'Byzantine Fault Tolerance & Cryptographic Immutability', 55));
  const footerText = escapeXml(truncateText((diagramData && diagramData.footerText) || 'Decentralized peer consensus ensures data integrity without centralized authorities.', 100));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${nodesSvg}
    <g transform="translate(30, 260)">
      <rect x="0" y="0" width="${width - 60}" height="90" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">${footerLabel}</text>
      <text x="${(width - 60) / 2}" y="50" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">${footerText}</text>
      <text x="${(width - 60) / 2}" y="70" font-family="Arial, sans-serif" font-size="8.5" font-style="italic" fill="${style.footerTextSub}" text-anchor="middle">SHA-256 Merkle root linkage guarantees tamper-evident historical auditability</text>
    </g>
  `;
}

/**
 * 4. CAUSE-EFFECT / CYBERSECURITY DEFENSE MATRIX RENDERER
 */
function renderCauseEffectDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Defense-in-Depth & Threat Mitigation Matrix`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Attack Vector Inflow', sub: 'Phishing, DDoS, malware injection' },
    { label: 'Zero-Trust Gateway', sub: 'MFA & deep packet inspection' },
    { label: 'AI Anomaly Detection', sub: 'Behavioral heuristic analysis' },
    { label: 'Automated Containment', sub: 'Micro-segmentation firewall' },
    { label: 'Forensic Audit & Recovery', sub: 'Immutable incident ledger' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 5);
  const count = nodes.length;

  const marginX = 24;
  const gap = 14;
  const boxWidth = Math.floor((width - (marginX * 2) - ((count - 1) * gap)) / count);
  const boxHeight = 145;
  const boxY = 85;

  let nodesSvg = '';

  nodes.forEach((n, i) => {
    const x = marginX + i * (boxWidth + gap);
    const color = style.cards[i % style.cards.length];
    const label = escapeXml(truncateText(n.label, 16));
    const sub = escapeXml(truncateText(n.sub, 24));

    nodesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="32" rx="10" fill="${color.headerBg}" />
        <rect x="0" y="20" width="${boxWidth}" height="12" fill="${color.headerBg}" />
        <line x1="0" y1="32" x2="${boxWidth}" y2="32" stroke="${color.border}" stroke-width="1" />
        
        <circle cx="16" cy="16" r="10" fill="${color.dot}" />
        <text x="16" y="20" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#ffffff" text-anchor="middle">T${i + 1}</text>
        
        <text x="${boxWidth / 2 + 8}" y="20" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">${label}</text>
        
        <text x="${boxWidth / 2}" y="65" font-family="Arial, sans-serif" font-size="9" fill="#334155" text-anchor="middle">${escapeXml(truncateText(sub.split(',')[0] || sub, 18))}</text>
        <text x="${boxWidth / 2}" y="85" font-family="Arial, sans-serif" font-size="8.5" fill="#64748b" text-anchor="middle">${escapeXml(truncateText(sub.split(',')[1] || 'Security Rule', 18))}</text>
        
        <rect x="10" y="110" width="${boxWidth - 20}" height="22" rx="4" fill="${color.headerBg}" />
        <text x="${boxWidth / 2}" y="125" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Rule Level ${i + 1}</text>
      </g>
    `;

    if (i < count - 1) {
      const arrowX = x + boxWidth + 2;
      const arrowY = boxY + boxHeight / 2;
      nodesSvg += `
        <g transform="translate(${arrowX}, ${arrowY})">
          <line x1="0" y1="0" x2="8" y2="0" stroke="${style.connectorColor}" stroke-width="2.5" />
          <polygon points="8,-4 13,0 8,4" fill="${style.connectorColor}" />
        </g>
      `;
    }
  });

  const footerLabel = escapeXml(truncateText((diagramData && diagramData.footerLabel) || 'Zero-Trust Threat Isolation Matrix', 50));
  const footerText = escapeXml(truncateText((diagramData && diagramData.footerText) || 'Continuous telemetry analytics automatically isolates lateral threat movement across endpoints.', 100));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${nodesSvg}
    <g transform="translate(30, 260)">
      <rect x="0" y="0" width="${width - 60}" height="90" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">${footerLabel}</text>
      <text x="${(width - 60) / 2}" y="50" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">${footerText}</text>
      <text x="${(width - 60) / 2}" y="70" font-family="Arial, sans-serif" font-size="8.5" font-style="italic" fill="${style.footerTextSub}" text-anchor="middle">Real-time heuristics isolate perimeter breaches in sub-second execution windows</text>
    </g>
  `;
}

/**
 * 5. VALUE STREAM & LOGISTICS ECOSYSTEM RENDERER
 */
function renderEcosystemDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Supply Chain Value Stream & Distributed Logistics`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Tier-1 Suppliers', sub: 'Material procurement' },
    { label: 'Manufacturing Hub', sub: 'Lean production & QA' },
    { label: 'Warehousing & Sort', sub: 'Automated fulfillment' },
    { label: 'Multi-Modal Transit', sub: 'Fleet route optimization' },
    { label: 'End Consumer', sub: 'Last-mile delivery' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 5);
  const count = nodes.length;

  const marginX = 24;
  const gap = 12;
  const boxWidth = Math.floor((width - (marginX * 2) - ((count - 1) * gap)) / count);
  const boxHeight = 135;
  const boxY = 90;

  let nodesSvg = '';

  nodes.forEach((n, i) => {
    const x = marginX + i * (boxWidth + gap);
    const color = style.cards[i % style.cards.length];
    const label = escapeXml(truncateText(n.label, 16));
    const sub = escapeXml(truncateText(n.sub, 22));

    nodesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="28" rx="10" fill="${color.headerBg}" />
        <rect x="0" y="16" width="${boxWidth}" height="12" fill="${color.headerBg}" />
        <line x1="0" y1="28" x2="${boxWidth}" y2="28" stroke="${color.border}" stroke-width="1" />
        
        <text x="${boxWidth / 2}" y="19" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Stage 0${i + 1}</text>
        <text x="${boxWidth / 2}" y="55" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">${label}</text>
        <text x="${boxWidth / 2}" y="75" font-family="Arial, sans-serif" font-size="8.5" fill="#475569" text-anchor="middle">${sub}</text>
        
        <circle cx="${boxWidth / 2}" cy="108" r="4" fill="${color.dot}" />
      </g>
    `;

    if (i < count - 1) {
      const nextX = x + boxWidth;
      const midY = boxY + boxHeight / 2;
      nodesSvg += `
        <line x1="${nextX}" y1="${midY - 6}" x2="${nextX + gap}" y2="${midY - 6}" stroke="${style.connectorColor}" stroke-width="1.8" />
        <polygon points="${nextX + gap},${midY - 6} ${nextX + gap - 4},${midY - 9} ${nextX + gap - 4},${midY - 3}" fill="${style.connectorColor}" />
        
        <line x1="${nextX + gap}" y1="${midY + 6}" x2="${nextX}" y2="${midY + 6}" stroke="${style.cards[1].dot}" stroke-width="1.5" stroke-dasharray="2 2" />
        <polygon points="${nextX},${midY + 6} ${nextX + 4},${midY + 3} ${nextX + 4},${midY + 9}" fill="${style.cards[1].dot}" />
      `;
    }
  });

  const footerLabel = escapeXml(truncateText((diagramData && diagramData.footerLabel) || 'Dual-Stream Visibility: Forward Material & Reverse Telemetry', 60));
  const footerText = escapeXml(truncateText((diagramData && diagramData.footerText) || 'Continuous telemetry balances inventory holding costs against customer fulfillment SLAs.', 100));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${nodesSvg}
    <g transform="translate(30, 255)">
      <rect x="0" y="0" width="${width - 60}" height="95" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">${footerLabel}</text>
      <text x="${(width - 60) / 2}" y="50" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">${footerText}</text>
      <text x="${(width - 60) / 2}" y="70" font-family="Arial, sans-serif" font-size="8.5" fill="#0284c7" text-anchor="middle">&mdash; Solid line: Forward Material Flow &nbsp;&nbsp;|&nbsp;&nbsp; - - - Dashed line: Reverse Information Feedback</text>
    </g>
  `;
}

/**
 * 6. FEEDBACK LOOP / RENEWABLE ENERGY GRID SYSTEM RENDERER
 */
function renderFeedbackLoopDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Power Generation, Storage & Smart Grid Balancing`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Renewable Harvesting', sub: 'Solar PV & wind turbines' },
    { label: 'Power Inverter & MPPT', sub: 'AC frequency conditioning' },
    { label: 'BESS Storage Hub', sub: 'Battery buffer reserves' },
    { label: 'Smart Grid Substation', sub: 'Automated distribution' },
    { label: 'Demand Load Nodes', sub: 'Industrial & domestic loads' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 5);
  const count = nodes.length;

  const marginX = 24;
  const gap = 12;
  const boxWidth = Math.floor((width - (marginX * 2) - ((count - 1) * gap)) / count);
  const boxHeight = 130;
  const boxY = 85;

  let nodesSvg = '';

  nodes.forEach((n, i) => {
    const x = marginX + i * (boxWidth + gap);
    const color = style.cards[i % style.cards.length];
    const label = escapeXml(truncateText(n.label, 16));
    const sub = escapeXml(truncateText(n.sub, 22));

    nodesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="28" rx="10" fill="${color.headerBg}" />
        <rect x="0" y="16" width="${boxWidth}" height="12" fill="${color.headerBg}" />
        <line x1="0" y1="28" x2="${boxWidth}" y2="28" stroke="${color.border}" stroke-width="1" />
        
        <text x="${boxWidth / 2}" y="19" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Unit 0${i + 1}</text>
        <text x="${boxWidth / 2}" y="52" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">${label}</text>
        <text x="${boxWidth / 2}" y="72" font-family="Arial, sans-serif" font-size="8.5" fill="#475569" text-anchor="middle">${sub}</text>
        
        <circle cx="${boxWidth / 2}" cy="105" r="4" fill="${color.dot}" />
      </g>
    `;

    if (i < count - 1) {
      const nextX = x + boxWidth;
      const midY = boxY + boxHeight / 2;
      nodesSvg += `
        <line x1="${nextX}" y1="${midY}" x2="${nextX + gap}" y2="${midY}" stroke="${style.connectorColor}" stroke-width="2" />
        <polygon points="${nextX + gap},${midY} ${nextX + gap - 4},${midY - 3} ${nextX + gap - 4},${midY + 3}" fill="${style.connectorColor}" />
      `;
    }
  });

  const footerLabel = escapeXml(truncateText((diagramData && diagramData.footerLabel) || 'Closed-Loop Frequency & Load Balancing Telemetry', 55));
  const footerText = escapeXml(truncateText((diagramData && diagramData.footerText) || 'Real-time battery buffering stabilizes voltage against environmental intermittency.', 100));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${nodesSvg}
    
    <!-- Feedback Return Arc -->
    <path d="M ${width - 50} 215 C ${width - 50} 245, 50 245, 50 215" fill="none" stroke="${style.cards[1].dot}" stroke-width="2" stroke-dasharray="4 3" />
    <polygon points="50,215 46,222 54,222" fill="${style.cards[1].dot}" />
    <text x="${width / 2}" y="240" font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="${style.cards[1].dot}" text-anchor="middle">&larr; Automated Demand Response & Storage Feedback Loop &larr;</text>
    
    <g transform="translate(30, 260)">
      <rect x="0" y="0" width="${width - 60}" height="90" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="26" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">${footerLabel}</text>
      <text x="${(width - 60) / 2}" y="48" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">${footerText}</text>
      <text x="${(width - 60) / 2}" y="68" font-family="Arial, sans-serif" font-size="8.5" font-style="italic" fill="${style.footerTextSub}" text-anchor="middle">Dynamically manages grid harmonics, storage dispatch, and reactive power compensation</text>
    </g>
  `;
}

/**
 * 7. INPUT - PROCESS - OUTPUT (IPO) ARCHITECTURE RENDERER
 */
function renderIPODiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `${topic || 'System'} Input-Process-Output Framework`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Raw System Inputs', sub: 'Telemetry logs & parameter datasets' },
    { label: 'Core Processing Engine', sub: 'Algorithmic transformation & validation' },
    { label: 'Target Output Deliverables', sub: 'Verified analytics & actionable reports' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback);
  const inputNode = nodes[0] || fallback[0];
  const processNode = nodes[1] || fallback[1];
  const outputNode = nodes[nodes.length - 1] || fallback[2];

  const cardW = 200;
  const cardH = 150;
  const y = 85;

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    
    <!-- Inputs Box -->
    <g transform="translate(30, ${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${style.cards[0].border}" stroke-width="2" />
      <rect x="0" y="0" width="${cardW}" height="32" rx="10" fill="${style.cards[0].headerBg}" />
      <rect x="0" y="20" width="${cardW}" height="12" fill="${style.cards[0].headerBg}" />
      <text x="${cardW / 2}" y="21" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.cards[0].headerText}" text-anchor="middle">1. INPUT VECTOR</text>
      <text x="${cardW / 2}" y="65" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(truncateText(inputNode.label, 22))}</text>
      <text x="${cardW / 2}" y="90" font-family="Arial, sans-serif" font-size="9" fill="#475569" text-anchor="middle">${escapeXml(truncateText(inputNode.sub, 26))}</text>
    </g>
    
    <!-- Arrow 1 -->
    <line x1="235" y1="${y + cardH / 2}" x2="275" y2="${y + cardH / 2}" stroke="${style.connectorColor}" stroke-width="2.5" />
    <polygon points="275,${y + cardH / 2} 268,${y + cardH / 2 - 4} 268,${y + cardH / 2 + 4}" fill="${style.connectorColor}" />
    
    <!-- Process Box -->
    <g transform="translate(280, ${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${style.cards[2].border}" stroke-width="2" />
      <rect x="0" y="0" width="${cardW}" height="32" rx="10" fill="${style.cards[2].headerBg}" />
      <rect x="0" y="20" width="${cardW}" height="12" fill="${style.cards[2].headerBg}" />
      <text x="${cardW / 2}" y="21" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.cards[2].headerText}" text-anchor="middle">2. CORE PROCESS</text>
      <text x="${cardW / 2}" y="65" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(truncateText(processNode.label, 22))}</text>
      <text x="${cardW / 2}" y="90" font-family="Arial, sans-serif" font-size="9" fill="#475569" text-anchor="middle">${escapeXml(truncateText(processNode.sub, 26))}</text>
    </g>
    
    <!-- Arrow 2 -->
    <line x1="485" y1="${y + cardH / 2}" x2="525" y2="${y + cardH / 2}" stroke="${style.connectorColor}" stroke-width="2.5" />
    <polygon points="525,${y + cardH / 2} 518,${y + cardH / 2 - 4} 518,${y + cardH / 2 + 4}" fill="${style.connectorColor}" />
    
    <!-- Output Box -->
    <g transform="translate(530, ${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${style.cards[1].border}" stroke-width="2" />
      <rect x="0" y="0" width="${cardW}" height="32" rx="10" fill="${style.cards[1].headerBg}" />
      <rect x="0" y="20" width="${cardW}" height="12" fill="${style.cards[1].headerBg}" />
      <text x="${cardW / 2}" y="21" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.cards[1].headerText}" text-anchor="middle">3. OUTPUT RESULT</text>
      <text x="${cardW / 2}" y="65" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(truncateText(outputNode.label, 22))}</text>
      <text x="${cardW / 2}" y="90" font-family="Arial, sans-serif" font-size="9" fill="#475569" text-anchor="middle">${escapeXml(truncateText(outputNode.sub, 26))}</text>
    </g>
    
    <g transform="translate(30, 265)">
      <rect x="0" y="0" width="${width - 60}" height="85" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">Deterministic Transformation & Quality Governance</text>
      <text x="${(width - 60) / 2}" y="50" font-family="Arial, sans-serif" font-size="9.5" fill="${style.footerTextSub}" text-anchor="middle">Converts raw inputs into validated outputs while executing automated error correction and state isolation.</text>
    </g>
  `;
}

/**
 * 8. CLOSED-LOOP CIRCULAR LIFECYCLE RENDERER
 */
function renderCycleDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Continuous ${topic || 'System'} Lifecycle`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Requirement Analysis' },
    { label: 'System Modeling' },
    { label: 'Implementation & Build' },
    { label: 'Automated Testing' },
    { label: 'Continuous Audit' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 5);

  const steps = [
    { label: nodes[0]?.label || 'Analysis', color: style.cards[0], x: 285, y: 70 },
    { label: nodes[1]?.label || 'Modeling', color: style.cards[1], x: 505, y: 125 },
    { label: nodes[2]?.label || 'Execution', color: style.cards[2], x: 435, y: 220 },
    { label: nodes[3]?.label || 'Verification', color: style.cards[3], x: 135, y: 220 },
    { label: nodes[4]?.label || 'Audit & Feedback', color: style.cards[4], x: 65, y: 125 }
  ];

  let nodesSvg = '';
  steps.forEach((st, i) => {
    nodesSvg += `
      <g transform="translate(${st.x}, ${st.y})">
        <rect x="0" y="0" width="160" height="52" rx="8" fill="#ffffff" stroke="${st.color.border}" stroke-width="2" />
        <rect x="0" y="0" width="160" height="18" rx="8" fill="${st.color.headerBg}" />
        <rect x="0" y="10" width="160" height="8" fill="${st.color.headerBg}" />
        <text x="80" y="14" font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="${st.color.headerText}" text-anchor="middle">Phase 0${i + 1}</text>
        <text x="80" y="38" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(truncateText(st.label, 18))}</text>
      </g>
    `;
  });

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    
    <circle cx="${width / 2}" cy="170" r="42" fill="${style.hubFill}" stroke="${style.hubStroke}" stroke-width="1.5" />
    <text x="${width / 2}" y="167" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${style.hubTextMain}" text-anchor="middle">Closed-Loop</text>
    <text x="${width / 2}" y="180" font-family="Arial, sans-serif" font-size="8.5" fill="${style.hubTextSub}" text-anchor="middle">Optimization</text>
    
    ${nodesSvg}
    
    <g transform="translate(50, 290)">
      <rect x="0" y="0" width="${width - 100}" height="65" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 100) / 2}" y="24" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">Continuous Feedback & Performance Refinement</text>
      <text x="${(width - 100) / 2}" y="44" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">Iterative lifecycle governance adapts schema topologies to evolving analytics requirements</text>
    </g>
  `;
}

/**
 * 9. HUB & SPOKE / CONCEPT MAP RENDERER
 */
function renderHubDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Core ${topic || 'System'} Objectives & Architecture`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Throughput', sub: 'Low latency execution' },
    { label: 'Reliability', sub: 'High fault tolerance' },
    { label: 'Security', sub: 'Access controls & audit' },
    { label: 'Scalability', sub: 'Elastic distributed load' },
    { label: 'Maintainability', sub: 'Modular decoupled code' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 5);
  const count = nodes.length;

  const marginX = 20;
  const gap = 12;
  const boxWidth = Math.floor((width - (marginX * 2) - ((count - 1) * gap)) / count);
  const boxHeight = 105;
  const boxY = 160;
  const hubCenterX = width / 2;
  const hubCenterY = 95;

  let branchLinesSvg = '';
  let boxesSvg = '';

  nodes.forEach((box, i) => {
    const x = marginX + i * (boxWidth + gap);
    const boxCenterX = x + (boxWidth / 2);
    const color = style.cards[i % style.cards.length];
    const label = escapeXml(truncateText(box.label, 16));
    const sub = escapeXml(truncateText(box.sub, 22));

    branchLinesSvg += `<line x1="${hubCenterX}" y1="${hubCenterY + 20}" x2="${boxCenterX}" y2="${boxY}" stroke="${style.connectorColor}" stroke-width="1.5" />`;

    boxesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="8" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="26" rx="8" fill="${color.headerBg}" />
        <rect x="0" y="16" width="${boxWidth}" height="10" fill="${color.headerBg}" />
        <line x1="0" y1="26" x2="${boxWidth}" y2="26" stroke="${color.border}" stroke-width="1" />
        <text x="${boxWidth / 2}" y="18" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">${label}</text>
        <text x="${boxWidth / 2}" y="55" font-family="Arial, sans-serif" font-size="8.5" fill="#334155" text-anchor="middle">${sub}</text>
        <circle cx="${boxWidth / 2}" cy="88" r="3.5" fill="${color.dot}" />
      </g>
    `;
  });

  const hubLabel = escapeXml(truncateText(topic || 'Core Coordinator', 24));

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    
    <ellipse cx="${hubCenterX}" cy="${hubCenterY}" rx="95" ry="22" fill="${style.hubFill}" stroke="${style.hubStroke}" stroke-width="1.5" />
    <text x="${hubCenterX}" y="${hubCenterY - 3}" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="${style.hubTextMain}" text-anchor="middle">${hubLabel}</text>
    <text x="${hubCenterX}" y="${hubCenterY + 11}" font-family="Arial, sans-serif" font-size="8.5" fill="${style.hubTextSub}" text-anchor="middle">Central System Orchestrator</text>
    
    ${branchLinesSvg}
    ${boxesSvg}
    
    <g transform="translate(40, 280)">
      <rect x="0" y="0" width="${width - 80}" height="75" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 80) / 2}" y="24" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">Multi-Factor Trade-off Optimization</text>
      <text x="${(width - 80) / 2}" y="44" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">Balancing system efficiency, latency, and reliability requirements across operational domains.</text>
    </g>
  `;
}

/**
 * 10. HIERARCHICAL TREE / TAXONOMY RENDERER
 */
function renderTreeDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `${topic || 'System'} Taxonomy & Classification Tree`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Sub-system A', sub: 'Component 1' },
    { label: 'Sub-system B', sub: 'Component 2' },
    { label: 'Sub-system C', sub: 'Component 3' },
    { label: 'Sub-system D', sub: 'Component 4' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 4);
  const count = nodes.length;

  const rootW = 220;
  const rootH = 40;
  const rootX = (width - rootW) / 2;
  const rootY = 75;

  const leafW = 150;
  const leafH = 75;
  const leafY = 165;
  const leafGap = 20;
  const totalLeafWidth = (count * leafW) + ((count - 1) * leafGap);
  const startLeafX = (width - totalLeafWidth) / 2;

  let leavesSvg = '';
  let linesSvg = '';

  nodes.forEach((n, i) => {
    const lx = startLeafX + i * (leafW + leafGap);
    const color = style.cards[i % style.cards.length];

    linesSvg += `<line x1="${width / 2}" y1="${rootY + rootH}" x2="${lx + leafW / 2}" y2="${leafY}" stroke="${style.connectorColor}" stroke-width="1.8" />`;

    leavesSvg += `
      <g transform="translate(${lx}, ${leafY})">
        <rect x="0" y="0" width="${leafW}" height="${leafH}" rx="8" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${leafW}" height="22" rx="8" fill="${color.headerBg}" />
        <rect x="0" y="14" width="${leafW}" height="8" fill="${color.headerBg}" />
        <text x="${leafW / 2}" y="16" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Branch 0${i + 1}</text>
        <text x="${leafW / 2}" y="42" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(truncateText(n.label, 16))}</text>
        <text x="${leafW / 2}" y="60" font-family="Arial, sans-serif" font-size="8" fill="#475569" text-anchor="middle">${escapeXml(truncateText(n.sub, 20))}</text>
      </g>
    `;
  });

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    
    <g transform="translate(${rootX}, ${rootY})">
      <rect x="0" y="0" width="${rootW}" height="${rootH}" rx="8" fill="${style.hubFill}" stroke="${style.hubStroke}" stroke-width="2" />
      <text x="${rootW / 2}" y="24" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.hubTextMain}" text-anchor="middle">${escapeXml(truncateText(topic || 'Root System', 26))}</text>
    </g>
    
    ${linesSvg}
    ${leavesSvg}
    
    <g transform="translate(40, 265)">
      <rect x="0" y="0" width="${width - 80}" height="85" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 80) / 2}" y="28" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">Hierarchical Subsystem Decomposition</text>
      <text x="${(width - 80) / 2}" y="50" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">Decomposes root architectural objectives into specialized domain implementations with clear separation of concerns.</text>
    </g>
  `;
}

/**
 * 11. COMPARATIVE ARCHITECTURE MATRIX RENDERER
 */
function renderComparisonDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `${topic || 'Methodology'} Comparative Evaluation`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const cardW = 320;
  const cardH = 160;
  const y = 80;

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    
    <g transform="translate(45, ${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${style.cards[0].border}" stroke-width="2" />
      <rect x="0" y="0" width="${cardW}" height="32" rx="10" fill="${style.cards[0].headerBg}" />
      <rect x="0" y="20" width="${cardW}" height="12" fill="${style.cards[0].headerBg}" />
      <text x="${cardW / 2}" y="21" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.cards[0].headerText}" text-anchor="middle">TRADITIONAL / BASELINE APPROACH</text>
      <text x="20" y="65" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">&bull; Monolithic tightly-coupled processing</text>
      <text x="20" y="90" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">&bull; Higher latency under burst demand</text>
      <text x="20" y="115" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">&bull; Manual scaling & schema rigidity</text>
      <text x="20" y="140" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#b91c1c">&times; High operational overhead</text>
    </g>
    
    <circle cx="${width / 2}" cy="${y + cardH / 2}" r="20" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="${y + cardH / 2 + 5}" font-family="'Times New Roman', serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">VS</text>
    
    <g transform="translate(${width - cardW - 45}, ${y})">
      <rect x="0" y="0" width="${cardW}" height="${cardH}" rx="10" fill="#ffffff" stroke="${style.cards[1].border}" stroke-width="2" />
      <rect x="0" y="0" width="${cardW}" height="32" rx="10" fill="${style.cards[1].headerBg}" />
      <rect x="0" y="20" width="${cardW}" height="12" fill="${style.cards[1].headerBg}" />
      <text x="${cardW / 2}" y="21" font-family="'Times New Roman', serif" font-size="11.5" font-weight="bold" fill="${style.cards[1].headerText}" text-anchor="middle">PROPOSED / MODERN ARCHITECTURE</text>
      <text x="20" y="65" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">&bull; Microservices & distributed orchestration</text>
      <text x="20" y="90" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">&bull; Real-time stream processing with low latency</text>
      <text x="20" y="115" font-family="Arial, sans-serif" font-size="9.5" fill="#334155">&bull; Elastic auto-scaling & fault isolation</text>
      <text x="20" y="140" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#15803d">&check; 99.99% operational availability</text>
    </g>
    
    <g transform="translate(45, 260)">
      <rect x="0" y="0" width="${width - 90}" height="90" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 90) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">Performance Benchmark Synthesis</text>
      <text x="${(width - 90) / 2}" y="50" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">The proposed architecture achieves significant throughput gains while dramatically lowering maintenance latency.</text>
    </g>
  `;
}

/**
 * 12. GENERATIONAL EVOLUTION TIMELINE RENDERER
 */
function renderTimelineDiagram(diagramData, topic, style, width, height) {
  const rawTitle = (diagramData && diagramData.title) ? diagramData.title : `Generational Evolution Roadmap of ${topic || 'Technology'}`;
  const title = escapeXml(truncateText(rawTitle, 55));

  const fallback = [
    { label: 'Gen 1.0 (Foundational)', sub: 'Monolithic prototypes' },
    { label: 'Gen 2.0 (Distributed)', sub: 'Microservice pipelines' },
    { label: 'Gen 3.0 (Cloud Native)', sub: 'Container orchestration' },
    { label: 'Gen 4.0 (Autonomous)', sub: 'AI self-healing systems' }
  ];

  const nodes = extractNodesFromData(diagramData, fallback).slice(0, 4);
  const count = nodes.length;

  const marginX = 25;
  const colGap = 16;
  const boxWidth = Math.floor((width - (marginX * 2) - ((count - 1) * colGap)) / count);
  const boxHeight = 130;
  const boxY = 95;

  let nodesSvg = '';

  nodes.forEach((n, i) => {
    const x = marginX + i * (boxWidth + colGap);
    const color = style.cards[i % style.cards.length];

    nodesSvg += `
      <g transform="translate(${x}, ${boxY})">
        <rect x="0" y="0" width="${boxWidth}" height="${boxHeight}" rx="10" fill="#ffffff" stroke="${color.border}" stroke-width="2" />
        <rect x="0" y="0" width="${boxWidth}" height="28" rx="10" fill="${color.headerBg}" />
        <rect x="0" y="16" width="${boxWidth}" height="12" fill="${color.headerBg}" />
        <line x1="0" y1="28" x2="${boxWidth}" y2="28" stroke="${color.border}" stroke-width="1" />
        
        <circle cx="16" cy="14" r="8" fill="${color.dot}" />
        <text x="16" y="17" font-family="Arial, sans-serif" font-size="8.5" font-weight="bold" fill="#ffffff" text-anchor="middle">${i + 1}</text>
        
        <text x="${boxWidth / 2 + 6}" y="18" font-family="'Times New Roman', serif" font-size="10.5" font-weight="bold" fill="${color.headerText}" text-anchor="middle">Milestone 0${i + 1}</text>
        <text x="${boxWidth / 2}" y="55" font-family="'Times New Roman', serif" font-size="10" font-weight="bold" fill="#0f172a" text-anchor="middle">${escapeXml(truncateText(n.label, 17))}</text>
        <text x="${boxWidth / 2}" y="78" font-family="Arial, sans-serif" font-size="8.5" fill="#475569" text-anchor="middle">${escapeXml(truncateText(n.sub, 22))}</text>
      </g>
    `;

    if (i < count - 1) {
      const nextX = x + boxWidth;
      const midY = boxY + boxHeight / 2;
      nodesSvg += `
        <line x1="${nextX}" y1="${midY}" x2="${nextX + colGap}" y2="${midY}" stroke="${style.connectorColor}" stroke-width="2" />
        <polygon points="${nextX + colGap},${midY} ${nextX + colGap - 4},${midY - 3} ${nextX + colGap - 4},${midY + 3}" fill="${style.connectorColor}" />
      `;
    }
  });

  return `
    <rect width="${width}" height="${height}" fill="#ffffff" />
    <rect x="18" y="12" width="${width - 36}" height="44" rx="4" fill="${style.bannerBg}" />
    <text x="${width / 2}" y="39" font-family="'Times New Roman', serif" font-size="16" font-weight="bold" fill="${style.bannerText}" text-anchor="middle">${title}</text>
    ${nodesSvg}
    <g transform="translate(30, 255)">
      <rect x="0" y="0" width="${width - 60}" height="95" rx="8" fill="${style.footerFill}" stroke="${style.footerStroke}" stroke-width="1.5" />
      <text x="${(width - 60) / 2}" y="28" font-family="'Times New Roman', serif" font-size="12" font-weight="bold" fill="${style.footerTextMain}" text-anchor="middle">Technology Maturity & Strategic Roadmap</text>
      <text x="${(width - 60) / 2}" y="50" font-family="Arial, sans-serif" font-size="9" fill="${style.footerTextSub}" text-anchor="middle">Chronological progression illustrates the transition from basic prototypes to autonomous intelligent enterprise networks.</text>
    </g>
  `;
}

/**
 * Main SVG Generator Function
 */
function generateDiagramSvg(diagramData, topic = '', layoutOverride = null, styleIndex = -1) {
  const width = 760;
  const height = 370;
  const style = pickStylePreset(topic, styleIndex);
  const layout = layoutOverride || resolveLayoutType(diagramData, topic);

  let innerSvg = '';
  switch (layout) {
    case 'process_flow':
    case 'process':
    case 'pipeline':
      innerSvg = renderProcessFlowDiagram(diagramData, topic, style, width, height);
      break;
    case 'layered_architecture':
    case 'layers':
      innerSvg = renderLayersDiagram(diagramData, topic, style, width, height);
      break;
    case 'network':
    case 'blockchain':
      innerSvg = renderNetworkDiagram(diagramData, topic, style, width, height);
      break;
    case 'cause_effect':
    case 'cybersecurity':
      innerSvg = renderCauseEffectDiagram(diagramData, topic, style, width, height);
      break;
    case 'ecosystem':
    case 'supply_chain':
      innerSvg = renderEcosystemDiagram(diagramData, topic, style, width, height);
      break;
    case 'feedback_loop':
    case 'energy':
      innerSvg = renderFeedbackLoopDiagram(diagramData, topic, style, width, height);
      break;
    case 'input_process_output':
    case 'ipo':
      innerSvg = renderIPODiagram(diagramData, topic, style, width, height);
      break;
    case 'cycle':
    case 'lifecycle':
      innerSvg = renderCycleDiagram(diagramData, topic, style, width, height);
      break;
    case 'hierarchical_tree':
    case 'tree':
      innerSvg = renderTreeDiagram(diagramData, topic, style, width, height);
      break;
    case 'comparison':
      innerSvg = renderComparisonDiagram(diagramData, topic, style, width, height);
      break;
    case 'timeline':
      innerSvg = renderTimelineDiagram(diagramData, topic, style, width, height);
      break;
    case 'hub_spoke':
    case 'hub':
    default:
      innerSvg = renderHubDiagram(diagramData, topic, style, width, height);
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    ${innerSvg}
  </svg>`.trim();
}

/**
 * Rasterize SVG string to high-resolution PNG data URI via HTML5 Canvas
 */
function rasterizeSvgToPng(svgString, diagramData = {}, topic = '', targetWidth = 760, targetHeight = 370) {
  return new Promise((resolve) => {
    try {
      if (!svgString || typeof svgString !== 'string') {
        svgString = generateDiagramSvg(diagramData, topic);
      }

      const img = new Image();
      const scaleFactor = 2;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth * scaleFactor;
      canvas.height = targetHeight * scaleFactor;
      const ctx = canvas.getContext('2d');

      let resolved = false;
      const fallbackResolve = () => {
        if (resolved) return;
        resolved = true;
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
      };

      const timer = setTimeout(fallbackResolve, 2500);

      img.onload = () => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        try {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngDataUri = canvas.toDataURL('image/png');
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          resolve(pngDataUri);
        } catch (e) {
          fallbackResolve();
        }
      };

      img.onerror = () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        fallbackResolve();
      };

      let blobUrl = null;
      try {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        blobUrl = URL.createObjectURL(blob);
        img.src = blobUrl;
      } catch (blobErr) {
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      }

    } catch (outerErr) {
      resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    }
  });
}

window.generateDiagramSvg = generateDiagramSvg;
window.rasterizeSvgToPng = rasterizeSvgToPng;
window.DIAGRAM_STYLE_PRESETS = DIAGRAM_STYLE_PRESETS;
window.resolveLayoutType = resolveLayoutType;


