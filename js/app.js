/**
 * Main Application Controller
 * Handles user interactions, form validation, step progression, API communication,
 * rich text Word-style inline editing, and .doc document assembly.
 */

// Sample Data Preset from official template
const SAMPLE_DATA = {
  topic: 'Dimensional Space in Data Warehousing and Data Mining',
  subject: 'Data Warehousing and Data Mining',
  studentName: 'KAVIN KUMAR S',
  registerNo: '731622104045',
  courseCodeName: '23CBC26 / Data Warehousing and Data Mining',
  facultyName: 'Mr. D. Jotheeswaran, AP/CSBS',
  department: 'B.Tech Computer Science and Business Systems',
  yearSemSec: 'III / VI / A',
  academicYear: '2026-2027',
  seminarNo: '01',
  seminarDate: '23-08-2026'
};

// Global state
let currentGeneratedDocHtml = null;
let currentReportFilename = 'MEC_Seminar_Report.doc';
let customUploadedDiagramDataUri = null;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('report-form');
  const btnFillSample = document.getElementById('btn-fill-sample');
  const btnDownload = document.getElementById('btn-download');
  const btnDownloadBottom = document.getElementById('btn-download-bottom');
  const btnReset = document.getElementById('btn-reset');
  const errorDismiss = document.getElementById('error-dismiss');
  const diagramOptionSelect = document.getElementById('diagramOption');
  const customImageFileInput = document.getElementById('customImageFile');

  // Initialize Smart Dropdowns & Searchable Comboboxes
  if (window.SmartDropdowns && typeof window.SmartDropdowns.init === 'function') {
    window.SmartDropdowns.init();
  }

  // Handle diagram option selector
  diagramOptionSelect?.addEventListener('change', (e) => {
    const val = e.target.value;
    const customGroup = document.getElementById('custom-image-group');
    const urlGroup = document.getElementById('url-image-group');

    customGroup?.classList.add('hidden');
    urlGroup?.classList.add('hidden');

    if (val === 'custom') {
      customGroup?.classList.remove('hidden');
    } else if (val === 'url') {
      urlGroup?.classList.remove('hidden');
    }
  });

  // Handle custom image file upload with strict MIME & size validation
  customImageFileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        showError('Invalid file type. Only PNG, JPEG, and WebP image files are allowed.');
        customImageFileInput.value = '';
        customUploadedDiagramDataUri = null;
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        showError('Image file size exceeds the 5MB security limit.');
        customImageFileInput.value = '';
        customUploadedDiagramDataUri = null;
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        customUploadedDiagramDataUri = event.target.result;
      };
      reader.onerror = () => {
        showError('Failed to read the uploaded image file.');
        customUploadedDiagramDataUri = null;
      };
      reader.readAsDataURL(file);
    }
  });

  // Fill sample data
  btnFillSample?.addEventListener('click', () => {
    if (window.SmartDropdowns && typeof window.SmartDropdowns.populateSampleData === 'function') {
      window.SmartDropdowns.populateSampleData(SAMPLE_DATA);
    } else {
      document.getElementById('topic').value = SAMPLE_DATA.topic;
      document.getElementById('subject').value = SAMPLE_DATA.subject;
      document.getElementById('studentName').value = SAMPLE_DATA.studentName;
      document.getElementById('registerNo').value = SAMPLE_DATA.registerNo;
      document.getElementById('courseCodeName').value = SAMPLE_DATA.courseCodeName;
      document.getElementById('facultyName').value = SAMPLE_DATA.facultyName;
      document.getElementById('department').value = SAMPLE_DATA.department;
      document.getElementById('yearSemSec').value = SAMPLE_DATA.yearSemSec;
      document.getElementById('academicYear').value = SAMPLE_DATA.academicYear;
      document.getElementById('seminarNo').value = SAMPLE_DATA.seminarNo;
      document.getElementById('seminarDate').value = SAMPLE_DATA.seminarDate;
    }

    hideError();
    highlightSampleLoaded();
  });

  // Reset form
  btnReset?.addEventListener('click', () => {
    form.reset();
    customUploadedDiagramDataUri = null;
    if (window.SmartDropdowns) {
      window.SmartDropdowns.courseCombobox?.clear();
      window.SmartDropdowns.facultyCombobox?.clear();
      document.getElementById('courseManualGroup')?.classList.add('hidden');
      document.getElementById('facultyManualGroup')?.classList.add('hidden');
      document.getElementById('manualDepartmentGroup')?.classList.add('hidden');
      document.getElementById('manualSeminarNoGroup')?.classList.add('hidden');
      document.getElementById('manualYearGroup')?.classList.add('hidden');
      document.getElementById('manualSemesterGroup')?.classList.add('hidden');
      document.getElementById('manualSectionGroup')?.classList.add('hidden');
      document.getElementById('manualAcademicYearGroup')?.classList.add('hidden');
      document.getElementById('manualDateGroup')?.classList.add('hidden');
      document.getElementById('calendarDateGroup')?.classList.remove('hidden');
    }
    hideError();
    hideProgress();
    hideSuccess();
    currentGeneratedDocHtml = null;
  });

  // Dismiss error
  errorDismiss?.addEventListener('click', hideError);

  // Download actions
  btnDownload?.addEventListener('click', handleDownload);
  btnDownloadBottom?.addEventListener('click', handleDownload);

  // Setup Word Ribbon Formatting Tools
  setupRibbonToolbar();

  // Wire Font Style dropdowns to live preview (report-only, no global font changes)
  const fontStyleSelect = document.getElementById('fontStyle');
  const ribbonFontSelect = document.getElementById('ribbon-font-style');
  const onFontChange = (e) => {
    if (typeof window.applyReportFont === 'function') {
      window.applyReportFont(e.target.value);
    }
  };
  fontStyleSelect?.addEventListener('change', onFontChange);
  ribbonFontSelect?.addEventListener('change', onFontChange);

  // Setup 3-Page Preview Tabs
  setupPreviewTabs();

  // ── Mode Switcher (Mode A: Report + PPT | Mode B: Create PPT Only) ──
  const tabReportPpt = document.getElementById('tab-mode-report-ppt');
  const tabPptOnly = document.getElementById('tab-mode-ppt-only');
  const pptOnlySection = document.getElementById('ppt-only-section');
  const previewContainer = document.getElementById('preview-container');
  const successContainer = document.getElementById('success-container');

  tabReportPpt?.addEventListener('click', () => {
    tabReportPpt.classList.add('active');
    tabReportPpt.setAttribute('aria-selected', 'true');
    tabPptOnly?.classList.remove('active');
    tabPptOnly?.setAttribute('aria-selected', 'false');

    form.classList.remove('hidden');
    pptOnlySection?.classList.add('hidden');
    hideError();
  });

  tabPptOnly?.addEventListener('click', () => {
    tabPptOnly?.classList.add('active');
    tabPptOnly?.setAttribute('aria-selected', 'true');
    tabReportPpt?.classList.remove('active');
    tabReportPpt?.setAttribute('aria-selected', 'false');

    form.classList.add('hidden');
    previewContainer?.classList.add('hidden');
    successContainer?.classList.add('hidden');
    pptOnlySection?.classList.remove('hidden');
    hideError();
  });

  // ── Template Selector Handlers (Mode A & Mode B) ──
  function setupTemplateSelectors() {
    const setupGrid = (gridId, inputId) => {
      const grid = document.getElementById(gridId);
      const input = document.getElementById(inputId);
      if (!grid || !input) return;

      const cards = grid.querySelectorAll('.ppt-template-card');
      cards.forEach(card => {
        const selectCard = () => {
          const templateId = card.getAttribute('data-template-id');
          if (!templateId) return;

          cards.forEach(c => {
            c.classList.remove('selected');
            c.setAttribute('aria-checked', 'false');
          });
          card.classList.add('selected');
          card.setAttribute('aria-checked', 'true');
          input.value = templateId;
        };

        card.addEventListener('click', selectCard);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectCard();
          }
        });
      });
    };

    setupGrid('mode-a-template-grid', 'modeAPptTemplateId');
    setupGrid('mode-b-template-grid', 'modeBPptTemplateId');
  }

  setupTemplateSelectors();

  // ── Mode A PPT Download & Preview Handlers ──
  const btnDownloadPptPptx = document.getElementById('btn-download-ppt-pptx');
  const btnDownloadPptPdf = document.getElementById('btn-download-ppt-pdf');
  const btnToggleSlidePreview = document.getElementById('btn-toggle-slide-preview');

  btnDownloadPptPptx?.addEventListener('click', async () => {
    if (window.currentGeneratedPptDeck && typeof window.downloadDeckAsPptx === 'function') {
      try {
        await window.downloadDeckAsPptx(window.currentGeneratedPptDeck);
      } catch (e) {
        showError(`PowerPoint download failed: ${e.message}`);
      }
    } else {
      showError('Presentation not ready yet. Please wait for generation to complete.');
    }
  });

  btnDownloadPptPdf?.addEventListener('click', async () => {
    if (window.currentGeneratedPptDeck && typeof window.downloadDeckAsPdf === 'function') {
      try {
        await window.downloadDeckAsPdf(window.currentGeneratedPptDeck);
      } catch (e) {
        showError(`PDF download failed: ${e.message}`);
      }
    } else {
      showError('Presentation not ready yet. Please wait for generation to complete.');
    }
  });

  btnToggleSlidePreview?.addEventListener('click', () => {
    const previewBox = document.getElementById('mode-a-slide-preview-container');
    if (!previewBox) return;
    if (previewBox.classList.contains('hidden')) {
      previewBox.classList.remove('hidden');
      if (window.currentGeneratedPptDeck && typeof window.renderSlideDeckPreview === 'function') {
        window.renderSlideDeckPreview(window.currentGeneratedPptDeck, previewBox);
      }
      btnToggleSlidePreview.textContent = 'Hide Slides Preview';
    } else {
      previewBox.classList.add('hidden');
      btnToggleSlidePreview.textContent = 'Preview Slide Deck';
    }
  });

  // ── Mode B: PPT Only Form Submission ──
  const pptOnlyForm = document.getElementById('ppt-only-form');
  const pptTopicInput = document.getElementById('pptTopicInput');
  const pptSubjectInput = document.getElementById('pptSubjectInput');
  const btnGeneratePptOnly = document.getElementById('btn-generate-ppt-only');
  const btnPptSpinner = document.getElementById('btn-ppt-spinner');
  const btnPptText = document.getElementById('btn-ppt-text');
  const pptProgressContainer = document.getElementById('ppt-progress-container');
  const pptSuccessContainer = document.getElementById('ppt-success-container');
  const pptOnlyPreviewStage = document.getElementById('ppt-only-preview-stage');
  const btnPptDownloadPptx = document.getElementById('btn-ppt-download-pptx');
  const btnPptDownloadPdf = document.getElementById('btn-ppt-download-pdf');
  const btnPptReset = document.getElementById('btn-ppt-reset');

  let modeBPptDeck = null;

  pptOnlyForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    pptSuccessContainer?.classList.add('hidden');

    const topic = pptTopicInput?.value?.trim();
    const subject = pptSubjectInput?.value?.trim() || 'Computer Science & Engineering';

    if (!topic || topic.length < 3) {
      showError('Please enter a valid Seminar Topic (minimum 3 characters).');
      pptTopicInput?.focus();
      return;
    }

    const runPptGeneration = async (paymentToken = null, orderId = null) => {
      if (btnGeneratePptOnly) btnGeneratePptOnly.disabled = true;
      if (btnPptSpinner) btnPptSpinner.style.display = 'inline-block';
      if (btnPptText) btnPptText.textContent = 'Generating Presentation...';

      pptProgressContainer?.classList.remove('hidden');
      updatePptStep(1, 'Analyzing topic & deriving academic presentation outline...');

      try {
        await new Promise(r => setTimeout(r, 200));
        updatePptStep(2, 'Generating structured slide content & academic bullet points...');

        const selectedTemplateId = document.getElementById('modeBPptTemplateId')?.value || 'template-academic-flowchart';
        const deck = await fetchPptContent(topic, subject, null, selectedTemplateId, paymentToken, orderId);

        // Attach optional presenter and seminar metadata if provided in Mode B
        const pptStudentName = document.getElementById('pptStudentName')?.value?.trim() || '';
        const pptRegisterNo = document.getElementById('pptRegisterNo')?.value?.trim() || '';
        const pptCourse = document.getElementById('pptCourse')?.value?.trim() || '';
        const pptFaculty = document.getElementById('pptFaculty')?.value?.trim() || '';
        const pptDepartment = document.getElementById('pptDepartment')?.value?.trim() || '';
        const pptDate = document.getElementById('pptDate')?.value?.trim() || '';

        if (deck) {
          deck.metadata = {
            topic,
            subject,
            studentName: pptStudentName,
            registerNo: pptRegisterNo,
            courseCodeName: pptCourse,
            facultyName: pptFaculty,
            department: pptDepartment,
            seminarDate: pptDate
          };
        }
        modeBPptDeck = deck;

        updatePptStep(3, 'Designing topic-specific flowchart & process architecture...');
        await new Promise(r => setTimeout(r, 250));

        updatePptStep(4, 'Building 16:9 PowerPoint (.pptx) & Vector PDF (.pdf)...');
        await new Promise(r => setTimeout(r, 200));

        // Show success & preview
        pptProgressContainer?.classList.add('hidden');
        pptSuccessContainer?.classList.remove('hidden');

        if (typeof window.renderSlideDeckPreview === 'function' && pptOnlyPreviewStage) {
          window.renderSlideDeckPreview(deck, pptOnlyPreviewStage);
        }

      } catch (err) {
        console.error('PPT Only Generation error:', err);
        showError(`Presentation Generation failed: ${err.message}`);
        pptProgressContainer?.classList.add('hidden');
      } finally {
        if (btnGeneratePptOnly) btnGeneratePptOnly.disabled = false;
        if (btnPptSpinner) btnPptSpinner.style.display = 'none';
        if (btnPptText) btnPptText.textContent = '⚡ Generate PowerPoint Presentation';
      }
    };

    // Check PPT pricing & prompt for payment if paid
    if (typeof window.showPptPaymentModal === 'function') {
      const pptStudentName = document.getElementById('pptStudentName')?.value?.trim() || '';
      window.showPptPaymentModal({
        topic,
        subject,
        studentName: pptStudentName,
        pptStudentName
      }, runPptGeneration);
    } else {
      await runPptGeneration(null, null);
    }
  });

  btnPptDownloadPptx?.addEventListener('click', async () => {
    if (modeBPptDeck && typeof window.downloadDeckAsPptx === 'function') {
      try {
        await window.downloadDeckAsPptx(modeBPptDeck);
      } catch (err) {
        showError(`Failed to download PowerPoint: ${err.message}`);
      }
    } else {
      showError('No presentation generated yet.');
    }
  });

  btnPptDownloadPdf?.addEventListener('click', async () => {
    if (modeBPptDeck && typeof window.downloadDeckAsPdf === 'function') {
      try {
        await window.downloadDeckAsPdf(modeBPptDeck);
      } catch (err) {
        showError(`Failed to download PDF: ${err.message}`);
      }
    } else {
      showError('No presentation generated yet.');
    }
  });

  btnPptReset?.addEventListener('click', () => {
    pptOnlyForm?.reset();
    modeBPptDeck = null;
    pptSuccessContainer?.classList.add('hidden');
    pptProgressContainer?.classList.add('hidden');
    hideError();
  });

  // Form submission — validate all fields strictly before opening payment modal
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    hideSuccess();

    const formData = extractFormData();

    // 1. Topic validation
    if (!formData.topic || formData.topic.length < 3) {
      showError('Please enter a valid Seminar Topic (minimum 3 characters).');
      document.getElementById('topic')?.focus();
      return;
    }
    if (formData.topic.length > 300) {
      showError('Seminar Topic cannot exceed 300 characters.');
      document.getElementById('topic')?.focus();
      return;
    }

    // 2. Student Name validation
    if (!formData.studentName || formData.studentName.length < 2) {
      showError('Please enter the Student Name (minimum 2 characters).');
      document.getElementById('studentName')?.focus();
      return;
    }
    if (formData.studentName.length > 100) {
      showError('Student Name cannot exceed 100 characters.');
      document.getElementById('studentName')?.focus();
      return;
    }

    // 3. Register Number validation
    if (!formData.registerNo || formData.registerNo.length < 3) {
      showError('Please enter a valid Register Number (e.g. 731622104045).');
      document.getElementById('registerNo')?.focus();
      return;
    }

    // 4. Custom Image URL validation if provided
    const diagramOption = document.getElementById('diagramOption')?.value || 'ai';
    const customUrl = document.getElementById('customImageUrl')?.value?.trim();
    if (diagramOption === 'url' && customUrl) {
      try {
        const parsed = new URL(customUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          showError('Invalid Image URL protocol. Only HTTP and HTTPS URLs are permitted.');
          document.getElementById('customImageUrl')?.focus();
          return;
        }
      } catch (err) {
        showError('Please enter a valid Image URL (e.g. https://example.com/diagram.png).');
        document.getElementById('customImageUrl')?.focus();
        return;
      }
    }

    // Delegate to payment module — opens ₹5 modal
    if (typeof window.showPaymentModal === 'function') {
      window.showPaymentModal(formData);
    } else {
      // Fallback (dev without payment.js): generate directly
      await runReportGeneration(formData, null, null);
    }
  });
});

