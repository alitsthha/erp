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
          className={`
            w-full
            rounded-lg
            border
            px-4
            py-3
            outline-none
            transition
            focus:ring-2
            focus:ring-blue-500
            ${
              error
                ? "border-red-500"
                : "border-gray-300"
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