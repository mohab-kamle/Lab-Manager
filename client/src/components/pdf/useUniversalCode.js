import { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * A headless hook to generate Data URLs for Barcodes and QR Codes.
 * 
 * @param {string} type - 'barcode' | 'qrcode'
 * @param {string} value - The value to encode
 * @param {object} options - Custom options for generation
 * @returns {string|null} - The data URL of the generated code
 */
const useUniversalCode = (type, value, options = {}) => {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const generateCode = async () => {
      if (!value) {
        setDataUrl(null);
        return;
      }

      try {
        if (type === 'barcode') {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, value, {
            format: options.format || 'CODE128',
            displayValue: options.displayValue !== undefined ? options.displayValue : false,
            width: options.width || 2,
            height: options.height || 40,
            margin: options.margin !== undefined ? options.margin : 0,
            lineColor: options.lineColor || '#000000',
            background: options.background || '#FFFFFF',
            ...options,
          });
          if (isMounted) setDataUrl(canvas.toDataURL('image/png'));
        } else if (type === 'qrcode') {
          const url = await QRCode.toDataURL(value, {
            width: options.width || 80,
            margin: options.margin !== undefined ? options.margin : 0,
            color: {
              dark: options.lineColor || '#000000',
              light: options.background || '#FFFFFF',
            },
            ...options,
          });
          if (isMounted) setDataUrl(url);
        }
      } catch (error) {
        console.error(`${type} generation failed:`, error);
        if (isMounted) setDataUrl(null);
      }
    };

    generateCode();

    return () => {
      isMounted = false;
    };
  }, [
    type, 
    value, 
    options.format, 
    options.width, 
    options.height, 
    options.margin, 
    options.displayValue,
    options.lineColor,
    options.background
  ]);

  return dataUrl;
};

export default useUniversalCode;
