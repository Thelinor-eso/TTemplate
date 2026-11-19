'use client';

import { createPortal } from 'react-dom';
import { useState, type ReactNode } from 'react';

type PortalTooltipProps = {
  children: ReactNode;
  content: ReactNode;
};

export default function PortalTooltip({ children, content }: PortalTooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const hasContent = content !== null && content !== undefined && content !== false && content !== '';

  const show = (element: HTMLElement) => {
    if (!hasContent) return;
    const trigger = element.firstElementChild instanceof HTMLElement ? element.firstElementChild : element;
    const bounds = trigger.getBoundingClientRect();
    const width = 288;
    const above = bounds.top > 220;
    setPosition({
      top: above ? bounds.top - 8 : bounds.bottom + 8,
      left: Math.max(8, Math.min(window.innerWidth - width - 8, bounds.left + bounds.width / 2 - width / 2)),
      above,
    });
  };

  return (
    <span
      className="contents"
      onMouseEnter={(event) => show(event.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={(event) => show(event.currentTarget)}
      onBlur={() => setPosition(null)}
    >
      {children}
      {position && hasContent && typeof document !== 'undefined' ? createPortal(
        <span className={`pointer-events-none fixed z-[99999] w-72 max-h-[min(60vh,28rem)] overflow-y-auto rounded-lg border border-[#d6b46b] bg-[#111111] p-3 text-left text-xs text-white shadow-2xl ${position.above ? '-translate-y-full' : ''}`} style={{ top: position.top, left: position.left }}>
          {content}
        </span>,
        document.body,
      ) : null}
    </span>
  );
}
