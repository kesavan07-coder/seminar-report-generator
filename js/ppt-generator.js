/**
 * AI PowerPoint Presentation Generator & Slide Deck Viewer
 * Provides:
 * - downloadDeckAsPptx: Generates editable .pptx matching master template (16:9, Times New Roman, Wingdings square bullets, connected flowchart)
 * - downloadDeckAsPdf: Generates crisp 16:9 vector PDF matching every slide 1:1 with zero excessive whitespace
 * - renderSlideDeckPreview: Renders interactive slide carousel with thumbnails & navigation
 * Supports Template 1 (Classic Academic Flowchart) and Template 2 (Executive Technical Grid)
 */

(function (window) {
  'use strict';

  function sanitizeFilename(topic) {
    return String(topic || 'Seminar_Presentation')
      .replace(/[^a-zA-Z0-9_\- ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 60);
  }

  /**
   * 1. Build and download editable PowerPoint (.pptx)
   */
  async function downloadDeckAsPptx(deckData) {
    if (!window.PptxGenJS) {
      throw new Error('PowerPoint generation engine (PptxGenJS) is not loaded. Please refresh the page.');
    }

    const pres = new window.PptxGenJS();
    // 16:9 widescreen layout: 13.333 x 7.5 inches
    pres.defineLayout({ name: 'A4_16_9', width: 13.333, height: 7.5 });
    pres.layout = 'A4_16_9';

    if (deckData.metadata) {
      if (deckData.metadata.studentName) pres.author = deckData.metadata.studentName;
      if (deckData.metadata.department) pres.company = deckData.metadata.department;
      if (deckData.metadata.courseCodeName || deckData.metadata.subject) {
        pres.subject = deckData.metadata.courseCodeName || deckData.metadata.subject;
      }
    }

    const slides = deckData.slides || [];
    slides.forEach((slide, sIdx) => {
      const s = pres.addSlide();
      s.background = { color: 'FFFFFF' };

      // Top Title (Upper Case for Template 1, Headline for Template 2)
      const rawTitle = String(slide.title || 'SEMINAR PRESENTATION :');
      const isTemplate2 = deckData.templateId === 'template-executive-grid' || 
                          ['executive_overview', 'parameter_matrix', 'executive_process', 'three_column_conclusion'].includes(slide.type);

      const titleText = isTemplate2 ? rawTitle : rawTitle.toUpperCase();

      s.addText(titleText, {
        x: 0.45,
        y: 0.22,
        w: 12.2,
        h: 0.58,
        fontFace: 'Times New Roman',
        fontSize: isTemplate2 ? 26 : 24,
        bold: true,
        color: '000000'
      });

      // ─────────────────────────────────────────────────────────────
      // TEMPLATE 1: Classic Academic Slide Types
      // ─────────────────────────────────────────────────────────────
      if (slide.type === 'overview') {
        // Subtitle / Intro
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.45,
            y: 0.95,
            w: 12.2,
            h: 0.65,
            fontFace: 'Times New Roman',
            fontSize: 17,
            color: '000000'
          });
        }

        // Square Bullets (❑)
        const bullets = (slide.bullets || []).map(b => ({
          text: b,
          options: { bullet: { type: 'bullet', code: '274F' } }
        }));

        s.addText(bullets, {
          x: 0.5,
          y: slide.subtitle ? 1.75 : 1.15,
          w: 12.1,
          h: 5.3,
          fontFace: 'Times New Roman',
          fontSize: 16,
          color: '000000',
          lineSpacing: 28,
          spaceAfter: 8
        });

      } else if (slide.type === 'process') {
        // Left Column: Flowchart Explanation
        s.addText(slide.leftHeading || 'FLOW CHART EXPLANATION :', {
          x: 0.55,
          y: 1.05,
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
          y: 1.55,
          w: 6.2,
          h: 5.3,
          fontFace: 'Times New Roman',
          fontSize: 15,
          color: '000000',
          lineSpacing: 26,
          spaceAfter: 7
        });

        // Right Column: Simple Flow Chart Heading
        s.addText(slide.rightHeading || 'SIMPLE FLOW CHART :', {
          x: 7.65,
          y: 0.95,
          w: 4.5,
          h: 0.4,
          fontFace: 'Times New Roman',
          fontSize: 17,
          bold: true,
          color: '000000'
        });

        // Flowchart Stacked Rounded Rectangles
        const steps = slide.flowchart || [];
        const boxX = 7.65;
        const boxW = 3.85;
        const boxH = steps.length > 5 ? 0.52 : 0.58;
        const boxGap = steps.length > 5 ? 0.22 : 0.27;
        const startY = 1.55;

        steps.forEach((stepText, idx) => {
          const curY = startY + idx * (boxH + boxGap);

          // Rounded Rectangle shape with steel blue accent border (#4F81BD)
          s.addShape(pres.ShapeType.roundRect, {
            x: boxX,
            y: curY,
            w: boxW,
            h: boxH,
            fill: { color: 'FFFFFF' },
            line: { color: '4F81BD', width: 1.5 },
            rectRadius: 0.1
          });

          // Centered text inside shape
          s.addText(stepText, {
            x: boxX,
            y: curY,
            w: boxW,
            h: boxH,
            align: 'center',
            valign: 'middle',
            fontFace: 'Times New Roman',
            fontSize: steps.length > 5 ? 11 : 12,
            bold: true,
            color: '000000'
          });

          // Connector line with arrow
          if (idx < steps.length - 1) {
            s.addShape(pres.ShapeType.line, {
              x: boxX + boxW / 2,
              y: curY + boxH,
              w: 0,
              h: boxGap,
              line: { color: '4F81BD', width: 1.5, endArrowType: 'triangle' }
            });
          }
        });

      // ─────────────────────────────────────────────────────────────
      // TEMPLATE 2: Executive Slide Types
      // ─────────────────────────────────────────────────────────────
      } else if (slide.type === 'executive_overview') {
        // Subtitle
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.55,
            y: 0.82,
            w: 12.0,
            h: 0.35,
            fontFace: 'Times New Roman',
            fontSize: 13,
            color: '000000'
          });
        }

        // Executive Concept Banner
        if (slide.banner) {
          s.addShape(pres.ShapeType.roundRect, {
            x: 0.75,
            y: 1.30,
            w: 11.85,
            h: 0.90,
            fill: { color: 'EEF4FB' },
            line: { color: '4F81BD', width: 1.5 },
            rectRadius: 0.08
          });

          s.addText(slide.banner, {
            x: 0.85,
            y: 1.30,
            w: 11.65,
            h: 0.90,
            align: 'center',
            valign: 'middle',
            fontFace: 'Times New Roman',
            fontSize: 20,
            bold: true,
            color: '000000'
          });
        }

        // Bullets
        const bullets = (slide.bullets || []).map(b => ({
          text: b,
          options: { bullet: { type: 'bullet' } }
        }));

        s.addText(bullets, {
          x: 0.85,
          y: 2.50,
          w: 11.65,
          h: 4.4,
          fontFace: 'Times New Roman',
          fontSize: 16.5,
          color: '000000',
          lineSpacing: 28,
          spaceAfter: 8
        });

        // Slide Number
        s.addText('1', { x: 12.55, y: 7.0, w: 0.45, h: 0.25, fontSize: 10, fontFace: 'Times New Roman', color: '666666' });

      } else if (slide.type === 'parameter_matrix') {
        // Subtitle
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.55,
            y: 0.82,
            w: 12.0,
            h: 0.35,
            fontFace: 'Times New Roman',
            fontSize: 13,
            color: '000000'
          });
        }

        // 3-Column Table
        const headers = (slide.tableHeaders || ['Limit', 'Purpose / Mechanism', 'Why It Matters / Impact']).map(h => ({
          text: h,
          options: {
            bold: true,
            fill: '4F81BD',
            color: 'FFFFFF',
            align: 'center',
            fontFace: 'Times New Roman',
            fontSize: 13,
            valign: 'middle'
          }
        }));

        const rows = (slide.tableRows || []).map((row, rIdx) => row.map((cellText, cIdx) => ({
          text: cellText,
          options: {
            bold: cIdx === 0,
            fill: rIdx % 2 === 0 ? 'F9FBFD' : 'FFFFFF',
            color: '000000',
            align: cIdx === 0 ? 'center' : 'left',
            fontFace: 'Times New Roman',
            fontSize: 12,
            valign: 'middle'
          }
        })));

        s.addTable([headers, ...rows], {
          x: 0.55,
          y: 1.30,
          w: 12.2,
          colW: [2.5, 5.7, 4.0],
          rowH: [0.5, ...rows.map(() => 0.65)],
          border: { pt: 1, color: 'D0D7DE' }
        });

        // Footnote
        if (slide.footnote) {
          s.addText(slide.footnote, {
            x: 0.65,
            y: 6.25,
            w: 12.0,
            h: 0.5,
            fontFace: 'Times New Roman',
            fontSize: 13,
            italic: true,
            color: '333333'
          });
        }

        s.addText('2', { x: 12.55, y: 7.0, w: 0.45, h: 0.25, fontSize: 10, fontFace: 'Times New Roman', color: '666666' });

      } else if (slide.type === 'executive_process') {
        // Subtitle
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.55,
            y: 0.82,
            w: 12.0,
            h: 0.35,
            fontFace: 'Times New Roman',
            fontSize: 13,
            color: '000000'
          });
        }

        // Left Heading & Steps
        s.addText(slide.leftHeading || 'LEFT — Explanation', {
          x: 0.55,
          y: 1.20,
          w: 5.8,
          h: 0.4,
          fontFace: 'Times New Roman',
          fontSize: 18,
          bold: true,
          color: '000000'
        });

        const leftSteps = (slide.leftSteps || slide.leftBullets || []).map(st => ({
          text: st,
          options: { spaceAfter: 6 }
        }));

        s.addText(leftSteps, {
          x: 0.60,
          y: 1.65,
          w: 5.8,
          h: 5.2,
          fontFace: 'Times New Roman',
          fontSize: 14,
          color: '000000',
          lineSpacing: 24
        });

        // Right Heading & Flowchart
        s.addText(slide.rightHeading || 'RIGHT — Simple Flow Chart', {
          x: 7.65,
          y: 1.20,
          w: 4.8,
          h: 0.4,
          fontFace: 'Times New Roman',
          fontSize: 18,
          bold: true,
          color: '000000'
        });

        const flowSteps = slide.flowchart || [];
        const boxX = 7.75;
        const boxW = 3.65;
        const boxH = 0.55;
        const boxGap = 0.26;
        const startY = 1.75;

        flowSteps.forEach((stepText, idx) => {
          const curY = startY + idx * (boxH + boxGap);

          s.addShape(pres.ShapeType.roundRect, {
            x: boxX,
            y: curY,
            w: boxW,
            h: boxH,
            fill: { color: 'FFFFFF' },
            line: { color: '4F81BD', width: 1.5 },
            rectRadius: 0.1
          });

          s.addText(stepText, {
            x: boxX,
            y: curY,
            w: boxW,
            h: boxH,
            align: 'center',
            valign: 'middle',
            fontFace: 'Times New Roman',
            fontSize: 12,
            bold: true,
            color: '000000'
          });

          if (idx < flowSteps.length - 1) {
            s.addShape(pres.ShapeType.line, {
              x: boxX + boxW / 2,
              y: curY + boxH,
              w: 0,
              h: boxGap,
              line: { color: '4F81BD', width: 1.5, endArrowType: 'triangle' }
            });
          }
        });

        s.addText('3', { x: 12.55, y: 7.0, w: 0.45, h: 0.25, fontSize: 10, fontFace: 'Times New Roman', color: '666666' });

      } else if (slide.type === 'three_column_conclusion') {
        // Subtitle
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.55,
            y: 0.82,
            w: 12.0,
            h: 0.35,
            fontFace: 'Times New Roman',
            fontSize: 13,
            color: '000000'
          });
        }

        // 3 Pillar Cards
        const cols = slide.columns || [];
        cols.forEach((col, colIdx) => {
          const colX = 0.55 + colIdx * 4.2;
          const colW = 3.8;
          const colH = 4.9;

          // Card Background
          s.addShape(pres.ShapeType.roundRect, {
            x: colX,
            y: 1.30,
            w: colW,
            h: colH,
            fill: { color: 'F8FAFC' },
            line: { color: 'D0D7DE', width: 1.2 },
            rectRadius: 0.08
          });

          // Card Title
          s.addText(col.title, {
            x: colX,
            y: 1.40,
            w: colW,
            h: 0.45,
            align: 'center',
            fontFace: 'Times New Roman',
            fontSize: 17,
            bold: true,
            color: '000000'
          });

          // Card Bullets
          const bullets = (col.bullets || []).map(b => ({
            text: b,
            options: { spaceAfter: 6 }
          }));

          s.addText(bullets, {
            x: colX + 0.15,
            y: 1.95,
            w: colW - 0.3,
            h: colH - 0.8,
            fontFace: 'Times New Roman',
            fontSize: 12.5,
            color: '000000',
            lineSpacing: 22
          });
        });

        // Bottom Conclusion Banner
        if (slide.conclusionBanner) {
          s.addShape(pres.ShapeType.roundRect, {
            x: 0.55,
            y: 6.40,
            w: 12.2,
            h: 0.65,
            fill: { color: 'EEF4FB' },
            line: { color: '4F81BD', width: 1.5 },
            rectRadius: 0.08
          });

          s.addText(slide.conclusionBanner, {
            x: 0.65,
            y: 6.40,
            w: 12.0,
            h: 0.65,
            align: 'center',
            valign: 'middle',
            fontFace: 'Times New Roman',
            fontSize: 13,
            bold: true,
            color: '000000'
          });
        }

        s.addText('4', { x: 12.55, y: 7.0, w: 0.45, h: 0.25, fontSize: 10, fontFace: 'Times New Roman', color: '666666' });

      // ─────────────────────────────────────────────────────────────
      // DEFAULT: General / Introduction / Conclusion Slide
      // ─────────────────────────────────────────────────────────────
      } else {
        const bullets = (slide.bullets || []).map(b => ({
          text: b,
          options: { bullet: { type: 'bullet', code: '274F' } }
        }));

        s.addText(bullets, {
          x: 0.45,
          y: 1.15,
          w: 12.2,
          h: 5.6,
          fontFace: 'Times New Roman',
          fontSize: 16,
          color: '000000',
          lineSpacing: 28,
        });
      }

      // Slide 1 metadata byline if present
      if (sIdx === 0 && deckData.metadata) {
        const bylineParts = [
          deckData.metadata.studentName,
          deckData.metadata.registerNo ? `(${deckData.metadata.registerNo})` : '',
          deckData.metadata.courseCodeName,
          deckData.metadata.department,
          deckData.metadata.seminarDate
        ].filter(Boolean);
        if (bylineParts.length > 0) {
          s.addText(bylineParts.join('  •  '), {
            x: 0.45,
            y: 7.05,
            w: 11.5,
            h: 0.25,
            fontSize: 9.5,
            fontFace: 'Times New Roman',
            color: '666666'
          });
        }
      }
    });

    const fname = `${sanitizeFilename(deckData.topic || 'Seminar')}_Presentation.pptx`;
    await pres.writeFile({ fileName: fname });
    return fname;
  }

  /**
   * 2. Build and download vector PDF (.pdf) matching every slide 1:1 with zero excessive whitespace
   */
  async function downloadDeckAsPdf(deckData) {
    const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPdfLib) {
      throw new Error('PDF generation engine (jsPDF) is not loaded. Please refresh the page.');
    }

    // 16:9 widescreen in points: 960 pt x 540 pt
    const doc = new jsPdfLib({
      orientation: 'landscape',
      unit: 'pt',
      format: [960, 540]
    });

    // ── Embed TrueType Tinos fonts for cross-platform Times New Roman rendering ──
    // Tinos is an Apache 2.0-licensed metric-compatible substitute for Times New Roman.
    // Without embedding, jsPDF uses unembedded Type1 "Times-Roman" which Android/iOS
    // PDF viewers replace with Droid Serif, causing character-width mismatches.
    const ttfFonts = window.TIMES_FONT_TTF_BASE64;
    const FONT_FAMILY = ttfFonts ? 'Times New Roman' : 'times';

    if (ttfFonts) {
      try {
        doc.addFileToVFS('TimesNewRoman-Regular.ttf', ttfFonts.regular);
        doc.addFont('TimesNewRoman-Regular.ttf', 'Times New Roman', 'normal');
        doc.addFileToVFS('TimesNewRoman-Bold.ttf', ttfFonts.bold);
        doc.addFont('TimesNewRoman-Bold.ttf', 'Times New Roman', 'bold');
        doc.addFileToVFS('TimesNewRoman-Italic.ttf', ttfFonts.italic);
        doc.addFont('TimesNewRoman-Italic.ttf', 'Times New Roman', 'italic');
      } catch (fontErr) {
        console.warn('[PDF] TrueType font embedding failed, using built-in Times:', fontErr.message);
      }
    }

    const pageWidth = 960;
    const pageHeight = 540;
    const slides = deckData.slides || [];

    if (deckData.metadata) {
      doc.setProperties({
        title: deckData.title || deckData.topic || 'Seminar Presentation',
        subject: deckData.metadata.courseCodeName || deckData.metadata.subject || 'Seminar Presentation',
        author: deckData.metadata.studentName || 'Student',
        creator: 'MEC Seminar Presentation Generator'
      });
    }

    slides.forEach((slide, idx) => {
      if (idx > 0) doc.addPage([960, 540], 'landscape');

      // Slide background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      const isTemplate2 = deckData.templateId === 'template-executive-grid' ||
                          ['executive_overview', 'parameter_matrix', 'executive_process', 'three_column_conclusion'].includes(slide.type);

      const rawTitle = String(slide.title || 'SEMINAR PRESENTATION :');
      const titleText = isTemplate2 ? rawTitle : rawTitle.toUpperCase();

      // Top Title
      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(24);
      doc.setTextColor(0, 0, 0);
      doc.text(titleText, 36, 42);

      // ─────────────────────────────────────────────────────────────
      // TEMPLATE 1: Classic Academic Slide Types (With Adaptive Spacing)
      // ─────────────────────────────────────────────────────────────
      if (slide.type === 'overview') {
        // Subtitle / definition
        let curY = 90;
        if (slide.subtitle) {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(16.5);
          const subLines = doc.splitTextToSize(slide.subtitle, 888);
          doc.text(subLines, 36, curY);
          curY += (subLines.length * 21) + 18;
        } else {
          curY = 110;
        }

        // Bullets with adaptive spacing filling available height down to 495 pt
        const bullets = slide.bullets || [];
        const bulletCount = bullets.length;
        const availableHeight = 495 - curY;

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(16.5);
        const textLineHeight = 22.5;

        const bulletData = bullets.map(b => {
          const lines = doc.splitTextToSize(b, 856);
          return { text: b, lines, height: lines.length * textLineHeight };
        });

        const totalTextHeight = bulletData.reduce((sum, b) => sum + b.height, 0);
        const remainingSpace = availableHeight - totalTextHeight;
        const paragraphGap = bulletCount > 1 
          ? Math.max(8, Math.min(18, remainingSpace / (bulletCount - 1)))
          : 12;

        bulletData.forEach((bObj, bIdx) => {
          const topY = curY;
          // Square bullet icon: 10x10pt crisp square
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.3);
          doc.rect(36, topY - 11.5, 10, 10, 'S');

          // Text
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(16.5);
          doc.setTextColor(0, 0, 0);
          doc.text(bObj.lines, 60, topY);

          curY += bObj.height + (bIdx < bulletCount - 1 ? paragraphGap : 0);
        });

      } else if (slide.type === 'process') {
        // Left Column: Flowchart explanation
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(17);
        doc.text(slide.leftHeading || 'FLOW CHART EXPLANATION :', 42, 90);

        let curY = 122;
        const leftBullets = slide.leftBullets || [];
        const bulletCount = leftBullets.length;
        const availableHeight = 495 - curY;

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(14.5);
        const textLineHeight = 20;

        const bulletData = leftBullets.map(b => {
          const lines = doc.splitTextToSize(b, 460);
          return { text: b, lines, height: lines.length * textLineHeight };
        });

        const totalTextHeight = bulletData.reduce((sum, b) => sum + b.height, 0);
        const remainingSpace = availableHeight - totalTextHeight;
        const paragraphGap = bulletCount > 1 
          ? Math.max(6, Math.min(16, remainingSpace / (bulletCount - 1)))
          : 10;

        bulletData.forEach((bObj, bIdx) => {
          const topY = curY;
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.2);
          doc.rect(42, topY - 9.5, 8, 8, 'S');

          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(14.5);
          doc.setTextColor(0, 0, 0);
          doc.text(bObj.lines, 58, topY);

          curY += bObj.height + (bIdx < bulletCount - 1 ? paragraphGap : 0);
        });

        // Right Column: Flow Chart Heading
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(17);
        doc.text(slide.rightHeading || 'SIMPLE FLOW CHART :', 650, 90, { align: 'center' });

        // Flowchart Stacked Rounded Rectangles
        const boxes = slide.flowchart || [];
        const boxW = 260;
        const boxH = boxes.length > 5 ? 38 : 42;
        const gapY = boxes.length > 5 ? 16 : 22;
        const startX = 650 - (boxW / 2);
        let boxY = 122;

        boxes.forEach((bText, bIdx) => {
          doc.setDrawColor(79, 129, 189);
          doc.setLineWidth(1.5);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(startX, boxY, boxW, boxH, 6, 6, 'FD');

          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(boxes.length > 5 ? 10 : 11);
          doc.setTextColor(0, 0, 0);
          const bLines = doc.splitTextToSize(bText, boxW - 20);
          const textY = boxY + (boxH / 2) - ((bLines.length - 1) * 6) + 4;
          doc.text(bLines, 650, textY, { align: 'center' });

          if (bIdx < boxes.length - 1) {
            const arrowStartY = boxY + boxH;
            const arrowEndY = arrowStartY + gapY;
            doc.setDrawColor(79, 129, 189);
            doc.setLineWidth(1.5);
            doc.line(650, arrowStartY, 650, arrowEndY);
            doc.setFillColor(79, 129, 189);
            doc.triangle(650, arrowEndY, 646, arrowEndY - 5, 654, arrowEndY - 5, 'FD');
          }

          boxY += boxH + gapY;
        });

      // ─────────────────────────────────────────────────────────────
      // TEMPLATE 2: Executive Slide Types in Vector PDF
      // ─────────────────────────────────────────────────────────────
      } else if (slide.type === 'executive_overview') {
        // Subtitle
        if (slide.subtitle) {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(13);
          doc.text(slide.subtitle, 40, 68);
        }

        // Concept Callout Banner
        if (slide.banner) {
          doc.setFillColor(238, 244, 251);
          doc.setDrawColor(79, 129, 189);
          doc.setLineWidth(1.4);
          doc.roundedRect(40, 88, 880, 52, 6, 6, 'FD');

          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          const bLines = doc.splitTextToSize(slide.banner, 850);
          doc.text(bLines, 480, 118 - ((bLines.length - 1) * 8), { align: 'center' });
        }

        // Bullets with adaptive spacing
        let curY = 168;
        const bullets = slide.bullets || [];
        const bulletCount = bullets.length;
        const availableHeight = 495 - curY;

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(15.5);
        const textLineHeight = 21.5;

        const bulletData = bullets.map(b => {
          const lines = doc.splitTextToSize(b, 840);
          return { text: b, lines, height: lines.length * textLineHeight };
        });

        const totalTextHeight = bulletData.reduce((sum, b) => sum + b.height, 0);
        const remainingSpace = availableHeight - totalTextHeight;
        const paragraphGap = bulletCount > 1 
          ? Math.max(8, Math.min(18, remainingSpace / (bulletCount - 1)))
          : 12;

        bulletData.forEach((bObj, bIdx) => {
          const topY = curY;
          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text('•', 44, topY);

          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(15.5);
          doc.text(bObj.lines, 62, topY);

          curY += bObj.height + (bIdx < bulletCount - 1 ? paragraphGap : 0);
        });

        // Slide Number
        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('1', 915, 520);

      } else if (slide.type === 'parameter_matrix') {
        if (slide.subtitle) {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(13);
          doc.text(slide.subtitle, 40, 68);
        }

        // 3-Column Table
        const headers = slide.tableHeaders || ['Limit', 'Purpose / Mechanism', 'Why It Matters / Impact'];
        const rows = slide.tableRows || [];

        const startX = 40;
        let startY = 92;
        const colW = [180, 420, 280];
        const headerH = 32;
        const rowH = 46;

        // Draw Header
        doc.setFillColor(79, 129, 189);
        doc.rect(startX, startY, 880, headerH, 'F');
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(12.5);
        doc.setTextColor(255, 255, 255);

        let colX = startX;
        headers.forEach((h, i) => {
          doc.text(h, colX + (colW[i] / 2), startY + 21, { align: 'center' });
          colX += colW[i];
        });

        // Draw Rows
        startY += headerH;
        rows.forEach((row, rIdx) => {
          doc.setFillColor(rIdx % 2 === 0 ? 249 : 255, rIdx % 2 === 0 ? 251 : 255, rIdx % 2 === 0 ? 253 : 255);
          doc.rect(startX, startY, 880, rowH, 'F');

          doc.setDrawColor(208, 215, 222);
          doc.setLineWidth(0.8);
          doc.rect(startX, startY, 880, rowH, 'S');

          let cX = startX;
          row.forEach((cell, cIdx) => {
            // Draw column separator
            if (cIdx > 0) {
              doc.line(cX, startY, cX, startY + rowH);
            }

            doc.setFont(FONT_FAMILY, cIdx === 0 ? 'bold' : 'normal');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);

            const lines = doc.splitTextToSize(cell, colW[cIdx] - 16);
            const textY = startY + (rowH / 2) - ((lines.length - 1) * 6) + 4;

            if (cIdx === 0) {
              doc.text(lines, cX + (colW[cIdx] / 2), textY, { align: 'center' });
            } else {
              doc.text(lines, cX + 10, textY);
            }

            cX += colW[cIdx];
          });

          startY += rowH;
        });

        // Footnote
        if (slide.footnote) {
          doc.setFont(FONT_FAMILY, 'italic');
          doc.setFontSize(12);
          doc.setTextColor(50, 50, 50);
          doc.text(slide.footnote, 42, 485);
        }

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('2', 915, 520);

      } else if (slide.type === 'executive_process') {
        if (slide.subtitle) {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(13);
          doc.text(slide.subtitle, 40, 68);
        }

        // Left Column: Heading & Steps
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(16.5);
        doc.setTextColor(0, 0, 0);
        doc.text(slide.leftHeading || 'LEFT — Explanation', 42, 102);

        let curY = 130;
        const leftSteps = slide.leftSteps || slide.leftBullets || [];
        const availableHeight = 495 - curY;

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(13);
        const textLineHeight = 18;

        const bulletData = leftSteps.map(b => {
          const lines = doc.splitTextToSize(b, 420);
          return { text: b, lines, height: lines.length * textLineHeight };
        });

        const totalTextHeight = bulletData.reduce((sum, b) => sum + b.height, 0);
        const remainingSpace = availableHeight - totalTextHeight;
        const paragraphGap = leftSteps.length > 1 
          ? Math.max(6, Math.min(14, remainingSpace / (leftSteps.length - 1)))
          : 8;

        bulletData.forEach((bObj, bIdx) => {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(13);
          doc.setTextColor(0, 0, 0);
          doc.text(bObj.lines, 42, curY);
          curY += bObj.height + (bIdx < leftSteps.length - 1 ? paragraphGap : 0);
        });

        // Right Column: Heading & Flowchart
        doc.setFont(FONT_FAMILY, 'bold');
        doc.setFontSize(16.5);
        doc.text(slide.rightHeading || 'RIGHT — Simple Flow Chart', 730, 102, { align: 'center' });

        const flowSteps = slide.flowchart || [];
        const boxX = 590;
        const boxW = 280;
        const boxH = 38;
        const gapY = 18;
        let boxY = 130;

        flowSteps.forEach((stepText, idx) => {
          doc.setDrawColor(79, 129, 189);
          doc.setLineWidth(1.4);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(boxX, boxY, boxW, boxH, 6, 6, 'FD');

          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          const bLines = doc.splitTextToSize(stepText, boxW - 16);
          const textY = boxY + (boxH / 2) - ((bLines.length - 1) * 6) + 4;
          doc.text(bLines, boxX + (boxW / 2), textY, { align: 'center' });

          if (idx < flowSteps.length - 1) {
            const arrowStartY = boxY + boxH;
            const arrowEndY = arrowStartY + gapY;
            doc.setDrawColor(79, 129, 189);
            doc.setLineWidth(1.4);
            doc.line(boxX + (boxW / 2), arrowStartY, boxX + (boxW / 2), arrowEndY);
            doc.setFillColor(79, 129, 189);
            doc.triangle(boxX + (boxW / 2), arrowEndY, boxX + (boxW / 2) - 4, arrowEndY - 5, boxX + (boxW / 2) + 4, arrowEndY - 5, 'FD');
          }

          boxY += boxH + gapY;
        });

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('3', 915, 520);

      } else if (slide.type === 'three_column_conclusion') {
        if (slide.subtitle) {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(13);
          doc.text(slide.subtitle, 40, 68);
        }

        // 3 Cards
        const cols = slide.columns || [];
        cols.forEach((col, colIdx) => {
          const cX = 40 + colIdx * 300;
          const cW = 280;
          const cH = 340;

          // Card Box
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(208, 215, 222);
          doc.setLineWidth(1.2);
          doc.roundedRect(cX, 95, cW, cH, 6, 6, 'FD');

          // Title
          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(15);
          doc.setTextColor(0, 0, 0);
          doc.text(col.title, cX + (cW / 2), 122, { align: 'center' });

          // Bullets
          let bulletY = 148;
          (col.bullets || []).forEach(b => {
            doc.setFont(FONT_FAMILY, 'normal');
            doc.setFontSize(11);
            doc.setTextColor(0, 0, 0);
            const cleanBullet = b.replace(/^[•\s-]+/, '');
            const lines = doc.splitTextToSize(cleanBullet, cW - 28);
            doc.setFont(FONT_FAMILY, 'bold');
            doc.text('•', cX + 12, bulletY);
            doc.setFont(FONT_FAMILY, 'normal');
            doc.text(lines, cX + 24, bulletY);
            bulletY += (lines.length * 15) + 8;
          });
        });

        // Bottom Banner
        if (slide.conclusionBanner) {
          doc.setFillColor(238, 244, 251);
          doc.setDrawColor(79, 129, 189);
          doc.setLineWidth(1.4);
          doc.roundedRect(40, 452, 880, 44, 6, 6, 'FD');

          doc.setFont(FONT_FAMILY, 'bold');
          doc.setFontSize(11.5);
          doc.setTextColor(0, 0, 0);
          const bLines = doc.splitTextToSize(slide.conclusionBanner, 850);
          doc.text(bLines, 480, 478 - ((bLines.length - 1) * 6), { align: 'center' });
        }

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('4', 915, 520);

      // ─────────────────────────────────────────────────────────────
      // DEFAULT: General / Introduction / Conclusion Slide (Adaptive Spacing)
      // ─────────────────────────────────────────────────────────────
      } else {
        let curY = 96;
        const bullets = slide.bullets || [];
        const bulletCount = bullets.length;
        const availableHeight = 495 - curY;

        doc.setFont(FONT_FAMILY, 'normal');
        doc.setFontSize(16);
        const textLineHeight = 22;

        const bulletData = bullets.map(b => {
          const lines = doc.splitTextToSize(b, 856);
          return { text: b, lines, height: lines.length * textLineHeight };
        });

        const totalTextHeight = bulletData.reduce((sum, b) => sum + b.height, 0);
        const remainingSpace = availableHeight - totalTextHeight;
        const paragraphGap = bulletCount > 1 
          ? Math.max(8, Math.min(18, remainingSpace / (bulletCount - 1)))
          : 12;

        bulletData.forEach((bObj, bIdx) => {
          const topY = curY;
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(1.3);
          doc.rect(36, topY - 11.5, 10, 10, 'S');

          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text(bObj.lines, 60, topY);

          curY += bObj.height + (bIdx < bulletCount - 1 ? paragraphGap : 0);
        });
      }

      // Slide 1 metadata byline if present
      if (idx === 0 && deckData.metadata) {
        const bylineParts = [
          deckData.metadata.studentName,
          deckData.metadata.registerNo ? `(${deckData.metadata.registerNo})` : '',
          deckData.metadata.courseCodeName,
          deckData.metadata.department,
          deckData.metadata.seminarDate
        ].filter(Boolean);
        if (bylineParts.length > 0) {
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(100, 100, 100);
          doc.text(bylineParts.join('  •  '), 36, 526);
        }
      }
    });

    const fname = `${sanitizeFilename(deckData.topic || 'Seminar')}_Presentation.pdf`;
    doc.save(fname);
    return fname;
  }

  /**
   * 3. Render Interactive Slide Carousel & Thumbnails Preview in Browser
   */
  function renderSlideDeckPreview(deckData, containerEl) {
    if (!containerEl) return;
    const slides = deckData.slides || [];
    if (!slides.length) {
      containerEl.innerHTML = '<div class="slide-empty">No slides available to preview.</div>';
      return;
    }

    let activeIdx = 0;

    function renderSlideContentHtml(slide) {
      const isTemplate2 = deckData.templateId === 'template-executive-grid' || 
                          ['executive_overview', 'parameter_matrix', 'executive_process', 'three_column_conclusion'].includes(slide.type);

      const rawTitle = String(slide.title || 'SEMINAR PRESENTATION :');
      const title = isTemplate2 ? rawTitle : rawTitle.toUpperCase();

      // TEMPLATE 1: Overview
      if (slide.type === 'overview') {
        const bulletsHtml = (slide.bullets || []).map(b => `
          <div class="slide-bullet-item">
            <span class="slide-square-icon">&#x274F;</span>
            <span class="slide-bullet-text">${b}</span>
          </div>
        `).join('');

        return `
          <div class="slide-inner-viewport">
            <h1 class="slide-title-text">${title}</h1>
            ${slide.subtitle ? `<div class="slide-subtitle-text">${slide.subtitle}</div>` : ''}
            <div class="slide-bullets-wrap ${slide.subtitle ? 'with-sub' : ''}">
              ${bulletsHtml}
            </div>
            ${deckData.metadata && (deckData.metadata.studentName || deckData.metadata.courseCodeName) ? `
              <div class="slide-preview-meta-byline" style="margin-top:auto; padding-top:8px; font-size:11px; color:#64748b; font-family:'Times New Roman', serif;">
                ${[deckData.metadata.studentName, deckData.metadata.registerNo ? `(${deckData.metadata.registerNo})` : '', deckData.metadata.courseCodeName, deckData.metadata.department, deckData.metadata.seminarDate].filter(Boolean).join(' &bull; ')}
              </div>
            ` : ''}
          </div>
        `;
      }

      // TEMPLATE 1: Process
      if (slide.type === 'process') {
        const leftBulletsHtml = (slide.leftBullets || []).map(b => `
          <div class="slide-bullet-item">
            <span class="slide-square-icon">&#x274F;</span>
            <span class="slide-bullet-text">${b}</span>
          </div>
        `).join('');

        const steps = slide.flowchart || [];
        const flowchartHtml = steps.map((stepText, idx) => `
          <div class="slide-flow-node">
            <div class="slide-flow-box">${stepText.replace(/\n/g, '<br>')}</div>
            ${idx < steps.length - 1 ? '<div class="slide-flow-arrow">&#x25BC;</div>' : ''}
          </div>
        `).join('');

        return `
          <div class="slide-inner-viewport">
            <h1 class="slide-title-text">${title}</h1>
            <div class="slide-two-col-layout">
              <div class="slide-left-col">
                <h2 class="slide-col-heading">${slide.leftHeading || 'FLOW CHART EXPLANATION :'}</h2>
                <div class="slide-bullets-wrap flow-bullets">
                  ${leftBulletsHtml}
                </div>
              </div>
              <div class="slide-right-col">
                <h2 class="slide-col-heading center">${slide.rightHeading || 'SIMPLE FLOW CHART :'}</h2>
                <div class="slide-flowchart-stack">
                  ${flowchartHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // TEMPLATE 2: Executive Overview
      if (slide.type === 'executive_overview') {
        const bulletsHtml = (slide.bullets || []).map(b => `
          <div class="slide-bullet-item">
            <span class="slide-square-icon" style="font-size: 1.1em;">&bull;</span>
            <span class="slide-bullet-text">${b}</span>
          </div>
        `).join('');

        return `
          <div class="slide-inner-viewport">
            <h1 class="slide-title-text">${title}</h1>
            ${slide.subtitle ? `<div class="slide-subtitle-text">${slide.subtitle}</div>` : ''}
            ${slide.banner ? `
              <div style="background: #EEF4FB; border: 1.5px solid #4F81BD; border-radius: 6px; padding: 10px 16px; text-align: center; font-weight: bold; font-size: clamp(0.75rem, 1.4vw, 1.1rem); margin-bottom: 12px; color: #000000;">
                ${slide.banner}
              </div>
            ` : ''}
            <div class="slide-bullets-wrap">
              ${bulletsHtml}
            </div>
          </div>
        `;
      }

      // TEMPLATE 2: Parameter Matrix
      if (slide.type === 'parameter_matrix') {
        const headers = slide.tableHeaders || ['Limit', 'Purpose / Mechanism', 'Why It Matters / Impact'];
        const rows = slide.tableRows || [];

        return `
          <div class="slide-inner-viewport">
            <h1 class="slide-title-text">${title}</h1>
            ${slide.subtitle ? `<div class="slide-subtitle-text">${slide.subtitle}</div>` : ''}
            <div style="overflow-x: auto; flex: 1; margin-top: 6px;">
              <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', serif; font-size: clamp(0.65rem, 1.1vw, 0.85rem);">
                <thead>
                  <tr style="background: #4F81BD; color: #ffffff;">
                    ${headers.map((h, i) => `<th style="padding: 6px 10px; border: 1px solid #D0D7DE; text-align: ${i === 0 ? 'center' : 'left'}; font-weight: bold;">${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row, rIdx) => `
                    <tr style="background: ${rIdx % 2 === 0 ? '#F9FBFD' : '#ffffff'};">
                      ${row.map((cell, cIdx) => `
                        <td style="padding: 6px 10px; border: 1px solid #D0D7DE; text-align: ${cIdx === 0 ? 'center' : 'left'}; font-weight: ${cIdx === 0 ? 'bold' : 'normal'}; color: #000000;">
                          ${cell}
                        </td>
                      `).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${slide.footnote ? `<div style="font-style: italic; font-size: clamp(0.6rem, 1.0vw, 0.78rem); margin-top: 8px; color: #475569;">${slide.footnote}</div>` : ''}
            </div>
          </div>
        `;
      }

      // TEMPLATE 2: Executive Process
      if (slide.type === 'executive_process') {
        const leftStepsHtml = (slide.leftSteps || slide.leftBullets || []).map(st => `
          <div style="margin-bottom: 6px; font-size: clamp(0.68rem, 1.2vw, 0.9rem); line-height: 1.35; color: #000000;">
            ${st}
          </div>
        `).join('');

        const steps = slide.flowchart || [];
        const flowchartHtml = steps.map((stepText, idx) => `
          <div class="slide-flow-node">
            <div class="slide-flow-box">${stepText.replace(/\n/g, '<br>')}</div>
            ${idx < steps.length - 1 ? '<div class="slide-flow-arrow">&#x25BC;</div>' : ''}
          </div>
        `).join('');

        return `
          <div class="slide-inner-viewport">
            <h1 class="slide-title-text">${title}</h1>
            ${slide.subtitle ? `<div class="slide-subtitle-text">${slide.subtitle}</div>` : ''}
            <div class="slide-two-col-layout">
              <div class="slide-left-col">
                <h2 class="slide-col-heading">${slide.leftHeading || 'LEFT — Explanation'}</h2>
                <div style="overflow-y: auto; flex: 1;">
                  ${leftStepsHtml}
                </div>
              </div>
              <div class="slide-right-col">
                <h2 class="slide-col-heading center">${slide.rightHeading || 'RIGHT — Simple Flow Chart'}</h2>
                <div class="slide-flowchart-stack">
                  ${flowchartHtml}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // TEMPLATE 2: Three Column Conclusion
      if (slide.type === 'three_column_conclusion') {
        const cols = slide.columns || [];
        const colsHtml = cols.map(col => `
          <div style="background: #F8FAFC; border: 1.2px solid #D0D7DE; border-radius: 6px; padding: 10px; display: flex; flex-direction: column; overflow: hidden;">
            <h3 style="text-align: center; font-size: clamp(0.72rem, 1.3vw, 1.0rem); font-weight: bold; margin: 0 0 8px 0; color: #000000;">${col.title}</h3>
            <div style="overflow-y: auto; flex: 1; font-size: clamp(0.62rem, 1.1vw, 0.82rem); line-height: 1.35; color: #000000;">
              ${(col.bullets || []).map(b => `<div style="margin-bottom: 5px;">${b}</div>`).join('')}
            </div>
          </div>
        `).join('');

        return `
          <div class="slide-inner-viewport">
            <h1 class="slide-title-text">${title}</h1>
            ${slide.subtitle ? `<div class="slide-subtitle-text">${slide.subtitle}</div>` : ''}
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; flex: 1; overflow: hidden; margin-bottom: 10px;">
              ${colsHtml}
            </div>
            ${slide.conclusionBanner ? `
              <div style="background: #EEF4FB; border: 1.5px solid #4F81BD; border-radius: 6px; padding: 8px 14px; text-align: center; font-weight: bold; font-size: clamp(0.65rem, 1.1vw, 0.85rem); color: #000000;">
                ${slide.conclusionBanner}
              </div>
            ` : ''}
          </div>
        `;
      }

      // Default Introduction, Conclusion, or Body slide
      const bulletsHtml = (slide.bullets || []).map(b => `
        <div class="slide-bullet-item">
          <span class="slide-square-icon">&#x274F;</span>
          <span class="slide-bullet-text">${b}</span>
        </div>
      `).join('');

      return `
        <div class="slide-inner-viewport">
          <h1 class="slide-title-text">${title}</h1>
          <div class="slide-bullets-wrap">
            ${bulletsHtml}
          </div>
        </div>
      `;
    }

    function updateView() {
      const activeSlide = slides[activeIdx];
      const viewportEl = containerEl.querySelector('.slide-deck-stage');
      const counterEl = containerEl.querySelector('.slide-nav-counter');
      const prevBtn = containerEl.querySelector('.btn-slide-prev');
      const nextBtn = containerEl.querySelector('.btn-slide-next');

      if (viewportEl) {
        viewportEl.innerHTML = renderSlideContentHtml(activeSlide);
      }
      if (counterEl) {
        counterEl.textContent = `Slide ${activeIdx + 1} of ${slides.length}`;
      }
      if (prevBtn) {
        prevBtn.disabled = activeIdx === 0;
      }
      if (nextBtn) {
        nextBtn.disabled = activeIdx === slides.length - 1;
      }

      // Update active thumbnail
      const thumbs = containerEl.querySelectorAll('.slide-thumb-pill');
      thumbs.forEach((th, idx) => {
        if (idx === activeIdx) th.classList.add('active');
        else th.classList.remove('active');
      });
    }

    // Build the outer deck container
    containerEl.innerHTML = `
      <div class="slide-deck-viewer-root">
        <!-- Deck Header & Actions -->
        <div class="slide-deck-toolbar">
          <div class="slide-deck-meta">
            <span class="slide-badge-169">16:9 Widescreen</span>
            <span class="slide-badge-font">Times New Roman &bull; Academic Standard</span>
            <span class="slide-nav-counter">Slide 1 of ${slides.length}</span>
          </div>
          <div class="slide-nav-controls">
            <button type="button" class="btn-slide-nav btn-slide-prev" title="Previous Slide">&larr; Prev</button>
            <button type="button" class="btn-slide-nav btn-slide-next" title="Next Slide">Next &rarr;</button>
          </div>
        </div>

        <!-- 16:9 Slide Canvas Screen -->
        <div class="slide-deck-viewport-frame">
          <div class="slide-deck-aspect-wrapper">
            <div class="slide-deck-stage">
              ${renderSlideContentHtml(slides[0])}
            </div>
          </div>
        </div>

        <!-- Thumbnails Strip -->
        <div class="slide-thumbs-strip">
          ${slides.map((s, idx) => `
            <button type="button" class="slide-thumb-pill ${idx === 0 ? 'active' : ''}" data-slide-idx="${idx}">
              <span class="thumb-num">${idx + 1}</span>
              <span class="thumb-label">${String(s.type || 'Slide').replace(/_/g, ' ').toUpperCase()}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Wire events
    const prevBtn = containerEl.querySelector('.btn-slide-prev');
    const nextBtn = containerEl.querySelector('.btn-slide-next');

    prevBtn?.addEventListener('click', () => {
      if (activeIdx > 0) {
        activeIdx--;
        updateView();
      }
    });

    nextBtn?.addEventListener('click', () => {
      if (activeIdx < slides.length - 1) {
        activeIdx++;
        updateView();
      }
    });

    containerEl.querySelectorAll('.slide-thumb-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-slide-idx'), 10);
        if (!isNaN(idx) && idx >= 0 && idx < slides.length) {
          activeIdx = idx;
          updateView();
        }
      });
    });

    updateView();
  }

  // Export onto window
  window.downloadDeckAsPptx = downloadDeckAsPptx;
  window.downloadDeckAsPdf = downloadDeckAsPdf;
  window.renderSlideDeckPreview = renderSlideDeckPreview;

})(typeof window !== 'undefined' ? window : this);
