"use client";

import { useState, useSyncExternalStore } from "react";
import { useMedia } from "./hooks";

const noSubscribe = () => () => {};

/**
 * A QR code that opens the demo booking page on the visitor's phone. It is drawn by the
 * same QR service as the counter QR in the settings, only on wide screens, and falls
 * back to the plain address if the service does not answer.
 */
export function DemoQr({ path }: { path: string }) {
  const host = useSyncExternalStore(
    noSubscribe,
    () => window.location.host,
    () => null
  );
  const wide = useMedia("(min-width: 1024px)");
  const [failed, setFailed] = useState(false);
  const url = host ? `${window.location.protocol}//${host}${path}` : null;

  return (
    <div className="grid h-[148px] w-[148px] place-items-center border border-lime-edge bg-lime p-3">
      {url && wide && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=248x248&margin=0&color=1A2E12&bgcolor=CFEA6E&data=${encodeURIComponent(url)}`}
          alt="קוד QR לעמוד ההזמנה לדוגמה"
          width={124}
          height={124}
          onError={() => setFailed(true)}
          className="h-[124px] w-[124px]"
        />
      )}
      {host && failed && (
        <span dir="ltr" className="break-all text-center text-[13px] font-bold leading-snug text-lime-ink">
          {host}
          {path}
        </span>
      )}
    </div>
  );
}
