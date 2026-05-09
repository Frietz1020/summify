import { useState } from "react";
import { useDocument } from "../../context/DocumentContext";

/**
 * PasteTextModal
 * Overlay modal triggered by the "Paste Text" button.
 * Allows user to type or paste raw text directly.
 * On confirm: sets extractedText in DocumentContext.
 *
 * Props:
 *  - onClose  {function}  closes the modal
 */
export default function PasteTextModal({ onClose }) {
  const { setPastedText, setExtractedText } = useDocument();
  const [draft, setDraft] = useState("");

  function handleConfirm() {
    if (!draft.trim()) return;
    setPastedText(draft);
    setExtractedText(draft.trim());
    onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-[fadeSlideUp_0.2s_ease_both]"
      onClick={onClose}
    >
      {/* Sheet */}
      <div
        className="w-full max-w-[412px] bg-white rounded-t-[24px] px-5 pt-5 pb-8 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 bg-[#B8C5B1] rounded-full mx-auto" />

        <h2 className="font-['Poppins'] text-[16px] font-semibold text-[#06070D] text-center">
          Paste Text
        </h2>

        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste or type your text here…"
          rows={8}
          className={[
            "w-full resize-none rounded-[12px] border border-[#8BA88C]",
            "bg-[#F7F8FC] px-4 py-3",
            "font-['Poppins'] text-[14px] text-[#06070D] placeholder-[#B8C5B1]",
            "focus:outline-none focus:border-[#8D7C66]",
            "transition-colors duration-200",
          ].join(" ")}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[44px] rounded-full border border-[#B8C5B1] font-['Poppins'] text-[14px] font-medium text-[#8D7C66] hover:bg-[#f0f0f0] transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!draft.trim()}
            className={[
              "flex-1 h-[44px] rounded-full",
              "bg-[#8BA88C] font-['Poppins'] text-[14px] font-medium text-white",
              "transition-all duration-200",
              "hover:bg-[#7a9a7b] disabled:opacity-50 disabled:cursor-not-allowed",
            ].join(" ")}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
