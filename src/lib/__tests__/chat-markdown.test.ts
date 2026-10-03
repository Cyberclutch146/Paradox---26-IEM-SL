import { describe, expect, it } from "vitest";
import { parseChatMarkdown, parseInline } from "../chat-markdown";

describe("parseInline", () => {
  it("splits bold and italic runs", () => {
    expect(parseInline("a **b** _c_ *d*")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", italic: true },
    ]);
  });

  it("leaves text containing no markers alone, including HTML", () => {
    expect(parseInline("<script>x</script>")).toEqual([{ text: "<script>x</script>" }]);
  });
});

describe("parseChatMarkdown", () => {
  it("groups bullets and numbered items into lists", () => {
    const blocks = parseChatMarkdown("Intro\n- one\n- two\n\n1. first\n2. second\nEnd");
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "bullets", "numbered", "paragraph"]);
    expect(blocks[1]).toMatchObject({ kind: "bullets", items: [[{ text: "one" }], [{ text: "two" }]] });
  });

  it("drops heading hashes rather than showing them", () => {
    expect(parseChatMarkdown("## Title")[0]).toEqual({ kind: "paragraph", segments: [{ text: "Title" }] });
  });
});
