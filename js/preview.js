/**
 * Interactive 3-Page Preview Module with Live In-Browser Rich Editing
 * Features: contenteditable editing, drag-to-move diagram, resize handles.
 * Exact Page 3 match to official format (media_1787501503802.png).
 */

const REPORT_FONTS = {
  'Times New Roman': '"Times New Roman", Times, "Tinos", serif',
  'Arial': 'Arial, "Helvetica Neue", Helvetica, "Arimo", sans-serif',
  'Calibri': 'Calibri, "Carlito", "Segoe UI", Candara, Arial, sans-serif',
  'Georgia': 'Georgia, "Gelasio", Cambria, "Times New Roman", serif'
};

let selectedReportFont = 'Times New Roman';

function getReportFontStack(fontName) {
  return REPORT_FONTS[fontName] || REPORT_FONTS['Times New Roman'];
}

function applyReportFont(fontName) {
  if (!fontName || !REPORT_FONTS[fontName]) {
    fontName = 'Times New Roman';
  }
  selectedReportFont = fontName;
  window.selectedReportFont = fontName;

  const fontStack = getReportFontStack(fontName);

  // Apply CSS custom property to preview container, wrapper, and all report sheets
  const previewContainer = document.getElementById('preview-container');
  if (previewContainer) {
    previewContainer.style.setProperty('--report-font', fontStack);
  }
  const wrapper = document.getElementById('sheets-wrapper');
  if (wrapper) {
    wrapper.style.setProperty('--report-font', fontStack);
  }
  const sheets = document.querySelectorAll('.paper-sheet, .viewer-paper-sheet');
  sheets.forEach(sheet => {
    sheet.style.setProperty('--report-font', fontStack);
  });

  // Synchronize both dropdowns if present
  const formSelect = document.getElementById('fontStyle');
  if (formSelect && formSelect.value !== fontName) {
    formSelect.value = fontName;
  }
  const ribbonSelect = document.getElementById('ribbon-font-style');
  if (ribbonSelect && ribbonSelect.value !== fontName) {
    ribbonSelect.value = fontName;
  }
}

window.REPORT_FONTS = REPORT_FONTS;
window.selectedReportFont = selectedReportFont;
window.applyReportFont = applyReportFont;

