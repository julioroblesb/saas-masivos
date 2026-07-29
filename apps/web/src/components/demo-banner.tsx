import IconMessage from '@/components/icon/icon-message';

export default function DemoBanner({ active }: { active: boolean }) {
  if (!active) return null;

  return (
    <div className="relative z-[60] flex w-full flex-col items-center justify-center gap-2 bg-primary px-4 py-2.5 text-white sm:flex-row sm:gap-4">
      <span className="text-center text-xs font-semibold sm:text-sm">
        Vista demo interactiva · Explora Renova con los datos de tu negocio · Disponible durante 24 horas
      </span>
      <a
        href="https://wa.me/51936755465?text=Hola%20Julio,%20estoy%20probando%20el%20demo%20y%20deseo%20contratar%20el%20sistema."
        target="_blank"
        rel="noreferrer"
        className="flex whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-bold text-pink-600 shadow-sm transition-colors hover:bg-pink-50 sm:px-4 sm:py-1.5 sm:text-sm"
      >
        <IconMessage className="mr-1.5 size-4" />
        Solicitar acceso completo
      </a>
    </div>
  );
}
