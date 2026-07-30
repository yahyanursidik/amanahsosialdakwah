import { LoaderCircle } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";

type AppBootProps = {
  message: string;
};

export function AppBoot({ message }: AppBootProps) {
  return (
    <main className="app-boot" aria-busy="true" aria-live="polite">
      <div className="app-boot__inner">
        <BrandLogo priority />
        <span className="app-boot__status">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          {message}
        </span>
      </div>
    </main>
  );
}
