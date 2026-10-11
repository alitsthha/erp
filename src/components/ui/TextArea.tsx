import { forwardRef } from "react";

interface Props
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const TextArea = forwardRef<
  HTMLTextAreaElement,
  Props
>(({ error, className = "", ...props }, ref) => {
  return (
    <div className="space-y-1">
      <textarea
        ref={ref}
        {...props}
        rows={4}
        className={`ui-field
          w-full
          text-sm
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
      />

      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = "TextArea";

export default TextArea;