"use client";

import { useEffect, useMemo, useState } from "react";
import { AddSquare, Calendar } from "iconsax-react";
import EventFormModal, { type EventDraft } from "./EventFormModal";

const STORAGE_KEY = "gem_business_events_draft_v1";

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardEventPage() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<EventDraft[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      setEvents(parsed as EventDraft[]);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // ignore
    }
  }, [events]);

  const hasEvents = events.length > 0;

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aTime = new Date(a.startDateTime).getTime();
      const bTime = new Date(b.startDateTime).getTime();
      return Number.isNaN(aTime) || Number.isNaN(bTime) ? 0 : bTime - aTime;
    });
  }, [events]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Event</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create and manage events for your business.
          </p>
        </div>

        {hasEvents ? (
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
            onClick={() => setOpen(true)}
          >
            <AddSquare size={18} variant="Linear" color="#ffffff" aria-hidden="true" />
            Add Event
          </button>
        ) : null}
      </div>

      {!hasEvents ? (
        <div className="mt-8">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-36 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/10 via-zinc-700/5 to-zinc-200/10 blur-3xl" />
            </div>

            <div className="relative grid gap-6 px-6 py-10 sm:px-10 sm:py-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                Events
              </div>

              <div className="grid gap-2">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-950 text-white shadow-sm">
                    <Calendar size={22} variant="Linear" color="#ffffff" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">
                      No events yet
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-600">
                      Add your first event to start promoting.
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900"
                  onClick={() => setOpen(true)}
                >
                  <AddSquare size={18} variant="Linear" color="#ffffff" aria-hidden="true" />
                  Add Event
                </button>
                <div className="text-xs text-zinc-500">
                  Tip: you can save as draft and publish later.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="border-b border-zinc-900/10 px-5 py-4">
                <div className="text-sm font-semibold text-zinc-950 line-clamp-2">
                  {event.title}
                </div>
                <div className="mt-1 text-xs text-zinc-500">{event.type}</div>
              </div>

              <div className="grid gap-3 px-5 py-4">
                <div className="grid gap-1 text-xs text-zinc-600">
                  <div>
                    <span className="font-medium text-zinc-900">Start:</span>{" "}
                    {formatDateTime(event.startDateTime)}
                  </div>
                  <div>
                    <span className="font-medium text-zinc-900">End:</span>{" "}
                    {formatDateTime(event.endDateTime)}
                  </div>
                </div>

                <div className="text-xs text-zinc-600 line-clamp-2">
                  {event.location?.address}
                </div>

                {event.tags?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {event.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border border-zinc-900/10 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-xs text-zinc-500 line-clamp-1">
                    {event.hostOrganizer}
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                    onClick={() => {
                      setEvents((prev) => prev.filter((x) => x.id !== event.id));
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <EventFormModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(draft) => {
          setEvents((prev) => [draft, ...prev]);
        }}
      />
    </div>
  );
}
