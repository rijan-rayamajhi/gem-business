"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { AddSquare, DocumentText, Information, Lamp, MessageQuestion, MessageText, Text } from "iconsax-react";

type FaqDraft = {
  question: string;
  answer: string;
};

type Props = {
  termsHtml: string;
  aboutHtml: string;
  thingsToKnow: string;
  amenities: string;
  buttonText: string;
  faqs: FaqDraft[];
  onTerms: (v: string) => void;
  onAbout: (v: string) => void;
  onThingsToKnow: (v: string) => void;
  onAmenities: (v: string) => void;
  onButtonText: (v: string) => void;
  onFaqs: (v: FaqDraft[]) => void;
};

export default function EventContentSection({
  termsHtml,
  aboutHtml,
  thingsToKnow,
  amenities,
  buttonText,
  faqs,
  onTerms,
  onAbout,
  onThingsToKnow,
  onAmenities,
  onButtonText,
  onFaqs,
}: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="text-base font-semibold tracking-tight">Policies & content</div>
        <div className="mt-1 text-sm text-zinc-600">Long form content.</div>
      </div>

      <div className="grid gap-5 px-6 py-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventThingsToKnow">
            Things to know
          </label>
          <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
            <RichTextEditor id="eventThingsToKnow" value={thingsToKnow} onChange={onThingsToKnow} variant="embedded" />
          </div>
          <div className="text-xs text-zinc-500">Optional: add key info, do’s & don’ts.</div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventAmenities">
            Aminties
          </label>
          <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
            <RichTextEditor id="eventAmenities" value={amenities} onChange={onAmenities} variant="embedded" />
          </div>
          <div className="text-xs text-zinc-500">Optional: list facilities available at the venue.</div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventButtonText">
            Button Text
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Text size={18} variant="Linear" color="#71717a" aria-hidden="true" />
            </span>
            <input
              id="eventButtonText"
              className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={buttonText}
              onChange={(e) => onButtonText(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">FAQs</div>
              <div className="text-xs text-zinc-500">Optional: add common questions and answers.</div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => onFaqs([...(faqs.length ? faqs : [{ question: "", answer: "" }]), { question: "", answer: "" }])}
            >
              <AddSquare size={18} variant="Linear" color="#09090b" aria-hidden="true" className="mr-2" />
              Add FAQ
            </button>
          </div>

          {(faqs.length ? faqs : [{ question: "", answer: "" }]).map((f, idx) => (
            <div key={idx} className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">FAQ #{idx + 1}</div>
                {(faqs.length ? faqs : [{ question: "", answer: "" }]).length > 1 ? (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                    onClick={() => {
                      const base = faqs.length ? faqs : [{ question: "", answer: "" }];
                      const next = base.filter((_, i) => i !== idx);
                      onFaqs(next.length ? next : [{ question: "", answer: "" }]);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-zinc-700">Question</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                      <MessageQuestion size={18} variant="Linear" color="#71717a" aria-hidden="true" />
                    </span>
                    <input
                      className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                      value={f.question}
                      onChange={(e) => {
                        const v = e.target.value;
                        const base = faqs.length ? faqs : [{ question: "", answer: "" }];
                        onFaqs(base.map((x, i) => (i === idx ? { ...x, question: v } : x)));
                      }}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-zinc-700">Answer</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-2.5 text-zinc-500">
                      <MessageText size={18} variant="Linear" color="#71717a" aria-hidden="true" />
                    </span>
                    <textarea
                      className="min-h-[90px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                      value={f.answer}
                      onChange={(e) => {
                        const v = e.target.value;
                        const base = faqs.length ? faqs : [{ question: "", answer: "" }];
                        onFaqs(base.map((x, i) => (i === idx ? { ...x, answer: v } : x)));
                      }}
                      placeholder="Optional"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventTerms">
            <span className="inline-flex items-center gap-2">
              <DocumentText size={18} variant="Linear" color="#71717a" aria-hidden="true" />
              Event terms and conditions
            </span>
          </label>
          <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
            <RichTextEditor id="eventTerms" value={termsHtml} onChange={onTerms} variant="embedded" />
          </div>
          <div className="text-xs text-zinc-500">Optional: add legal / entry rules.</div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventAbout">
            <span className="inline-flex items-center gap-2">
              <DocumentText size={18} variant="Linear" color="#71717a" aria-hidden="true" />
              About Event
            </span>
          </label>
          <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
            <RichTextEditor id="eventAbout" value={aboutHtml} onChange={onAbout} variant="embedded" />
          </div>
          <div className="text-xs text-zinc-500">Tip: include agenda, speakers, dress code, etc.</div>
        </div>
      </div>
    </div>
  );
}
