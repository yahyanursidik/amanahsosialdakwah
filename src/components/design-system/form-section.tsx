type FormSectionProps = {
  children: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  title: string;
};

export function FormSection({
  children,
  description,
  footer,
  title,
}: FormSectionProps) {
  return (
    <section className="form-section" aria-labelledby={`${title}-form`}>
      <div className="section-heading section-heading--stacked">
        <h2 id={`${title}-form`}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="form-section__body">{children}</div>
      {footer ? <div className="form-section__footer">{footer}</div> : null}
    </section>
  );
}
