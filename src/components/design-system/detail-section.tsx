type DetailItem = {
  label: string;
  value: React.ReactNode;
};

type DetailSectionProps = {
  actions?: React.ReactNode;
  items?: DetailItem[];
  title: string;
  children?: React.ReactNode;
  description?: React.ReactNode;
};

export function DetailSection({
  actions,
  children,
  description,
  items = [],
  title,
}: DetailSectionProps) {
  return (
    <section className="detail-section" aria-labelledby={`${title}-detail`}>
      <div className="section-heading">
        <div>
          <h2 id={`${title}-detail`}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      {items.length > 0 ? (
        <dl className="detail-section__grid">
          {items.map((item) => (
            <div key={item.label} className="detail-section__item">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
    </section>
  );
}
