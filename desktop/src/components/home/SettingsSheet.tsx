"use client";

import BottomSheet from "@/components/ui/BottomSheet";

type Props = { onClose: () => void };

export default function SettingsSheet({ onClose }: Props) {
  return (
    <BottomSheet title="Settings" onClose={onClose}>
      <p className="text-[13px] text-white/40">Soon.</p>
    </BottomSheet>
  );
}