function renderLivePreview(formData, aiContent, diagramPngDataUri) {
  const previewContainer = document.getElementById('preview-container');
  const page1Content = document.getElementById('preview-page-1');
  const page2Content = document.getElementById('preview-page-2');
  const page3Content = document.getElementById('preview-page-3');

  if (!previewContainer || !page1Content || !page2Content || !page3Content) {
    return;
  }

  // Apply chosen font style strictly to the seminar report
  const fontChoice = formData.fontStyle || document.getElementById('fontStyle')?.value || 'Times New Roman';
  applyReportFont(fontChoice);

  const studentName = escapeHtml(formData.studentName || 'Student Name');
  const registerNo = escapeHtml(formData.registerNo || '7316XXXXXXX');
  const courseCodeName = escapeHtml(formData.courseCodeName || 'Course Code & Name');
  const facultyName = escapeHtml(formData.facultyName || 'Faculty In-Charge');
  const department = escapeHtml(formData.department || 'Computer Science and Engineering');
  const yearSemSec = escapeHtml(formData.yearSemSec || 'III / VI / A');
  const academicYear = escapeHtml(formData.academicYear || '2026-2027');
  const seminarNo = escapeHtml(formData.seminarNo || '01');
  const seminarDate = escapeHtml(formData.seminarDate || '');
  const topic = toTitleCase(formData.topic || aiContent.title || 'Seminar Topic');

  const headerCode = 'MEC/IQAC/2026-27/COE/136';

  // --- PAGE 1: Title, Byline, Sec 1 (Abstract), Sec 2 (Intro), Sec 3 (Theme) ---
  page1Content.innerHTML = `
    <div class="sheet-header-code">${headerCode}</div>
    <h1 class="sheet-title" contenteditable="true" spellcheck="false">${escapeHtml(topic)}</h1>
    <p class="sheet-byline" contenteditable="true" spellcheck="false">${studentName}, ${registerNo}, ${yearSemSec}, ${department}, Muthayammal Engineering College${seminarDate ? `, ${seminarDate}` : ''}</p>

    <div class="sheet-section-title" contenteditable="true" spellcheck="false">1.&nbsp;&nbsp;&nbsp;&nbsp;ABSTRACT</div>
    <p class="sheet-p" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.abstract || ''))}</p>

    <div class="sheet-section-title" contenteditable="true" spellcheck="false">2.&nbsp;&nbsp;&nbsp;&nbsp;INTRODUCTION</div>
    <p class="sheet-p intro-indent" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.introduction || ''))}</p>

    <div class="sheet-section-title" contenteditable="true" spellcheck="false">3.&nbsp;&nbsp;&nbsp;&nbsp;THEME OF THE SEMINAR</div>
    <p class="sheet-p" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.themeParagraph1 || ''))}</p>
    ${aiContent.themeParagraph2 ? `<p class="sheet-p" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.themeParagraph2))}</p>` : ''}
  `;

  // --- PAGE 2: Figure 1, Sec 4 (Applications), Sec 5 (Conclusion), Sec 6 (References) ---
  const appsList = (Array.isArray(aiContent.applications) ? aiContent.applications : []).map(app => {
    return `<li contenteditable="true" spellcheck="false"><strong>${escapeHtml(String(app.domain || ''))}:</strong> ${escapeHtml(String(app.text || ''))}</li>`;
  }).join('');

  const refsList = (Array.isArray(aiContent.references) ? aiContent.references : []).map((ref) => {
    if (ref.style === 'book' || (ref.author && ref.title)) {
      return `<li contenteditable="true" spellcheck="false">${escapeHtml(String(ref.author || ''))}, <em>${escapeHtml(String(ref.title || ''))}</em>.</li>`;
    }
    return `<li contenteditable="true" spellcheck="false">${escapeHtml(String(ref.text || ref.title || 'Institutional Research Report, 2026.'))}</li>`;
  }).join('');

  page2Content.innerHTML = `
    <div class="sheet-header-code">${headerCode}</div>

    <div class="sheet-figure-box">
      <div class="diagram-drag-wrapper" id="diagram-drag-wrapper">
        <img id="preview-diagram-img" src="${diagramPngDataUri}" alt="${escapeHtml(String(aiContent.figureCaption || 'Architecture Diagram'))}" class="sheet-diagram-img" draggable="false" />
        <div class="resize-handle resize-se" title="Drag to resize"></div>
        <div class="drag-hint">⠿ drag to move &nbsp;|&nbsp; ↘ corner to resize</div>
      </div>
      <div class="sheet-figure-caption" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.figureCaption || `Figure 1. Architecture of ${topic}`))}</div>

      <div class="diagram-replace-bar">
        <label class="btn-replace-img">
          <input type="file" id="replace-diagram-file" accept="image/*" style="display:none;">
          📷 Upload Diagram
        </label>
        <button type="button" id="btn-search-web-img" class="btn-diagram-tool" title="Search diagrams on Google Images">
          🌐 Search Web Images
        </button>
        <button type="button" id="btn-switch-layout" class="btn-diagram-tool" title="Switch architectural layout style">
          🔄 Switch Layout
        </button>
        <button type="button" id="btn-switch-theme" class="btn-diagram-tool" title="Switch diagram color palette">
          🎨 Switch Color
        </button>
        <input type="text" id="replace-diagram-url" placeholder="Or paste image URL..." class="url-replace-input">
        <button type="button" id="btn-apply-url" class="btn-apply-url">Apply</button>
      </div>
    </div>

    <div class="sheet-section-title" contenteditable="true" spellcheck="false">4.&nbsp;&nbsp;&nbsp;&nbsp;APPLICATIONS</div>
    <p class="sheet-p" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.applicationsIntro || 'Key applications across diverse sectors include:'))}</p>
    <ul class="sheet-list">
      ${appsList}
    </ul>
    <p class="sheet-p" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.applicationsClosing || 'These applications demonstrate the transformational capability of the technology across modern enterprises.'))}</p>

    <div class="sheet-section-title" contenteditable="true" spellcheck="false">5.&nbsp;&nbsp;&nbsp;&nbsp;CONCLUSION</div>
    <p class="sheet-p" contenteditable="true" spellcheck="false">${escapeHtml(String(aiContent.conclusion || ''))}</p>

    <div class="sheet-section-title" contenteditable="true" spellcheck="false">6.&nbsp;&nbsp;&nbsp;&nbsp;REFERENCES</div>
    <ol class="sheet-num-list">
      ${refsList}
    </ol>
  `;

  // --- PAGE 3 (EXACT MATCH TO media_1787501503802.png) ---
  const letterheadImgSrc = (window.MEC_LETTERHEAD_BASE64 && window.MEC_LETTERHEAD_BASE64.startsWith('data:')) ? window.MEC_LETTERHEAD_BASE64 : 'assets/mec-letterhead.jpeg';

  page3Content.innerHTML = `
    <div class="sheet-header-code">${headerCode}</div>

    <div class="sheet-letterhead" style="text-align: center; margin-bottom: 8pt;">
      <img src="${letterheadImgSrc}" alt="Muthayammal Engineering College" class="sheet-letterhead-img" width="580" style="width: 6.0in; max-width: 100%; height: auto; display: block; margin: 0 auto;" />
    </div>

    <div class="sheet-page3-title" contenteditable="true" spellcheck="false" style="text-align: center; font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; text-decoration: underline; font-size: 16pt; margin-top: 4pt; margin-bottom: 12pt; letter-spacing: 0.5pt;">SEMINAR PRESENTATION</div>

    <table class="sheet-table" border="1" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1pt solid #000000; margin-bottom: 10pt; background-color: #ffffff;">
      <tbody>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', serif); font-size: 12pt;">Name of the Student</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${studentName}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Register No.</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${registerNo}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Course Code / Name</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${courseCodeName}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Course Faculty Name</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${facultyName}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Program / Department</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${department}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Year / Semester / Section</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${yearSemSec}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Academic Year</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${academicYear}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Seminar No.</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${seminarNo}</td></tr>
        <tr><td style="border: 1pt solid #000000; padding: 5pt 8pt; width: 35%; font-weight: normal; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;">Seminar Date</td><td style="border: 1pt solid #000000; padding: 5pt 8pt; font-family: var(--report-font, 'Times New Roman', Times, serif); font-size: 12pt;" contenteditable="true" spellcheck="false">${seminarDate}</td></tr>
      </tbody>
    </table>

    <div class="sheet-eval-title" contenteditable="true" spellcheck="false" style="text-align: center; font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 12pt; margin-top: 6pt; margin-bottom: 5pt;">Evaluation</div>

    <table class="sheet-table sheet-eval-table" border="1" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%; border: 1pt solid #000000; margin-bottom: 10pt; background-color: #ffffff; text-align: center;">
      <thead>
        <tr>
          <th style="border: 1pt solid #000000; width: 22%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Seminar Report</th>
          <th style="border: 1pt solid #000000; width: 20%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">PPT<br>[Hand Out]</th>
          <th style="border: 1pt solid #000000; width: 24%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Presentation<br>[Min. 5 Minutes]</th>
          <th style="border: 1pt solid #000000; width: 17%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Viva</th>
          <th style="border: 1pt solid #000000; width: 17%; padding: 5pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">Total</th>
        </tr>
        <tr>
          <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(5)</th>
          <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(5)</th>
          <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(10)</th>
          <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(5)</th>
          <th style="border: 1pt solid #000000; padding: 4pt 2pt; font-size: 11.5pt; font-weight: bold; font-family: var(--report-font, 'Times New Roman', Times, serif); background-color: #ffffff; text-align: center; vertical-align: middle;">(25)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
          <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
          <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
          <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
          <td class="empty-cell" style="border: 1pt solid #000000; height: 30pt; text-align: center; vertical-align: middle;">&nbsp;</td>
        </tr>
      </tbody>
    </table>

    <table class="sheet-sig-table" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: none; margin-top: 4pt; margin-bottom: 8pt; background-color: #ffffff;">
      <tr>
        <td style="border: none; text-align: left; width: 33%; font-weight: bold; font-size: 12pt; font-family: var(--report-font, 'Times New Roman', Times, serif); vertical-align: bottom; padding-top: 30pt;" contenteditable="true" spellcheck="false">Student Signature</td>
        <td style="border: none; text-align: center; width: 34%; font-weight: bold; font-size: 12pt; font-family: var(--report-font, 'Times New Roman', Times, serif); vertical-align: bottom; padding-top: 30pt;" contenteditable="true" spellcheck="false">Course Faculty Signature</td>
        <td style="border: none; text-align: right; width: 33%; font-weight: bold; font-size: 12pt; font-family: var(--report-font, 'Times New Roman', Times, serif); vertical-align: bottom; padding-top: 30pt;" contenteditable="true" spellcheck="false">HOD</td>
      </tr>
    </table>

    <div class="sheet-note-title" contenteditable="true" spellcheck="false" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 16pt; margin-top: 6pt; margin-bottom: 4pt; text-align: left;">Note:</div>
    <div class="sheet-note-item" contenteditable="true" spellcheck="false" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 11.5pt; line-height: 1.4; margin-bottom: 3pt; text-align: left; margin-left: 6pt;">1.&nbsp;&nbsp;&nbsp;&nbsp;Seminar Presentation : Minimum 5 minutes.</div>
    <div class="sheet-note-item" contenteditable="true" spellcheck="false" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 11.5pt; line-height: 1.4; margin-bottom: 3pt; text-align: left; margin-left: 6pt;">2.&nbsp;&nbsp;&nbsp;&nbsp;Student should submit at least 4 PPT slides and 2 pages seminar report.</div>
    <div class="sheet-note-item" contenteditable="true" spellcheck="false" style="font-family: var(--report-font, 'Times New Roman', Times, serif); font-weight: bold; font-size: 11.5pt; line-height: 1.4; margin-bottom: 3pt; text-align: left; margin-left: 6pt;">3.&nbsp;&nbsp;&nbsp;&nbsp;Any one of the following shall be used for the seminar presentation:</div>
    <table class="sheet-note-table" border="0" cellspacing="0" cellpadding="0" style="width: 100%; border-collapse: collapse; border: none; margin-top: 2pt; margin-bottom: 2pt; background-color: #ffffff;">
      <tr>
        <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);" contenteditable="true" spellcheck="false">&#x2022;&nbsp;&nbsp;Technical Video</td>
        <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);" contenteditable="true" spellcheck="false">&#x2022;&nbsp;&nbsp;Research Work</td>
      </tr>
      <tr>
        <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);" contenteditable="true" spellcheck="false">&#x2022;&nbsp;&nbsp;Technical Problem</td>
        <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);" contenteditable="true" spellcheck="false">&#x2022;&nbsp;&nbsp;Patent</td>
      </tr>
      <tr>
        <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);" contenteditable="true" spellcheck="false">&#x2022;&nbsp;&nbsp;Project Demo</td>
        <td style="border: none; font-size: 11.5pt; font-weight: bold; width: 50%; padding: 2pt 8pt 2pt 28pt; text-align: left; vertical-align: middle; font-family: var(--report-font, 'Times New Roman', Times, serif);" contenteditable="true" spellcheck="false">&#x2022;&nbsp;&nbsp;Course Topic</td>
      </tr>
    </table>
  `;

  // Attach diagram interactions after DOM is ready
  setupDiagramInteractions(formData, aiContent);

  previewContainer.classList.remove('hidden');
  // Use rAF to ensure the container is visible and painted before computing scale
  if (typeof updatePreviewScale === 'function') {
    requestAnimationFrame(() => updatePreviewScale());
  }
  previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Set up drag-to-move, corner-resize, and interactive layout switching for diagram
 */
