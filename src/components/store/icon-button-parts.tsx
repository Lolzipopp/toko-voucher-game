export function CartSvgIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M3.5 4h2.1l1.7 10.2a2 2 0 0 0 2 1.7h7.5a2 2 0 0 0 1.9-1.4l1.5-5.6H7.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 20a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 10 20Zm8 0a1.25 1.25 0 1 1-2.5 0A1.25 1.25 0 0 1 18 20Z" fill="currentColor" />
    </svg>
  );
}

export function WhatsAppSvgIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <path d="M20.2 11.7a8.1 8.1 0 0 1-12 7.1L4 20l1.3-4a8.1 8.1 0 1 1 14.9-4.3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.1 8.6c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2.1.4 0 .6l-.4.5c-.1.2-.2.3-.1.5.3.5.7 1 1.2 1.4.6.5 1.1.8 1.7 1 .2.1.4 0 .5-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.4.3.4.5 0 .6-.2 1.2-.6 1.6-.5.4-1.2.6-2.2.4-1.2-.2-2.5-.9-3.8-2.1-1.3-1.2-2.2-2.6-2.5-3.8-.3-.9-.1-1.5.2-1.9Z" fill="currentColor" />
    </svg>
  );
}
