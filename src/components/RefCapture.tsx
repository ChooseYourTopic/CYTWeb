"use client";

import { useEffect } from "react";
import { captureRefFromUrl } from "@/lib/ref";

/** Invisible: on any page load, stash a ?ref= affiliate code for later sign-up. */
export function RefCapture() {
  useEffect(() => {
    captureRefFromUrl();
  }, []);
  return null;
}
