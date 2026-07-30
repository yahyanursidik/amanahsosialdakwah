import { Search, SlidersHorizontal } from "lucide-react";

type FilterBarProps = {
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  searchPlaceholder?: string;
  searchValue?: string;
};

export function FilterBar({
  actions,
  children,
  onSearchChange,
  searchLabel = "Cari data",
  searchPlaceholder = "Cari nama, kode, atau catatan",
  searchValue,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <div className="filter-bar__search">
        <Search aria-hidden="true" size={18} />
        <label className="sr-only" htmlFor="resource-search">
          {searchLabel}
        </label>
        <input
          id="resource-search"
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange?.(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </div>
      {children ? (
        <div className="filter-bar__filters" aria-label="Filter data">
          <SlidersHorizontal aria-hidden="true" size={18} />
          {children}
        </div>
      ) : null}
      {actions ? <div className="filter-bar__actions">{actions}</div> : null}
    </div>
  );
}
