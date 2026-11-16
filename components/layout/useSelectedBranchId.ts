"use client";

import { useSyncExternalStore } from "react";
import { BRANCH_CHANGE_EVENT, readBranchCookie } from "@/lib/branch-cookie";

// Public sayfalar ISR ile önbelleklendiği için seçili şube sunucuda okunmaz;
// istemcide kh_branch çerezinden okunur. Sunucu (ve hidrasyon) anında değer
// null'dır, hidrasyondan hemen sonra gerçek çerez değeriyle yeniden render olur.

function subscribe(onChange: () => void) {
  window.addEventListener(BRANCH_CHANGE_EVENT, onChange);
  // Başka sekmede şube değiştiyse sekmeye dönünce tazelensin
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(BRANCH_CHANGE_EVENT, onChange);
    window.removeEventListener("focus", onChange);
  };
}

const getSnapshot = () => readBranchCookie(document.cookie);
const getServerSnapshot = () => null;

/** Çerezdeki şube id'si (geçerliliği çağıran, aktif şube listesine göre kontrol eder). */
export function useSelectedBranchId(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Server action çerezi yazdıktan sonra çağrılır; header/modal çerezi yeniden okur. */
export function notifyBranchChange() {
  window.dispatchEvent(new Event(BRANCH_CHANGE_EVENT));
}
