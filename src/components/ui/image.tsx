import { forwardRef, type ImgHTMLAttributes } from 'react';

export type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fittingType?: 'fill' | 'fit';
  originWidth?: number;
  originHeight?: number;
  focalPointX?: number;
  focalPointY?: number;
};

const FALLBACK_IMAGE_URL = '/fallback-logo.png';

export const Image = forwardRef<HTMLImageElement, ImageProps>(function Image(
  { src, alt = '', onError, fittingType = 'fill', className = '', ...props },
  ref,
) {
  return (
    <img
      ref={ref}
      src={src || FALLBACK_IMAGE_URL}
      alt={alt}
      className={`${className} ${fittingType === 'fit' ? 'object-contain' : 'object-cover'}`.trim()}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src !== FALLBACK_IMAGE_URL) {
          img.src = FALLBACK_IMAGE_URL;
        }
        onError?.(e);
      }}
      {...props}
    />
  );
});