/**
 * Called by payment.js after successful payment verification
 * Receives the verified paymentToken and orderId from server
 */
window.generateReportAfterPayment = async function(formData, paymentToken, orderId) {
  hideError();
  hideSuccess();

  try {
    setGeneratingState(true);

    // Step 1: Draft AI Content (with payment token for backend verification)
    updateStep(1, 'Payment verified ✓ — connecting to AI engine and drafting 3-page seminar report...');
    const aiContent = await fetchAiContent(formData.topic, formData.subject, paymentToken, orderId, formData);

    // Step 2: Build Diagram / Resolve Image
    updateStep(2, 'Processing diagram and rasterizing high-resolution graphics...');
    let diagramPngDataUri = '';

    const diagramOption = document.getElementById('diagramOption')?.value || 'ai';
    const customUrl = document.getElementById('customImageUrl')?.value?.trim();

    if (diagramOption === 'custom' && customUploadedDiagramDataUri) {
      diagramPngDataUri = customUploadedDiagramDataUri;
    } else if (diagramOption === 'url' && customUrl) {
      diagramPngDataUri = customUrl;
    } else {
      const diagramSvg = window.generateDiagramSvg(aiContent.diagram, formData.topic);
      diagramPngDataUri = await window.rasterizeSvgToPng(diagramSvg, aiContent.diagram, formData.topic, 760, 340);
    }

    // Step 3: Assemble 3-Page Document and Coordinate PowerPoint Generation
    updateStep(3, 'Assembling official 3-Page report and coordinated PowerPoint presentation...');
    await new Promise((r) => setTimeout(r, 300));

    // Generate matching PPT deck in background using report content as context
    try {
      const selectedTemplateId = document.getElementById('modeAPptTemplateId')?.value || 'template-academic-flowchart';
      const pptDeck = await fetchPptContent(formData.topic, formData.subject, aiContent, selectedTemplateId);
      if (pptDeck) {
        pptDeck.metadata = formData;
      }
      window.currentGeneratedPptDeck = pptDeck;
    } catch (pptErr) {
      console.warn('Could not generate coordinated PPT deck:', pptErr);
    }

    const letterheadDataUri = window.MEC_LETTERHEAD_BASE64 || '';
    const docHtml = window.generateWordDocHtml(formData, aiContent, diagramPngDataUri, letterheadDataUri);
    currentGeneratedDocHtml = docHtml;

    const sanitizedTopic = formData.topic.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    currentReportFilename = `MEC_Seminar_Report_${sanitizedTopic}.doc`;

    // Render Live 3-Page Editable Preview
    window.renderLivePreview(formData, aiContent, diagramPngDataUri);

    // Complete Steps
    markAllStepsCompleted();
    showSuccess();

  } catch (err) {
    console.error('Seminar Generation Failure:', err);
    const message = err instanceof Error ? err.message : String(err || 'An unknown error occurred during generation.');
    showError(message);
  } finally {
    setGeneratingState(false);
  }
};

