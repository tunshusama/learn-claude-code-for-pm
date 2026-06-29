"use client";

import { useLayoutEffect, useMemo, useRef } from "react";

interface DocCodeWalkthroughProps {
  introHtml?: string;
  title: string;
  codeHtml: string;
  tableHtml: string;
}

function unwrapTableScroll(html: string): string {
  const match = html.match(/<table[\s\S]*<\/table>/);
  return match ? match[0] : html;
}

export function DocCodeWalkthrough({
  introHtml,
  title,
  codeHtml,
  tableHtml,
}: DocCodeWalkthroughProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tableContentHtml = useMemo(() => unwrapTableScroll(tableHtml), [tableHtml]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const code = root.querySelector<HTMLElement>(".code-walkthrough-code pre");
    const reading = root.querySelector<HTMLElement>(".code-walkthrough-reading");
    const tableScroll = root.querySelector<HTMLElement>(
      ".code-walkthrough-table-scroll"
    );
    if (!code) return;

    const syncCodeHeight = () => {
      const height = Math.ceil(code.getBoundingClientRect().height);
      if (!height || !tableScroll) return;

      root.style.setProperty("--walkthrough-code-height", `${height}px`);
      tableScroll.style.setProperty("height", `${height}px`, "important");
      tableScroll.style.setProperty("max-height", `${height}px`, "important");
      tableScroll.style.setProperty("min-height", "0", "important");
      tableScroll.style.setProperty("overflow", "auto", "important");
      tableScroll.style.setProperty("display", "block", "important");
      tableScroll.style.setProperty("box-sizing", "border-box", "important");

      if (reading) {
        const title = reading.querySelector<HTMLElement>(".code-walkthrough-title");
        const titleGap = title ? title.offsetHeight + 8 : 0;
        reading.style.setProperty(
          "max-height",
          `${height + titleGap}px`,
          "important"
        );
        reading.style.setProperty("overflow", "hidden", "important");
      }
    };

    const frame = window.requestAnimationFrame(syncCodeHeight);
    const observer = new ResizeObserver(syncCodeHeight);
    observer.observe(code);
    window.addEventListener("resize", syncCodeHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", syncCodeHeight);
    };
  }, [codeHtml]);

  return (
    <>
      {introHtml && <div dangerouslySetInnerHTML={{ __html: introHtml }} />}
      <div ref={rootRef} className="code-walkthrough">
        <section className="code-walkthrough-panel code-walkthrough-code">
          <div className="code-walkthrough-title">{title}</div>
          <div
            className="code-walkthrough-code-html"
            dangerouslySetInnerHTML={{ __html: codeHtml }}
          />
        </section>
        <section className="code-walkthrough-panel code-walkthrough-reading">
          <div className="code-walkthrough-title">逐行读</div>
          <div
            className="table-scroll code-walkthrough-table-scroll"
            dangerouslySetInnerHTML={{ __html: tableContentHtml }}
          />
        </section>
      </div>
    </>
  );
}
