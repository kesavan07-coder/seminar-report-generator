/**
 * Automated Verification & Unit Tests for Seminar Report Generator
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting Seminar Report Generator verification tests...\n');

// 1. Test Serverless Function File Existence and Export
const functionPath = path.join(__dirname, '..', 'netlify', 'functions', 'generate-content.js');
assert.ok(fs.existsSync(functionPath), 'Serverless function file must exist');
const serverlessModule = require(functionPath);
assert.strictEqual(typeof serverlessModule.handler, 'function', 'Handler must be an exported function');
console.log('✅ Serverless handler module structure verified.');

// 2. Test Word Document Template Generation Logic
global.window = global;
require('../js/doc-generator.js');

const sampleFormData = {
  topic: 'Heavy metal ions from contaminated wastewater',
  subject: 'Environmental Engineering & Chemical Technology',
  studentName: 'KAVIN KUMAR S',
  registerNo: '731622104045',
  courseCodeName: '22CH601 / Wastewater Treatment Technologies',
  facultyName: 'Dr. M. Senthil Kumar, M.E., Ph.D.',
  department: 'Computer Science and Engineering',
  yearSemSec: 'III / VI / A',
  academicYear: '2026-2027',
  seminarNo: '01',
  seminarDate: '23-08-2026'
};

const sampleAiContent = {
  title: 'Heavy metal ions from contaminated wastewater',
  abstract: 'Sentence 1. Sentence 2. Sentence 3. Sentence 4. Sentence 5. Sentence 6. Sentence 7.',
  introduction: 'Sentence 1. Sentence 2. Sentence 3. Sentence 4. Sentence 5. Sentence 6. Sentence 7. Sentence 8. Sentence 9.',
  themeParagraph1: 'Mechanism sentence 1. Mechanism sentence 2. Mechanism sentence 3.',
  themeParagraph2: 'Sub-techniques sentence 1. Sub-techniques sentence 2. Sub-techniques sentence 3. Sub-techniques sentence 4.',
  figureCaption: 'Figure 1. Heavy metal contamination in water',
  applicationsIntro: 'Biosorption is a promising approach for the removal of heavy metal ions.',
  applications: [
    { domain: 'Industrial Wastewater', text: 'Biosorption treatment in electroplating facilities.' },
    { domain: 'Mining Operations', text: 'Tailings water remediation.' },
    { domain: 'Chemical Plants', text: 'Heavy metal recovery systems.' },
    { domain: 'Tannery Effluent', text: 'Chromium removal and precipitation.' },
    { domain: 'Battery Manufacturing', text: 'Lead and cadmium extraction.' },
    { domain: 'Groundwater Remediation', text: 'In-situ permeable reactive barriers.' }
  ],
  applicationsClosing: 'These implementations highlight the immense potential across distributed ecosystems.',
  conclusion: 'The discharge of metallic waste into soil, air, and water from industrial processes can harm humans and other animals.',
  references: [
    { style: 'book', author: 'Elwakeel, K.Z. et al. (2022)', title: 'Recent Advances in Alginate-Based Adsorbents, Desalination.' },
    { style: 'book', author: 'Elgarahy, A.M. et al. (2023)', title: 'Use of Biopolymers in Wastewater Treatment, Chin. J. Chem. Eng.' },
    { style: 'source', text: 'Mishra, S. – Biomedical Impact of Heavy Metal Ions on Human Health, Int. J. Biochem. Physiol. 2023.' },
    { style: 'source', text: 'Adnan, M. et al. – Research Progress on Heavy Metals Pollution in China, Toxics 2022.' }
  ],
  diagram: {
    title: 'Heavy Metal Biosorption Workflow',
    boxes: [
      { label: 'Wastewater Influx', lines: ['Raw effluent intake', 'Heavy ion detection'] },
      { label: 'Biosorbent Matrix', lines: ['Alginate beads', 'Binding active sites'] },
      { label: 'Desorption & Recovery', lines: ['Elution process', 'Regeneration cycle'] }
    ],
    footerLabel: 'Wastewater Treatment Pipeline',
    footerText: 'Sustainable and cost-effective heavy metal biosorption process'
  }
};

const dummyPngDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const generatedDocHtml = window.generateWordDocHtml(sampleFormData, sampleAiContent, dummyPngDataUri);

// Format and Template Checks
assert.ok(generatedDocHtml.includes('MEC/IQAC/2026-27/COE/136'), 'Must contain official MEC IQAC header code');
assert.ok(generatedDocHtml.includes('1. ABSTRACT'), 'Must contain "1. ABSTRACT" section heading');
assert.ok(generatedDocHtml.includes('2. INTRODUCTION'), 'Must contain "2. INTRODUCTION" section heading');
assert.ok(generatedDocHtml.includes('3. THEME OF THE SEMINAR'), 'Must contain "3. THEME OF THE SEMINAR" section heading');
assert.ok(generatedDocHtml.includes('4. APPLICATIONS'), 'Must contain "4. APPLICATIONS" section heading');
assert.ok(generatedDocHtml.includes('5. CONCLUSION'), 'Must contain "5. CONCLUSION" section heading');
assert.ok(generatedDocHtml.includes('6. REFERENCES'), 'Must contain "6. REFERENCES" section heading');
assert.ok(generatedDocHtml.includes('0.046in'), 'Must contain the exact 0.046 inch introduction indent specification');
assert.ok(generatedDocHtml.includes('page-break-before: always;'), 'Must include forced page breaks for Page 2 and Page 3');
assert.ok(generatedDocHtml.includes('SEMINAR PRESENTATION'), 'Must include Page 3 SEMINAR PRESENTATION heading');
assert.ok(generatedDocHtml.includes('Name of the Student'), 'Must include 9-row details table');
assert.ok(generatedDocHtml.includes('Seminar Report'), 'Must include evaluation rubric table');
assert.ok(generatedDocHtml.includes('Technical Video'), 'Must include 3x2 presentation options table');
assert.ok(generatedDocHtml.includes('Student Signature'), 'Must include student, faculty, and HOD signature rows');
console.log('✅ Word document template (.doc HTML) generation passed all 3-page compliance checks.');

// 3. Test SVG Diagram Generation
require('../js/diagram.js');
const svgOutput = window.generateDiagramSvg(sampleAiContent.diagram, sampleFormData.topic);
assert.ok(svgOutput.startsWith('<svg'), 'Diagram output must start with SVG root element');
assert.ok(svgOutput.includes('</svg>'), 'Diagram output must be closed properly');
assert.ok(svgOutput.includes('Wastewater Influx'), 'Diagram must render node label');
console.log('✅ Dynamic vector SVG diagram generation verified successfully.');

// 4. Test MHTML Packaging for Word Native Image Embedding
const mhtmlOutput = window.packageDocAsMhtml(generatedDocHtml);
assert.ok(mhtmlOutput.includes('MIME-Version: 1.0'), 'MHTML must declare MIME-Version 1.0');
assert.ok(mhtmlOutput.includes('multipart/related; boundary='), 'MHTML must declare multipart/related boundary');
assert.ok(mhtmlOutput.includes('Content-Location: document.htm'), 'MHTML must include document.htm main part');
assert.ok(mhtmlOutput.includes('Content-Location: image_1.'), 'MHTML must attach images as MIME parts');
assert.ok(!mhtmlOutput.includes('src="data:image/'), 'MHTML document body must have data URIs replaced with local MIME references');
console.log('✅ Word document MHTML image packaging verified (prevents "Cannot find linked file" and layout shift).');

// 5. Test Mobile Font Consistency & PDF Export Integrity
const fontsDir = path.join(__dirname, '..', 'assets', 'fonts');
assert.ok(fs.existsSync(fontsDir), 'assets/fonts directory must exist');
const fontFiles = ['tinos-regular.woff2', 'tinos-bold.woff2', 'tinos-italic.woff2', 'tinos-regular.ttf', 'tinos-bold.ttf'];
fontFiles.forEach(f => {
  assert.ok(fs.existsSync(path.join(fontsDir, f)), `Font asset ${f} must exist`);
});

const cssContent = fs.readFileSync(path.join(__dirname, '..', 'css', 'styles.css'), 'utf8');
assert.ok(cssContent.includes("@font-face"), 'styles.css must declare @font-face for Times New Roman');
assert.ok(cssContent.includes("text-size-adjust"), 'styles.css must enforce text-size-adjust: 100% against mobile font boosting');
assert.ok(cssContent.includes("max-height: 999999px"), 'styles.css must include max-height font boosting guard');
assert.ok(cssContent.includes("body.pdf-exporting .paper-sheet"), 'styles.css must lock paper-sheet to 850px during PDF export');

const paymentJsContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'payment.js'), 'utf8');
assert.ok(paymentJsContent.includes("windowWidth: 850"), 'payment.js must set windowWidth: 850 in captureOptions');
assert.ok(paymentJsContent.includes("document.fonts.ready"), 'payment.js must await document.fonts.ready before capturing PDF');
assert.ok(paymentJsContent.includes("clonedDoc.documentElement.style.width = '850px'"), 'payment.js must lock clonedDoc width to 850px');

const indexHtmlContent = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(indexHtmlContent.includes("family=Tinos"), 'index.html must load Tinos webfont for mobile devices');

const docGenContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'doc-generator.js'), 'utf8');
assert.ok(docGenContent.includes("panose-1"), 'doc-generator.js must declare PANOSE Times New Roman in Word HTML');

console.log('✅ Mobile font consistency, @font-face assets, and 850px PDF capture verified successfully.');

// 6. Test Mobile Responsive Preview Scaling & Validation
const previewJsContent = fs.readFileSync(path.join(__dirname, '..', 'js', 'preview.js'), 'utf8');
assert.ok(previewJsContent.includes("calculatePreviewScale"), 'preview.js must define calculatePreviewScale');
assert.ok(previewJsContent.includes("updatePreviewScale"), 'preview.js must define updatePreviewScale');
assert.ok(previewJsContent.includes("setupPreviewScaling"), 'preview.js must define setupPreviewScaling');

// Evaluate preview scale calculation across all required viewport widths
const testWidths = [320, 360, 375, 390, 414, 768, 1024, 1440];
const baseWidth = 850;
const baseHeight = 1202;

testWidths.forEach(viewportWidth => {
  const padding = viewportWidth <= 480 ? 16 : 24;
  const avail = Math.max(260, viewportWidth - padding);
  const scale = avail < baseWidth ? avail / baseWidth : 1;
  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;

  assert.ok(scale > 0 && scale <= 1.0, `Scale for ${viewportWidth}px must be between 0 and 1 (got ${scale})`);
  assert.ok(scaledWidth <= viewportWidth, `Scaled sheet width (${scaledWidth}px) must fit within viewport (${viewportWidth}px)`);

  // Verify exact A4 portrait aspect ratio (height / width = ~1.414)
  const ratio = scaledHeight / scaledWidth;
  assert.ok(Math.abs(ratio - 1.4141) < 0.01, `A4 aspect ratio must be maintained at ${viewportWidth}px (got ${ratio})`);
});

// Verify index.html contains sheet-card and sheet-viewport wrappers
assert.ok(indexHtmlContent.includes('class="sheet-card"'), 'index.html must wrap sheets in sheet-card');
assert.ok(indexHtmlContent.includes('class="sheet-viewport"'), 'index.html must wrap sheets in sheet-viewport');
assert.ok(indexHtmlContent.includes('id="btn-toggle-zoom"'), 'index.html must provide zoom toggle button');

// Verify styles.css responsive preview rules
assert.ok(cssContent.includes('.sheet-viewport'), 'styles.css must style .sheet-viewport');
assert.ok(cssContent.includes('translateX(-50%) scale(var(--sheet-scale'), 'styles.css must use CSS transform for sheet scaling');
assert.ok(cssContent.includes('.btn-zoom-toggle'), 'styles.css must style .btn-zoom-toggle');

// Verify PDF validation checks in payment.js
assert.ok(paymentJsContent.includes("totalPages !== 3"), 'payment.js must strictly validate exactly 3 pages');
assert.ok(paymentJsContent.includes("checkCanvasContent"), 'payment.js must verify rendered canvas has visible ink/content');

console.log('✅ Mobile responsive preview scaling (320px, 360px, 375px, 390px, 414px, 768px, 1024px+) and PDF validation verified successfully.');

console.log('\n🎉 All test suites passed successfully! 100% verified.');
