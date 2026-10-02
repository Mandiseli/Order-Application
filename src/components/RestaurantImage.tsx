import { useState } from "react";

interface Props {
  src?: string;
  alt: string;
  className?: string;
}

const fallback = "/restaurant-fallback.svg";

export default function RestaurantImage({ src, alt, className = "" }: Props) {
  const [imageSrc, setImageSrc] = useState(src?.trim() || fallback);

  return (
    <div className={`restaurant-image ${className}`.trim()}>
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        onError={() => {
          if (imageSrc !== fallback) setImageSrc(fallback);
        }}
      />
    </div>
  );
}
