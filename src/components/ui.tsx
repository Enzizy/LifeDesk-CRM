import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    spark: (
      <>
        <path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5z" />
        <path d="m19 16-.7 2.3L16 19l2.3.7L19 22l.7-2.3L22 19l-2.3-.7z" />
      </>
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9M9 20v-6h6v6" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.8M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    funnel: <path d="M3 4h18l-7 8v6l-4 2v-8z" />,
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    dots: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    close: <path d="M6 6l12 12M18 6 6 18" />,
    send: (
      <>
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
      </>
    ),
    download: <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />,
    trash: (
      <>
        <path d="M4 7h16M10 11v6M14 11v6" />
        <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" />
      </>
    ),
    logout: <path d="M15 12H3m0 0 4-4m-4 4 4 4M10 4h8a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-8" />,
    note: (
      <>
        <path d="M5 3h14v18H5z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Avatar({ initials, tone }: { initials: string; tone: string }) {
  return <span className={`avatar ${tone}`}>{initials}</span>;
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Spinner() {
  return <span className="command-spinner" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ toast */

export type ToastAction = { label: string; onClick: () => void };
export type ToastState = {
  message: string;
  action?: ToastAction;
  tone?: "info" | "error";
};
export type Notify = (
  message: string,
  action?: ToastAction,
  tone?: "info" | "error",
) => void;

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  // Without this the timer keeps a reference to setToast after unmount and
  // fires against a dead component during fast navigation.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const notify = useCallback<Notify>((message, action, tone = "info") => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast({ message, action, tone });
    timerRef.current = window.setTimeout(
      () => setToast(null),
      action ? 6000 : tone === "error" ? 5000 : 2600,
    );
  }, []);

  const dismiss = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  return { toast, notify, dismiss };
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  return (
    <div className={`toast ${toast.tone === "error" ? "toast-error" : ""}`} role="status">
      <Icon name={toast.tone === "error" ? "close" : "check"} size={15} />
      <span>{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}

/** Wraps a <dialog> so Escape, backdrop clicks, and focus all behave. */
export function Modal({
  labelledBy,
  onClose,
  className = "form-dialog",
  children,
}: {
  labelledBy: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    // showModal() throws InvalidStateError if the dialog is already open, which
    // the previous build hit when switching records without closing first.
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  return (
    <div className="form-backdrop" onClick={onClose}>
      <dialog
        ref={ref}
        className={className}
        aria-labelledby={labelledBy}
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </dialog>
    </div>
  );
}
