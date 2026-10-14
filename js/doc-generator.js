/**
 * Document Generator Module for Muthayammal Engineering College
 * Generates official 3-page seminar report formatted HTML packaged as downloadable .doc file.
 * Exactly matches official template (seminar format (1).docx / media_1787501503802.png).
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
}

function getCollegeLetterheadHtml(logoDataUri = '') {
  const imgSrc = (logoDataUri && logoDataUri.startsWith('data:')) ? logoDataUri : (window.MEC_LETTERHEAD_BASE64 || 'assets/mec-letterhead.jpeg');
  const isDataUri = imgSrc.startsWith('data:');

  if (isDataUri) {
    // Word-native VML embedding — avoids "Cannot find linked file" warnings
    // and prevents images from overflowing to the next page
    return `
    <div class="letterhead-container" style="text-align: center; margin-bottom: 10pt; mso-element:para-border-div;">
      <!--[if gte vml 1]>
      <v:shape id="letterhead_img" type="#_x0000_t75"
        style="width:576pt;height:auto;mso-position-horizontal:center;mso-position-horizontal-relative:page;visibility:visible;mso-wrap-style:inline;mso-lock-aspect-ratio:t"
        o:spid="_x0000_i1025">
        <v:imagedata src="${imgSrc}" o:title="MEC Letterhead"/>
      </v:shape>
      <![endif]-->
      <!--[if !vml]--><img src="${imgSrc}" alt="Muthayammal Engineering College" width="580" style="width:6.0in;max-width:100%;height:auto;display:block;margin:0 auto;" /><!--[endif]-->
    </div>
  `;
  }

  // Fallback for asset path (local dev only)
  return `
    <div class="letterhead-container" style="text-align: center; margin-bottom: 10pt;">
      <img src="${imgSrc}" alt="Muthayammal Engineering College" width="580" style="width: 6.0in; max-width: 100%; height: auto; display: block; margin: 0 auto;" />
    </div>
  `;
}

/**
 * Generate full Microsoft Word HTML Document String with 3 distinct pages
 */
