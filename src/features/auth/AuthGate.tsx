import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getSession,
  onSessionChange,
  sendPasswordReset,
  signInWithPassword,
  updatePassword,
} from "../../lib/cloud";
import { isSupabaseConfigured } from "../../lib/supabase";
import { Icon, Spinner } from "../../components/ui";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  // True after arriving from a password-reset email: the user has a temporary
  // session and must choose a new password before seeing the workspace.
  const [recovering, setRecovering] = useState(false);

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

    const subscription = onSessionChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { session, ready, recovering, finishRecovery: () => setRecovering(false) };
}

function AuthShell({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div className="auth-screen">
      <section className="auth-card">
        <span className="auth-mark">
          <Icon name="spark" size={20} />
        </span>
        <h1>{title}</h1>
        <p>{lede}</p>
        {children}
      </section>
    </div>
  );
}

export function SignIn() {
  const [mode, setMode] = useState<"signin" | "reset" | "reset-sent">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!isSupabaseConfigured) {
    return (
      <AuthShell title="LifeDesk is not configured" lede="">
        <p>
          Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to{" "}
          <code>.env.local</code>, then restart the dev server.
        </p>
        <p className="auth-note">See SETUP.md for the full setup steps.</p>
      </AuthShell>
    );
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "reset") {
        await sendPasswordReset(email);
        setMode("reset-sent");
      } else {
        await signInWithPassword(email, password);
        // onAuthStateChange in useSession swaps the screen; nothing to do here.
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "reset-sent") {
    return (
      <AuthShell title="Check your email" lede="">
        <div className="auth-sent" role="status">
          <Icon name="check" size={16} />
          <div>
            <strong>Reset link sent</strong>
            <small>
              If {email} has an account, a link to choose a new password is on its way. It
              expires in an hour.
            </small>
          </div>
        </div>
        <button className="button secondary" onClick={() => setMode("signin")}>
          Back to sign in
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="LifeDesk"
      lede={
        mode === "reset"
          ? "Enter your email and we'll send a link to choose a new password."
          : "Your personal workspace for finding and keeping good clients."
      }
    >
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Email address
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoFocus
            required
          />
        </label>

        {mode === "signin" && (
          <label>
            Password
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="text-btn"
                onClick={() => setShowPassword((current) => !current)}
                aria-pressed={showPassword}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="button primary" type="submit" disabled={busy}>
          {busy ? <Spinner /> : <Icon name={mode === "reset" ? "send" : "arrow"} size={15} />}
          {busy ? "One moment…" : mode === "reset" ? "Send reset link" : "Sign in"}
        </button>
      </form>

      <button
        className="text-btn auth-switch"
        onClick={() => {
          setError("");
          setMode(mode === "reset" ? "signin" : "reset");
        }}
      >
        {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
      </button>

      <p className="auth-note">
        This is a private workspace. There is no sign-up; accounts are created by the owner.
      </p>
    </AuthShell>
  );
}

/** Shown after following a reset link, before the workspace. */
export function SetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirm) return setError("The two passwords don't match.");
    setError("");
    setBusy(true);
    try {
      await updatePassword(password);
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The password could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" lede="At least 8 characters. You'll be signed in straight after.">
      <form onSubmit={(event) => void submit(event)}>
        <label>
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            autoFocus
            required
          />
        </label>
        <label>
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? <Spinner /> : <Icon name="check" size={15} />}
          Save password
        </button>
      </form>
    </AuthShell>
  );
}

export function AuthGate({
  session,
  ready,
  recovering,
  onRecovered,
  children,
}: {
  session: Session | null;
  ready: boolean;
  recovering: boolean;
  onRecovered: () => void;
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
  if (recovering) return <SetPassword onDone={onRecovered} />;
  return <>{children}</>;
}
