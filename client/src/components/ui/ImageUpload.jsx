import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import SecureImage from './SecureImage';

const ImageUpload = ({
  images = [],
  onImagesChange,
  maxImages = 3,
  disabled = false,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Only image files are allowed';
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFiles = (files) => {
    setError('');
    const fileArray = Array.from(files);

    // Check if adding these files would exceed the limit
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    const validFiles = [];
    const errors = [];

    fileArray.forEach(file => {
      const validationError = validateFile(file);
      if (validationError) {
        errors.push(`${file.name}: ${validationError}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    // Create preview URLs for new files
    const newImages = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));

    onImagesChange([...images, ...newImages]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    // Revoke object URL to prevent memory leaks
    if (images[index].preview) {
      URL.revokeObjectURL(images[index].preview);
    }
    onImagesChange(newImages);
    setError('');
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // eslint-disable-next-line no-unused-vars
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        role="button"
        tabIndex={disabled || images.length >= maxImages ? -1 : 0}
        aria-label="Upload images"
        aria-disabled={disabled || images.length >= maxImages}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFileDialog();
          }
        }}
        className={`
          position-relative border border-2 rounded p-4 text-center transition-colors
          ${dragActive ? 'border-primary bg-light' : 'border-secondary'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover-border-dark'}
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ borderStyle: 'dashed' }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileInput}
          className="d-none"
          disabled={disabled || images.length >= maxImages}
        />

        <div className="d-flex flex-column align-items-center gap-2">
          <Upload className="h-8 w-8 text-secondary" size={32} />
          <div className="small text-secondary">
            {images.length >= maxImages ? (
              <span className="text-warning">Maximum {maxImages} images reached</span>
            ) : (
              <>
                <span className="fw-medium text-primary">Click to upload</span> or drag and drop
                <br />
                <span className="small text-muted">
                  PNG, JPG, GIF up to 5MB ({images.length}/{maxImages} images)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="d-flex align-items-center gap-2 text-danger small bg-light p-3 rounded">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="d-flex flex-column gap-3 mt-3">
          <h4 className="small fw-semibold text-dark">Selected Images</h4>
          <div className="d-flex flex-wrap gap-2">
            {images.map((image, index) => (
              <div
                key={index}
                className="bg-light border border-secondary rounded position-relative overflow-hidden d-flex flex-column align-items-center justify-content-center image-preview-item"
                style={{ width: '120px', height: '120px' }}
                tabIndex={0}
                aria-label={`Image ${index + 1}: ${image.name || image.image_name}. Press Delete to remove.`}
                title="Press Delete to remove"
                onKeyDown={(e) => {
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!disabled) removeImage(index);
                  }
                }}
              >
                {/* Image Thumbnail */}
                <SecureImage
                  src={image.preview || image.url || image.image_path}
                  alt={image.name || `Image ${index + 1}`}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    // Note: SecureImage has its own error handling, but we can still have a local fallback if needed
                  }}
                />

                {/* Broken Image Fallback */}
                {!image.preview && (
                  <div className="d-none w-100 h-100 align-items-center justify-content-center bg-light">
                    <ImageIcon size={40} />
                  </div>
                )}

                {/* Remove Button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(index);
                    }}
                    className="d-flex align-items-center justify-content-center bg-danger text-white position-absolute top-0 end-0 m-1 border-0 rounded image-preview-remove-btn"
                    title="Remove image"
                    aria-label={`Remove image ${image.name || index + 1}`}
                    style={{ width: '24px', height: '24px' }}
                  >
                    <X size={14} />
                  </button>
                )}

                {/* Image Name Tooltip */}
                <div className="image-preview-name text-truncate">
                  {image.name || image.image_name || `Image ${index + 1}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

ImageUpload.propTypes = {
  images: PropTypes.arrayOf(PropTypes.shape({
    preview: PropTypes.string,
    url: PropTypes.string,
    image_path: PropTypes.string,
    name: PropTypes.string,
    image_name: PropTypes.string,
  })),
  onImagesChange: PropTypes.func.isRequired,
  maxImages: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default ImageUpload;
