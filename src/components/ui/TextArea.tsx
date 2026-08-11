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