"use client";

import type { TicketDraft } from "../EventCreateForm";

type Props = {
  tickets: TicketDraft[];
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  onTickets: (v: TicketDraft[]) => void;
  onTouched: (v: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
};

export default function EventTicketsSection(props: Props) {
  const { tickets, touched, errors, onTickets, onTouched } = props;

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold tracking-tight">Tickets</div>
            <div className="mt-1 text-sm text-zinc-600">Add at least one ticket type.</div>
          </div>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
            onClick={() => {
              onTickets([
                ...tickets,
                { title: "", description: "", price: "", discountPercent: "", quantity: "", couponCode: "" },
              ]);
              onTouched((p) => ({ ...p, tickets: true }));
            }}
          >
            Add ticket
          </button>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6">
        {tickets.map((t, idx) => (
          <div key={idx} className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Ticket #{idx + 1}</div>
              {tickets.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => onTickets(tickets.filter((_, i) => i !== idx))}
                >
                  Remove
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-zinc-700">Title</label>
                <input
                  className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={t.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTickets(tickets.map((x, i) => (i === idx ? { ...x, title: v } : x)));
                  }}
                  onBlur={() => onTouched((p) => ({ ...p, [`ticket_${idx}`]: true }))}
                />
                {touched[`ticket_${idx}`] && errors[`ticket_${idx}_title`] ? (
                  <div className="text-xs text-rose-600">{errors[`ticket_${idx}_title`]}</div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-zinc-700">Coupon code</label>
                <input
                  className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={t.couponCode}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTickets(tickets.map((x, i) => (i === idx ? { ...x, couponCode: v } : x)));
                  }}
                />
              </div>

              <div className="grid gap-2 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-700">Description</label>
                <textarea
                  className="min-h-[90px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={t.description}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTickets(tickets.map((x, i) => (i === idx ? { ...x, description: v } : x)));
                  }}
                  onBlur={() => onTouched((p) => ({ ...p, [`ticket_${idx}`]: true }))}
                />
                {touched[`ticket_${idx}`] && errors[`ticket_${idx}_description`] ? (
                  <div className="text-xs text-rose-600">{errors[`ticket_${idx}_description`]}</div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-zinc-700">Price</label>
                <input
                  inputMode="decimal"
                  className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={t.price}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTickets(tickets.map((x, i) => (i === idx ? { ...x, price: v } : x)));
                  }}
                  onBlur={() => onTouched((p) => ({ ...p, [`ticket_${idx}`]: true }))}
                  placeholder="0"
                />
                {touched[`ticket_${idx}`] && errors[`ticket_${idx}_price`] ? (
                  <div className="text-xs text-rose-600">{errors[`ticket_${idx}_price`]}</div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-zinc-700">Discount (%)</label>
                <input
                  inputMode="numeric"
                  className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={t.discountPercent}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTickets(tickets.map((x, i) => (i === idx ? { ...x, discountPercent: v } : x)));
                  }}
                  onBlur={() => onTouched((p) => ({ ...p, [`ticket_${idx}`]: true }))}
                  placeholder="Optional"
                />
                {touched[`ticket_${idx}`] && errors[`ticket_${idx}_discountPercent`] ? (
                  <div className="text-xs text-rose-600">{errors[`ticket_${idx}_discountPercent`]}</div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-zinc-700">Slot / Quantity</label>
                <input
                  inputMode="numeric"
                  className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={t.quantity}
                  onChange={(e) => {
                    const v = e.target.value;
                    onTickets(tickets.map((x, i) => (i === idx ? { ...x, quantity: v } : x)));
                  }}
                  onBlur={() => onTouched((p) => ({ ...p, [`ticket_${idx}`]: true }))}
                  placeholder="0"
                />
                {touched[`ticket_${idx}`] && errors[`ticket_${idx}_quantity`] ? (
                  <div className="text-xs text-rose-600">{errors[`ticket_${idx}_quantity`]}</div>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {touched.tickets && errors.tickets ? (
          <div className="text-xs text-rose-600">{errors.tickets}</div>
        ) : null}
      </div>
    </div>
  );
}
