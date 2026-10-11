import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1">
        <input
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
            transition
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
        />

        {error && (
          <p className="text-red-500 text-sm">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;