function generateWordDocHtml(formData, aiContent, diagramPngDataUri, letterheadPngDataUri = '') {
  const fontName = (formData && formData.fontStyle) ? formData.fontStyle : 'Times New Roman';
  const WORD_FONT_STACKS = {
    'Times New Roman': '"Times New Roman", Times, serif',
    'Arial': 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    'Calibri': 'Calibri, "Segoe UI", Candara, Arial, sans-serif',
    'Georgia': 'Georgia, Cambria, "Times New Roman", serif'
  };
  const fontStack = WORD_FONT_STACKS[fontName] || '"Times New Roman", Times, serif';

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

  const abstract = escapeHtml(aiContent.abstract || '');
  const introduction = escapeHtml(aiContent.introduction || '');
  const themeParagraph1 = escapeHtml(aiContent.themeParagraph1 || '');
  const themeParagraph2 = escapeHtml(aiContent.themeParagraph2 || '');
  const figureCaption = escapeHtml(aiContent.figureCaption || `Figure 1. Architecture of ${topic}`);

  const applicationsIntro = escapeHtml(aiContent.applicationsIntro || 'The major applications across diverse engineering and industrial sectors include:');
  const applicationsClosing = escapeHtml(aiContent.applicationsClosing || 'These applications demonstrate the versatility and transformational capability of the technology across modern enterprises.');
  
  const applicationsListHtml = (aiContent.applications || []).map(app => {
    return `<li><b>${escapeHtml(app.domain)}:</b> ${escapeHtml(app.text)}</li>`;
  }).join('\n');

  const conclusion = escapeHtml(aiContent.conclusion || '');

  const referencesListHtml = (aiContent.references || []).map((ref) => {
    if (ref.style === 'book' || (ref.author && ref.title)) {
      return `<li>${escapeHtml(ref.author)}, <i>${escapeHtml(ref.title)}</i>.</li>`;
    }
    return `<li>${escapeHtml(ref.text || ref.title || 'IEEE Technical Report on Advanced Systems, 2026.')}</li>`;
  }).join('\n');

  const letterheadHtml = getCollegeLetterheadHtml(letterheadPngDataUri);

  return `
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${escapeHtml(topic)} - Seminar Report</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:SpellingState>Clean</w:SpellingState>
    <w:GrammarState>Clean</w:GrammarState>
    <w:DocumentKind>Document</w:DocumentKind>
    <w:DrawingGridHorizontalSpacing>6 pt</w:DrawingGridHorizontalSpacing>
    <w:DisplayHorizontalDrawingGridEvery>0</w:DisplayHorizontalDrawingGridEvery>
    <w:DisplayVerticalDrawingGridEvery>2</w:DisplayVerticalDrawingGridEvery>
    <w:ValidateAgainstSchemas/>
    <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
    <w:IgnoreMarketDataStructure>false</w:IgnoreMarketDataStructure>
    <w:AllowPNG/>
    <w:Compatibility>
      <w:BreakWrappedTables/>
      <w:SnapToGridInCell/>
      <w:WrapTextWithPunct/>
      <w:UseAsianBreakRules/>
      <w:DontGrowAutofit/>
      <w:SplitPgBreakAndParaMark/>
      <w:EnableOpenTypeFeatures/>
    </w:Compatibility>
    <w:BrowserLevel>MicrosoftInternetExplorer4</w:BrowserLevel>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @font-face {
    font-family: 'Times New Roman';
    panose-1: 2 2 6 3 5 4 5 2 3 4;
    mso-font-charset: 0;
    mso-generic-font-family: roman;
    mso-font-pitch: variable;
    mso-font-signature: -536870145 1107305791 0 0 415 0;
  }
  @page Section1 {
    size: 210mm 297mm; /* Standard A4 */
    margin: 20mm 20mm 20mm 20mm;
    mso-header-margin: 12mm;
    mso-footer-margin: 12mm;
    mso-header: h1;
    mso-paper-source: 0;
  }
  div.Section1 {
    page: Section1;
  }
  p.MsoHeader, div.MsoHeader {
    margin: 0pt;
    margin-top: 0pt;
    margin-bottom: 0pt;
    text-align: right;
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 11pt;
    color: #000000;
  }
  body {
    font-family: ${fontStack};
    font-size: 12pt;
    line-height: 1.35;
    color: #000000;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }
  p {
    font-family: ${fontStack};
    font-size: 12pt;
    line-height: 1.30;
    margin-top: 0pt;
    margin-bottom: 5.5pt;
    text-align: justify;
    text-justify: inter-ideograph;
  }
  .report-title {
    text-align: center;
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 16pt;
    line-height: 1.25;
    margin-top: 0pt;
    margin-bottom: 6pt;
  }
  .byline {
    text-align: left;
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 11.5pt;
    line-height: 1.35;
    margin-top: 0pt;
    margin-bottom: 14pt;
  }
  .sec-heading {
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 12.5pt;
    margin-top: 12pt;
    margin-bottom: 4pt;
    text-align: left;
    text-transform: uppercase;
  }
  .intro-p {
    margin-left: 0.046in;
    text-align: justify;
    text-justify: inter-ideograph;
  }
  .figure-wrapper {
    text-align: center;
    margin-top: 8pt;
    margin-bottom: 4pt;
  }
  .figure-caption {
    text-align: center;
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 11pt;
    margin-top: 3pt;
    margin-bottom: 6pt;
  }
  ul.app-list {
    margin-top: 4pt;
    margin-bottom: 6pt;
    padding-left: 20pt;
    text-align: left;
  }
  ul.app-list li {
    font-family: ${fontStack};
    font-size: 11.5pt;
    line-height: 1.28;
    margin-bottom: 3.5pt;
    text-align: justify;
    text-justify: inter-ideograph;
  }
  ol.ref-list {
    margin-top: 4pt;
    margin-bottom: 4pt;
    padding-left: 18pt;
    text-align: left;
  }
  ol.ref-list li {
    font-family: ${fontStack};
    font-size: 11.5pt;
    line-height: 1.28;
    margin-bottom: 3.5pt;
    text-align: left;
  }
  
  .page-break {
    page-break-before: always;
    mso-special-character: line-break;
    clear: both;
  }

  .page3-title {
    text-align: center;
    font-family: ${fontStack};
    font-weight: bold;
    text-decoration: underline;
    font-size: 16pt;
    margin-top: 4pt;
    margin-bottom: 12pt;
    letter-spacing: 0.5pt;
  }
  table.details-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
    font-family: ${fontStack};
  }
  table.details-table td {
    border: 1pt solid #000000;
    padding: 5pt 8pt;
    font-size: 12pt;
    line-height: 1.2;
    vertical-align: middle;
    font-weight: normal;
  }
  table.details-table td.label-col {
    width: 35%;
    font-weight: normal;
  }
  .eval-heading {
    text-align: center;
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 12pt;
    margin-top: 8pt;
    margin-bottom: 6pt;
  }
  table.eval-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14pt;
    font-family: ${fontStack};
  }
  table.eval-table th {
    border: 1pt solid #000000;
    padding: 5pt 3pt;
    font-size: 11.5pt;
    font-weight: bold;
    background-color: #ffffff;
    text-align: center;
    vertical-align: middle;
  }
  table.eval-table td {
    border: 1pt solid #000000;
    height: 30pt;
    font-size: 11pt;
    text-align: center;
    vertical-align: middle;
  }
  table.sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8pt;
    margin-bottom: 14pt;
    font-family: ${fontStack};
  }
  table.sig-table td {
    border: none;
    font-weight: bold;
    font-size: 12pt;
    vertical-align: bottom;
    padding-top: 30pt;
  }
  .notes-heading {
    font-family: ${fontStack};
    font-weight: bold;
    font-size: 16pt;
    margin-top: 6pt;
    margin-bottom: 4pt;
    text-align: left;
  }
  .note-item {
    font-family: ${fontStack};
    font-size: 11.5pt;
    font-weight: bold;
    line-height: 1.4;
    margin-bottom: 3pt;
    margin-left: 6pt;
  }
  table.notes-options {
    width: 100%;
    border: none;
    border-collapse: collapse;
    margin-top: 3pt;
    margin-bottom: 3pt;
    font-family: ${fontStack};
  }
  table.notes-options td {
    border: none;
    font-size: 11.5pt;
    font-weight: bold;
    width: 50%;
    padding: 2pt 8pt 2pt 28pt;
    text-align: left;
    vertical-align: middle;
  }
</style>
</head>
<body style="background-color: #ffffff; margin: 0; padding: 0;" bgcolor="#ffffff">

<!-- Word Native Running Header Definition -->
<div style="mso-element:header" id="h1">
  <p class="MsoHeader" style="text-align: right; font-family: ${fontStack}; font-weight: bold; font-size: 11pt; margin: 0; padding: 0;">
    ${headerCode}
  </p>
</div>

<div class="Section1">

  <!-- ==================== PAGE 1 (Title, Byline, Sec 1, Sec 2, Sec 3) ==================== -->
  <div class="report-title">${topic}</div>

  <p class="byline">
    ${studentName}, ${registerNo}, ${yearSemSec}, ${department}, Muthayammal Engineering College${seminarDate ? `, ${seminarDate}` : ''}
  </p>

  <div class="sec-heading">1. ABSTRACT</div>
  <p>${abstract}</p>

  <div class="sec-heading">2. INTRODUCTION</div>
  <p class="intro-p">${introduction}</p>

  <div class="sec-heading">3. THEME OF THE SEMINAR</div>
  <p>${themeParagraph1}</p>
  ${themeParagraph2 ? `<p>${themeParagraph2}</p>` : ''}

  <!-- ==================== PAGE 2 (FORCED BREAK: Figure 1, Sec 4 Applications, Sec 5 Conclusion, Sec 6 References) ==================== -->
  <div class="page-break" style="page-break-before: always; mso-special-character: line-break; clear: both;"></div>

  <div class="figure-wrapper" style="margin-top: 6pt; margin-bottom: 6pt; text-align: center;">
    <!--[if gte vml 1]>
    <v:shape id="diagram_img" type="#_x0000_t75"
      style="width:500pt;height:auto;mso-position-horizontal:center;mso-position-horizontal-relative:page;visibility:visible;mso-wrap-style:inline;mso-lock-aspect-ratio:t"
      o:spid="_x0000_i1026">
      <v:imagedata src="${diagramPngDataUri}" o:title="${figureCaption}"/>
    </v:shape>
    <![endif]-->
    <!--[if !vml]--><img src="${diagramPngDataUri}" alt="${figureCaption}" width="500" style="width:5.2in;max-width:100%;height:auto;display:block;margin:0 auto;" /><!--[endif]-->
    <div class="figure-caption" style="margin-top: 3pt;">${figureCaption}</div>
  </div>

  <div class="sec-heading" style="margin-top: 8pt;">4. APPLICATIONS</div>
  <p>${applicationsIntro}</p>
  <ul class="app-list">
    ${applicationsListHtml}
  </ul>
  <p>${applicationsClosing}</p>

  <div class="sec-heading" style="margin-top: 16pt;">5. CONCLUSION</div>
  <p>${conclusion}</p>

  <div class="sec-heading" style="margin-top: 16pt;">6. REFERENCES</div>
  <ol class="ref-list">
    ${referencesListHtml}
  </ol>

  <!-- ==================== PAGE 3 (FORCED BREAK: Evaluation Sheet) ==================== -->
  <div class="page-break" style="page-break-before: always; mso-special-character: line-break; clear: both;"></div>

  ${letterheadHtml}

  <div class="page3-title">SEMINAR PRESENTATION</div>

  <table class="details-table">
    <tr>
      <td class="label-col">Name of the Student</td>
      <td>${studentName}</td>
    </tr>
    <tr>
      <td class="label-col">Register No.</td>
      <td>${registerNo}</td>
    </tr>
    <tr>
      <td class="label-col">Course Code / Name</td>
      <td>${courseCodeName}</td>
    </tr>
    <tr>
      <td class="label-col">Course Faculty Name</td>
      <td>${facultyName}</td>
    </tr>
    <tr>
      <td class="label-col">Program / Department</td>
      <td>${department}</td>
    </tr>
    <tr>
      <td class="label-col">Year / Semester / Section</td>
      <td>${yearSemSec}</td>
    </tr>
    <tr>
      <td class="label-col">Academic Year</td>
      <td>${academicYear}</td>
    </tr>
    <tr>
      <td class="label-col">Seminar No.</td>
      <td>${seminarNo}</td>
    </tr>
    <tr>
      <td class="label-col">Seminar Date</td>
      <td>${seminarDate}</td>
    </tr>
  </table>

  <div class="eval-heading">Evaluation</div>

  <table class="eval-table">
    <thead>
      <tr>
        <th style="width: 20%;">Seminar Report</th>
        <th style="width: 20%;">PPT<br>[Hand Out]</th>
        <th style="width: 24%;">Presentation<br>[Min. 5 Minutes]</th>
        <th style="width: 16%;">Viva</th>
        <th style="width: 20%;">Total</th>
      </tr>
      <tr>
        <th>(5)</th>
        <th>(5)</th>
        <th>(10)</th>
        <th>(5)</th>
        <th>(25)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    </tbody>
  </table>

  <table class="sig-table">
    <tr>
      <td style="text-align: left; width: 33%;">Student Signature</td>
      <td style="text-align: center; width: 34%;">Course Faculty Signature</td>
      <td style="text-align: right; width: 33%;">HOD</td>
    </tr>
  </table>

  <div class="notes-heading">Note:</div>
  <div class="note-item">1.&nbsp;&nbsp;&nbsp;&nbsp;Seminar Presentation : Minimum 5 minutes.</div>
  <div class="note-item">2.&nbsp;&nbsp;&nbsp;&nbsp;Student should submit at least 4 PPT slides and 2 pages seminar report.</div>
  <div class="note-item">3.&nbsp;&nbsp;&nbsp;&nbsp;Any one of the following shall be used for the seminar presentation:</div>
  <table class="notes-options">
    <tr>
      <td>&bull;&nbsp;&nbsp;&nbsp;&nbsp;Technical Video</td>
      <td>&bull;&nbsp;&nbsp;&nbsp;&nbsp;Research Work</td>
    </tr>
    <tr>
      <td>&bull;&nbsp;&nbsp;&nbsp;&nbsp;Technical Problem</td>
      <td>&bull;&nbsp;&nbsp;&nbsp;&nbsp;Patent</td>
    </tr>
    <tr>
      <td>&bull;&nbsp;&nbsp;&nbsp;&nbsp;Project Demo</td>
      <td>&bull;&nbsp;&nbsp;&nbsp;&nbsp;Course Topic</td>
    </tr>
  </table>

</div>
</body>
</html>
  `.trim();
}

