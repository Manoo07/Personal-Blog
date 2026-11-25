import { isValidElement } from "react";
import type { Components } from "react-markdown";
import MermaidDiagram from "@/components/MermaidDiagram";
import PdfEmbed from "@/components/PdfEmbed";
import { isPdfUrl } from "@/lib/image-upload";

/** Custom renderers for ReactMarkdown */
export const markdownComponents: Components = {
  pre({ children, ...props }) {
    // Extract language from the child <code> element's className
    let language = "";
    let codeContent = "";
    if (isValidElement<{ className?: string; children?: unknown }>(children)) {
      const codeProps = children.props;
      const className = codeProps?.className || "";
      const match = className.match(/language-(\w+)/);
      if (match) language = match[1];
      if (typeof codeProps?.children === "string") {
        codeContent = codeProps.children;
      }
    }

    if (language === "mermaid") {
      return <MermaidDiagram code={codeContent} />;
    }

    return (
      <div className="code-block-wrapper">
        {language && (
          <div className="code-block-lang">
            {language}
          </div>
        )}
        <pre {...props}>{children}</pre>
      </div>
    );
  },

  img({ node: _node, ...props }) {
    // ![title](…/file.pdf) embeds a PDF reader, like Obsidian's ![[file.pdf]]
    if (typeof props.src === "string" && isPdfUrl(props.src)) return <PdfEmbed src={props.src} title={props.alt} />;
    return <img {...props} loading="lazy" decoding="async" />;
  },

  // Wrap every table in a horizontally-scrollable container so it
  // never overflows on small screens.
  table({ children, ...props }) {
    return (
      <div className="table-responsive-wrapper">
        <table {...props}>{children}</table>
      </div>
    );
  },
};
