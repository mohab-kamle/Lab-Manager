import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';

/**
 * A React component for Browser UI rendering of Barcodes and QR Codes.
 * Uses <canvas> for high-resolution rendering.
 */
const UniversalCode = ({
  type = 'barcode',
  value,
  format = 'CODE128',
  width = 2,
  height = 40,
  margin = 10,
  displayValue = false,
  lineColor = '#000000',
  background = '#FFFFFF',
  fontSize = 20,
  fontOptions = '',
  qrWidth = 128,
  ...props
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;

    if (type === 'barcode') {
      try {
        JsBarcode(canvasRef.current, value, {
          format,
          width,
          height,
          displayValue,
          margin,
          lineColor,
          background,
          fontSize,
          fontOptions,
          ...props,
        });
      } catch (error) {
        console.error('Barcode generation failed:', error);
      }
    } else if (type === 'qrcode') {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: qrWidth,
          margin: Math.floor(margin / 4), // Normalize margin for QR codes
          color: {
            dark: lineColor,
            light: background,
          },
          ...props,
        },
        (error) => {
          if (error) console.error('QR Code generation failed:', error);
        }
      );
    }
  }, [
    type, 
    value, 
    format, 
    width, 
    height, 
    margin, 
    displayValue, 
    lineColor, 
    background, 
    fontSize, 
    fontOptions, 
    qrWidth,
    JSON.stringify(props)
  ]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        maxWidth: '100%', 
        height: 'auto',
        display: 'block' 
      }} 
    />
  );
};

export default UniversalCode;
