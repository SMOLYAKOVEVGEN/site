import { ImageOff } from 'lucide-react';

export default function ProductImageFallback() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(180deg,#07162b_0%,#0d2b57_55%,#07101d_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.18),transparent_48%)]" />
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.7)_50%,transparent_100%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 text-center">
        <img
          src="/fallback-logo.png"
          alt=""
          className="mb-4 h-14 w-14 object-contain opacity-95"
          draggable={false}
        />

        <div className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-white/90">
          Изображение
        </div>

        <div className="mt-1 text-xs uppercase tracking-[0.14em] text-white/60">
          скоро появится
        </div>
      </div>
    </div>
  );
}