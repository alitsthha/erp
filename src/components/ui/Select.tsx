import { forwardRef } from "react";

interface Props
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ children, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        <select
          ref={ref}
          {...props}
          className={`ui-field
            w-full
            text-sm
            h-11
            rounded-lg
            border
            px-4
            py-2.5
            outline-none
            focus:ring-2
            focus:border-brand-600
            focus:ring-brand-100
            ${
              error
                ? "border-red-500"
                : "border-slate-300"
            }
            ${className}
          `}
        >
          {children}
        </select>

        {error && (
          <p className="text-red-500 text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;