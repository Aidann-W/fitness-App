export default function ProgressPreviewPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm font-medium text-[#3d6d8c]">This week</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-slate-900">Progress</h1>
        </div>
        <p className="max-w-sm text-right text-sm leading-6 text-slate-500">
          A quiet record of finished sessions. Charts wait until there is something real to plot.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-dashed border-[#b7c9d6] bg-white/70 px-8 py-10">
          <h2 className="text-xl font-semibold text-slate-900">No completed workouts yet</h2>
          <p className="mt-3 max-w-lg text-base leading-7 text-slate-600">
            When you finish a session, it will land here with the date, the focus, and only the sets you marked done.
          </p>
        </article>

        <article className="rounded-3xl border border-[#d5e0e8] bg-white p-8 shadow-[0_12px_40px_rgba(30,58,82,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Session card</h2>
            <span className="rounded-full bg-[#e7eef3] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#3d6d8c]">
              Sample
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This is the shape of a saved workout. It is not a completed session.
          </p>
          <dl className="mt-6 space-y-4 border-t border-[#e6eef3] pt-5">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-slate-500">Focus</dt>
              <dd className="font-medium text-slate-900">Full body</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-slate-500">Completed sets</dt>
              <dd className="font-medium text-slate-900">Only sets you mark done</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-sm text-slate-500">Load</dt>
              <dd className="font-medium text-slate-900">Left blank until you enter it</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}