/**
 * Direct report generation (used by generateReportAfterPayment — internal)
 */
async function runReportGeneration(formData, paymentToken, orderId) {
  return window.generateReportAfterPayment(formData, paymentToken, orderId);
}

/**
 * Setup Word-style formatting toolbar for live in-browser editing
 */
function setupRibbonToolbar() {
  const ribbonBtns = document.querySelectorAll('.ribbon-btn');
  ribbonBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const command = btn.getAttribute('data-command');
      if (command) {
        document.execCommand(command, false, null);
      }
    });
  });
}

/**
 * Extract values from all form fields (with Smart Dropdowns and Manual Entry support)
 */
function extractFormData() {
  // 1. Resolve Course Code and Course Name
  let courseCodeName = document.getElementById('courseCodeName')?.value?.trim();
  const manualCourseCode = document.getElementById('manualCourseCode')?.value?.trim();
  const manualCourseName = document.getElementById('manualCourseName')?.value?.trim();
  const courseManualGroup = document.getElementById('courseManualGroup');
  if (courseManualGroup && !courseManualGroup.classList.contains('hidden') && (manualCourseCode || manualCourseName)) {
    courseCodeName = manualCourseCode && manualCourseName ? `${manualCourseCode} / ${manualCourseName}` : (manualCourseCode || manualCourseName);
  }

  // 2. Resolve Faculty Name and Designation
  let facultyName = document.getElementById('facultyName')?.value?.trim();
  const manualFacultyName = document.getElementById('manualFacultyName')?.value?.trim();
  const manualFacultyDesig = document.getElementById('manualFacultyDesig')?.value?.trim();
  const facultyManualGroup = document.getElementById('facultyManualGroup');
  if (facultyManualGroup && !facultyManualGroup.classList.contains('hidden') && (manualFacultyName || manualFacultyDesig)) {
    facultyName = manualFacultyName && manualFacultyDesig ? `${manualFacultyName}, ${manualFacultyDesig}` : (manualFacultyName || manualFacultyDesig);
  }

  // 3. Resolve Seminar Number (preserve leading zeros e.g. 01)
  let seminarNo = document.getElementById('seminarNo')?.value?.trim() || '01';
  const seminarNoSelect = document.getElementById('seminarNoSelect');
  const manualSeminarNo = document.getElementById('manualSeminarNo')?.value?.trim();
  if (seminarNoSelect && seminarNoSelect.value === 'other' && manualSeminarNo) {
    seminarNo = /^\d$/.test(manualSeminarNo) ? '0' + manualSeminarNo : manualSeminarNo;
  } else if (/^\d$/.test(seminarNo)) {
    seminarNo = '0' + seminarNo;
  }

  // 4. Resolve Program / Department
  let department = document.getElementById('department')?.value?.trim() || 'B.Tech Computer Science and Business Systems';
  const departmentSelect = document.getElementById('departmentSelect');
  const manualDepartment = document.getElementById('manualDepartment')?.value?.trim();
  if (departmentSelect && departmentSelect.value === 'other' && manualDepartment) {
    department = manualDepartment;
  }

  // 5. Resolve Year / Semester / Section
  let yearSemSec = document.getElementById('yearSemSec')?.value?.trim() || 'III / VI / A';
  const yearSelect = document.getElementById('yearSelect');
  const semSelect = document.getElementById('semesterSelect');
  const secSelect = document.getElementById('sectionSelect');
  if (yearSelect && semSelect && secSelect) {
    const yr = yearSelect.value === 'other' ? (document.getElementById('manualYear')?.value?.trim() || 'III') : yearSelect.value;
    const sm = semSelect.value === 'other' ? (document.getElementById('manualSemester')?.value?.trim() || 'VI') : semSelect.value;
    const sc = secSelect.value === 'other' ? (document.getElementById('manualSection')?.value?.trim() || 'A') : secSelect.value;
    yearSemSec = `${yr} / ${sm} / ${sc}`;
  }

  // 6. Resolve Academic Year
  let academicYear = document.getElementById('academicYear')?.value?.trim() || '2026 - 2027';
  const academicYearSelect = document.getElementById('academicYearSelect');
  const manualAcademicYear = document.getElementById('manualAcademicYear')?.value?.trim();
  if (academicYearSelect && academicYearSelect.value === 'other' && manualAcademicYear) {
    academicYear = manualAcademicYear;
  }

  // 7. Resolve Seminar Date
  let seminarDate = document.getElementById('seminarDate')?.value?.trim();
  const dateModeSelect = document.getElementById('dateModeSelect');
  if (dateModeSelect && dateModeSelect.value === 'other') {
    const manualDate = document.getElementById('manualSeminarDate')?.value?.trim();
    if (manualDate) seminarDate = manualDate;
  }

  return {
    topic: document.getElementById('topic')?.value?.trim() || '',
    subject: document.getElementById('subject')?.value?.trim() || 'Data Warehousing and Data Mining',
    studentName: document.getElementById('studentName')?.value?.trim() || 'Student Name',
    registerNo: document.getElementById('registerNo')?.value?.trim() || '7316XXXXXXX',
    courseCodeName: courseCodeName || '23CBC26 / Data Warehousing and Data Mining',
    facultyName: facultyName || 'Mr. D. Jotheeswaran, AP/CSBS',
    department: department || 'B.Tech Computer Science and Business Systems',
    yearSemSec: yearSemSec || 'III / VI / A',
    academicYear: academicYear || '2026-2027',
    seminarNo: seminarNo || '01',
    seminarDate: seminarDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
    fontStyle: document.getElementById('fontStyle')?.value || 'Times New Roman'
  };
}

