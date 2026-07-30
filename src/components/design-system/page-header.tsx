import type { ReactNode } from "react";

type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  meta?: ReactNode;
  title: string;
};

export function PageHeader({
  actions,
  description,
  eyebrow,
  meta,
  title,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        {eyebrow ? <p className="page-header__eyebrow">{eyebrow}</p> : null}
        <div>
          <h1>{title}</h1>
          {description ? (
            <p className="page-header__description">{description}</p>
          ) : null}
        </div>
        {meta ? <div className="page-header__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
