import { useState } from "react";
import Modal from "@/components/ui/Modal";

export type CommentAction = "approve" | "approve-flagged" | "reject" | "query";

const META: Record<
  CommentAction,
  { title: string; subtitle: string; cta: string; ctaTone: "good" | "warn" | "bad"; required: boolean }
> = {
  "approve":         { title: "Approve record",                       subtitle: "Optional comment for the audit trail.",                                            cta: "Approve",         ctaTone: "good", required: false },
  "approve-flagged": { title: "Approve flagged record",               subtitle: "This record carries anomaly flags. A justification comment is required (FR-2.3).", cta: "Approve & justify", ctaTone: "warn", required: true },
  "reject":          { title: "Reject record",                        subtitle: "Reject is irreversible. A reason is required (FR-2.5).",                            cta: "Reject",          ctaTone: "bad",  required: true },
  "query":           { title: "Raise a query",                        subtitle: "Ask the maker for clarification. They will be notified immediately (FR-2.4).",      cta: "Send query",      ctaTone: "warn", required: true },
};

export default function CommentDialog({
  open,
  action,
  onClose,
  onConfirm,
}: {
  open: boolean;
  action: CommentAction;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}) {
  const [text, setText] = useState("");
  const meta = META[action];
  const valid = meta.required ? text.trim().length >= 6 : true;

  function close() {
    setText("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={meta.title}
      subtitle={meta.subtitle}
      size="md"
      footer={
        <>
          <button className="btn-secondary" onClick={close}>
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => {
              onConfirm(text.trim());
              setText("");
            }}
            className={
              meta.ctaTone === "good"
                ? "btn-primary"
                : meta.ctaTone === "bad"
                  ? "btn bg-bad text-white hover:bg-red-700"
                  : "btn bg-warn text-white hover:bg-warn/80"
            }
          >
            {meta.cta}
          </button>
        </>
      }
    >
      <div>
        <label className="block">
          <span className="text-[12px] font-medium text-ink-600">
            Comment {meta.required && <span className="text-bad">*</span>}
          </span>
          <textarea
            className="input min-h-[120px] py-2 mt-1"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              action === "query"
                ? "What clarification do you need from the maker?"
                : action === "reject"
                  ? "Why is this record being rejected? The maker will see this."
                  : action === "approve-flagged"
                    ? "Why is this flagged record acceptable to approve?"
                    : "Optional context for the audit trail."
            }
          />
        </label>
        {meta.required && (
          <div className="text-[11px] text-ink-500 mt-2">
            Minimum 6 characters. This comment becomes part of the immutable audit trail (FR-2.5).
          </div>
        )}
      </div>
    </Modal>
  );
}