/**
 * Call Serverless Function Endpoint
 * paymentToken and orderId are required for protected report generation
 */
async function fetchAiContent(topic, subject, paymentToken, orderId, formData = null) {
  const endpoints = ['/api/generate-content', '/.netlify/functions/generate-content'];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject,
          paymentToken: paymentToken || null,
          orderId: orderId || null,
          formData: formData || null
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (!response.ok || !result.success) {
        const errMsg = result.error || `Server responded with status ${response.status}`;
        throw new Error(errMsg);
      }

      if (!result.data) {
        throw new Error('Server returned empty data payload in response.');
      }

      return result.data;

    } catch (err) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Failed to connect to the seminar generation service.');
}

/**
 * Call Serverless Endpoint for PowerPoint Presentation Generation
 */
async function fetchPptContent(topic, subject, reportContent = null, templateId = 'template-academic-flowchart', paymentToken = null, orderId = null) {
  const endpoints = ['/api/generate-ppt', '/.netlify/functions/generate-ppt'];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          subject: subject || '',
          reportContent: reportContent || null,
          templateId: templateId || 'template-academic-flowchart',
          paymentToken: paymentToken || null,
          orderId: orderId || null,
          service: 'pptOnly'
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error(`Server returned non-JSON response (${response.status}): ${responseText.substring(0, 200)}`);
      }

      if (!response.ok || !result.success) {
        const errMsg = result.error || `Server responded with status ${response.status}`;
        throw new Error(errMsg);
      }

      if (!result.data) {
        throw new Error('Server returned empty presentation payload.');
      }

      return result.data;
    } catch (err) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('Failed to connect to the presentation generation service.');
}