function setupDiagramInteractions(formData = {}, aiContent = {}) {
  const wrapper = document.getElementById('diagram-drag-wrapper');
  const imgEl = document.getElementById('preview-diagram-img');
  const fileInput = document.getElementById('replace-diagram-file');
  const urlInput = document.getElementById('replace-diagram-url');
  const applyUrlBtn = document.getElementById('btn-apply-url');
  const searchWebBtn = document.getElementById('btn-search-web-img');
  const switchLayoutBtn = document.getElementById('btn-switch-layout');
  const switchThemeBtn = document.getElementById('btn-switch-theme');

  if (!wrapper || !imgEl) return;

  const topic = formData.topic || aiContent.title || 'Seminar Topic';
  const layoutTypes = [
    'process_flow', 'layered_architecture', 'network', 'cause_effect', 
    'ecosystem', 'feedback_loop', 'input_process_output', 'cycle', 
    'hub_spoke', 'hierarchical_tree', 'comparison', 'timeline'
  ];
  let currentLayoutIdx = 0;
  let currentThemeIdx = 0;

  // Initialize layout index based on topic default or diagram type
  if (aiContent && aiContent.diagram && aiContent.diagram.type) {
    const initialIdx = layoutTypes.indexOf(aiContent.diagram.type.toLowerCase());
    if (initialIdx !== -1) currentLayoutIdx = initialIdx;
  }

  // ── SWITCH DIAGRAM LAYOUT ─────────────────────────────────────
  if (switchLayoutBtn) {
    switchLayoutBtn.addEventListener('click', async () => {
      currentLayoutIdx = (currentLayoutIdx + 1) % layoutTypes.length;
      const layout = layoutTypes[currentLayoutIdx];
      const svg = window.generateDiagramSvg(aiContent.diagram, topic, layout, currentThemeIdx);
      const png = await window.rasterizeSvgToPng(svg, aiContent.diagram, topic, 760, 370);
      imgEl.src = png;
      imgEl.style.width = '';
      imgEl.style.height = '';
      switchLayoutBtn.textContent = `🔄 Layout: ${layout.replace(/_/g, ' ').toUpperCase()}`;
    });
  }

  // ── SWITCH DIAGRAM COLOR THEME ────────────────────────────────
  if (switchThemeBtn) {
    switchThemeBtn.addEventListener('click', async () => {
      currentThemeIdx = (currentThemeIdx + 1) % 5;
      const layout = layoutTypes[currentLayoutIdx];
      const svg = window.generateDiagramSvg(aiContent.diagram, topic, layout, currentThemeIdx);
      const png = await window.rasterizeSvgToPng(svg, aiContent.diagram, topic, 760, 370);
      imgEl.src = png;
      imgEl.style.width = '';
      imgEl.style.height = '';
      const themeNames = ['Navy', 'Teal', 'Slate', 'Crimson', 'Indigo'];
      switchThemeBtn.textContent = `🎨 Color: ${themeNames[currentThemeIdx]}`;
    });
  }

  // ── SEARCH WEB IMAGES SHORTCUT ────────────────────────────────
  if (searchWebBtn) {
    searchWebBtn.addEventListener('click', () => {
      const q = encodeURIComponent(`${topic} architecture diagram`);
      window.open(`https://www.google.com/search?tbm=isch&q=${q}`, '_blank');
    });
  }

  // ── DRAG TO MOVE ──────────────────────────────────────────────
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;

  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resize-se') ||
        e.target.closest('.diagram-replace-bar') ||
        e.target.closest('.drag-hint')) return;

    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    wrapper.style.position = 'relative';
    wrapper.style.cursor = 'grabbing';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      wrapper.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      wrapper.style.cursor = 'grab';
    }
  });

  // ── CORNER RESIZE ─────────────────────────────────────────────
  const resizeHandle = wrapper.querySelector('.resize-se');
  if (resizeHandle) {
    let isResizing = false;
    let resizeStartX = 0, resizeStartY = 0;
    let startW = 0, startH = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      startW = imgEl.offsetWidth;
      startH = imgEl.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        const newW = Math.max(150, startW + (e.clientX - resizeStartX));
        const newH = Math.max(80, startH + (e.clientY - resizeStartY));
        imgEl.style.width = newW + 'px';
        imgEl.style.height = newH + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  // ── FILE REPLACE ──────────────────────────────────────────────
  if (fileInput && imgEl) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
          alert('Invalid file format. Please upload a PNG, JPEG, or WebP image.');
          fileInput.value = '';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert('Image size exceeds maximum limit of 5MB.');
          fileInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          imgEl.src = event.target.result;
          imgEl.style.width = '';
          imgEl.style.height = '';
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // ── URL REPLACE ───────────────────────────────────────────────
  if (applyUrlBtn && urlInput && imgEl) {
    applyUrlBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        try {
          const parsed = new URL(url);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            alert('Invalid URL. Only HTTP and HTTPS URLs are permitted.');
            return;
          }
          imgEl.src = url;
          imgEl.style.width = '';
          imgEl.style.height = '';
        } catch (e) {
          alert('Please enter a valid HTTP/HTTPS image URL.');
        }
      }
    });
  }
}

