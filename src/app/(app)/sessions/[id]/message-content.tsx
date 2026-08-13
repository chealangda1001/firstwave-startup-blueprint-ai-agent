import ReactMarkdown from "react-markdown";

/**
 * Renders a chat bubble's content as markdown (the agent writes **bold**,
 * numbered lists, etc. per the system prompt) instead of dumping the raw
 * string with literal asterisks. Inherits color/size from the parent bubble
 * — only spacing and emphasis are styled here.
 */
export function MessageContent({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-2 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_strong]:font-semibold [&_em]:italic [&_p]:leading-relaxed">
      <ReactMarkdown
        components={{
          // Avoid literal <a> styling clashes; keep links inline and legible
          // on both light and dark bubble backgrounds.
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