/**
 * Clean clone of preview DOM for Word doc generation
 * Strips all interactive UI widgets (drag badges, resize handles, file replacement bars)
 * and removes inline header texts so native Word running header takes over.
 */
function cleanDomForWordExport(pageElement) {
  if (!pageElement) return '';
  const clone = pageElement.cloneNode(true);

  // Remove sheet header code from body since it will be in the native Word header
  const headerCodes = clone.querySelectorAll('.sheet-header-code, .header-code');
  headerCodes.forEach(el => el.remove());

  // Remove UI helper elements
  const uiElements = clone.querySelectorAll('.diagram-replace-bar, .drag-hint, .resize-se, input, button, label');
  uiElements.forEach(el => el.remove());

  // Remove contenteditable and spellcheck attributes
  const editables = clone.querySelectorAll('[contenteditable]');
  editables.forEach(el => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('spellcheck');
  });

  // Reset drag wrapper styles to standard centered block
  const dragWrappers = clone.querySelectorAll('.diagram-drag-wrapper');
  dragWrappers.forEach(w => {
    w.style.position = 'static';
    w.style.left = 'auto';
    w.style.top = 'auto';
    w.style.cursor = 'default';
    w.style.transform = 'none';
  });

  // Convert diagram images to VML for Word-safe embedding (no "linked file" warnings)
  const diagramImgs = clone.querySelectorAll('.sheet-diagram-img');
  diagramImgs.forEach(img => {
    const src = img.src || img.getAttribute('src') || '';
    if (!src) return;
    const caption = img.alt || 'Figure 1. Architecture Diagram';
    const vmlHtml = `<!--[if gte vml 1]>
<v:shape id="diagram_img_${Date.now()}" type="#_x0000_t75"
  style="width:500pt;height:auto;mso-position-horizontal:center;mso-position-horizontal-relative:page;visibility:visible;mso-wrap-style:inline;mso-lock-aspect-ratio:t"
  o:spid="_x0000_i1026">
  <v:imagedata src="${src}" o:title="${caption}"/>
</v:shape>
<![endif]--><!--[if !vml]--><img src="${src}" alt="${caption}" width="500" style="width:5.2in;max-width:100%;height:auto;display:block;margin:0 auto;" /><!--[endif]-->`;
    const placeholder = clone.createElement ? clone.createElement('span') : document.createElement('span');
    placeholder.innerHTML = vmlHtml;
    img.parentNode.replaceChild(placeholder, img);
  });

  // Convert letterhead images to VML for Word-safe embedding
  const letterheadImgs = clone.querySelectorAll('.sheet-letterhead-img');
  letterheadImgs.forEach(img => {
    let src = img.src || img.getAttribute('src') || '';
    if ((!src || src.startsWith('assets/') || !src.startsWith('data:')) && window.MEC_LETTERHEAD_BASE64) {
      src = window.MEC_LETTERHEAD_BASE64;
    }
    if (!src) return;
    const vmlHtml = `<!--[if gte vml 1]>
<v:shape id="letterhead_img_${Date.now()}" type="#_x0000_t75"
  style="width:576pt;height:auto;mso-position-horizontal:center;mso-position-horizontal-relative:page;visibility:visible;mso-wrap-style:inline;mso-lock-aspect-ratio:t"
  o:spid="_x0000_i1025">
  <v:imagedata src="${src}" o:title="MEC Letterhead"/>
</v:shape>
<![endif]--><!--[if !vml]--><img src="${src}" alt="Muthayammal Engineering College" width="580" style="width:6.0in;max-width:100%;height:auto;display:block;margin:0 auto;" /><!--[endif]-->`;
    const placeholder = document.createElement('span');
    placeholder.innerHTML = vmlHtml;
    img.parentNode.replaceChild(placeholder, img);
  });

  // Ensure all tables have proper Word inline attributes
  const tables = clone.querySelectorAll('table');
  tables.forEach(tbl => {
    tbl.setAttribute('cellspacing', '0');
    if (tbl.classList.contains('sheet-sig-table') || tbl.classList.contains('sheet-note-table')) {
      tbl.setAttribute('border', '0');
      tbl.setAttribute('cellpadding', '0');
      tbl.style.border = 'none';
      tbl.style.borderCollapse = 'collapse';
      tbl.style.width = '100%';
    } else {
      tbl.setAttribute('border', '1');
      tbl.setAttribute('cellpadding', '4');
      tbl.style.border = '1pt solid #000000';
      tbl.style.borderCollapse = 'collapse';
      tbl.style.width = '100%';
    }
  });

  return clone.innerHTML;
}

