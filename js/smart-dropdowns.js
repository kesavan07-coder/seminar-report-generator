/**
 * Smart Dropdowns and Manual Entry Controller
 * Provides searchable dropdowns, synchronized manual entry fallback,
 * leading-zero preservation, and consistent data extraction.
 */

'use strict';

(function(window) {
  // Predefined Course Catalog
  const COURSE_CATALOG = [
    // Table 1
    { code: '23CBC26', name: 'Data Warehousing and Data Mining' },
    { code: '23CBC16', name: 'Business Analytics' },
    { code: '23CBC18', name: 'Supply Chain Management' },
    { code: '23CBE03', name: 'Professional Elective – I Salesforce CRM and Platforms' },
    { code: '23CBE07', name: 'Professional Elective – II AI for Business Systems' },
    // Table 2
    { code: '23CSF08', name: 'Formal Language and Automata Theory' },
    { code: '23CSF18', name: 'Data Warehousing and Data Mining' },
    { code: '23CSF39', name: 'Foundation of Quantum Computing' },
    { code: '23CSE01', name: 'Internet of Things' },
    { code: '23CSE06', name: 'Salesforce CRM and Platform' }
  ];

  // Predefined Faculty Catalog
  const FACULTY_CATALOG = [
    { name: 'Mr. D. Jotheeswaran', designation: 'AP/CSBS' },
    { name: 'Ms. P. Dheevaambiga', designation: 'AP/CSBS' },
    { name: 'Dr. S. Gomathi', designation: 'AP/CSBS' },
    { name: 'Mrs. P. Sathya', designation: 'AP/CSBS' },
    { name: 'Ms. S. Priyadharshini', designation: 'AP/CSBS' },
    { name: 'Dr. C. Suganthi', designation: 'Prof/CSE' },
    { name: 'Mrs. P. Nandhini', designation: 'AP/CSE' },
    { name: 'Ms. S. Balamani', designation: 'AP/CSE' },
    { name: 'Mr. K. Ravikumar', designation: 'AP/CSE' },
    { name: 'Mrs. R. Pavithra', designation: 'AP/MCA' }
  ];

  // Predefined Department Options
  const DEPARTMENT_OPTIONS = [
    'B.Tech Computer Science and Business Systems',
    'B.E. Computer Science and Engineering'
  ];

  // Predefined Seminar Numbers (preserve leading zero)
  const SEMINAR_NO_OPTIONS = ['01', '02', '03', '04', '05'];

  // Predefined Year / Semester / Section
  const YEAR_OPTIONS = ['I', 'II', 'III'];
  const SEMESTER_OPTIONS = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

  // Predefined Academic Year
  const ACADEMIC_YEAR_OPTIONS = ['2026 - 2027'];

  // Helper: Format Date object to DD-MM-YYYY
  function formatDateToDDMMYYYY(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Helper: Parse date string in YYYY-MM-DD or DD-MM-YYYY
  function parseDateString(str) {
    if (!str) return null;
    str = str.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split('-');
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    if (/^\d{2}[-/.]\d{2}[-/.]\d{4}$/.test(str)) {
      const parts = str.split(/[-/.]/);
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Searchable Combobox Component
   */
  class SearchableCombobox {
    constructor(options) {
      this.container = options.container;
      this.items = options.items || [];
      this.placeholder = options.placeholder || 'Search or select...';
      this.displayKey = options.displayKey || 'label';
      this.searchKeys = options.searchKeys || ['label'];
      this.onSelect = options.onSelect || (() => {});
      this.onOther = options.onOther || (() => {});
      this.onClear = options.onClear || (() => {});

      this.selectedItem = null;
      this.isOther = false;
      this.isOpen = false;
      this.highlightIndex = -1;

      this.init();
    }

    init() {
      this.container.classList.add('smart-combobox-wrapper');
      this.container.innerHTML = `
        <div class="smart-combobox-control">
          <input type="text" class="smart-combobox-input" placeholder="${this.placeholder}" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="false" aria-haspopup="listbox">
          <button type="button" class="smart-combobox-toggle" aria-label="Toggle options" tabindex="-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 5.5l6.5 6.5 6.5-6.5h-13z"/></svg>
          </button>
        </div>
        <ul class="smart-combobox-menu hidden" role="listbox"></ul>
      `;

      this.input = this.container.querySelector('.smart-combobox-input');
      this.toggleBtn = this.container.querySelector('.smart-combobox-toggle');
      this.menu = this.container.querySelector('.smart-combobox-menu');

      this.bindEvents();
    }

    bindEvents() {
      this.input.addEventListener('focus', () => {
        this.renderMenu(this.input.value);
        this.open();
      });

      this.input.addEventListener('input', () => {
        this.selectedItem = null;
        this.isOther = false;
        this.renderMenu(this.input.value);
        this.open();
      });

      this.toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.isOpen) {
          this.close();
        } else {
          this.input.focus();
          this.renderMenu(this.input.value);
          this.open();
        }
      });

      this.input.addEventListener('keydown', (e) => {
        const optionEls = this.menu.querySelectorAll('.smart-combobox-item');
        if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          this.open();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.highlightIndex = Math.min(this.highlightIndex + 1, optionEls.length - 1);
          this.updateHighlight(optionEls);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.highlightIndex = Math.max(this.highlightIndex - 1, 0);
          this.updateHighlight(optionEls);
        } else if (e.key === 'Enter') {
          if (this.isOpen && this.highlightIndex >= 0 && optionEls[this.highlightIndex]) {
            e.preventDefault();
            optionEls[this.highlightIndex].click();
          }
        } else if (e.key === 'Escape') {
          this.close();
        }
      });

      document.addEventListener('click', (e) => {
        if (!this.container.contains(e.target)) {
          this.close();
        }
      });
    }

    open() {
      this.isOpen = true;
      this.menu.classList.remove('hidden');
      this.input.setAttribute('aria-expanded', 'true');
    }

    close() {
      this.isOpen = false;
      this.menu.classList.add('hidden');
      this.input.setAttribute('aria-expanded', 'false');
      this.highlightIndex = -1;
    }

    updateHighlight(optionEls) {
      optionEls.forEach((el, idx) => {
        if (idx === this.highlightIndex) {
          el.classList.add('highlighted');
          el.scrollIntoView({ block: 'nearest' });
        } else {
          el.classList.remove('highlighted');
        }
      });
    }

    renderMenu(filterText = '') {
      const q = String(filterText || '').trim().toLowerCase();
      this.menu.innerHTML = '';
      this.highlightIndex = -1;

      const filtered = this.items.filter(item => {
        if (!q) return true;
        return this.searchKeys.some(key => {
          const val = String(item[key] || '').toLowerCase();
          return val.includes(q);
        });
      });

      if (filtered.length === 0) {
        const noMatch = document.createElement('li');
        noMatch.className = 'smart-combobox-item no-match';
        noMatch.textContent = 'No matching options found';
        this.menu.appendChild(noMatch);
      } else {
        filtered.forEach(item => {
          const li = document.createElement('li');
          li.className = 'smart-combobox-item';
          li.setAttribute('role', 'option');
          li.innerHTML = typeof this.displayKey === 'function' 
            ? this.displayKey(item) 
            : (item[this.displayKey] || item.label);

          li.addEventListener('click', () => {
            this.selectedItem = item;
            this.isOther = false;
            this.input.value = typeof this.displayKey === 'function' ? item.displayText || item.name : (item[this.displayKey] || item.label);
            this.close();
            this.onSelect(item);
          });

          this.menu.appendChild(li);
        });
      }

      // Always append "Other" Option
      const otherLi = document.createElement('li');
      otherLi.className = 'smart-combobox-item smart-combobox-item-other';
      otherLi.setAttribute('role', 'option');
      otherLi.innerHTML = `
        <span class="other-icon">✏️</span>
        <span class="other-text"><strong>Other</strong> &ndash; Enter custom details manually</span>
      `;
      otherLi.addEventListener('click', () => {
        this.selectedItem = null;
        this.isOther = true;
        this.input.value = 'Other (Custom Entry)';
        this.close();
        this.onOther();
      });
      this.menu.appendChild(otherLi);
    }

    setValue(text, isOther = false) {
      this.input.value = text;
      this.isOther = isOther;
    }

    clear() {
      this.input.value = '';
      this.selectedItem = null;
      this.isOther = false;
      this.close();
      this.onClear();
    }
  }

  /**
   * Main Smart Dropdowns Controller
   */
  class SmartDropdownsController {
    constructor() {
      this.initialized = false;
      this.courseCombobox = null;
      this.facultyCombobox = null;
    }

    init() {
      if (this.initialized) return;

      this.initCourseDropdown();
      this.initFacultyDropdown();
      this.initSeminarNoDropdown();
      this.initDepartmentDropdown();
      this.initYearSemSecDropdowns();
      this.initDateSelection();
      this.initAcademicYearDropdown();
      this.initModeBIntegration();

      this.initialized = true;
    }

    /**
     * 1. Course Code & Course Name
     */
    initCourseDropdown() {
      const container = document.getElementById('courseComboboxContainer');
      const manualGroup = document.getElementById('courseManualGroup');
      const manualCodeInput = document.getElementById('manualCourseCode');
      const manualNameInput = document.getElementById('manualCourseName');
      const courseNameInput = document.getElementById('courseNameInput');
      const hiddenCourseCodeName = document.getElementById('courseCodeName');
      const subjectInput = document.getElementById('subject');

      if (!container) return;

      const items = COURSE_CATALOG.map(c => ({
        ...c,
        label: `${c.code} — ${c.name}`,
        displayText: `${c.code} — ${c.name}`
      }));

      const updateCanonicalCourse = () => {
        let code = '';
        let name = '';

        if (this.courseCombobox.isOther) {
          code = (manualCodeInput?.value || '').trim();
          name = (manualNameInput?.value || '').trim();
        } else if (this.courseCombobox.selectedItem) {
          code = this.courseCombobox.selectedItem.code;
          name = (courseNameInput?.value || this.courseCombobox.selectedItem.name).trim();
        } else {
          // If typed custom text in combobox input directly
          const typed = this.courseCombobox.input.value.trim();
          if (typed.includes('—') || typed.includes('/')) {
            const parts = typed.split(/[—/]/);
            code = parts[0].trim();
            name = parts.slice(1).join(' / ').trim();
          } else {
            code = '';
            name = typed;
          }
        }

        const canonical = code && name ? `${code} / ${name}` : (code || name || '');
        if (hiddenCourseCodeName) hiddenCourseCodeName.value = canonical;

        // Keep Section 1 Subject / Course Name synchronized if empty or unchanged
        if (subjectInput && name && (!subjectInput.value || subjectInput.dataset.autoSynced === 'true')) {
          subjectInput.value = name;
          subjectInput.dataset.autoSynced = 'true';
        }
      };

      this.courseCombobox = new SearchableCombobox({
        container,
        items,
        placeholder: 'Search course code (e.g. 23CBC26) or course name...',
        searchKeys: ['code', 'name', 'label'],
        displayKey: (item) => `<div class="course-opt-row"><span class="badge-code">${item.code}</span><span class="course-opt-name">${item.name}</span></div>`,
        onSelect: (item) => {
          manualGroup?.classList.add('hidden');
          if (courseNameInput) {
            courseNameInput.parentElement.classList.remove('hidden');
            courseNameInput.value = item.name;
          }
          if (subjectInput) {
            subjectInput.value = item.name;
            subjectInput.dataset.autoSynced = 'true';
          }
          updateCanonicalCourse();
        },
        onOther: () => {
          manualGroup?.classList.remove('hidden');
          if (courseNameInput) courseNameInput.parentElement.classList.add('hidden');
          manualCodeInput?.focus();
          updateCanonicalCourse();
        },
        onClear: () => {
          manualGroup?.classList.add('hidden');
          if (courseNameInput) courseNameInput.value = '';
          updateCanonicalCourse();
        }
      });

      manualCodeInput?.addEventListener('input', updateCanonicalCourse);
      manualNameInput?.addEventListener('input', () => {
        if (subjectInput && (!subjectInput.value || subjectInput.dataset.autoSynced === 'true')) {
          subjectInput.value = manualNameInput.value.trim();
          subjectInput.dataset.autoSynced = 'true';
        }
        updateCanonicalCourse();
      });
      courseNameInput?.addEventListener('input', () => {
        if (subjectInput && subjectInput.dataset.autoSynced === 'true') {
          subjectInput.value = courseNameInput.value.trim();
        }
        updateCanonicalCourse();
      });

      if (subjectInput) {
        subjectInput.addEventListener('input', () => {
          // If user manually modifies Section 1 subject, detach auto-sync flag
          subjectInput.dataset.autoSynced = 'false';
        });
      }
    }

    /**
     * 2. Faculty Name & Designation
     */
    initFacultyDropdown() {
      const container = document.getElementById('facultyComboboxContainer');
      const manualGroup = document.getElementById('facultyManualGroup');
      const manualNameInput = document.getElementById('manualFacultyName');
      const manualDesigInput = document.getElementById('manualFacultyDesig');
      const facultyDesigInput = document.getElementById('facultyDesigInput');
      const hiddenFacultyName = document.getElementById('facultyName');

      if (!container) return;

      const items = FACULTY_CATALOG.map(f => ({
        ...f,
        label: `${f.name} — ${f.designation}`,
        displayText: `${f.name} — ${f.designation}`
      }));

      const updateCanonicalFaculty = () => {
        let name = '';
        let desig = '';

        if (this.facultyCombobox.isOther) {
          name = (manualNameInput?.value || '').trim();
          desig = (manualDesigInput?.value || '').trim();
        } else if (this.facultyCombobox.selectedItem) {
          name = this.facultyCombobox.selectedItem.name;
          desig = (facultyDesigInput?.value || this.facultyCombobox.selectedItem.designation).trim();
        } else {
          const typed = this.facultyCombobox.input.value.trim();
          if (typed.includes('—') || typed.includes(',')) {
            const parts = typed.split(/[—,]/);
            name = parts[0].trim();
            desig = parts.slice(1).join(', ').trim();
          } else {
            name = typed;
            desig = '';
          }
        }

        const canonical = name && desig ? `${name}, ${desig}` : (name || desig || '');
        if (hiddenFacultyName) hiddenFacultyName.value = canonical;
      };

      this.facultyCombobox = new SearchableCombobox({
        container,
        items,
        placeholder: 'Search faculty name or designation (e.g. D. Jotheeswaran, AP/CSBS)...',
        searchKeys: ['name', 'designation', 'label'],
        displayKey: (item) => `<div class="faculty-opt-row"><span class="faculty-opt-name">${item.name}</span><span class="badge-desig">${item.designation}</span></div>`,
        onSelect: (item) => {
          manualGroup?.classList.add('hidden');
          if (facultyDesigInput) {
            facultyDesigInput.parentElement.classList.remove('hidden');
            facultyDesigInput.value = item.designation;
          }
          updateCanonicalFaculty();
        },
        onOther: () => {
          manualGroup?.classList.remove('hidden');
          if (facultyDesigInput) facultyDesigInput.parentElement.classList.add('hidden');
          manualNameInput?.focus();
          updateCanonicalFaculty();
        },
        onClear: () => {
          manualGroup?.classList.add('hidden');
          if (facultyDesigInput) facultyDesigInput.value = '';
          updateCanonicalFaculty();
        }
      });

      manualNameInput?.addEventListener('input', updateCanonicalFaculty);
      manualDesigInput?.addEventListener('input', updateCanonicalFaculty);
      facultyDesigInput?.addEventListener('input', updateCanonicalFaculty);
    }

    /**
     * 3. Seminar Number Dropdown (Preserve leading zero)
     */
    initSeminarNoDropdown() {
      const select = document.getElementById('seminarNoSelect');
      const manualGroup = document.getElementById('manualSeminarNoGroup');
      const manualInput = document.getElementById('manualSeminarNo');
      const hiddenInput = document.getElementById('seminarNo');

      if (!select || !hiddenInput) return;

      const updateCanonical = () => {
        if (select.value === 'other') {
          manualGroup?.classList.remove('hidden');
          let val = (manualInput?.value || '').trim();
          // If user types a single digit like '6', normalize to '06' if desired or preserve exact
          if (/^\d$/.test(val)) val = '0' + val;
          hiddenInput.value = val || '01';
        } else {
          manualGroup?.classList.add('hidden');
          hiddenInput.value = select.value;
        }
      };

      select.addEventListener('change', updateCanonical);
      manualInput?.addEventListener('input', updateCanonical);
      updateCanonical();
    }

    /**
     * 4. Programme and Department Dropdown
     */
    initDepartmentDropdown() {
      const select = document.getElementById('departmentSelect');
      const manualGroup = document.getElementById('manualDepartmentGroup');
      const manualInput = document.getElementById('manualDepartment');
      const hiddenInput = document.getElementById('department');

      if (!select || !hiddenInput) return;

      const updateCanonical = () => {
        if (select.value === 'other') {
          manualGroup?.classList.remove('hidden');
          hiddenInput.value = (manualInput?.value || '').trim() || 'Computer Science and Engineering';
        } else {
          manualGroup?.classList.add('hidden');
          hiddenInput.value = select.value;
        }
      };

      select.addEventListener('change', updateCanonical);
      manualInput?.addEventListener('input', updateCanonical);
      updateCanonical();
    }

    /**
     * 5. Year, Semester, and Section (3 Independent Dropdowns)
     */
    initYearSemSecDropdowns() {
      const yearSelect = document.getElementById('yearSelect');
      const semSelect = document.getElementById('semesterSelect');
      const secSelect = document.getElementById('sectionSelect');

      const manualYearGroup = document.getElementById('manualYearGroup');
      const manualSemGroup = document.getElementById('manualSemesterGroup');
      const manualSecGroup = document.getElementById('manualSectionGroup');

      const manualYearInput = document.getElementById('manualYear');
      const manualSemInput = document.getElementById('manualSemester');
      const manualSecInput = document.getElementById('manualSection');

      const hiddenInput = document.getElementById('yearSemSec');

      if (!yearSelect || !semSelect || !secSelect || !hiddenInput) return;

      const updateCanonical = () => {
        let yr = yearSelect.value;
        if (yr === 'other') {
          manualYearGroup?.classList.remove('hidden');
          yr = (manualYearInput?.value || '').trim() || 'III';
        } else {
          manualYearGroup?.classList.add('hidden');
        }

        let sm = semSelect.value;
        if (sm === 'other') {
          manualSemGroup?.classList.remove('hidden');
          sm = (manualSemInput?.value || '').trim() || 'VI';
        } else {
          manualSemGroup?.classList.add('hidden');
        }

        let sc = secSelect.value;
        if (sc === 'other') {
          manualSecGroup?.classList.remove('hidden');
          sc = (manualSecInput?.value || '').trim() || 'A';
        } else {
          manualSecGroup?.classList.add('hidden');
        }

        hiddenInput.value = `${yr} / ${sm} / ${sc}`;
      };

      yearSelect.addEventListener('change', updateCanonical);
      semSelect.addEventListener('change', updateCanonical);
      secSelect.addEventListener('change', updateCanonical);

      manualYearInput?.addEventListener('input', updateCanonical);
      manualSemInput?.addEventListener('input', updateCanonical);
      manualSecInput?.addEventListener('input', updateCanonical);

      updateCanonical();
    }

    /**
     * 6. Date Selection (Calendar Picker + Manual Entry Mode)
     */
    initDateSelection() {
      const modeSelect = document.getElementById('dateModeSelect');
      const calendarGroup = document.getElementById('calendarDateGroup');
      const manualGroup = document.getElementById('manualDateGroup');
      const calendarInput = document.getElementById('calendarDateInput');
      const manualInput = document.getElementById('manualSeminarDate');
      const dateDisplay = document.getElementById('seminarDateFormattedDisplay');
      const hiddenInput = document.getElementById('seminarDate');

      if (!modeSelect || !hiddenInput) return;

      // Set default calendar date to today or 23-08-2026
      if (calendarInput && !calendarInput.value) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        calendarInput.value = `${yyyy}-${mm}-${dd}`;
      }

      const updateCanonical = () => {
        if (modeSelect.value === 'other') {
          calendarGroup?.classList.add('hidden');
          manualGroup?.classList.remove('hidden');
          const manualVal = (manualInput?.value || '').trim();
          hiddenInput.value = manualVal;
          if (dateDisplay) dateDisplay.textContent = manualVal ? `Selected: ${manualVal}` : '';
        } else {
          calendarGroup?.classList.remove('hidden');
          manualGroup?.classList.add('hidden');
          if (calendarInput?.value) {
            const parsed = parseDateString(calendarInput.value);
            const formatted = formatDateToDDMMYYYY(parsed);
            hiddenInput.value = formatted;
            if (dateDisplay) dateDisplay.textContent = `Formatted: ${formatted}`;
          } else {
            hiddenInput.value = '';
            if (dateDisplay) dateDisplay.textContent = '';
          }
        }
      };

      modeSelect.addEventListener('change', updateCanonical);
      calendarInput?.addEventListener('input', updateCanonical);
      calendarInput?.addEventListener('change', updateCanonical);
      manualInput?.addEventListener('input', updateCanonical);

      updateCanonical();
    }

    /**
     * 7. Academic Year Dropdown
     */
    initAcademicYearDropdown() {
      const select = document.getElementById('academicYearSelect');
      const manualGroup = document.getElementById('manualAcademicYearGroup');
      const manualInput = document.getElementById('manualAcademicYear');
      const hiddenInput = document.getElementById('academicYear');

      if (!select || !hiddenInput) return;

      const updateCanonical = () => {
        if (select.value === 'other') {
          manualGroup?.classList.remove('hidden');
          hiddenInput.value = (manualInput?.value || '').trim() || '2026-2027';
        } else {
          manualGroup?.classList.add('hidden');
          hiddenInput.value = select.value;
        }
      };

      select.addEventListener('change', updateCanonical);
      manualInput?.addEventListener('input', updateCanonical);
      updateCanonical();
    }

    /**
     * 8. Mode B (PPT Only) Details Integration
     */
    initModeBIntegration() {
      const toggleBtn = document.getElementById('btn-toggle-ppt-details');
      const detailsContainer = document.getElementById('ppt-details-container');
      const copyFromReportBtn = document.getElementById('btn-copy-report-details-to-ppt');

      toggleBtn?.addEventListener('click', () => {
        if (!detailsContainer) return;
        const isHidden = detailsContainer.classList.contains('hidden');
        if (isHidden) {
          detailsContainer.classList.remove('hidden');
          toggleBtn.textContent = 'Hide Seminar & Presenter Details';
        } else {
          detailsContainer.classList.add('hidden');
          toggleBtn.textContent = '+ Add Seminar & Presenter Details (Optional)';
        }
      });

      copyFromReportBtn?.addEventListener('click', () => {
        // Copy values from Mode A form to Mode B inputs
        const modeAData = window.extractFormData ? window.extractFormData() : {};
        const pptStudent = document.getElementById('pptStudentName');
        const pptReg = document.getElementById('pptRegisterNo');
        const pptCourse = document.getElementById('pptCourse');
        const pptFaculty = document.getElementById('pptFaculty');
        const pptDept = document.getElementById('pptDepartment');
        const pptDate = document.getElementById('pptDate');

        if (pptStudent && modeAData.studentName) pptStudent.value = modeAData.studentName;
        if (pptReg && modeAData.registerNo) pptReg.value = modeAData.registerNo;
        if (pptCourse && modeAData.courseCodeName) pptCourse.value = modeAData.courseCodeName;
        if (pptFaculty && modeAData.facultyName) pptFaculty.value = modeAData.facultyName;
        if (pptDept && modeAData.department) pptDept.value = modeAData.department;
        if (pptDate && modeAData.seminarDate) pptDate.value = modeAData.seminarDate;

        const badge = document.getElementById('ppt-copied-badge');
        if (badge) {
          badge.classList.remove('hidden');
          setTimeout(() => badge.classList.add('hidden'), 2500);
        }
      });
    }

    /**
     * Populate Form with Sample Data (matches official template)
     */
    populateSampleData(sample) {
      // 1. Topic & Subject
      const topicInput = document.getElementById('topic');
      const subjectInput = document.getElementById('subject');
      if (topicInput) topicInput.value = sample.topic;
      if (subjectInput) {
        subjectInput.value = sample.subject;
        subjectInput.dataset.autoSynced = 'false';
      }

      // 2. Student & Reg
      const studentNameInput = document.getElementById('studentName');
      const regInput = document.getElementById('registerNo');
      if (studentNameInput) studentNameInput.value = sample.studentName;
      if (regInput) regInput.value = sample.registerNo;

      // 3. Course: Select 23CBC26 (Data Warehousing and Data Mining) or custom
      const matchedCourse = COURSE_CATALOG.find(c => sample.courseCodeName && sample.courseCodeName.includes(c.code));
      if (matchedCourse && this.courseCombobox) {
        this.courseCombobox.selectedItem = matchedCourse;
        this.courseCombobox.isOther = false;
        this.courseCombobox.setValue(`${matchedCourse.code} — ${matchedCourse.name}`);
        const manualGroup = document.getElementById('courseManualGroup');
        manualGroup?.classList.add('hidden');
        const courseNameInput = document.getElementById('courseNameInput');
        if (courseNameInput) {
          courseNameInput.parentElement.classList.remove('hidden');
          courseNameInput.value = matchedCourse.name;
        }
      } else if (this.courseCombobox) {
        // Use Other
        this.courseCombobox.selectedItem = null;
        this.courseCombobox.isOther = true;
        this.courseCombobox.setValue('Other (Custom Entry)');
        const manualGroup = document.getElementById('courseManualGroup');
        manualGroup?.classList.remove('hidden');
        const manualCodeInput = document.getElementById('manualCourseCode');
        const manualNameInput = document.getElementById('manualCourseName');
        const parts = (sample.courseCodeName || '').split('/');
        if (manualCodeInput) manualCodeInput.value = parts[0]?.trim() || '22CH601';
        if (manualNameInput) manualNameInput.value = parts[1]?.trim() || 'Wastewater Treatment Technologies';
      }

      // 4. Faculty: Select Dr. S. Gomathi / Mr. D. Jotheeswaran or custom
      const matchedFaculty = FACULTY_CATALOG.find(f => sample.facultyName && sample.facultyName.includes(f.name));
      if (matchedFaculty && this.facultyCombobox) {
        this.facultyCombobox.selectedItem = matchedFaculty;
        this.facultyCombobox.isOther = false;
        this.facultyCombobox.setValue(`${matchedFaculty.name} — ${matchedFaculty.designation}`);
        const manualGroup = document.getElementById('facultyManualGroup');
        manualGroup?.classList.add('hidden');
        const desigInput = document.getElementById('facultyDesigInput');
        if (desigInput) {
          desigInput.parentElement.classList.remove('hidden');
          desigInput.value = matchedFaculty.designation;
        }
      } else if (this.facultyCombobox) {
        this.facultyCombobox.selectedItem = null;
        this.facultyCombobox.isOther = true;
        this.facultyCombobox.setValue('Other (Custom Entry)');
        const manualGroup = document.getElementById('facultyManualGroup');
        manualGroup?.classList.remove('hidden');
        const manualName = document.getElementById('manualFacultyName');
        const manualDesig = document.getElementById('manualFacultyDesig');
        if (manualName) manualName.value = 'Dr. M. Senthil Kumar, M.E., Ph.D.';
        if (manualDesig) manualDesig.value = 'Prof/CSE';
      }

      // 5. Department
      const deptSelect = document.getElementById('departmentSelect');
      if (deptSelect) {
        if (DEPARTMENT_OPTIONS.includes(sample.department)) {
          deptSelect.value = sample.department;
          document.getElementById('manualDepartmentGroup')?.classList.add('hidden');
        } else {
          deptSelect.value = 'other';
          document.getElementById('manualDepartmentGroup')?.classList.remove('hidden');
          const manualDept = document.getElementById('manualDepartment');
          if (manualDept) manualDept.value = sample.department;
        }
      }

      // 6. Seminar No
      const semNoSelect = document.getElementById('seminarNoSelect');
      if (semNoSelect) {
        if (SEMINAR_NO_OPTIONS.includes(sample.seminarNo)) {
          semNoSelect.value = sample.seminarNo;
          document.getElementById('manualSeminarNoGroup')?.classList.add('hidden');
        } else {
          semNoSelect.value = 'other';
          document.getElementById('manualSeminarNoGroup')?.classList.remove('hidden');
          const manualSem = document.getElementById('manualSeminarNo');
          if (manualSem) manualSem.value = sample.seminarNo;
        }
      }

      // 7. Year / Sem / Sec
      const yrSelect = document.getElementById('yearSelect');
      const smSelect = document.getElementById('semesterSelect');
      const scSelect = document.getElementById('sectionSelect');
      const parts = (sample.yearSemSec || 'III / VI / A').split('/').map(p => p.trim());
      if (yrSelect) yrSelect.value = YEAR_OPTIONS.includes(parts[0]) ? parts[0] : 'other';
      if (smSelect) smSelect.value = SEMESTER_OPTIONS.includes(parts[1]) ? parts[1] : 'other';
      if (scSelect) scSelect.value = SECTION_OPTIONS.includes(parts[2]) ? parts[2] : 'other';

      // 8. Date
      const dateMode = document.getElementById('dateModeSelect');
      if (dateMode) {
        dateMode.value = 'calendar';
        const cal = document.getElementById('calendarDateInput');
        if (cal) cal.value = '2026-08-23';
        document.getElementById('calendarDateGroup')?.classList.remove('hidden');
        document.getElementById('manualDateGroup')?.classList.add('hidden');
      }

      // 9. Academic Year
      const acadSelect = document.getElementById('academicYearSelect');
      if (acadSelect) {
        acadSelect.value = '2026 - 2027';
        document.getElementById('manualAcademicYearGroup')?.classList.add('hidden');
      }

      // Trigger change events to update hidden inputs
      deptSelect?.dispatchEvent(new Event('change'));
      semNoSelect?.dispatchEvent(new Event('change'));
      yrSelect?.dispatchEvent(new Event('change'));
      smSelect?.dispatchEvent(new Event('change'));
      scSelect?.dispatchEvent(new Event('change'));
      dateMode?.dispatchEvent(new Event('change'));
      acadSelect?.dispatchEvent(new Event('change'));

      const hiddenCourse = document.getElementById('courseCodeName');
      const hiddenFaculty = document.getElementById('facultyName');
      if (hiddenCourse) hiddenCourse.value = sample.courseCodeName;
      if (hiddenFaculty) hiddenFaculty.value = sample.facultyName;
    }
  }

  // Export to window
  window.SmartDropdowns = new SmartDropdownsController();
  window.COURSE_CATALOG = COURSE_CATALOG;
  window.FACULTY_CATALOG = FACULTY_CATALOG;

})(typeof window !== 'undefined' ? window : global);
