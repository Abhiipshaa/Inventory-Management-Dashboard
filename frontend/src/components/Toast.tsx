import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type Props = {
  toasts: ToastItem[];
  onRemove: (id: number) => void;
};

const icons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  info: "i",
};

const ToastItemComponent = ({ toast, onRemove }: { toast: ToastItem; onRemove: (id: number) => void }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    // Start exit animation before removal
    const exitTimer = setTimeout(() => setVisible(false), 3200);
    const removeTimer = setTimeout(() => onRemove(toast.id), 3700);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  return (
    <div
      className={`toast toast-${toast.type} ${visible ? "toast-enter" : "toast-exit"}`}
      onClick={() => onRemove(toast.id)}
    >
      <span className={`toast-icon toast-icon-${toast.type}`}>{icons[toast.type]}</span>
      <span className="toast-message">{toast.message}</span>
    </div>
  );
};

const ToastContainer = ({ toasts, onRemove }: Props) => {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <ToastItemComponent key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default ToastContainer;
