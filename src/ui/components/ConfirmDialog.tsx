interface ConfirmDialogProps {
  heading: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  heading,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-hazel-900/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-label={heading}
        className="w-full max-w-sm rounded-2xl border border-cream-300 bg-cream-50 p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="mb-2 text-lg font-semibold text-leaf-900">{heading}</h3>
        <p className="mb-4 text-sm text-hazel-700">{body}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full bg-cream-200 px-4 py-1.5 text-sm font-medium text-hazel-700 transition hover:bg-cream-300"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-leaf-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-leaf-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
