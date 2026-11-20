import * as React from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Auth } from "@/components/ui/auth-form-1";
import { Onboarding } from "@/components/onboarding";
import { PROFILE_KEY } from "@/data/stocks";

const background = `${import.meta.env.BASE_URL}background.png`;
const DASHBOARD = "../index.html";

export default function App() {
  const [screen, setScreen] = React.useState<"auth" | "onboarding">("auth");

  return (
    // reducedMotion="user" honours prefers-reduced-motion for every framer-motion transition
    <MotionConfig reducedMotion="user">
      <div
        className="flex min-h-[100dvh] w-full flex-col bg-background bg-cover bg-center"
        style={{ backgroundImage: `url(${background})` }}
      >
        <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-4 py-6 sm:px-7">
          <a
            href={DASHBOARD}
            className="text-lg font-medium tracking-tight text-foreground rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Kepler Finance
          </a>
          <a
            href={DASHBOARD}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Dashboard
          </a>
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
                  try {
                    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
                  } catch {
                    /* storage unavailable: preferences just aren't remembered */
                  }
                  window.location.href = DASHBOARD;
                }}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}
