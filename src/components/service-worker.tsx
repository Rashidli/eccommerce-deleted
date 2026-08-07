"use client";

import { useEffect } from "react";

// Service worker-i qeydiyyatdan keçirir — PWA quraşdırılması və oflayn keş üçün.
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      // Hər açılışda yeni versiyanı yoxla ki, köhnə keş ilişib qalmasın.
      .then((registration) => registration.update())
      .catch((error) => {
        console.error("[ecommerce] service worker qeydiyyatı alınmadı:", error);
      });
  }, []);

  return null;
}
