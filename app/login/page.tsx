"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Auth } from "@/components/ui/auth-form-1";
import { Onboarding } from "@/components/onboarding";
import { saveProfile } from "@/lib/profile";

const background = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/background.png`;

export default function LoginPage() {
  const router = useRouter();
  const [screen, setScreen] = React.useState<"auth" | "onboarding">("auth");

  React.useEffect(() => {
    document.title = "Sign in · Kepler Finance";
  }, []);

  return (
    // reducedMotion="user" honours prefers-reduced-motion for every framer-motion transition
    <MotionConfig reducedMotion="user">
      <div
        className="flex min-h-[100dvh] w-full flex-col bg-background bg-cover bg-center font-sans"
        style={{ backgroundImage: `url(${background})` }}
      >
        <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-6 sm:px-7">
          <Link
            href="/"
            className="rounded-sm text-lg font-medium tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Kepler Finance
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <AnimatePresence mode="wait">
            {screen === "auth" ? (
              <Auth key="auth" onAuthenticated={() => setScreen("onboarding")} />
            ) : (
              <Onboarding
                key="onboarding"
                onBack={() => setScreen("auth")}
                onFinish={(profile) => {
                  saveProfile(profile);
                  router.push("/");
                }}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}
