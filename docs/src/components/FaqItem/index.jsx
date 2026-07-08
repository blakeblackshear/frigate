import React, { useState, useEffect } from "react";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

// A single FAQ entry.
//
// The question is a real anchored heading (via @theme/Heading), so on desktop
// it gets the standard hover "#" hash link and the answer is always shown. On
// mobile the heading text is a button that toggles its answer, keeping long
// FAQ pages short. The desktop/mobile split is pure CSS (Docusaurus breakpoint:
// 996px), so there is no hydration flash. The answer is always rendered into
// the DOM, so search engines and the docs AI bot can read it regardless of
// layout or collapsed state. The heading id resolves deep links on both layouts
// and auto-expands the entry on mobile when it is the link target.
export default function FaqItem({ id, question, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openIfTargeted = () => {
      if (window.location.hash === `#${id}`) {
        setOpen(true);
      }
    };
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, [id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    // Reflect the entry in the URL like clicking the heading anchor, so an
    // opened answer is shareable. Use replaceState to avoid history spam and
    // an abrupt scroll. Clear it on close if it currently points here.
    if (next) {
      if (window.location.hash !== `#${id}`) {
        window.history.replaceState(null, "", `#${id}`);
      }
    } else if (window.location.hash === `#${id}`) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
  };

  return (
    <div className={styles.item} data-open={open || undefined}>
      <Heading as="h4" id={id} className={styles.heading}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={`${id}-content`}
          onClick={toggle}
        >
          {question}
        </button>
      </Heading>
      <div id={`${id}-content`} className={styles.content}>
        {children}
      </div>
    </div>
  );
}
