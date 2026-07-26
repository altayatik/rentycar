import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";

/* =====================================================================
   Shared primitives.

   Every page used to hand-roll `isDark ? "..." : "..."` ternaries on
   every element, which is why the styling drifted between pages. These
   components are the single source of truth now.
   ===================================================================== */

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------- Button ------------------------------ */

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  sheen?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  sheen = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        "btn",
        `btn-${variant}`,
        size === "sm" && "btn-sm",
        size === "lg" && "btn-lg",
        sheen && "btn-sheen",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  icon,
  variant = "ghost",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx("btn btn-icon", `btn-${variant}`, className)}
      {...rest}
    >
      {icon}
    </button>
  );
}

/* -------------------------------- Card ------------------------------- */

export function Card({
  className,
  children,
  hover = false,
  as: Tag = "div",
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
  as?: "div" | "section" | "article" | "li";
}) {
  return <Tag className={cx("card", hover && "card-hover", className)}>{children}</Tag>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="stencil mb-2 flex items-center gap-2">
            <span className="h-px w-6" style={{ background: "var(--sodium)" }} />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="h2">{title}</h2>
        {description ? <p className="muted mt-1.5 text-sm">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------- Motion -------------------------------- */

/**
 * Reveals children the first time they scroll into view.
 *
 * Uses IntersectionObserver rather than a scroll listener on purpose —
 * the observer fires a handful of times total, where a scroll handler
 * would re-render on every frame.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: `opacity 0.6s var(--ease-out) ${delay}s, transform 0.6s var(--ease-out) ${delay}s`,
      }}
    >
      {children}
    </Tag>
  );
}

/** Counts up to a target once it is on screen. */
export function CountUp({
  value,
  duration = 900,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    let start = 0;

    const step = (now: number) => {
      if (!start) start = now;
      const progress = Math.min(1, (now - start) / duration);
      // ease-out cubic
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          frame = requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  );
}

/* --------------------------- Board components -------------------------- */

/**
 * Split-flap arrivals board. The dark surface is the anchor of the whole
 * design language, so it deliberately breaks out of the daylight palette.
 */
export function Board({
  title,
  subtitle,
  live = false,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  live?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("board", className)}>
      <div className="board-head">
        <div className="flex min-w-0 items-center gap-3">
          {live ? (
            <span className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] board-dim">
                Live
              </span>
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="sign text-xl sm:text-2xl" style={{ color: "var(--board-ink)" }}>
              {title}
            </h2>
            {subtitle ? (
              <p className="mono mt-0.5 text-[11px] board-dim">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Column headers for a board, styled as the etched strip on a real FIDS.
 * `hideBelowMd` marks columns that collapse away on phones.
 */
export function BoardHeaderRow({
  columns,
  hideBelowMd = [],
}: {
  columns: string[];
  hideBelowMd?: string[];
}) {
  return (
    <div className="board-row board-row-head board-grid" style={{ background: "#0b0d10" }}>
      {columns.map((column) => (
        <span
          key={column}
          className={cx(
            "mono text-[10px] font-bold uppercase tracking-[0.16em] board-dim",
            hideBelowMd.includes(column) && "hidden md:block",
          )}
        >
          {column}
        </span>
      ))}
    </div>
  );
}

/** A row of character flaps — used for airport codes and plates. */
export function Flaps({ text, size = "md" }: { text: string; size?: "sm" | "md" | "lg" }) {
  const dims = {
    sm: "h-5 w-[0.95rem] text-[11px]",
    md: "h-7 w-5 text-sm",
    lg: "h-9 w-6 text-lg",
  }[size];

  return (
    <span className="inline-flex gap-[2px]" aria-label={text}>
      {text.split("").map((character, index) => (
        <span key={`${character}-${index}`} className={cx("flap", dims)} aria-hidden="true">
          {character}
        </span>
      ))}
    </span>
  );
}

/** Rubber-stamped condition mark. */
export function Stamp({
  children,
  tone = "go",
}: {
  children: ReactNode;
  tone?: "go" | "sodium" | "safety" | "stop" | "muted";
}) {
  const color = {
    go: "var(--go)",
    sodium: "#8a6111",
    safety: "var(--safety)",
    stop: "var(--stop)",
    muted: "var(--ink-3)",
  }[tone];

  return (
    <span className="stamp" style={{ color }}>
      {children}
    </span>
  );
}

/** A labelled readout, as printed on a rental agreement. */
export function Readout({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div>
      <p className="stencil">{label}</p>
      <p className="odo mt-1 text-lg" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </div>
  );
}

/* ------------------------------- Fields ------------------------------ */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("space-y-1.5", className)}>
      {label ? (
        <label className="label block" htmlFor={id}>
          {label}
          {required ? <span className="ml-1 text-danger">*</span> : null}
        </label>
      ) : null}
      {children(id)}
      {error ? (
        <p className="field-error animate-fade">{error}</p>
      ) : hint ? (
        <p className="hint">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  invalid,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input className={cx("input", invalid && "input-error", className)} {...rest} />;
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cx("select", invalid && "input-error", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea className={cx("textarea", invalid && "input-error", className)} {...rest} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx("tile w-full justify-between text-left", checked && "tile-active")}
    >
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        {description ? <span className="hint mt-0.5 block">{description}</span> : null}
      </span>
      <span
        className="relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
        style={{ background: checked ? "var(--sky)" : "var(--line-3)" }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-1 transition-all duration-200"
          style={{ left: checked ? "1.125rem" : "0.125rem" }}
        />
      </span>
    </button>
  );
}

/* ------------------------------- Badge ------------------------------- */

export type BadgeTone =
  | "sky"
  | "runway"
  | "mint"
  | "gold"
  | "terra"
  | "lavender"
  | "danger"
  | "neutral";

export function Badge({
  tone = "neutral",
  children,
  className,
  icon,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span className={cx("badge", `badge-${tone}`, className)}>
      {icon}
      {children}
    </span>
  );
}

/* ------------------------------- States ------------------------------ */

export function LoadingState({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton h-16 w-full" style={{ opacity: 1 - index * 0.18 }} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="bay animate-pop flex flex-col items-center gap-3 px-6 py-12 text-center">
      {icon ? (
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xs"
          style={{ background: "var(--sodium-tint)", color: "#8a6111" }}
        >
          {icon}
        </div>
      ) : null}
      <div>
        <p className="h2">{title}</p>
        {message ? <p className="muted mx-auto mt-1.5 max-w-sm text-sm">{message}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ title, message }: { title: string; message?: string }) {
  return (
    <div
      className="animate-rise flex items-start gap-3 rounded-sm px-4 py-3.5"
      style={{ background: "var(--danger-tint)", border: "1px solid #b8544a33" }}
      role="alert"
    >
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--danger)" }} aria-hidden="true" />
      <div className="min-w-0 text-sm">
        <p className="font-bold" style={{ color: "#8f3d35" }}>
          {title}
        </p>
        {message ? (
          <p className="mt-0.5 break-words" style={{ color: "#8f3d35cc" }}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function Callout({
  tone = "sky",
  title,
  children,
  icon,
}: {
  tone?: "sky" | "gold" | "mint" | "danger";
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  const palette = {
    sky: { bg: "var(--sky-tint)", fg: "#1f5f8a", border: "#3f93c933" },
    gold: { bg: "var(--gold-tint)", fg: "#8a6511", border: "#e0a92e40" },
    mint: { bg: "var(--mint-tint)", fg: "var(--forest)", border: "#3fa98533" },
    danger: { bg: "var(--danger-tint)", fg: "#8f3d35", border: "#b8544a33" },
  }[tone];

  return (
    <div
      className="flex items-start gap-3 rounded-sm px-4 py-3.5 text-sm"
      style={{ background: palette.bg, border: `1px solid ${palette.border}`, color: palette.fg }}
    >
      <span className="mt-0.5 shrink-0">{icon ?? <Info className="h-4 w-4" aria-hidden="true" />}</span>
      <div className="min-w-0 leading-relaxed">
        {title ? <p className="font-bold">{title}</p> : null}
        <div className={title ? "mt-0.5 opacity-90" : "opacity-90"}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------- Stats ------------------------------- */

export function StatCard({
  value,
  label,
  sublabel,
  tone = "sky",
  icon,
}: {
  value: ReactNode;
  label: string;
  sublabel?: string;
  tone?: "sky" | "mint" | "gold" | "terra" | "lavender";
  icon?: ReactNode;
}) {
  // One decorative accent, full stop. Colour on this site now means
  // something — blue and green are reserved for encoding data (map density,
  // condition, pass/fail), so a grid of stat tiles gets amber and ink only.
  void tone;

  return (
    <div className="bay card-hover relative overflow-hidden px-4 py-3.5">
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: "var(--sodium)" }}
        aria-hidden="true"
      />
      {icon ? (
        <span className="absolute right-3 top-3" style={{ color: "var(--ink-4)" }} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="stencil">{label}</p>
      <p className="odo mt-1 text-3xl leading-none text-ink">{value}</p>
      {sublabel ? <p className="hint mt-1">{sublabel}</p> : null}
    </div>
  );
}

/** Donut progress ring, as seen on the atlas overview. */
export function Ring({
  value,
  max,
  size = 92,
  label,
  tone = "sky",
}: {
  value: number;
  max: number;
  size?: number;
  label?: string;
  tone?: "sky" | "mint" | "gold" | "terra";
}) {
  const color = {
    sky: "var(--runway)",
    mint: "var(--go)",
    gold: "var(--sodium)",
    terra: "var(--safety)",
  }[tone];

  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const stroke = size * 0.11;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--line-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          style={{ transition: "stroke-dashoffset 1s var(--ease-out)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="odo text-lg leading-none">{pct}%</span>
        {label ? <span className="stencil mt-1 text-[9px]">{label}</span> : null}
      </div>
    </div>
  );
}

/* -------------------------------- Tabs ------------------------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ id: T; label: string; icon?: ReactNode; count?: number }>;
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      className="no-scrollbar flex gap-0 overflow-x-auto"
      style={{ borderBottom: "2px solid var(--line-2)" }}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cx(
              "relative flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-colors duration-150",
              active ? "text-ink" : "text-ink-3 hover:text-ink-2",
            )}
            style={{
              // Sits on the container's bottom border, like a signage tab.
              boxShadow: active ? "inset 0 -3px 0 var(--sodium)" : "none",
            }}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" && tab.count > 0 ? (
              <span
                className="mono rounded-[3px] px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: active ? "var(--sodium)" : "var(--line-2)",
                  color: active ? "#241a05" : "var(--ink-2)",
                }}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------- Modal ------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-lg",
  hideHeader = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
  /** For dialogs that present their own headline inside the body. */
  hideHeader?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="animate-fade absolute inset-0"
        style={{ background: "#2a211966", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "animate-pop relative w-full overflow-hidden sm:rounded-md",
          width,
        )}
        style={{
          background: "var(--paper)",
          border: "1px solid var(--line-2)",
          boxShadow: "var(--sh-3)",
          borderTopLeftRadius: "var(--r-md)",
          borderTopRightRadius: "var(--r-md)",
          maxHeight: "90vh",
        }}
      >
        {hideHeader ? (
          <div className="absolute right-3 top-3 z-10">
            <IconButton label="Close" icon={<X className="h-4 w-4" />} onClick={onClose} />
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
            <div className="min-w-0">
              <h2 className="h2">{title}</h2>
              {description ? <p className="muted mt-1 text-sm">{description}</p> : null}
            </div>
            <IconButton label="Close" icon={<X className="h-4 w-4" />} onClick={onClose} />
          </div>
        )}
        {children ? (
          <div className="overflow-y-auto px-5 pb-5 sm:px-6" style={{ maxHeight: "60vh" }}>
            {children}
          </div>
        ) : null}
        {footer ? (
          <div
            className="flex flex-wrap justify-end gap-2 px-5 py-4 sm:px-6"
            style={{ borderTop: "1px solid var(--line)", background: "#4a38220a" }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  loading = false,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={message}
      width="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onClick={onConfirm}
            loading={loading}
            icon={destructive ? <AlertTriangle className="h-4 w-4" /> : undefined}
          >
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}

/* ------------------------------- Toasts ------------------------------ */

type ToastTone = "success" | "error" | "info";
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

const ToastContext = createContext<{
  push: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++counter.current;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
          {toasts.map((toast) => {
            const palette = {
              success: { bg: "var(--mint-tint)", fg: "var(--forest)", border: "#3fa98544" },
              error: { bg: "var(--danger-tint)", fg: "#8f3d35", border: "#b8544a44" },
              info: { bg: "var(--sky-tint)", fg: "#1f5f8a", border: "#3f93c944" },
            }[toast.tone];
            const Icon =
              toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info;

            return (
              <div
                key={toast.id}
                className="animate-rise pointer-events-auto flex items-start gap-2.5 px-4 py-3 text-sm font-medium"
                style={{
                  background: palette.bg,
                  color: palette.fg,
                  border: `1px solid ${palette.border}`,
                  borderRadius: "var(--r-sm)",
                  boxShadow: "var(--sh-2)",
                  backdropFilter: "blur(8px)",
                }}
                role="status"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{toast.message}</span>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
