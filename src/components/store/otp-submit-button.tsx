"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  idleLabel: string;
  pendingLabel: string;
  cooldownSeconds?: number;
};

export default function OtpSubmitButton({
  idleLabel,
  pendingLabel,
  cooldownSeconds = 0,
}: Props) {
  const { pending } = useFormStatus();
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const disabled = pending || remaining > 0;

  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-2xl bg-[#103d2b] px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
    >
      {pending
        ? pendingLabel
        : remaining > 0
          ? `Kirim ulang dalam ${remaining} detik`
          : idleLabel}
    </button>
  );
}