/**
 * Handle Word doc download, capturing live edits if user modified the preview sheets
 */
function handleDownload() {
  const page1El = document.getElementById('preview-page-1');
  const topic = document.getElementById('topic')?.value?.trim() || 'Seminar Report';

  try {
    let finalDocHtml = currentGeneratedDocHtml;
    // If preview has been populated, export directly from edited preview to capture all user edits
    if (page1El && page1El.innerHTML.trim().length > 0) {
      finalDocHtml = window.generateWordDocFromEditedPreview(topic);
    }

    if (!finalDocHtml) {
      showError('No report generated yet. Please generate a seminar report first.');
      return;
    }

    window.downloadWordDoc(finalDocHtml, currentReportFilename);
  } catch (err) {
    showError(`Download failed: ${err.message}`);
  }
}

/**
 * Update UI progress indicator
 */
function updateStep(activeStepNumber, statusMessage) {
  const progressContainer = document.getElementById('progress-container');
  const progressStatusText = document.getElementById('progress-status-text');

  if (progressContainer) progressContainer.classList.remove('hidden');
  if (progressStatusText) progressStatusText.textContent = statusMessage;

  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`step-indicator-${i}`);
    if (!stepEl) continue;

    stepEl.classList.remove('step-active', 'step-completed', 'step-pending');
    if (i < activeStepNumber) {
      stepEl.classList.add('step-completed');
    } else if (i === activeStepNumber) {
      stepEl.classList.add('step-active');
    } else {
      stepEl.classList.add('step-pending');
    }
  }
}

