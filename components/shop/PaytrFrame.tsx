"use client";

import { useEffect } from "react";

export function PaytrFrame({ token }: { token: string }) {
  useEffect(() => {
    const sc = document.createElement("script");
    sc.src = "https://www.paytr.com/js/iframeResizer.min.js";
    sc.async = true;
    sc.onload = () => {
      // @ts-expect-error iFrameResize global
      if (window.iFrameResize) window.iFrameResize({}, "#paytriframe");
    };
    document.body.appendChild(sc);
    return () => { sc.remove(); };
  }, []);
  return (
    <iframe
      id="paytriframe"
      src={`https://www.paytr.com/odeme/guvenli/${token}`}
      frameBorder={0}
      scrolling="no"
      style={{ width: "100%", minHeight: 600 }}
      title="PayTR"
    />
  );
}