window.renderLivePreview = renderLivePreview;

/**
 * Responsive Mobile Preview Scaling System
 * Automatically calculates scale based on viewport width while preserving exact A4 dimensions
 */
let isZoomForced100 = false;

function calculatePreviewScale(availableWidth, baseWidth = 850) {
  if (isZoomForced100 || availableWidth >= baseWidth) {
    return 1;
  }
  const scale = availableWidth / baseWidth;
  return Math.max(0.25, Math.min(1, scale));
}

function updatePreviewScale() {
  const container = document.getElementById('preview-container');
  const baseWidth = 850;  // Standard A4 reference width in px
  const baseHeight = 1202; // Exact A4 proportional height (850 * 1.4142)

  // Use window.innerWidth as the reliable viewport reference.
  // wrapper.clientWidth can be unreliable when overflow:hidden is active or
  // when the function is called just before the container becomes visible.
  const isMobile = window.innerWidth <= 768;
  const horizontalPad = isMobile ? 24 : 48; // padding on each side of the sheet
  const availableWidth = Math.max(260, window.innerWidth - horizontalPad);

  const scale = calculatePreviewScale(availableWidth, baseWidth);
  document.documentElement.style.setProperty('--sheet-scale', scale.toFixed(4));

  // Update all viewport wrappers so they occupy exactly the scaled area in flow
  const viewports = document.querySelectorAll('.sheet-viewport');
  viewports.forEach(vp => {
    vp.style.width = Math.round(baseWidth * scale) + 'px';
    vp.style.height = Math.round(baseHeight * scale) + 'px';
  });

  // When zoomed to 100%, allow scrolling; when fit-screen, clip overflow
  const wrapper = document.getElementById('sheets-wrapper');
  if (wrapper) {
    wrapper.style.overflowX = (isZoomForced100 && scale >= 1) ? 'auto' : 'hidden';
  }

  const zoomBtn = document.getElementById('zoom-toggle-text');
  if (zoomBtn) {
    if (isZoomForced100) {
      zoomBtn.textContent = '🔍 Fit Screen';
    } else if (scale < 0.98) {
      zoomBtn.textContent = `🔍 100% (${Math.round(scale * 100)}%)`;
    } else {
      zoomBtn.textContent = '🔍 100% A4';
    }
  }
}

function setupPreviewScaling() {
  window.addEventListener('resize', () => {
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(updatePreviewScale);
    } else {
      updatePreviewScale();
    }
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(updatePreviewScale, 150);
  });

  const zoomBtn = document.getElementById('btn-toggle-zoom');
  if (zoomBtn) {
    zoomBtn.addEventListener('click', () => {
      isZoomForced100 = !isZoomForced100;
      updatePreviewScale();
    });
  }

  if (typeof window.ResizeObserver === 'function') {
    const previewContainer = document.getElementById('preview-container');
    if (previewContainer) {
      const ro = new ResizeObserver(() => {
        if (window.requestAnimationFrame) {
          window.requestAnimationFrame(updatePreviewScale);
        } else {
          updatePreviewScale();
        }
      });
      ro.observe(previewContainer);
    }
  }
}

window.calculatePreviewScale = calculatePreviewScale;
window.updatePreviewScale = updatePreviewScale;
window.setupPreviewScaling = setupPreviewScaling;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPreviewScaling);
} else {
  setupPreviewScaling();
}

