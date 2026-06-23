interface ModulePlaceholderProps {
  title: string;
  description: string;
  comingOn: string;
}

export default function ModulePlaceholder({
  title,
  description,
  comingOn,
}: ModulePlaceholderProps) {
  return (
    <div className="p-6 flex flex-col gap-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
        <p className="text-3xl mb-3">🚧</p>
        <p className="text-sm font-semibold text-slate-600">
          This module is under construction
        </p>
        <p className="text-xs text-slate-400 mt-1">Building on {comingOn}</p>
      </div>
    </div>
  );
}
