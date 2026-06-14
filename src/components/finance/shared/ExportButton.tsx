interface ExportButtonProps {
  href: string;
  label?: string;
}

export function ExportButton({ href, label = "Xuất Excel" }: ExportButtonProps) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
    >
      ⬇ {label}
    </a>
  );
}
