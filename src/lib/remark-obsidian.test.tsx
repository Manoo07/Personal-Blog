import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkObsidian from "./remark-obsidian";

const render = (md: string) =>
  renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkObsidian]}>{md}</ReactMarkdown>
  ).replace(/>\n+</g, "><");

describe("remarkObsidian callouts", () => {
  it("renders a titled callout with inline formatting in the body", () => {
    const html = render("> [!tip] Going deeper\n> Body with **bold** text.");
    expect(html).toBe(
      '<div class="callout" data-callout="tip"><p class="callout-title">Going deeper</p>' +
        "<p>Body with <strong>bold</strong> text.</p></div>"
    );
  });

  it("falls back to the type name when there is no title", () => {
    expect(render("> [!warning]\n> Careful.")).toBe(
      '<div class="callout" data-callout="warning"><p class="callout-title">Warning</p><p>Careful.</p></div>'
    );
  });

  it("supports title-only callouts", () => {
    expect(render("> [!note] Just a title")).toBe(
      '<div class="callout" data-callout="note"><p class="callout-title">Just a title</p></div>'
    );
  });

  it("maps aliases and accepts fold markers", () => {
    expect(render("> [!faq]- Why?\n> Because.")).toContain('data-callout="question"');
    expect(render("> [!important] X\n> y")).toContain('data-callout="tip"');
    expect(render("> [!madeup] X\n> y")).toContain('data-callout="note"');
  });

  it("keeps multi-paragraph bodies and code blocks", () => {
    const html = render("> [!example] Demo\n> First.\n>\n> ```java\n> int x = 1;\n> ```");
    expect(html).toContain('<p class="callout-title">Demo</p><p>First.</p><pre><code class="language-java">');
  });

  it("leaves ordinary blockquotes alone", () => {
    expect(render("> plain quote")).toBe("<blockquote><p>plain quote</p></blockquote>");
  });
});

describe("remarkObsidian highlights", () => {
  it("turns ==text== into <mark>", () => {
    expect(render("a ==key idea== b")).toBe("<p>a <mark>key idea</mark> b</p>");
  });

  it("ignores code and spaced equality operators", () => {
    expect(render("`==x==` and a == b == c")).toBe("<p><code>==x==</code> and a == b == c</p>");
    expect(render("```js\nif (a == b) {} // ==no==\n```")).not.toContain("<mark>");
  });
});
