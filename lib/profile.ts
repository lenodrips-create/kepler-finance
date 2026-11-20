"use client";

import * as React from "react";

export interface Profile {
  name: string;
  holdings: string[]; // ticker symbols
  tracking: string[];
}

const KEY = "kepler.profile";
export const EMPTY_PROFILE: Profile = { name: "", holdings: [], tracking: [] };

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!p || typeof p !== "object") return EMPTY_PROFILE;
    return {
      name: typeof p.name === "string" ? p.name : "",
      holdings: Array.isArray(p.holdings) ? p.holdings.filter((s: unknown) => typeof s === "string") : [],
      tracking: Array.isArray(p.tracking) ? p.tracking : [],
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: preferences just aren't remembered */
  }
}

/** Profile from localStorage; `null` until mounted (avoids a hydration mismatch in the static export). */
export function useProfile(): [Profile | null, (p: Profile) => void] {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  React.useEffect(() => setProfile(loadProfile()), []);
  const update = React.useCallback((p: Profile) => {
    saveProfile(p);
    setProfile(p);
  }, []);
  return [profile, update];
}
