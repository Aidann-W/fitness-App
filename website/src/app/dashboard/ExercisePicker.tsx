'use client';

import { useId, useMemo, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { CATEGORIES, MUSCLES, filterExercises } from '@/lib/exerciseCatalog';

const PAGE_SIZE = 6;

interface Props {
  label: string;
  value: string;
  onChange: (name: string) => void;
  // Names already in the routine, hidden so the same exercise isn't added twice.
  exclude: string[];
}

// Exercise name field with autocomplete from the built-in list. Anything typed
// that isn't in the list is kept as the user's own exercise.
export default function ExercisePicker({ label, value, onChange, exclude }: Props) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [active, setActive] = useState(-1);
  // On focus the whole list shows for browsing. Typing narrows it.
  const [typed, setTyped] = useState(false);

  const matches = useMemo(
    () => filterExercises(typed ? value : '', filter).filter((e) => !exclude.includes(e.name)),
    [typed, value, filter, exclude]
  );
  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const shown = matches.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const custom = value.trim();
  const isCustom = custom !== '' && !matches.some((e) => e.name.toLowerCase() === custom.toLowerCase());

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (name: string) => {
    onChange(name);
    setTyped(false);
    close();
  };

  const goToPage = (next: number) => {
    setPage(next);
    setActive(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, shown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (active >= 0 && shown[active]) choose(shown[active].name);
      else close();
    } else if (e.key === 'Escape') {
      close();
    }
  };

  // Close only when focus leaves the whole picker, not when it moves to the filter.
  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) close();
  };

  // Keeps focus in the input when clicking options and page buttons.
  const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

  return (
    <div className="relative" onBlur={handleBlur}>
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Exercise name"
        autoComplete="off"
        value={value}
        onFocus={() => {
          setTyped(false);
          setOpen(true);
        }}
        // Reopens after Escape, when the field already has focus.
        onClick={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setTyped(true);
          setOpen(true);
          goToPage(0);
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-transparent text-base font-semibold text-slate-900 focus:outline-none"
      />

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[17rem] rounded-2xl border border-[#d5e0e8] bg-white p-3 shadow-lg">
          <label className="block text-xs text-slate-500">
            Browse
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                goToPage(0);
              }}
              className="mt-1 block h-10 w-full rounded-xl border border-slate-300 bg-[#f4f8fb] px-2 text-sm text-slate-900"
            >
              <option value="all">All exercises</option>
              <optgroup label="Split">
                {CATEGORIES.map((category) => (
                  <option key={category} value={`category:${category}`}>{category}</option>
                ))}
              </optgroup>
              <optgroup label="Muscle">
                {MUSCLES.map((muscle) => (
                  <option key={muscle} value={`muscle:${muscle}`}>{muscle}</option>
                ))}
              </optgroup>
            </select>
          </label>

          <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="mt-2" onMouseDown={keepFocus}>
            {shown.map((exercise, i) => (
              <li
                key={exercise.name}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onClick={() => choose(exercise.name)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 ${
                  i === active ? 'bg-[#e7eef3]' : ''
                }`}
              >
                <span className="text-sm font-medium text-slate-900">{exercise.name}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {exercise.muscle} · {exercise.equipment}
                </span>
              </li>
            ))}
          </ul>

          {shown.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">No matches in the list.</p>
          )}

          {isCustom && typed && (
            <p className="px-3 py-2 text-xs text-[#3d6d8c]">
              &ldquo;{custom}&rdquo; will be saved as your own exercise.
            </p>
          )}

          {pageCount > 1 && (
            <div className="mt-2 flex items-center justify-between text-sm" onMouseDown={keepFocus}>
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 0}
                className="min-h-11 px-3 font-medium text-[#3d6d8c] disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {currentPage + 1} of {pageCount} · {matches.length} exercises
              </span>
              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageCount - 1}
                className="min-h-11 px-3 font-medium text-[#3d6d8c] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
