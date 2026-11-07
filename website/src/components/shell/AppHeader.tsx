const ITEMS = [
  { label: "Home" },
  { label: "Progress", current: true },
  { label: "Profile" },
];

export function AppHeader() {
  return (
    <header className="border-b border-[#d5e0e8] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-10 px-8 py-5">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight text-slate-900">Forge</span>
          <span className="text-sm text-slate-500">Strength training</span>
        </div>
        <nav aria-label="Primary" className="flex items-center gap-2">
          {ITEMS.map((item) =>
            item.current ? (
              <span
                key={item.label}
                aria-current="page"
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                {item.label}
              </span>
            ) : (
              <span
                key={item.label}
                className="rounded-full px-4 py-2 text-sm font-medium text-slate-500"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}
