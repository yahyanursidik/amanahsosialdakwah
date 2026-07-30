import { FileText, Image as ImageIcon } from "lucide-react";

type EvidenceItem = {
  alt?: string;
  caption?: string;
  href: string;
  id: string;
  kind?: "image" | "document";
  thumbnailUrl?: string;
  title: string;
};

type EvidenceGalleryProps = {
  empty?: React.ReactNode;
  items: EvidenceItem[];
};

export function EvidenceGallery({
  empty = "Belum ada bukti pendukung.",
  items,
}: EvidenceGalleryProps) {
  if (items.length === 0) {
    return <div className="evidence-gallery__empty">{empty}</div>;
  }

  return (
    <div className="evidence-gallery">
      {items.map((item) => {
        const isImage = item.kind !== "document" && item.thumbnailUrl;

        return (
          <a key={item.id} className="evidence-card" href={item.href}>
            <span className="evidence-card__preview">
              {isImage ? (
                <img src={item.thumbnailUrl} alt={item.alt ?? item.title} />
              ) : item.kind === "document" ? (
                <FileText aria-hidden="true" size={28} />
              ) : (
                <ImageIcon aria-hidden="true" size={28} />
              )}
            </span>
            <span className="evidence-card__copy">
              <strong>{item.title}</strong>
              {item.caption ? <small>{item.caption}</small> : null}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export type { EvidenceItem };
