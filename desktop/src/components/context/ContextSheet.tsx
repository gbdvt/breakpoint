"use client";

import { useEffect, useState } from "react";
import BottomSheet from "@/components/ui/BottomSheet";
import { useDesktopData } from "@/context/DesktopDataContext";

type Props = { onClose: () => void };

export default function ContextSheet({ onClose }: Props) {
  const { taskContextNote, setTaskContextNote } = useDesktopData();
  const [draft, setDraft] = useState(taskContextNote);

  useEffect(() => {
    setDraft(taskContextNote);
  }, [taskContextNote]);

  function handleClose() {
    setTaskContextNote(draft);
    onClose();
  }

  return (
    <BottomSheet title="Context" onClose={handleClose}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-[220px] w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2.5 text-[13px] leading-relaxed text-white/90 placeholder:text-white/25 focus:border-cyan-200/20 focus:outline-none focus:ring-1 focus:ring-cyan-200/15"
        spellCheck
        autoFocus
      />
    </BottomSheet>
  );
}
