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
          className={`
            w-full
            rounded-lg
            border
            px-4
            py-3
            outline-none
            focus:ring-2
            focus:ring-blue-500
            ${
              error
                ? "border-red-500"
                : "border-gray-300"
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