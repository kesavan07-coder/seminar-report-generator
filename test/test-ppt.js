/**
 * Comprehensive Automated Test Suite for AI PowerPoint Presentation Generator
 * Validates:
 * 1. Serverless endpoint /api/generate-ppt (OPTIONS, GET 405, 400 validation, and synthesis output)
 * 2. Topic-specific deck synthesis (Domain knowledge, flowchart steps, uppercase formatting)
 * 3. PPTX binary generation matching master 16:9 layout (PptxGenJS)
 * 4. Vector PDF generation matching 16:9 slide-by-slide pages (jsPDF)
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const PptxGenJS = require('pptxgenjs');
const { jsPDF } = require('jspdf');

const { handler } = require('../api/generate-ppt');
const { synthesizeTopicDeck, toUpperCaseTitle } = require('../api/_lib/ppt-content');

async function runPptTests() {
  console.log('====================================================');
  console.log('🧪 Starting AI PowerPoint Generator Test Suite');
  console.log('====================================================\n');

  // ─────────────────────────────────────────────────────────────
  // 1. Endpoint & CORS Validation
  // ─────────────────────────────────────────────────────────────
  console.log('--- Test Group 1: Serverless Handler Protocols ---');

  // 1.1 OPTIONS CORS Preflight
  const optionsRes = await handler({ httpMethod: 'OPTIONS' }, {});
  assert.strictEqual(optionsRes.statusCode, 200, 'OPTIONS should return 200');
  assert.strictEqual(optionsRes.headers['Access-Control-Allow-Origin'], '*', 'OPTIONS should have CORS header');
  console.log('  ✅ 1.1 OPTIONS CORS preflight returns 200 and headers');

  // 1.2 GET Method Not Allowed
  const getRes = await handler({ httpMethod: 'GET' }, {});
  assert.strictEqual(getRes.statusCode, 405, 'GET should return 405');
  console.log('  ✅ 1.2 GET returns 405 Method Not Allowed');

  // 1.3 Missing topic
  const noTopicRes = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ topic: '' })
  }, {});
  assert.strictEqual(noTopicRes.statusCode, 400, 'Empty topic should return 400');
  const noTopicBody = JSON.parse(noTopicRes.body);
  assert.ok(noTopicBody.error, 'Error message should be present');
  console.log('  ✅ 1.3 Missing topic returns 400 Bad Request');

  // 1.4 Short topic
  const shortTopicRes = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({ topic: 'ab' })
  }, {});
  assert.strictEqual(shortTopicRes.statusCode, 400, 'Short topic should return 400');
  console.log('  ✅ 1.4 Short topic (<3 chars) returns 400 Bad Request');

  // ─────────────────────────────────────────────────────────────
  // 2. Academic Synthesis Engine Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 2: Synthesis Engine & Flowchart Accuracy ---');

  const testTopics = [
    {
      topic: 'Artificial Intelligence in Healthcare',
      subject: 'Biomedical Computing',
      expectedFlowStep: 'CLINICAL PREPROCESSING'
    },
    {
      topic: 'Blockchain Technology and Decentralized Ledgers',
      subject: 'Distributed Cryptography',
      expectedFlowStep: 'TRANSACTION INITIATION'
    },
    {
      topic: 'Dimensional Space in Data Warehousing and Data Mining',
      subject: 'Data Warehousing',
      expectedFlowStep: 'DATA SOURCES'
    },
    {
      topic: 'Cybersecurity Incident Response and Threat Intelligence',
      subject: 'Information Security',
      expectedFlowStep: 'THREAT DETECTION'
    },
    {
      topic: 'Renewable Solar Microgrid Energy Storage Optimization',
      subject: 'Electrical Power Engineering',
      expectedFlowStep: 'ENERGY HARVESTING'
    }
  ];

  for (const t of testTopics) {
    const deck = synthesizeTopicDeck(t.topic, t.subject);
    
    // Check basic metadata
    assert.ok(deck.topic, 'Deck must contain topic name');
    assert.ok(deck.title.endsWith(' :'), `Title "${deck.title}" must end with " :"`);
    assert.strictEqual(deck.title, deck.title.toUpperCase(), 'Title must be all UPPERCASE');
    assert.ok(Array.isArray(deck.slides), 'Deck must contain slides array');
    assert.ok(deck.slides.length >= 4, `Deck must have >= 4 slides (found ${deck.slides.length})`);

    // Slide 1: Overview
    const slide1 = deck.slides[0];
    assert.strictEqual(slide1.type, 'overview');
    assert.ok(slide1.title.endsWith(' :'));
    assert.ok(slide1.subtitle, 'Slide 1 must have subtitle');
    assert.ok(slide1.bullets.length >= 4, 'Slide 1 must have >= 4 bullets');

    // Slide 2: Introduction
    const slide2 = deck.slides[1];
    assert.strictEqual(slide2.type, 'introduction');
    assert.ok(slide2.title.includes('INTRODUCTION'));
    assert.ok(slide2.bullets.length >= 4, 'Slide 2 must have >= 4 bullets');

    // Slide 3: Process Analysis & Flowchart
    const slide3 = deck.slides[2];
    assert.strictEqual(slide3.type, 'process');
    assert.ok(slide3.title.includes('PROCESS'));
    assert.ok(slide3.leftHeading, 'Slide 3 must have left heading');
    assert.ok(slide3.leftBullets.length >= 4, 'Slide 3 must have left bullets');
    assert.ok(slide3.rightHeading, 'Slide 3 must have right heading');
    assert.ok(Array.isArray(slide3.flowchart), 'Slide 3 must have flowchart array');
    assert.ok(slide3.flowchart.length >= 4, 'Slide 3 flowchart must have >= 4 steps');

    // Verify flowchart contains topic-specific domain step
    const hasDomainStep = slide3.flowchart.some(step => 
      step.replace(/\s+/g, ' ').toUpperCase().includes(t.expectedFlowStep)
    );
    assert.ok(hasDomainStep, `Flowchart for "${t.topic}" must contain step matching "${t.expectedFlowStep}"`);

    // Final Slide: Conclusion
    const lastSlide = deck.slides[deck.slides.length - 1];
    assert.strictEqual(lastSlide.type, 'conclusion');
    assert.ok(lastSlide.title.includes('CONCLUSION'));
    assert.ok(lastSlide.bullets.length >= 4, 'Conclusion must have >= 4 bullets');

    console.log(`  ✅ 2.${testTopics.indexOf(t) + 1} Synthesized deck for "${t.topic}" (${deck.slides.length} slides, ${slide3.flowchart.length}-step flowchart)`);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Serverless POST Generation Response
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 3: Serverless POST Generation ---');

  const postRes = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      topic: 'Artificial Intelligence in Healthcare',
      subject: 'Biomedical Informatics'
    })
  }, {});

  assert.strictEqual(postRes.statusCode, 200);
  const postBody = JSON.parse(postRes.body);
  assert.strictEqual(postBody.success, true);
  assert.ok(postBody.data);
  assert.ok(postBody.data.slides.length >= 4);
  assert.strictEqual(postBody.templateId, 'template-academic-flowchart');
  console.log(`  ✅ 3.1 Handler returned 200 with complete presentation payload (${postBody.data.slides.length} slides)`);

  const t2Res = await handler({
    httpMethod: 'POST',
    body: JSON.stringify({
      topic: 'Execution Governor Limits in Salesforce CRM',
      subject: 'Cloud Enterprise Platforms',
      templateId: 'template-executive-grid'
    })
  }, {});
  assert.strictEqual(t2Res.statusCode, 200);
  const t2Body = JSON.parse(t2Res.body);
  assert.strictEqual(t2Body.success, true);
  assert.strictEqual(t2Body.templateId, 'template-executive-grid');
  assert.strictEqual(t2Body.data.slides[0].type, 'executive_overview');
  assert.strictEqual(t2Body.data.slides[1].type, 'parameter_matrix');
  assert.strictEqual(t2Body.data.slides[2].type, 'executive_process');
  assert.strictEqual(t2Body.data.slides[3].type, 'three_column_conclusion');
  console.log('  ✅ 3.2 Handler returned 200 with Template 2 executive grid payload');

  // ─────────────────────────────────────────────────────────────
  // 4. PPTX File Generation with PptxGenJS (Matching Master Layout)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 4: PPTX Generation & Layout Integrity ---');

  const sampleDeck = postBody.data;
  const pres = new PptxGenJS();
  pres.defineLayout({ name: 'A4_16_9', width: 13.333, height: 7.5 });
  pres.layout = 'A4_16_9';

  sampleDeck.slides.forEach((slide) => {
    const s = pres.addSlide();
    s.background = { color: 'FFFFFF' };

    s.addText(String(slide.title || 'SEMINAR :').toUpperCase(), {
      x: 0.45,
      y: 0.25,
      w: 12.2,
      h: 0.6,
      fontFace: 'Times New Roman',
      fontSize: 24,
      bold: true,
      color: '000000'
    });

    if (slide.type === 'overview') {
      if (slide.subtitle) {
        s.addText(slide.subtitle, {
          x: 0.45,
          y: 1.05,
          w: 12.2,
          h: 0.7,
          fontFace: 'Times New Roman',
          fontSize: 17,
          color: '000000'
        });
      }
      const bullets = (slide.bullets || []).map(b => ({
        text: b,
        options: { bullet: { type: 'bullet', code: '274F' } }
      }));
      s.addText(bullets, {
        x: 0.5,
        y: slide.subtitle ? 2.05 : 1.25,
        w: 12.1,
        h: 5.0,
        fontFace: 'Times New Roman',
        fontSize: 16,
        color: '000000',
        lineSpacing: 28,
        spaceAfter: 6
      });
    } else if (slide.type === 'process') {
      s.addText(slide.leftHeading || 'FLOW CHART EXPLANATION :', {
        x: 0.55,
        y: 1.15,
        w: 5.8,
        h: 0.4,
        fontFace: 'Times New Roman',
        fontSize: 17,
        bold: true,
        color: '000000'
      });
      const leftBullets = (slide.leftBullets || []).map(b => ({
        text: b,
        options: { bullet: { type: 'bullet', code: '274F' } }
      }));
      s.addText(leftBullets, {
        x: 0.55,
        y: 1.65,
        w: 5.8,
        h: 5.3,
        fontFace: 'Times New Roman',
        fontSize: 15,
        color: '000000',
        lineSpacing: 26,
        spaceAfter: 6
      });
      s.addText(slide.rightHeading || 'SIMPLE FLOW CHART :', {
        x: 6.8,
        y: 1.15,
        w: 5.8,
        h: 0.4,
        fontFace: 'Times New Roman',
        fontSize: 17,
        bold: true,
        color: '000000'
      });

      const flowSteps = slide.flowchart || [];
      const boxW = 3.65;
      const boxH = 0.58;
      const boxX = 7.65;
      const startY = 1.75;
      const gapY = 0.28;

      flowSteps.forEach((step, idx) => {
        const yPos = startY + idx * (boxH + gapY);
        s.addShape(pres.ShapeType.roundRect, {
          x: boxX,
          y: yPos,
          w: boxW,
          h: boxH,
          fill: { color: 'FFFFFF' },
          line: { color: '4F81BD', width: 1.2 },
          rectRadius: 0.1
        });
        s.addText(step, {
          x: boxX,
          y: yPos,
          w: boxW,
          h: boxH,
          fontFace: 'Times New Roman',
          fontSize: 12.5,
          bold: true,
          color: '000000',
          align: 'center',
          valign: 'middle'
        });
      });
    } else {
      const bullets = (slide.bullets || []).map(b => ({
        text: b,
        options: { bullet: { type: 'bullet', code: '274F' } }
      }));
      s.addText(bullets, {
        x: 0.5,
        y: 1.15,
        w: 12.1,
        h: 5.8,
        fontFace: 'Times New Roman',
        fontSize: 16,
        color: '000000',
        lineSpacing: 28,
        spaceAfter: 6
      });
    }
  });

  const pptxBuffer = await pres.write({ outputType: 'nodebuffer' });
  assert.ok(Buffer.isBuffer(pptxBuffer), 'Output must be a Node buffer');
  assert.ok(pptxBuffer.length > 20000, `PPTX size (${pptxBuffer.length} bytes) must exceed 20KB`);
  console.log(`  ✅ 4.1 Generated editable .pptx successfully (${pptxBuffer.length} bytes)`);

  // Verify PPTX is a valid ZIP archive containing slide XMLs
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(pptxBuffer);
  assert.ok(zip.file('ppt/presentation.xml'), 'Must contain presentation.xml');
  assert.ok(zip.file('ppt/slides/slide1.xml'), 'Must contain slide1.xml');
  assert.ok(zip.file('ppt/slides/slide3.xml'), 'Must contain slide3.xml');
  console.log('  ✅ 4.2 Verified PPTX structure: presentation.xml, slide1.xml, slide3.xml present');

  // ─────────────────────────────────────────────────────────────
  // 5. Vector PDF Generation with jsPDF (16:9 Landscape)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- Test Group 5: Vector PDF Generation & 16:9 Page Mapping ---');

  const pdfDoc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [960, 540]
  });

  const slides = sampleDeck.slides;
  slides.forEach((slide, index) => {
    if (index > 0) pdfDoc.addPage([960, 540], 'landscape');
    pdfDoc.setFillColor(255, 255, 255);
    pdfDoc.rect(0, 0, 960, 540, 'F');

    // Title
    pdfDoc.setFont('times', 'bold');
    pdfDoc.setFontSize(22);
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.text(String(slide.title || 'SEMINAR :').toUpperCase(), 36, 42);

    if (slide.type === 'process') {
      // Flowchart boxes
      const steps = slide.flowchart || [];
      const boxW = 280;
      const boxH = 46;
      const boxX = 580;
      const startY = 135;
      const gapY = 22;

      steps.forEach((step, sIdx) => {
        const boxY = startY + sIdx * (boxH + gapY);
        pdfDoc.setDrawColor(79, 129, 189);
        pdfDoc.setLineWidth(1.5);
        pdfDoc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, 'S');

        pdfDoc.setFont('times', 'bold');
        pdfDoc.setFontSize(10.5);
        pdfDoc.setTextColor(0, 0, 0);
        const lines = step.split('\n');
        lines.forEach((l, lIdx) => {
          const lY = boxY + 22 + (lIdx * 13) - ((lines.length - 1) * 6);
          pdfDoc.text(l.trim(), boxX + (boxW / 2), lY, { align: 'center' });
        });
      });
    }
  });

  const pdfOutput = pdfDoc.output('arraybuffer');
  const pdfBuffer = Buffer.from(pdfOutput);
  assert.ok(pdfBuffer.length > 5000, `PDF size (${pdfBuffer.length} bytes) must exceed 5KB`);
  assert.strictEqual(pdfBuffer.subarray(0, 5).toString('ascii'), '%PDF-', 'PDF must have %PDF- header');
  assert.strictEqual(pdfDoc.getNumberOfPages(), slides.length, `PDF page count (${pdfDoc.getNumberOfPages()}) must equal slides (${slides.length})`);
  console.log(`  ✅ 5.1 Generated 16:9 vector PDF successfully (${pdfBuffer.length} bytes, ${pdfDoc.getNumberOfPages()} pages)`);

  console.log('\n====================================================');
  console.log('🎉 ALL AI POWERPOINT GENERATOR TESTS PASSED!');
  console.log('====================================================\n');
}

runPptTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
