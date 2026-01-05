import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

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
          relative border-2 border-dashed rounded-lg p-6 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          ${images.length >= maxImages ? 'opacity-50 cursor-not-allowed' : ''}
        `}
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
          className="hidden"
          disabled={disabled || images.length >= maxImages}
        />
        
        <div className="space-y-2">
          <Upload className="mx-auto h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            {images.length >= maxImages ? (
              <span className="text-orange-600">Maximum {maxImages} images reached</span>
            ) : (
              <>
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                <br />
                <span className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 5MB ({images.length}/{maxImages} images)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Image Previews */}
{images.length > 0 && (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-gray-800">Selected Images</h4>
    <div className="d-flex flex-wrap gap-2">
      {images.map((image, index) => (
        <div
          key={index}
          className="bg-grey-100 border border-gray-200 rounded-lg relative group overflow-hidden d-flex flex-column align-items-center justify-content-center "
          style={{ width: '120px'}}
        >
          {/* Image Thumbnail */}
          <img
            src={image.preview || image.url || image.image_path}
            alt={image.name || `Image ${index + 1}`}
            loading="lazy"
            style={{ width: '80px', height: '80px', objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextSibling.style.display = "flex";
            }}
          />

          {/* Broken Image Fallback */}
          {!image.preview && (
            <div className="hidden w-full h-full items-center justify-center bg-gray-100">
              <ImageIcon size={80} />
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
              className=" d-flex items-center justify-center bg-danger text-white absolute top-1 right-1 border-0 rounded-3 group-hover:opacity-100 transition-opacity"
              title="Remove image"
              aria-label={`Remove image ${image.name || index + 1}`}
            >
              <X size={16} />
            </button>
          )}

          {/* Image Name Tooltip */}
          <div className="absolute bottom-0 left-0 right-0  px-1 py-0.5  group-hover:opacity-100 transition truncate">
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