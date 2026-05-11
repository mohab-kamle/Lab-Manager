import React, { useState, useRef, useEffect, useMemo } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import pdfMake from "pdfmake/build/pdfmake";
import { vfs } from "../../utils/vfs_fonts";
import { DateTime } from "luxon";
import { Printer } from "react-bootstrap-icons";
import LoadingSpinner from "../ui/LoadingSpinner";
import { useLab } from "../../context/LabContext";

// Set up pdfMake with Cairo font
pdfMake.vfs = vfs;

// Configure Cairo font for Arabic text support
pdfMake.fonts = {
  Cairo: {
    normal: "Cairo-Regular.ttf",
    bold: "Cairo-Bold.ttf",
    italics: "Cairo-Regular.ttf",
    bolditalics: "Cairo-Bold.ttf",
  },
};

// Helper to detect Arabic text
function isArabic(text) {
  return /[\u0600-\u06FF]/.test(text);
}
function fixArabicName(name) {
  const rtlMark = "\u200F";
  if (!name || typeof name !== "string") return name;
  const words = name.trim().split(" ");
  if (words.length < 2) return rtlMark + name;
  return rtlMark + words.reverse().join(" ");
}

const InvoicePDF = ({ invoiceData, previewMode }) => {
  const { labInfo } = useLab();
  if (!invoiceData) return null;

  // Move destructuring here so all functions can access these variables
  const {
    id: billId,
    patient_name: patientName,
    patientcode: patientCode,
    tests = [],
    cultures = [],
    packages = [],
    payments = [],
    date: invoiceDate,
    total,
    discount = 0,
    tax = 0,
    subtotal = 0,
    paid = 0,
    due = 0,
    notes,
    status,
  } = invoiceData;

  const [showModal, setShowModal] = useState(false);
  const [paperSize, setPaperSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [copies, setCopies] = useState(1);

  // PDF preview state
  const [pdfUrl, setPdfUrl] = useState(null);
  const iframeRef = useRef();
  const debounceRef = useRef(null);

  // --- Input Handlers ---
  const handleCopiesChange = (e) => {
    const val = e.target.value;

    // Strip any non-digit characters (covers pasting/symbols)
    const digits = val.replace(/\D/g, "");

    if (digits === "") {
      setCopies("");
      return;
    }

    let num = parseInt(digits, 10);

    // Enforce maximum of 5
    if (num > 5) {
      num = 5;
    }

    setCopies(num);
  };

  const handleCopiesKeyDown = (e) => {
    // Allow: Backspace, Delete, Tab, Escape, Enter
    const controlKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (controlKeys.includes(e.key)) return;

    // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (
      (e.ctrlKey || e.metaKey) &&
      ["a", "c", "v", "x", "A", "C", "V", "X"].includes(e.key)
    )
      return;

    // Block anything that is not a digit (0-9)
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // --- Helper functions ---
  // (keep/createA4InvoiceDefinition and createPOSReceiptDefinition here)

  const createA4InvoiceDefinition = () => {
    const allItems = [
      ...tests.map((test) => ({
        name: test.name || test.test_name || "Test",
        type: "Test",
        price: Number(test.price || 0),
      })),
      ...cultures.map((culture) => ({
        name: culture.name || "Culture",
        type: "Culture",
        price: Number(culture.price || 0),
      })),
      ...packages.map((pkg) => ({
        name: pkg.name || "Package",
        type: "Package",
        price: Number(pkg.price || 0),
      })),
    ];

    const calculatedSubtotal = allItems.reduce(
      (sum, item) => sum + item.price,
      0,
    );
    const actualSubtotal =
      calculatedSubtotal > 0 ? calculatedSubtotal : Number(subtotal || 0);

    return {
      pageSize: "A4",
      pageOrientation: orientation,
      pageMargins: [20, 30, 20, 40],
      defaultStyle: {
        font: "Cairo",
        fontSize: 10,
        alignment: "left",
      },
      footer: function (currentPage, pageCount) {
        const labWebsite = labInfo?.lab_website || "";
        const labEmail = labInfo?.lab_email || "";
        const labPhone = labInfo?.lab_phone || "";
        const footerText = [labPhone, labWebsite, labEmail].filter(Boolean).join(" | ");
        return [
          {
            text: footerText,
            alignment: "center",
            fontSize: 8,
            margin: [0, 0, 0, 2],
          },
          {
            text: "Validated and approved by the lab manager",
            alignment: "center",
            fontSize: 8,
          },
        ];
      },
      content: [
        // Header (always in content for preview compatibility)
        {
          text: (labInfo?.lab_name_invoice || labInfo?.name || "Laboratory").toUpperCase(),
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 5],
        },
        {
          text: "MEDICAL LABORATORIES",
          style: "subheader",
          alignment: "center",
          margin: [0, 0, 0, 10],
        },

        // Patient and Invoice Info
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                {
                  text: "Patient Information",
                  style: "sectionHeader",
                  alignment: "left",
                },
                {
                  text: "Invoice Details",
                  style: "sectionHeader",
                  alignment: "left",
                },
                {
                  text: "Status",
                  style: "sectionHeader",
                  alignment: "left",
                },
              ],
              [
                {
                  columns: [
                    {
                      text: "Name:",
                      alignment: "left",
                      margin: [0, 0, 2, 0],
                      fontSize: 8,
                    },
                    {
                      text: isArabic(patientName)
                        ? fixArabicName(patientName)
                        : patientName,
                      alignment: "right",
                      fontSize: 8,
                    },
                  ],
                  colSpan: 1,
                },
                {
                  text: `Invoice #: ${billId || "-"}`,
                  alignment: "left",
                },
                {
                  text: `Items Count: ${allItems.length}`,
                  alignment: "left",
                },
              ],
              [
                {
                  text: `Code: ${patientCode || "-"}`,
                  alignment: "left",
                },
                {
                  text: `Date: ${invoiceDate ? DateTime.fromISO(invoiceDate).toFormat("dd/MM/yyyy") : "-"}`,
                  alignment: "left",
                },
                {
                  text: `Status: ${status || "Pending"}`,
                  alignment: "left",
                },
              ],
            ],
          },
          layout: "lightHorizontalLines",
          margin: [0, 0, 0, 20],
        },

        // Items Table
        {
          text: "Items & Prices",
          style: "sectionHeader",
          alignment: "center",
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            widths: ["*", "auto", "auto", "auto"],
            body: [
              [
                { text: "Item", style: "tableHeader", alignment: "left" },
                { text: "Type", style: "tableHeader", alignment: "left" },
                { text: "Price", style: "tableHeader", alignment: "left" },
                { text: "Total", style: "tableHeader", alignment: "left" },
              ],
              ...allItems.map((item) => [
                { text: item.name, alignment: "left" },
                { text: item.type, alignment: "left" },
                { text: `${item.price.toFixed(2)} EGP`, alignment: "left" },
                { text: `${item.price.toFixed(2)} EGP`, alignment: "left" },
              ]),
            ],
          },
          layout: {
            hLineWidth: function () {
              return 0.5;
            },
            vLineWidth: function () {
              return 0.5;
            },
            paddingLeft: function () {
              return 1;
            },
            paddingRight: function () {
              return 1;
            },
            paddingTop: function () {
              return 0;
            },
            paddingBottom: function () {
              return 0;
            },
          },
          margin: [0, 0, 0, 10],
        },

        // Financial Summary
        {
          text: "Financial Summary",
          style: "sectionHeader",
          alignment: "center",
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            widths: ["*", "auto"],
            body: [
              [
                { text: "Subtotal:", alignment: "left" },
                { text: `EGP ${actualSubtotal.toFixed(2)}`, alignment: "left" },
              ],
              [
                { text: "Discount:", alignment: "left" },
                {
                  text: `EGP ${Number(discount || 0).toFixed(2)}`,
                  alignment: "left",
                },
              ],
              [
                {
                  text: `Tax${invoiceData.tax_rate ? ` (${(invoiceData.tax_rate * 100).toFixed(2)}%)` : ""}:`,
                  alignment: "left",
                },
                {
                  text: `EGP ${Number(tax || 0).toFixed(2)}`,
                  alignment: "left",
                },
              ],
              [
                { text: "Total:", style: "totalRow", alignment: "left" },
                {
                  text: `EGP ${Number(total || 0).toFixed(2)}`,
                  style: "totalRow",
                  alignment: "left",
                },
              ],
              [
                { text: "Paid:", alignment: "left" },
                {
                  text: `EGP ${Number(paid || 0).toFixed(2)}`,
                  alignment: "left",
                },
              ],
              [
                { text: "Due:", alignment: "left" },
                {
                  text: `EGP ${Number(due || 0).toFixed(2)}`,
                  alignment: "left",
                },
              ],
            ],
          },
          layout: {
            hLineWidth: function () {
              return 0;
            },
            vLineWidth: function () {
              return 0;
            },
            paddingLeft: function () {
              return 1;
            },
            paddingRight: function () {
              return 1;
            },
            paddingTop: function () {
              return 0;
            },
            paddingBottom: function () {
              return 0;
            },
          },
          margin: [0, 0, 0, 10],
        },

        // Payment Methods
        ...(payments && payments.length > 0
          ? [
              {
                text: "Payment Methods",
                style: "sectionHeader",
                alignment: "center",
                margin: [0, 0, 0, 10],
              },
              {
                table: {
                  widths: ["*", "auto"],
                  body: [
                    [
                      {
                        text: "Payment Method",
                        style: "tableHeader",
                        alignment: "left",
                      },
                      {
                        text: "Amount",
                        style: "tableHeader",
                        alignment: "left",
                      },
                    ],
                    ...payments.map((payment) => [
                      {
                        text:
                          payment.payment_method_name ||
                          payment.method ||
                          payment.payment_method ||
                          payment.type ||
                          payment.name ||
                          "Payment Method",
                        alignment: "left",
                      },
                      {
                        text: `EGP ${Number(payment.paid_amount || payment.amount || payment.payment_amount || payment.value || payment.price || 0).toFixed(2)}`,
                        alignment: "left",
                      },
                    ]),
                  ],
                },
                layout: {
                  hLineWidth: function () {
                    return 0.5;
                  },
                  vLineWidth: function () {
                    return 0.5;
                  },
                  paddingLeft: function () {
                    return 1;
                  },
                  paddingRight: function () {
                    return 1;
                  },
                  paddingTop: function () {
                    return 0;
                  },
                  paddingBottom: function () {
                    return 0;
                  },
                },
                margin: [0, 0, 0, 10],
              },
            ]
          : []),

        // Notes
        ...(notes
          ? [
              {
                text: "Notes:",
                style: "sectionHeader",
                alignment: "left",
                margin: [0, 0, 0, 5],
              },
              {
                text: notes,
                alignment: "left",
                margin: [0, 0, 0, 20],
              },
            ]
          : []),
      ],
      styles: {
        header: {
          fontSize: 24,
          bold: true,
          color: "#2980b9",
        },
        subheader: {
          fontSize: 14,
          color: "#2980b9",
        },
        sectionHeader: {
          fontSize: 12,
          bold: true,
          color: "#2c3e50",
        },
        tableHeader: {
          fontSize: 10,
          bold: true,
          color: "#2c3e50",
        },
        totalRow: {
          fontSize: 10,
          bold: true,
          color: "#e74c3c",
        },
      },
    };
  };

  const createPOSReceiptDefinition = () => {
    const allItems = [
      ...tests.map((test) => ({
        name: test.name || test.test_name || "Test",
        price: Number(test.price || 0),
      })),
      ...cultures.map((culture) => ({
        name: culture.name || "Culture",
        price: Number(culture.price || 0),
      })),
      ...packages.map((pkg) => ({
        name: pkg.name || "Package",
        price: Number(pkg.price || 0),
      })),
    ];

    const calculatedSubtotal = allItems.reduce(
      (sum, item) => sum + item.price,
      0,
    );
    const actualSubtotal =
      calculatedSubtotal > 0 ? calculatedSubtotal : Number(subtotal || 0);

    // Determine paper width based on POS type
    const is58mm = paperSize === "pos-58";
    const pageWidth = is58mm ? 48 : 72;

    return {
      pageSize: { width: pageWidth, height: 297 },
      pageMargins: [1, 8, 1, 8],
      defaultStyle: {
        font: "Cairo",
        fontSize: is58mm ? 2 : 3,
        alignment: "left",
      },
      content: [
        // Header (always in content for preview compatibility)
        {
          text: (labInfo?.lab_name_invoice || labInfo?.name || "Laboratory").toUpperCase(),
          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 2],
        },
        {
          text: "MEDICAL LABORATORIES",
          style: "subheader",
          alignment: "center",
          margin: [0, 0, 0, 1],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 5,
              y1: 0,
              x2: pageWidth - 6,
              y2: 0,
              lineWidth: 0.1,
            },
          ],
        },
        { text: "", margin: [0, 2] },

        // Invoice Info Table
        {
          table: {
            widths: ["*", "*"],
            body: [
              [
                {
                  text: `Invoice #: ${billId || "N/A"}`,
                  alignment: "left",
                  border: [false, false, false, false],
                },
                {
                  text: `Date: ${invoiceDate ? DateTime.fromISO(invoiceDate).toFormat("dd/MM/yyyy") : "N/A"}`,
                  alignment: "right",
                  border: [false, false, false, false],
                },
              ],
              [
                {
                  text: "Patient:",
                  alignment: "left",
                  border: [false, false, false, false],
                },
                {
                  text: patientName
                    ? isArabic(patientName)
                      ? fixArabicName(patientName)
                      : patientName
                    : "N/A",
                  alignment: isArabic(patientName) ? "right" : "left",
                  direction: isArabic(patientName) ? "rtl" : "ltr",
                  border: [false, false, false, false],
                },
              ],
              [
                {
                  text: `Code: ${patientCode || "N/A"}`,
                  alignment: "left",
                  colSpan: 2,
                  border: [false, false, false, false],
                },
                {},
              ],
            ],
          },
          layout: "noBorders",
          margin: [0, 0, 0, 2],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 5,
              y1: 0,
              x2: pageWidth - 6,
              y2: 0,
              lineWidth: 0.1,
            },
          ],
        },
        { text: "", margin: [0, 2] },

        // Items Table
        {
          table: {
            widths: ["*", "auto"],
            body: [
              [
                { text: "Item", style: "tableHeader", alignment: "left" },
                { text: "Price", style: "tableHeader", alignment: "right" },
              ],
              ...allItems.map((item) => [
                { text: item.name, alignment: "left" },
                { text: `${item.price.toFixed(2)} EGP`, alignment: "right" },
              ]),
            ],
          },
          layout: {
            hLineWidth: function () {
              return 0.2;
            },
            vLineWidth: function () {
              return 0.2;
            },
            paddingLeft: function () {
              return 1;
            },
            paddingRight: function () {
              return 1;
            },
            paddingTop: function () {
              return 0;
            },
            paddingBottom: function () {
              return 0;
            },
          },
          margin: [0, 0, 0, 1],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 5,
              y1: 0,
              x2: pageWidth - 6,
              y2: 0,
              lineWidth: 0.1,
            },
          ],
        },
        { text: "", margin: [0, 2] },

        // Financial Summary Table
        {
          table: {
            widths: ["*", "auto"],
            body: [
              [
                { text: "Subtotal:", alignment: "left" },
                {
                  text: `${actualSubtotal.toFixed(2)} EGP`,
                  alignment: "right",
                },
              ],
              [
                { text: "Discount:", alignment: "left" },
                {
                  text: `${Number(discount || 0).toFixed(2)} EGP`,
                  alignment: "right",
                },
              ],
              [
                {
                  text: `Tax${invoiceData.tax_rate ? ` (${(invoiceData.tax_rate * 100).toFixed(2)}%)` : ""}:`,
                  alignment: "left",
                },
                {
                  text: `${Number(tax || 0).toFixed(2)} EGP`,
                  alignment: "right",
                },
              ],
              [
                { text: "Total:", style: "totalRow", alignment: "left" },
                {
                  text: `${Number(total || 0).toFixed(2)} EGP`,
                  style: "totalRow",
                  alignment: "right",
                },
              ],
              [
                { text: "Paid:", alignment: "left" },
                {
                  text: `${Number(paid || 0).toFixed(2)} EGP`,
                  alignment: "right",
                },
              ],
              [
                { text: "Due:", alignment: "left" },
                {
                  text: `${Number(due || 0).toFixed(2)} EGP`,
                  alignment: "right",
                },
              ],
            ],
          },
          layout: {
            hLineWidth: function () {
              return 0;
            },
            vLineWidth: function () {
              return 0;
            },
            paddingLeft: function () {
              return 1;
            },
            paddingRight: function () {
              return 1;
            },
            paddingTop: function () {
              return 0;
            },
            paddingBottom: function () {
              return 0;
            },
          },
          margin: [0, 0, 0, 1],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 5,
              y1: 0,
              x2: pageWidth - 6,
              y2: 0,
              lineWidth: 0.1,
            },
          ],
        },
        { text: "", margin: [0, 2] },

        // Payment Methods Table
        {
          text: "Payment Methods",
          style: "sectionHeader",
          alignment: "center",
          margin: [0, 0, 0, 1],
        },
        {
          table: {
            widths: ["*", "auto"],
            body: [
              [
                { text: "Method", style: "tableHeader", alignment: "left" },
                { text: "Amount", style: "tableHeader", alignment: "right" },
              ],
              ...payments.map((payment) => [
                {
                  text:
                    payment.payment_method_name ||
                    payment.method ||
                    payment.payment_method ||
                    payment.type ||
                    payment.name ||
                    "Payment Method",
                  alignment: "left",
                },
                {
                  text: `${Number(payment.paid_amount || payment.amount || payment.payment_amount || payment.value || payment.price || 0).toFixed(2)} EGP`,
                  alignment: "right",
                },
              ]),
            ],
          },
          layout: {
            hLineWidth: function () {
              return 0.2;
            },
            vLineWidth: function () {
              return 0.2;
            },
            paddingLeft: function () {
              return 1;
            },
            paddingRight: function () {
              return 1;
            },
            paddingTop: function () {
              return 0;
            },
            paddingBottom: function () {
              return 0;
            },
          },
          margin: [0, 0, 0, 1],
        },
        {
          canvas: [
            {
              type: "line",
              x1: 5,
              y1: 0,
              x2: pageWidth - 6,
              y2: 0,
              lineWidth: 0.1,
            },
          ],
        },
        { text: "", margin: [0, 2] },

        // Footer
        {
          text: `${labInfo?.lab_name_invoice || labInfo?.name || "Laboratory"} Medical Laboratories`,
          alignment: "center",
          margin: [0, 2, 0, 1],
        },
        {
          text: [labInfo?.lab_phone, labInfo?.lab_website].filter(Boolean).join(" | "),
          alignment: "center",
          fontSize: is58mm ? 2 : 3,
          margin: [0, 0, 0, 1],
        },
        {
          text: "Thank You!",
          alignment: "center",
          margin: [0, 0, 0, 1],
        },
      ],
      styles: {
        header: {
          fontSize: is58mm ? 3 : 5,
          bold: true,
        },
        subheader: {
          fontSize: is58mm ? 3 : 5,
        },
        sectionHeader: {
          fontSize: is58mm ? 3 : 5,
          bold: true,
        },
        tableHeader: {
          fontSize: is58mm ? 3 : 5,
          bold: true,
        },
        totalRow: {
          fontSize: is58mm ? 2 : 3,
          bold: true,
        },
      },
    };
  };

  // --- useEffect for preview mode ---
  const isPOS = useMemo(() => paperSize.startsWith("pos-"), [paperSize]);
  const docDefinition = useMemo(
    () => (isPOS ? createPOSReceiptDefinition() : createA4InvoiceDefinition()),
    [isPOS, invoiceData, orientation],
  );

  useEffect(() => {
    if (!previewMode || !invoiceData) {
      setPdfUrl((currentUrl) => {
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        return null;
      });
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      try {
        pdfMake.createPdf(docDefinition).getBlob((blob) => {
          const newObjectUrl = URL.createObjectURL(blob);
          setPdfUrl((currentUrl) => {
            if (currentUrl) URL.revokeObjectURL(currentUrl);
            return newObjectUrl;
          });
        });
      } catch (e) {
        setPdfUrl((currentUrl) => {
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          return null;
        });
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [previewMode, invoiceData, docDefinition]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Mobile detection function
  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) || window.innerWidth <= 768
    );
  };

  const isMobile = isMobileDevice();

  if (previewMode) {
    return (
      <div>
        {/* Paper size selector for preview mode */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ marginRight: 8, fontWeight: 500 }}>Paper Size:</label>
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            style={{ padding: "2px 8px", fontSize: 14 }}
          >
            <option value="A4">A4</option>
            <option value="pos-58">58mm POS</option>
            <option value="pos-80">80mm POS</option>
          </select>
        </div>

        {isMobile ? (
          // Mobile-friendly fallback
          <div
            style={{
              height: "300px",
              border: "1px solid #ccc",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              padding: "20px",
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <Printer size={48} color="#6c757d" />
            </div>
            <h5 style={{ color: "#495057", marginBottom: "10px" }}>
              PDF Preview Not Available
            </h5>
            <p
              style={{
                color: "#6c757d",
                marginBottom: "20px",
                fontSize: "14px",
              }}
            >
              PDF preview is not supported on mobile devices. Please download
              the invoice to view it.
            </p>
            <button
              onClick={() => {
                const isPOS = paperSize.startsWith("pos-");
                let docDefinition;
                if (isPOS) {
                  docDefinition = createPOSReceiptDefinition();
                } else {
                  docDefinition = createA4InvoiceDefinition();
                }
                pdfMake
                  .createPdf(docDefinition)
                  .download(`Invoice_${billId || "invoice"}.pdf`);
              }}
              style={{
                padding: "10px 20px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Download Invoice PDF
            </button>
          </div>
        ) : // Desktop preview using Blob URL (more compatible than data URLs)
        pdfUrl ? (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title="Invoice PDF Preview"
            width="100%"
            height="600px"
            style={{ border: "none" }}
          />
        ) : (
          <LoadingSpinner message="Loading PDF preview..." />
        )}
      </div>
    );
  }

  const handlePrint = async () => {
    // Determine if this is a POS receipt
    const isPOS = paperSize.startsWith("pos-");

    let docDefinition;

    if (isPOS) {
      docDefinition = createPOSReceiptDefinition();
    } else {
      docDefinition = createA4InvoiceDefinition();
    }

    // Generate PDF once
    const pdfDoc = pdfMake.createPdf(docDefinition);

    // Repeat the print order based on the number of copies (max 5)
    const printCopies = Math.min(Math.max(1, copies), 5);

    for (let i = 0; i < printCopies; i++) {
      // Use print() to integrate with default browser print function
      // This will trigger the browser's print dialog or silent print if configured
      pdfDoc.print();
    }

    setShowModal(false);
  };

  return (
    <>
      <Button
        variant="outline-primary"
        size="sm"
        onClick={() => setShowModal(true)}
        title="Print Invoice"
      >
        <Printer size={16} />
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Print Invoice</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Paper Size</Form.Label>
              <Form.Control
                as="select"
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
              >
                <option value="A4">A4</option>
                <option value="pos-58">58mm POS</option>
                <option value="pos-80">80mm POS</option>
              </Form.Control>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Orientation</Form.Label>
              <Form.Control
                as="select"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </Form.Control>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Number of Copies</Form.Label>
              <Form.Control
                type="text"
                value={copies}
                onKeyDown={handleCopiesKeyDown}
                onChange={handleCopiesChange}
                inputMode="numeric"
                autoComplete="off"
              />
              <Form.Text className="text-muted">
                Maximum 5 copies per print order.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            Print
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default InvoicePDF;
