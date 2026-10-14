import { Children, Fragment, isValidElement, type ReactNode } from "react";

export interface SearchableOption {
  value: string;
  label: string;
  disabled: boolean;
  group?: string;
}

function optionText(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? optionText(child.props.children) : "";
  }).join("");
}

/** Keep native option values (including implicit text values) unchanged. */
export function getSelectOptions(children: ReactNode, group?: string, groupDisabled = false): SearchableOption[] {
  return Children.toArray(children).flatMap((child): SearchableOption[] => {
    if (!isValidElement<{ value?: string | number; label?: string; disabled?: boolean; children?: ReactNode }>(child)) return [];
    if (child.type === Fragment) return getSelectOptions(child.props.children, group, groupDisabled);
    if (child.type === "optgroup") return getSelectOptions(child.props.children, child.props.label, !!child.props.disabled);
    if (child.type !== "option") return [];
    const text = optionText(child.props.children);
    return [{ value: String(child.props.value ?? text), label: child.props.label ?? text, disabled: groupDisabled || !!child.props.disabled, group }];
  });
}
