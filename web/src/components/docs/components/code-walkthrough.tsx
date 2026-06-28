"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

interface DocCodeWalkthroughProps {
  introHtml?: string;
  title: string;
  codeHtml: string;
  tableHtml: string;
}

type WalkthroughStyle = CSSProperties & {
  "--walkthrough-code-height"?: string;
};

export function DocCodeWalkthrough({
  introHtml,
  title,
  codeHtml,
  tableHtml,
}: DocCodeWalkthroughProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [codeHeight, setCodeHeight] = useState<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const code = root.querySelector<HTMLElement>(".code-walkthrough-code pre");
    if (!code) return;

    const syncCodeHeight = () => {
      setCodeHeight(code.offsetHeight);
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

  const style: WalkthroughStyle = codeHeight
    ? { "--walkthrough-code-height": `${codeHeight}px` }
    : {};

  return (
    <>
      {introHtml && <div dangerouslySetInnerHTML={{ __html: introHtml }} />}
      <div ref={rootRef} className="code-walkthrough" style={style}>
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
            className="code-walkthrough-table-html"
            dangerouslySetInnerHTML={{ __html: tableHtml }}
          />
        </section>
      </div>
    </>
  );
}
