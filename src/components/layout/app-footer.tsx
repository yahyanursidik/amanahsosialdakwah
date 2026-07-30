type AppFooterProps = {
  compact?: boolean;
};

export function AppFooter({ compact = false }: AppFooterProps) {
  return (
    <footer className={compact ? "app-footer app-footer--compact" : "app-footer"}>
      {!compact ? (
        <p className="app-footer__statement">
          Menjaga amanah, menghubungkan kebaikan.
        </p>
      ) : null}
      <div className="app-footer__meta">
        <span>Amanah Platform</span>
        <span>
          Disusun dan dikembangkan oleh{" "}
          <a href="https://yahyanursidik.my.id/" rel="noreferrer" target="_blank">
            Yahya Nursidik
          </a>
        </span>
      </div>
    </footer>
  );
}