/**
 * Generate full Word doc directly from edited preview sheets HTML
 */
function generateWordDocFromEditedPreview(title = 'Seminar Report') {
  const page1El = document.getElementById('preview-page-1');
  const page2El = document.getElementById('preview-page-2');
  const page3El = document.getElementById('preview-page-3');

  const page1 = cleanDomForWordExport(page1El);
  const page2 = cleanDomForWordExport(page2El);
  const page3 = cleanDomForWordExport(page3El);

  return `
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<title>${escapeHtml(title)} - Seminar Report</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:SpellingState>Clean</w:SpellingState>
    <w:GrammarState>Clean</w:GrammarState>
    <w:DocumentKind>Document</w:DocumentKind>
    <w:DrawingGridHorizontalSpacing>6 pt</w:DrawingGridHorizontalSpacing>
    <w:DisplayHorizontalDrawingGridEvery>0</w:DisplayHorizontalDrawingGridEvery>
    <w:DisplayVerticalDrawingGridEvery>2</w:DisplayVerticalDrawingGridEvery>
    <w:ValidateAgainstSchemas/>
    <w:SaveIfXMLInvalid>false</w:SaveIfXMLInvalid>
    <w:IgnoreMarketDataStructure>false</w:IgnoreMarketDataStructure>
    <w:AllowPNG/>
    <w:Compatibility>
      <w:BreakWrappedTables/>
      <w:SnapToGridInCell/>
      <w:WrapTextWithPunct/>
      <w:UseAsianBreakRules/>
      <w:DontGrowAutofit/>
      <w:SplitPgBreakAndParaMark/>
      <w:EnableOpenTypeFeatures/>
    </w:Compatibility>
    <w:BrowserLevel>MicrosoftInternetExplorer4</w:BrowserLevel>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page Section1 {
    size: 210mm 297mm; /* Standard A4 */
    margin: 20mm 20mm 20mm 20mm;
    mso-header-margin: 12mm;
    mso-footer-margin: 12mm;
    mso-header: h1;
    mso-paper-source: 0;
  }
  div.Section1 {
    page: Section1;
  }
  p.MsoHeader, div.MsoHeader {
    margin: 0pt;
    margin-top: 0pt;
    margin-bottom: 0pt;
    text-align: right;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 11pt;
    color: #000000;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.25;
    color: #000000;
    margin: 0;
    padding: 0;
    background-color: #ffffff;
  }
  p, .sheet-p {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.25;
    margin-top: 0pt;
    margin-bottom: 5pt;
    text-align: justify;
    text-justify: inter-ideograph;
  }
  .sheet-title {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 16pt;
    line-height: 1.2;
    margin-top: 0pt;
    margin-bottom: 4pt;
  }
  .sheet-byline {
    text-align: left;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 11.5pt;
    line-height: 1.3;
    margin-top: 0pt;
    margin-bottom: 12pt;
  }
  .sheet-section-title {
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 12pt;
    margin-top: 8pt;
    margin-bottom: 3pt;
    text-align: left;
  }
  .sheet-p.intro-indent {
    margin-left: 0.046in;
  }
  .sheet-figure-box {
    text-align: center;
    margin: 3pt 0 2pt;
  }
  .sheet-diagram-img {
    width: 5.2in;
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .sheet-figure-caption {
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 11pt;
    margin-top: 2pt;
    margin-bottom: 4pt;
    text-align: center;
  }
  .sheet-list, .sheet-num-list {
    margin: 2pt 0 3pt 18pt;
  }
  .sheet-list li, .sheet-num-list li {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11.5pt;
    line-height: 1.22;
    margin-bottom: 2pt;
  }
  .page-break {
    page-break-before: always;
    mso-special-character: line-break;
    clear: both;
  }
  .sheet-letterhead {
    text-align: center;
    margin-bottom: 10pt;
  }
  .sheet-letterhead-img {
    width: 6.0in;
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  .sheet-page3-title {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    text-decoration: underline;
    font-size: 16pt;
    margin-top: 4pt;
    margin-bottom: 10pt;
    letter-spacing: 0.5pt;
  }
  table.sheet-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10pt;
    font-family: 'Times New Roman', Times, serif;
    background-color: #ffffff;
  }
  table.sheet-table td {
    border: 1pt solid #000000;
    padding: 4pt 8pt;
    font-size: 12pt;
    line-height: 1.2;
    vertical-align: middle;
  }
  table.sheet-table td.sheet-label-td {
    width: 35%;
    font-weight: bold;
  }
  .sheet-eval-title {
    text-align: center;
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 12pt;
    margin-top: 8pt;
    margin-bottom: 5pt;
  }
  table.sheet-eval-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
    font-family: 'Times New Roman', Times, serif;
    background-color: #ffffff;
  }
  table.sheet-eval-table th {
    border: 1pt solid #000000;
    padding: 4pt 2pt;
    font-size: 11pt;
    font-weight: bold;
    background-color: #f2f2f2;
    text-align: center;
    vertical-align: middle;
  }
  table.sheet-eval-table td {
    border: 1pt solid #000000;
    height: 30pt;
    font-size: 11pt;
    text-align: center;
    vertical-align: middle;
  }
  table.sheet-sig-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14pt;
    margin-bottom: 12pt;
    font-family: 'Times New Roman', Times, serif;
    background-color: #ffffff;
  }
  table.sheet-sig-table td {
    border: none;
    font-weight: bold;
    font-size: 12pt;
    vertical-align: bottom;
    padding-top: 22pt;
  }
  .sheet-note-title {
    font-family: 'Times New Roman', Times, serif;
    font-weight: bold;
    font-size: 14pt;
    margin-top: 6pt;
    margin-bottom: 4pt;
    text-align: left;
  }
  .sheet-note-item {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.25;
    margin-bottom: 3pt;
    text-align: left;
  }
  table.sheet-note-table {
    width: 100%;
    border: none;
    border-collapse: collapse;
    margin-top: 3pt;
    margin-bottom: 3pt;
    font-family: 'Times New Roman', Times, serif;
    background-color: #ffffff;
  }
  table.sheet-note-table td {
    border: none;
    font-size: 12pt;
    font-weight: bold;
    width: 50%;
    padding: 1.5pt 8pt 1.5pt 20pt;
    text-align: left;
    vertical-align: middle;
  }
</style>
</head>
<body style="background-color: #ffffff; margin: 0; padding: 0;" bgcolor="#ffffff">

<!-- Word Native Running Header Definition -->
<div style="mso-element:header" id="h1">
  <p class="MsoHeader" style="text-align: right; font-family: 'Times New Roman', Times, serif; font-weight: bold; font-size: 11pt; margin: 0; padding: 0;">
    MEC/IQAC/2026-27/COE/136
  </p>
</div>

<div class="Section1">
  ${page1}
  <div class="page-break" style="page-break-before: always; mso-special-character: line-break;"></div>
  ${page2}
  <div class="page-break" style="page-break-before: always; mso-special-character: line-break;"></div>
  ${page3}
</div>
</body>
</html>
  `.trim();
}

