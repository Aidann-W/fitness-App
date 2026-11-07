import { AppHeader } from "@/components/shell/AppHeader";

export default function ForgeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#e7eef3] font-sans text-slate-800">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">{children}</main>
    </div>
  );
}