/**
 * Update PPT-Only UI progress indicator (4 steps)
 */
function updatePptStep(activeStepNumber, statusMessage) {
  const progressContainer = document.getElementById('ppt-progress-container');
  const progressStatusText = document.getElementById('ppt-progress-status-text');

  if (progressContainer) progressContainer.classList.remove('hidden');
  if (progressStatusText) progressStatusText.textContent = statusMessage;

  for (let i = 1; i <= 4; i++) {
    const stepEl = document.getElementById(`ppt-step-${i}`);
    if (!stepEl) continue;

    stepEl.classList.remove('step-active', 'step-completed', 'step-pending');
    if (i < activeStepNumber) {
      stepEl.classList.add('step-completed');
    } else if (i === activeStepNumber) {
      stepEl.classList.add('step-active');
    } else {
      stepEl.classList.add('step-pending');
    }
  }
}

function markAllStepsCompleted() {
  for (let i = 1; i <= 3; i++) {
    const stepEl = document.getElementById(`step-indicator-${i}`);
    if (stepEl) {
      stepEl.classList.remove('step-active', 'step-pending');
      stepEl.classList.add('step-completed');
    }
  }
  const progressStatusText = document.getElementById('progress-status-text');
  if (progressStatusText) {
    progressStatusText.textContent = '3-Page Seminar Report generated and ready to edit & download!';
  }
}

