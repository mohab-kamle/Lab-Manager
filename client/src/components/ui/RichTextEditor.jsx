import { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import 'react-quill/dist/quill.snow.css';
import '../../styles/RichTextEditor.css';

/**
 * RichTextEditor Component
 * 
 * A secure rich text editor component using React Quill with:
 * - HTML sanitization using DOMPurify
 * - Character limit validation
 * - Optimized performance with minimal re-renders
 * - Simple toolbar for essential formatting
 * 
 * @param {Object} props
 * @param {string} props.value - Current HTML content
 * @param {function} props.onChange - Callback when content changes
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.maxLength - Maximum character limit (default: 5000)
 * @param {boolean} props.disabled - Whether editor is disabled
 * @param {string} props.className - Additional CSS classes
 */
const RichTextEditor = ({
  value = '',
  onChange,
  placeholder = 'Enter your comment...',
  maxLength = 5000,
  disabled = false,
  className = ''
}) => {
  const [content, setContent] = useState(value);
  const [characterCount, setCharacterCount] = useState(() => {
    if (!value) return 0;
    const text = value.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
    return text.length;
  });
  const debounceRef = useRef(null);
  const previousValueRef = useRef(value);

  // Simplified Quill configuration for better performance
  const modules = useMemo(() => ({
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }],
      ['clean']
    ]
  }), []);

  const formats = useMemo(() => [
    'bold', 'italic', 'underline', 'list', 'bullet', 'color'
  ], []);

  // Memoized sanitization configuration
  const sanitizeConfig = useMemo(() => ({
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ol', 'ul', 'li', 'span'],
    ALLOWED_ATTR: ['style'],
    ALLOWED_STYLES: {
      '*': {
        'color': [/^#[0-9a-f]{3,6}$/i]
      }
    }
  }), []);

  // Optimized text length calculation using regex
  const getTextLength = useMemo(() => {
    return (html) => {
      if (!html) return 0;
      // Remove HTML tags and decode entities for accurate character count
      const text = html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
      return text.length;
    };
  }, []);

  // Handle content changes with proper state management
  const handleChange = (html) => {
    const textLength = getTextLength(html);
    
    // Enforce character limit
    if (textLength > maxLength) {
      return;
    }

    // Update local state immediately
    setContent(html);
    setCharacterCount(textLength);
    
    // Debounce parent callback
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (onChange) {
        const sanitizedHtml = DOMPurify.sanitize(html, sanitizeConfig);
        onChange(sanitizedHtml);
      }
    }, 300);
  };

  // Only sync when external value actually changes (not from internal updates)
  useEffect(() => {
    if (value !== previousValueRef.current) {
      setContent(value || '');
      setCharacterCount(getTextLength(value || ''));
      previousValueRef.current = value;
    }
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Memoized character count styling
  const characterCountClass = useMemo(() => {
    const percentage = (characterCount / maxLength) * 100;
    if (percentage >= 90) return 'text-danger';
    if (percentage >= 75) return 'text-warning';
    return 'text-muted';
  }, [characterCount, maxLength]);

  const showWarning = characterCount > maxLength * 0.9;

  return (
    <div className={`rich-text-editor ${className}`}>
      <ReactQuill
        theme="snow"
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        readOnly={disabled}
        className={disabled ? 'disabled' : ''}
      />
      
      {/* Character count display */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <small className="text-muted">
          Supports <strong>bold</strong>, <em>italic</em>, lists, and colors
        </small>
        <small className={characterCountClass}>
          {characterCount}/{maxLength} characters
        </small>
      </div>
      
      {/* Warning when approaching limit */}
      {showWarning && (
        <div className="alert alert-warning mt-2 py-1 px-2 small">
          <i className="bi bi-exclamation-triangle me-1"></i>
          Approaching character limit
        </div>
      )}
    </div>
  );
};
RichTextEditor.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  maxLength: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};
export default RichTextEditor;