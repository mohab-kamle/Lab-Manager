// Step 5: Responsive Images Component
// This component demonstrates how to use optimized images with WebP format
// and proper fallbacks for better performance and Lighthouse scores

import React from 'react';
import PropTypes from 'prop-types';

/**
 * OptimizedImage Component
 * Automatically serves WebP images with fallbacks for better performance
 * Includes responsive sizing and lazy loading
 */
const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  loading = 'lazy',
  sizes,
  srcSet,
  webpSrc,
  webpSrcSet,
  ...props
}) => {
  // Generate WebP source if not provided
  const defaultWebpSrc = webpSrc || src?.replace(/\.(png|jpg|jpeg)$/i, '.webp');
  const defaultWebpSrcSet = webpSrcSet || srcSet?.replace(/\.(png|jpg|jpeg)/gi, '.webp');

  return (
    <picture className={className} style={style}>
      {/* WebP source for modern browsers */}
      {(defaultWebpSrc || defaultWebpSrcSet) && (
        <source
          srcSet={defaultWebpSrcSet || defaultWebpSrc}
          sizes={sizes}
          type="image/webp"
        />
      )}
      
      {/* Fallback for browsers that don't support WebP */}
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        {...props}
      />
    </picture>
  );
};

OptimizedImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  className: PropTypes.string,
  style: PropTypes.object,
  loading: PropTypes.oneOf(['lazy', 'eager']),
  sizes: PropTypes.string,
  srcSet: PropTypes.string,
  webpSrc: PropTypes.string,
  webpSrcSet: PropTypes.string,
};

/**
 * Hero Image Component
 * Example of using OptimizedImage for hero sections
 */
export const HeroImage = ({ className = '', ...props }) => {
  return (
    <OptimizedImage
      className={`hero-image ${className}`}
      loading="eager" // Hero images should load immediately
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      {...props}
    />
  );
};

/**
 * Thumbnail Image Component
 * Example of using OptimizedImage for thumbnails
 */
export const ThumbnailImage = ({ className = '', ...props }) => {
  return (
    <OptimizedImage
      className={`thumbnail-image ${className}`}
      loading="lazy" // Thumbnails can be lazy loaded
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 150px"
      {...props}
    />
  );
};

/**
 * Avatar Image Component
 * Example of using OptimizedImage for user avatars
 */
export const AvatarImage = ({ size = 40, className = '', ...props }) => {
  return (
    <OptimizedImage
      className={`avatar-image ${className}`}
      width={size}
      height={size}
      loading="lazy"
      style={{
        borderRadius: '50%',
        objectFit: 'cover',
        ...props.style
      }}
      {...props}
    />
  );
};

export default OptimizedImage;

/**
 * Usage Examples:
 * 
 * // Basic usage
 * <OptimizedImage
 *   src="/images/hero.png"
 *   alt="Hero image"
 *   width={800}
 *   height={400}
 * />
 * 
 * // With responsive srcSet
 * <OptimizedImage
 *   src="/images/hero-800.png"
 *   srcSet="/images/hero-400.png 400w, /images/hero-800.png 800w, /images/hero-1200.png 1200w"
 *   sizes="(max-width: 768px) 100vw, 50vw"
 *   alt="Responsive hero image"
 *   width={800}
 *   height={400}
 * />
 * 
 * // Hero image (loads immediately)
 * <HeroImage
 *   src="/images/hero.png"
 *   alt="Main hero image"
 *   width={1200}
 *   height={600}
 * />
 * 
 * // Thumbnail (lazy loaded)
 * <ThumbnailImage
 *   src="/images/thumbnail.png"
 *   alt="Product thumbnail"
 *   width={150}
 *   height={150}
 * />
 * 
 * // Avatar
 * <AvatarImage
 *   src="/images/user-avatar.png"
 *   alt="User avatar"
 *   size={64}
 * />
 */