import Image from 'next/image';

interface BrandMarkProps {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  size?: number;
}

export function BrandMark({
  className = '',
  imageClassName = '',
  priority = false,
  size = 40,
}: BrandMarkProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/brand/renova-logo.png"
        alt=""
        fill
        priority={priority}
        sizes={`${size}px`}
        className={`object-contain ${imageClassName}`}
      />
    </span>
  );
}
