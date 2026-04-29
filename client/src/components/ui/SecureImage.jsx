import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

/**
 * SecureImage Component
 * Fetches images with authentication headers and displays them securely
 * Used for comment images and other protected content
 */
const SecureImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  onError = null,
  placeholder = null,
  ...props 
}) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [isLocalBlob, setIsLocalBlob] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { user } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!src) {
      setLoading(false);
      setError(true);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // If it's already a blob or data URL, use it directly
        if (src.startsWith('blob:') || src.startsWith('data:')) {
          setImageSrc(src);
          setIsLocalBlob(false);
          setLoading(false);
          return;
        }

        // For server URLs, we need a token
        const userToken = user?.token || localStorage.getItem("token");
        if (!userToken) {
          console.warn('SecureImage: No authentication token available for server URL:', src);
          setError(true);
          setLoading(false);
          return;
        }
        
        // Construct the full URL if it's a relative path
        const imageUrl = src.startsWith('http') ? src : `${apiUrl}${src}`;
        
        const response = await axios.get(imageUrl, {
          headers: {
            Authorization: `Bearer ${userToken}`
          },
          responseType: 'blob'
        });

        // Create blob URL for the image
        const imageBlob = new Blob([response.data], { type: response.headers['content-type'] });
        const imageObjectURL = URL.createObjectURL(imageBlob);
        
        setImageSrc(imageObjectURL);
        setIsLocalBlob(true);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching secure image:', err.message, 'for URL:', src);
        setError(true);
        setLoading(false);
        if (onError) {
          onError(err);
        }
      }
    };

    fetchImage();

    // Cleanup function to revoke blob URL
    return () => {
      if (imageSrc && isLocalBlob) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, user?.token, apiUrl, onError]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (imageSrc && isLocalBlob) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc, isLocalBlob]);

  if (loading) {
    return (
      <div 
        className={`d-flex align-items-center justify-content-center ${className}`} 
        style={{ 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '0.375rem',
          minHeight: '80px',
          ...style 
        }}
        {...props}
      >
        <div className="spinner-border spinner-border-sm text-secondary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      placeholder || (
        <div 
          className={`d-flex align-items-center justify-content-center ${className}`} 
          style={{ 
            backgroundColor: '#f8f9fa', 
            border: '1px solid #dee2e6',
            borderRadius: '0.375rem',
            color: '#6c757d',
            minHeight: '80px',
            fontSize: '0.875rem',
            ...style 
          }}
          {...props}
        >
          <span>Image not available</span>
        </div>
      )
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      style={style}
      onError={() => {
        setError(true);
        if (onError) {
          onError(new Error('Image failed to load'));
        }
      }}
      {...props}
    />
  );
};

export default SecureImage;