type Props = {
  imageUrl?: string;
  svg?: string;
  alt: string;
  className?: string;
};

export default function VariantDiagram({ imageUrl, svg, alt, className = "" }: Props) {
  const url = imageUrl?.trim();
  const markup = svg?.trim();

  if (!url && !markup) return null;

  return (
    <figure className={`variant-diagram${className ? ` ${className}` : ""}`}>
      {url ? (
        <img className="variant-diagram__img" src={url} alt={alt} draggable={false} />
      ) : (
        <div
          className="variant-diagram__svg"
          role="img"
          aria-label={alt}
          dangerouslySetInnerHTML={{ __html: markup ?? "" }}
        />
      )}
    </figure>
  );
}
