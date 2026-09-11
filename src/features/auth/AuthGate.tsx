import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onSessionChange, sendMagicLink } from "../../lib/cloud";
import { isSupabaseConfigured } from "../../lib/supabase";
import { Icon, Spinner } from "../../components/ui";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    getSession()
      .then((current) => {
        if (active) setSession(current);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });

    const subscription = onSessionChange((_event, next) => setSession(next));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, ready };
}

export function SignIn() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <div className="auth-screen">
        <section className="auth-card">
          <span className="auth-mark">
            <Icon name="spark" size={20} />
          </span>
          <h1>LifeDesk is not configured</h1>
          <p>
            Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>,
            then restart the dev server.
          </p>
          <p className="auth-note">See SETUP.md for the full setup steps.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <span className="auth-mark">
          <Icon name="spark" size={20} />
        </span>
        <h1>LifeDesk</h1>
        <p>Your personal workspace for finding and keeping good clients.</p>

        {status === "sent" ? (
          <div className="auth-sent" role="status">
            <Icon name="check" size={16} />
            <div>
              <strong>Check your email</strong>
              <small>
                A sign-in link is on its way to {email}. Open it in this browser.
              </small>
            </div>
          </div>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setStatus("sending");
              try {
                await sendMagicLink(email);
                setStatus("sent");
              } catch (caught) {
                setStatus("idle");
                setError(
                  caught instanceof Error
                    ? caught.message
                    : "The sign-in link could not be sent.",
                );
              }
            }}
          >
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoFocus
                required
              />
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button primary"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? <Spinner /> : <Icon name="send" size={15} />}
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
          </form>
        )}

        <p className="auth-note">
          No password. LifeDesk emails you a one-time link, and your records stay
          private to your account.
        </p>
      </section>
    </div>
  );
}

export function AuthGate({
  session,
  ready,
  children,
}: {
  session: Session | null;
  ready: boolean;
  children: ReactNode;
}) {
  if (!ready) {
    return (
      <div className="auth-screen">
        <Spinner />
      </div>
    );
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}
