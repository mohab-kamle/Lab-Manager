// Step 2: Lazy-load Heavy Libraries Implementation
// This utility demonstrates how to lazy-load PDF generation libraries
// to improve initial bundle size and loading performance

/**
 * Lazy-loaded PDF generation using jsPDF and html2canvas
 * Only loads the libraries when actually needed for PDF generation
 */
export const generateLazyPDF = async (elementId, filename = 'document.pdf') => {
  try {
    // Dynamically import heavy libraries only when needed
    const [{ jsPDF }, html2canvas] = await Promise.all([
      import('jspdf'),
      import('html2canvas')
    ]);

    // Get the element to convert to PDF
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    // Generate canvas from HTML element
    const canvas = await html2canvas.default(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    // Convert canvas to image data
    const imgData = canvas.toDataURL('image/png');

    // Create PDF document
    const pdf = new jsPDF.jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Calculate dimensions to fit the page
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    // Add image to PDF (handle multiple pages if needed)
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(filename);
    
    return { success: true, message: 'PDF generated successfully' };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lazy-loaded invoice PDF generation using pdfMake
 * Alternative approach for complex document layouts
 */
export const generateLazyInvoicePDF = async (invoiceData, filename = 'invoice.pdf') => {
  try {
    // Dynamically import pdfMake only when needed
    const pdfMake = await import('pdfmake/build/pdfmake');
    const pdfFonts = await import('pdfmake/build/vfs_fonts');
    
    // Set up fonts
    pdfMake.default.vfs = pdfFonts.default.pdfMake.vfs;

    // Create document definition
    const docDefinition = {
      content: [
        { text: 'INVOICE', style: 'header' },
        { text: `Invoice #: ${invoiceData.id}`, margin: [0, 10, 0, 5] },
        { text: `Date: ${new Date(invoiceData.date).toLocaleDateString()}`, margin: [0, 0, 0, 10] },
        
        // Customer information
        {
          columns: [
            {
              width: '*',
              text: [
                { text: 'Bill To:\n', style: 'subheader' },
                `${invoiceData.patient_name}\n`,
                `Patient Code: ${invoiceData.patientcode}\n`
              ]
            },
            {
              width: '*',
              text: [
                { text: 'Invoice Details:\n', style: 'subheader' },
                `Status: ${invoiceData.status}\n`,
                `Total: $${invoiceData.total}\n`
              ]
            }
          ],
          margin: [0, 0, 0, 20]
        },
        
        // Items table
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: [
              ['Item', 'Type', 'Price'],
              ...invoiceData.tests?.map(test => [
                test.name || test.test_name,
                'Test',
                `$${test.price}`
              ]) || [],
              ...invoiceData.cultures?.map(culture => [
                culture.name,
                'Culture',
                `$${culture.price}`
              ]) || [],
              ...invoiceData.packages?.map(pkg => [
                pkg.name,
                'Package',
                `$${pkg.price}`
              ]) || []
            ]
          }
        },
        
        // Totals
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                body: [
                  ['Subtotal:', `$${invoiceData.subtotal || 0}`],
                  ['Discount:', `$${invoiceData.discount || 0}`],
                  ['Tax:', `$${invoiceData.tax || 0}`],
                  [{ text: 'Total:', style: 'tableHeader' }, { text: `$${invoiceData.total}`, style: 'tableHeader' }]
                ]
              },
              layout: 'noBorders'
            }
          ],
          margin: [0, 20, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center'
        },
        subheader: {
          fontSize: 12,
          bold: true
        },
        tableHeader: {
          bold: true
        }
      }
    };

    // Generate and download PDF
    pdfMake.default.createPdf(docDefinition).download(filename);
    
    return { success: true, message: 'Invoice PDF generated successfully' };
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lazy-loaded medical report PDF generation
 * Optimized for medical report layouts
 */
export const generateLazyMedicalReportPDF = async (patient, report, filename) => {
  try {
    // Dynamically import jsPDF only when needed
    const { jsPDF } = await import('jspdf');
    
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Medical Report', 105, 30, null, null, 'center');
    
    // Patient information section
    doc.setFillColor(240, 240, 240);
    doc.rect(10, 40, 190, 40, 'F');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    const patientInfo = [
      [`Patient Name:`, patient.name || 'Not Provided'],
      [`Age:`, patient.birth_date ? Math.floor((new Date().getFullYear() - new Date(patient.birth_date).getFullYear())) : 'Not Provided'],
      [`Gender:`, patient.gender === 'm' ? 'Male' : patient.gender === 'f' ? 'Female' : 'Not Provided'],
      [`Patient Code:`, patient.patientcode || 'Not Provided'],
    ];
    
    patientInfo.forEach((item, index) => {
      doc.text(`${item[0]} ${item[1]}`, 15, 50 + index * 8);
    });
    
    // Tests section
    let yPosition = 90;
    doc.setFont('helvetica', 'bold');
    doc.text('Test Results:', 15, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    if (report.tests && Array.isArray(report.tests)) {
      report.tests.forEach((test, index) => {
        if (yPosition > 270) { // Add new page if needed
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(`${index + 1}. ${test.name || 'Test'}`, 15, yPosition);
        yPosition += 6;
        
        if (test.result) {
          doc.text(`   Result: ${test.result}`, 15, yPosition);
          yPosition += 6;
        }
        
        if (test.normal_range) {
          doc.text(`   Normal Range: ${test.normal_range}`, 15, yPosition);
          yPosition += 6;
        }
        
        yPosition += 3; // Extra spacing between tests
      });
    }
    
    // Save the PDF
    const finalFilename = filename || `Medical_Report_${patient.name || 'Report'}.pdf`;
    doc.save(finalFilename);
    
    return { success: true, message: 'Medical report PDF generated successfully' };
  } catch (error) {
    console.error('Error generating medical report PDF:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Example usage in React components:
 * 
 * // Before (heavy imports loaded immediately):
 * import { jsPDF } from 'jspdf';
 * import html2canvas from 'html2canvas';
 * 
 * const generatePDF = () => {
 *   const canvas = html2canvas(element);
 *   const pdf = new jsPDF();
 *   // ... rest of the code
 * };
 * 
 * // After (lazy loading):
 * import { generateLazyPDF } from '../utils/lazyPdfUtils';
 * 
 * const generatePDF = async () => {
 *   const result = await generateLazyPDF('invoice-element', 'invoice.pdf');
 *   if (result.success) {
 *     console.log('PDF generated successfully!');
 *   } else {
 *     console.error('PDF generation failed:', result.error);
 *   }
 * };
 */