"use client";

import type { MouseEvent, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

export default function SectionLink({ href, children, className, onNavigate }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) {
      onNavigate?.();
      return;
    }

    const targetPath = href.slice(0, hashIndex) || pathname;
    const targetId = href.slice(hashIndex + 1);
    const isHomeTarget = targetPath === "/" || targetPath === "";

    if (pathname === "/" && isHomeTarget) {
      event.preventDefault();
      const element = document.getElementById(targetId);
      window.history.replaceState(null, "", `/#${targetId}`);
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
      onNavigate?.();
      return;
    }

    event.preventDefault();
    router.push(href.startsWith("#") ? `/${href}` : href);
    onNavigate?.();
  }

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
