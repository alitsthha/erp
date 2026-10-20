export interface ActivityOption { id: string; name: string }

export default function ActivityMultiSelect({ options, selected, onChange }: {
  options: ActivityOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="mb-4 rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">Activities — select multiple</legend>
      <div className="flex flex-wrap items-center gap-3">
        <details className="min-w-64 flex-1">
          <summary className="cursor-pointer text-sm text-slate-700">{selected.length ? `${selected.length} activities selected` : "All activities"}</summary>
          <div className="mt-3 grid max-h-64 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {options.map((option) => <label key={option.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={selected.includes(option.id)} onChange={(event) => onChange(event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} />
              {option.name}
            </label>)}
            {!options.length && <p className="text-sm text-slate-500">No activities found.</p>}
          </div>
        </details>
        {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="text-sm font-medium text-brand-600">Show all activities</button>}
      </div>
      {selected.length > 0 && <p className="mt-3 text-xs text-slate-500">{options.filter((option) => selected.includes(option.id)).map((option) => option.name).join(", ")}</p>}
    </fieldset>
  );
}
