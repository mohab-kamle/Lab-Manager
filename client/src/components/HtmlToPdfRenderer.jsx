import React from 'react';
import { Text, View } from '@react-pdf/renderer';

/**
 * HTML to PDF Renderer Components
 * 
 * These components convert HTML rich text content to @react-pdf/renderer components
 * for proper rendering in PDF documents.
 */

/**
 * Parse HTML string and extract text content and basic formatting
 * @param {string} html - HTML string to parse
 * @returns {Array} Array of parsed elements with type and content
 */
const parseHtmlContent = (html) => {
  if (!html || typeof html !== 'string') {
    return [{ type: 'text', content: '', styles: {} }];
  }

  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const elements = [];
  
  const processNode = (node, inheritedStyles = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (text && text.trim()) {
        elements.push({
          type: 'text',
          content: text,
          styles: { ...inheritedStyles }
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      let newStyles = { ...inheritedStyles };
      let shouldAddLineBreak = false;
      let isBlockElement = false;

      // Handle different HTML tags
      switch (tagName) {
        case 'strong':
        case 'b':
          newStyles.fontWeight = 'bold';
          break;
        case 'em':
        case 'i':
          newStyles.fontStyle = 'italic';
          break;
        case 'u':
          newStyles.textDecoration = 'underline';
          break;
        case 'h1':
          newStyles.fontSize = 16;
          newStyles.fontWeight = 'bold';
          shouldAddLineBreak = true;
          isBlockElement = true;
          break;
        case 'h2':
          newStyles.fontSize = 14;
          newStyles.fontWeight = 'bold';
          shouldAddLineBreak = true;
          isBlockElement = true;
          break;
        case 'h3':
          newStyles.fontSize = 12;
          newStyles.fontWeight = 'bold';
          shouldAddLineBreak = true;
          isBlockElement = true;
          break;
        case 'p':
          shouldAddLineBreak = true;
          isBlockElement = true;
          break;
        case 'br':
          elements.push({ type: 'linebreak' });
          return;
        case 'ol':
        case 'ul':
          shouldAddLineBreak = true;
          isBlockElement = true;
          break;
        case 'li':
          // Add line break before list item if not the first element
          if (elements.length > 0) {
            elements.push({ type: 'linebreak' });
          }
          elements.push({ type: 'text', content: '• ', styles: newStyles });
          break;
        case 'span':
          // Handle inline styles for color
          const style = node.getAttribute('style');
          if (style) {
            const colorMatch = style.match(/color:\s*([^;]+)/);
            const bgColorMatch = style.match(/background-color:\s*([^;]+)/);
            if (colorMatch) {
              newStyles.color = colorMatch[1].trim();
            }
            if (bgColorMatch) {
              newStyles.backgroundColor = bgColorMatch[1].trim();
            }
          }
          break;
      }

      // Add line break before block elements (except for the first element)
      if (isBlockElement && elements.length > 0) {
        const lastElement = elements[elements.length - 1];
        if (lastElement.type !== 'linebreak') {
          elements.push({ type: 'linebreak' });
        }
      }

      // Process child nodes
      Array.from(node.childNodes).forEach(child => {
        processNode(child, newStyles);
      });

      // Add line break after block elements
      if (isBlockElement) {
        const lastElement = elements[elements.length - 1];
        if (lastElement && lastElement.type !== 'linebreak') {
          elements.push({ type: 'linebreak' });
        }
      }
    }
  };

  Array.from(tempDiv.childNodes).forEach(node => {
    processNode(node);
  });

  // Clean up consecutive line breaks and trailing line breaks
  const cleanedElements = [];
  for (let i = 0; i < elements.length; i++) {
    const current = elements[i];
    const next = elements[i + 1];
    
    // Skip consecutive line breaks
    if (current.type === 'linebreak' && next && next.type === 'linebreak') {
      continue;
    }
    
    // Skip trailing line breaks
    if (current.type === 'linebreak' && i === elements.length - 1) {
      continue;
    }
    
    cleanedElements.push(current);
  }

  return cleanedElements.length > 0 ? cleanedElements : [{ type: 'text', content: '', styles: {} }];
};

/**
 * Convert parsed elements to PDF styles
 * @param {Object} styles - Styles object from parsed element
 * @param {Object} baseStyles - Base styles to merge with
 * @returns {Object} PDF-compatible styles
 */
const convertToPdfStyles = (styles, baseStyles = {}) => {
  const pdfStyles = { ...baseStyles };

  if (styles.fontWeight === 'bold') {
    pdfStyles.fontWeight = 'bold';
  }
  
  if (styles.fontStyle === 'italic') {
    pdfStyles.fontStyle = 'italic';
  }
  
  if (styles.textDecoration === 'underline') {
    pdfStyles.textDecoration = 'underline';
  }
  
  if (styles.fontSize) {
    pdfStyles.fontSize = styles.fontSize;
  }
  
  if (styles.color) {
    // Convert color to PDF-compatible format
    pdfStyles.color = styles.color;
  }
  
  if (styles.backgroundColor) {
    pdfStyles.backgroundColor = styles.backgroundColor;
  }

  return pdfStyles;
};

/**
 * Rich Text PDF Renderer Component
 * 
 * Renders HTML rich text content as PDF-compatible components
 * 
 * @param {Object} props
 * @param {string} props.html - HTML content to render
 * @param {Object} props.baseStyle - Base text styles
 * @param {Object} props.containerStyle - Container view styles
 */
const RichTextPdfRenderer = ({ 
  html, 
  baseStyle = {}, 
  containerStyle = {} 
}) => {
  const elements = parseHtmlContent(html);
  
  if (!elements || elements.length === 0) {
    return null;
  }

  // Render elements as separate Text components for better line break handling
  const renderElements = [];
  let currentLine = [];
  
  elements.forEach((element, index) => {
    if (element.type === 'linebreak') {
      // Finish current line if it has content
      if (currentLine.length > 0) {
        renderElements.push({
          type: 'line',
          elements: [...currentLine]
        });
        currentLine = [];
      }
      // Add line break
      renderElements.push({ type: 'linebreak' });
    } else if (element.type === 'text') {
      currentLine.push(element);
    }
  });
  
  // Add remaining line
  if (currentLine.length > 0) {
    renderElements.push({
      type: 'line',
      elements: currentLine
    });
  }

  return (
    <View style={containerStyle}>
      {renderElements.map((item, index) => {
        if (item.type === 'line') {
          return (
            <Text key={index} style={baseStyle}>
              {item.elements.map((element, elementIndex) => {
                const pdfStyles = convertToPdfStyles(element.styles, baseStyle);
                return (
                  <Text key={elementIndex} style={pdfStyles}>
                    {element.content}
                  </Text>
                );
              })}
            </Text>
          );
        } else if (item.type === 'linebreak') {
          return (
            <View key={index} style={{ height: 12 }}>
              <Text style={baseStyle}> </Text>
            </View>
          );
        }
        return null;
      })}
    </View>
  );
};

/**
 * Simple HTML to Plain Text Converter
 * 
 * Fallback function to extract plain text from HTML
 * 
 * @param {string} html - HTML content
 * @returns {string} Plain text content
 */
const htmlToPlainText = (html) => {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return tempDiv.textContent || tempDiv.innerText || '';
};

export { RichTextPdfRenderer, htmlToPlainText, parseHtmlContent };
export default RichTextPdfRenderer;