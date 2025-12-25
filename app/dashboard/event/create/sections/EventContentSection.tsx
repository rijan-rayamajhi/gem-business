"use client";

import RichTextEditor from "@/components/RichTextEditor";

type Props = {
  termsHtml: string;
  aboutHtml: string;
  onTerms: (v: string) => void;
  onAbout: (v: string) => void;
};

export default function EventContentSection({ termsHtml, aboutHtml, onTerms, onAbout }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="text-base font-semibold tracking-tight">Policies & content</div>
        <div className="mt-1 text-sm text-zinc-600">Long form content.</div>
      </div>

      <div className="grid gap-5 px-6 py-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventTerms">
            Event terms and conditions
          </label>
          <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
            <RichTextEditor id="eventTerms" value={termsHtml} onChange={onTerms} variant="embedded" />
          </div>
          <div className="text-xs text-zinc-500">Optional: add legal / entry rules.</div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventAbout">
            About Event
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