function setGeneratingState(isGenerating) {
  const btnGenerate = document.getElementById('btn-generate');
  const btnFillSample = document.getElementById('btn-fill-sample');
  const spinner = document.getElementById('btn-spinner');
  const btnText = document.getElementById('btn-text');

  if (btnGenerate) btnGenerate.disabled = isGenerating;
  if (btnFillSample) btnFillSample.disabled = isGenerating;
  if (spinner) spinner.style.display = isGenerating ? 'inline-block' : 'none';
  if (btnText) {
    btnText.textContent = isGenerating ? 'Generating 3-Page Report...' : 'Generate Seminar Report';
  }
}

function showError(message) {
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
    errorContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function hideError() {
  const errorContainer = document.getElementById('error-container');
  if (errorContainer) errorContainer.classList.add('hidden');
}

function showSuccess() {
  const successContainer = document.getElementById('success-container');
  if (successContainer) successContainer.classList.remove('hidden');
}

function hideSuccess() {
  const successContainer = document.getElementById('success-container');
  if (successContainer) successContainer.classList.add('hidden');
  const previewContainer = document.getElementById('preview-container');
  if (previewContainer) previewContainer.classList.add('hidden');
}

function hideProgress() {
  const progressContainer = document.getElementById('progress-container');
  if (progressContainer) progressContainer.classList.add('hidden');
}

function highlightSampleLoaded() {
  const badge = document.getElementById('sample-loaded-badge');
  if (badge) {
    badge.classList.remove('hidden');
    setTimeout(() => {
      badge.classList.add('hidden');
    }, 3500);
  }
}

function setupPreviewTabs() {
  const tabBtns = document.querySelectorAll('.preview-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPage = btn.getAttribute('data-tab');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const page1 = document.getElementById('preview-page-1');
      const page2 = document.getElementById('preview-page-2');
      const page3 = document.getElementById('preview-page-3');

      // Sheet cards containing labels and viewports
      const cards = document.querySelectorAll('.sheet-card');
      const tags = document.querySelectorAll('.sheet-label-tag');

      if (targetPage === '1') {
        page1?.classList.remove('hidden');
        page2?.classList.add('hidden');
        page3?.classList.add('hidden');
        if (cards[0]) cards[0].style.display = 'flex';
        if (cards[1]) cards[1].style.display = 'none';
        if (cards[2]) cards[2].style.display = 'none';
        if (tags[0]) tags[0].style.display = 'block';
        if (tags[1]) tags[1].style.display = 'none';
        if (tags[2]) tags[2].style.display = 'none';
      } else if (targetPage === '2') {
        page1?.classList.add('hidden');
        page2?.classList.remove('hidden');
        page3?.classList.add('hidden');
        if (cards[0]) cards[0].style.display = 'none';
        if (cards[1]) cards[1].style.display = 'flex';
        if (cards[2]) cards[2].style.display = 'none';
        if (tags[0]) tags[0].style.display = 'none';
        if (tags[1]) tags[1].style.display = 'block';
        if (tags[2]) tags[2].style.display = 'none';
      } else if (targetPage === '3') {
        page1?.classList.add('hidden');
        page2?.classList.add('hidden');
        page3?.classList.remove('hidden');
        if (cards[0]) cards[0].style.display = 'none';
        if (cards[1]) cards[1].style.display = 'none';
        if (cards[2]) cards[2].style.display = 'flex';
        if (tags[0]) tags[0].style.display = 'none';
        if (tags[1]) tags[1].style.display = 'none';
        if (tags[2]) tags[2].style.display = 'block';
      } else {
        // All 3 pages
        page1?.classList.remove('hidden');
        page2?.classList.remove('hidden');
        page3?.classList.remove('hidden');
        cards.forEach(c => c.style.display = 'flex');
        tags.forEach(t => t.style.display = 'block');
      }

      if (typeof window.updatePreviewScale === 'function') {
        window.updatePreviewScale();
      }
    });
  });
}
