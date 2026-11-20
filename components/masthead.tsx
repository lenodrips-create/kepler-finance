"use client";

import * as React from "react";
import { useProfile } from "@/lib/profile";

export function Masthead() {
  const [profile] = useProfile();
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => setNow(new Date()), []);

  const name = profile?.name.trim() || "Lennon";
  const mins = now ? now.getHours() * 60 + now.getMinutes() : 0;
  const weekday = now ? now.getDay() > 0 && now.getDay() < 6 : false;
  const open = weekday && mins >= 570 && mins < 960;

  return (
    <header className="mast">
      <h1 id="greeting">{profile ? `Hello, ${name}` : " "}</h1>
      <div className="meta">
        <div>{now?.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
        <div>
          Markets <b>{now ? (open ? "open" : "closed") : ""}</b>
        </div>
      </div>
    </header>
  );
}