/**
 * Package Word Document as MHTML (MIME multipart/related)
 * Microsoft Word natively opens MHTML packages and resolves all embedded images
 * from the MIME parts without triggering external link lookups or "Cannot find linked file" warnings.
 * This completely prevents broken image boxes from expanding and pushing diagrams or logos to the next page.
 */
function packageDocAsMhtml(docHtml) {
  if (!docHtml || typeof docHtml !== 'string') return docHtml;

  const boundary = '----=_NextPart_' + Date.now().toString(16).toUpperCase() + '_' + Math.random().toString(16).slice(2, 8).toUpperCase();
  const imageMap = new Map();
  let imgCounter = 0;

  // Match all Base64 data URIs in src attributes (both standard img src and VML imagedata src)
  const processedHtml = docHtml.replace(/src=["'](data:image\/([a-zA-Z0-9+.-]+);base64,([^"'\s]+))["']/g, (match, fullDataUri, mimeSubtype, base64Data) => {
    let imgInfo = imageMap.get(fullDataUri);
    if (!imgInfo) {
      imgCounter++;
      let ext = mimeSubtype.toLowerCase();
      if (ext === 'jpeg') ext = 'jpg';
      const filename = `image_${imgCounter}.${ext}`;
      const contentType = `image/${mimeSubtype}`;
      imgInfo = { filename, contentType, base64Data };
      imageMap.set(fullDataUri, imgInfo);
    }
    return `src="${imgInfo.filename}"`;
  });

  // If no embedded data URI images were present, return the original docHtml
  if (imageMap.size === 0) {
    return docHtml;
  }

  let mhtml = '';
  mhtml += `MIME-Version: 1.0\r\n`;
  mhtml += `Content-Type: multipart/related; boundary="${boundary}"\r\n\r\n`;

  // Main HTML Document part
  mhtml += `--${boundary}\r\n`;
  mhtml += `Content-Type: text/html; charset="utf-8"\r\n`;
  mhtml += `Content-Transfer-Encoding: 8bit\r\n`;
  mhtml += `Content-Location: document.htm\r\n\r\n`;
  mhtml += `${processedHtml}\r\n\r\n`;

  // Embedded MIME Image parts
  for (const img of imageMap.values()) {
    mhtml += `--${boundary}\r\n`;
    mhtml += `Content-Type: ${img.contentType}\r\n`;
    mhtml += `Content-Transfer-Encoding: base64\r\n`;
    mhtml += `Content-Location: ${img.filename}\r\n\r\n`;
    // Split into standard 76-character MIME chunks
    mhtml += `${img.base64Data.replace(/.{1,76}/g, '$&\r\n')}\r\n\r\n`;
  }

  mhtml += `--${boundary}--\r\n`;
  return mhtml;
}

function downloadWordDoc(docHtml, filename = 'Seminar_Report.doc') {
  try {
    const packagedContent = packageDocAsMhtml(docHtml);
    const blob = new Blob([packagedContent], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
    }, 200);
  } catch (err) {
    throw new Error(`Failed to initiate file download: ${err.message}`);
  }
}

window.generateWordDocHtml = generateWordDocHtml;
window.generateWordDocFromEditedPreview = generateWordDocFromEditedPreview;
window.downloadWordDoc = downloadWordDoc;
window.packageDocAsMhtml = packageDocAsMhtml;
window.getCollegeLetterheadHtml = getCollegeLetterheadHtml;
window.toTitleCase = toTitleCase;
window.escapeHtml = escapeHtml;
