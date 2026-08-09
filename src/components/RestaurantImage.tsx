interface Props {
  src?: string;
  alt: string;
}

const fallback =
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop";

export default function RestaurantImage({ src, alt }: Props) {
  return (
    <div className="restaurant-image">
      <img
        src={src && src.trim() !== "" ? src : fallback}
        alt={alt}
        onError={(e) => {
          e.currentTarget.src = fallback;
        }}
      />
    </div>
  );
}