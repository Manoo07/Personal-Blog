import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "./markdown-components";
import { isPdfUrl } from "./image-upload";

const render = (md: string) =>
  renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{md}</ReactMarkdown>
  );

describe("PDF embeds", () => {
  it("recognises PDF URLs by path, ignoring query and hash", () => {
    expect(isPdfUrl("https://api.example.dev/api/images/abc.pdf")).toBe(true);
    expect(isPdfUrl("https://arxiv.org/pdf/1234.pdf?v=2#page=3")).toBe(true);
    expect(isPdfUrl("https://api.example.dev/api/images/abc")).toBe(false);
    expect(isPdfUrl("https://x.dev/pdf-guide.png")).toBe(false);
  });

  it("renders ![title](….pdf) as an embedded reader with its title", () => {
    const html = render("![Dynamo paper](https://api.example.dev/api/images/abc.pdf)");
    expect(html).toContain('<iframe src="https://api.example.dev/api/images/abc.pdf#view=FitH&amp;navpanes=0" title="Dynamo paper"');
    expect(html).toContain("Dynamo paper</span>");
    expect(html).not.toContain("<img");
  });

  it("leaves ordinary images and plain PDF links alone", () => {
    expect(render("![diagram](https://x.dev/a.png)")).toContain('<img src="https://x.dev/a.png" alt="diagram"');
    expect(render("[read the paper](https://x.dev/p.pdf)")).toBe('<p><a href="https://x.dev/p.pdf">read the paper</a></p>');
  });
});
