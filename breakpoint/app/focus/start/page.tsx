import Link from "next/link";
import AppShell from "@/src/components/ui/AppShell";
import GlassPanel from "@/src/components/ui/GlassPanel";
import StartSession from "@/components/StartSession";

export default function FocusStartPage() {
  return (
    <AppShell showFloatingBar={false}>
      <Link
        href="/"
        className="mb-4 inline-flex text-[12px] font-medium text-indigo-300/75 hover:text-indigo-200"
      >
        ← Dashboard
      </Link>
      <GlassPanel variant="elevated" className="mx-auto max-w-lg p-2">
        <div className="rounded-[18px] bg-white/[0.03] p-1">
          <StartSession />
        </div>
      </GlassPanel>
    </AppShell>
  );
}
