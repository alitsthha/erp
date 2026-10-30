import { forwardRef, useCallback, useId, useMemo, useRef, useState, type SelectHTMLAttributes } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown } from "lucide-react";
import { twMerge as cn } from "tailwind-merge";
import { getSelectOptions } from "./select-options";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size"> & {
  placeholder?: string;
  emptyMessage?: string;
};

/** Shared searchable dropdown. A native select retains form submission,
 * registered refs, validation and real change events for existing forms.
 */
const SearchableSelect = forwardRef<HTMLSelectElement, Props>(function SearchableSelect({
  children, value, defaultValue, className, id, disabled, required, autoFocus,
  onChange, onBlur, onFocus, onInvalid, placeholder, emptyMessage = "No matches found. Try another search.",
  ...props
}, forwardedRef) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const options = useMemo(() => getSelectOptions(children), [children]);
  const [localValue, setLocalValue] = useState(() => String(defaultValue ?? options.find((item) => !item.disabled)?.value ?? ""));
  const [invalid, setInvalid] = useState(false);
  const selectedValue = String(value ?? localValue);
  const selected = selectedValue === "" ? null : options.find((option) => option.value === selectedValue) ?? null;
  const hint = placeholder || options.find((option) => option.value === "")?.label || "Type to search or select";
  const attachRef = useCallback((node: HTMLSelectElement | null) => {
    selectRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  }, [forwardedRef]);

  return (
    <div className="relative min-w-0 w-full">
      <Combobox.Root items={options} value={selected} disabled={disabled} autoHighlight openOnInputClick
        itemToStringLabel={(item) => item.label}
        isItemEqualToValue={(item, current) => item.value === current.value}
        onValueChange={(item) => {
          const element = selectRef.current;
          if (!element || item?.disabled) return;
          element.value = item?.value ?? "";
          element.dispatchEvent(new Event("change", { bubbles: true }));
        }}>
        <div className="relative">
          <Combobox.Input id={inputId} ref={inputRef} autoFocus={autoFocus} placeholder={hint}
            aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]}
            aria-describedby={props["aria-describedby"]} aria-invalid={props["aria-invalid"] || invalid || undefined}
            aria-required={required || props["aria-required"]} title={props.title}
            onBlur={() => selectRef.current?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }))}
            className={cn("ui-field h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100", className, "ui-field-trailing")}
          />
          <Combobox.Trigger aria-label="Show options" className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-lg text-slate-400 hover:text-slate-700 disabled:cursor-not-allowed">
            <ChevronDown size={17} aria-hidden="true" />
          </Combobox.Trigger>
        </div>
        <Combobox.Portal>
          <Combobox.Positioner sideOffset={6} className="z-[10000] w-[var(--anchor-width)] max-w-[calc(100vw-1rem)]">
            <Combobox.Popup className="max-h-[var(--available-height)] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              <Combobox.Empty className="px-4 py-3 text-sm text-slate-500">{emptyMessage}</Combobox.Empty>
              <Combobox.List className="max-h-64 overflow-y-auto py-1">
                {(item) => <Combobox.Item key={item.value} value={item} disabled={item.disabled}
                  className="cursor-pointer px-4 py-2.5 text-sm text-slate-900 outline-none data-highlighted:bg-brand-50 data-selected:font-semibold data-disabled:cursor-not-allowed data-disabled:opacity-40">
                  {item.group && <span className="mr-2 text-xs text-slate-500">{item.group}</span>}{item.label}
                </Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <select {...props} ref={attachRef} value={selectedValue} disabled={disabled} required={required}
        tabIndex={-1} aria-hidden="true" className="sr-only"
        onFocus={(event) => { inputRef.current?.focus(); onFocus?.(event); }}
        onBlur={onBlur}
        onChange={(event) => {
          setLocalValue(event.target.value);
          setInvalid(false);
          inputRef.current?.setCustomValidity("");
          onChange?.(event);
        }}
        onInvalid={(event) => {
          event.preventDefault();
          setInvalid(true);
          inputRef.current?.setCustomValidity(event.currentTarget.validationMessage);
          inputRef.current?.focus();
          inputRef.current?.reportValidity();
          onInvalid?.(event);
        }}
      >{children}</select>
    </div>
  );
});

export default SearchableSelect;
