"use client";

import { useEffect, useId, useMemo } from "react";
import type { PartyDraft } from "../EventCreateForm";

type Props = {
  sponsors: PartyDraft[];
  partners: PartyDraft[];
  gallery: File[];
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  onSponsors: (v: PartyDraft[]) => void;
  onPartners: (v: PartyDraft[]) => void;
  onGallery: (v: File[]) => void;
  onTouched: (v: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
};

export default function EventMediaPartiesSection(props: Props) {
  const { sponsors, partners, gallery, touched, errors, onSponsors, onPartners, onGallery, onTouched } = props;

  const galleryInputId = useId();

  const galleryPreviews = useMemo(() => {
    return gallery.map((file) => ({ file, url: URL.createObjectURL(file) }));
  }, [gallery]);

  const sponsorLogoPreviews = useMemo(() => {
    return sponsors.map((s) => (s.logo ? URL.createObjectURL(s.logo) : ""));
  }, [sponsors]);

  const partnerLogoPreviews = useMemo(() => {
    return partners.map((p) => (p.logo ? URL.createObjectURL(p.logo) : ""));
  }, [partners]);

  useEffect(() => {
    return () => {
      for (const p of galleryPreviews) URL.revokeObjectURL(p.url);
      for (const url of sponsorLogoPreviews) if (url) URL.revokeObjectURL(url);
      for (const url of partnerLogoPreviews) if (url) URL.revokeObjectURL(url);
    };
  }, [galleryPreviews, partnerLogoPreviews, sponsorLogoPreviews]);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="text-base font-semibold tracking-tight">Sponsors / Partners / Gallery</div>
        <div className="mt-1 text-sm text-zinc-600">Optional marketing assets.</div>
      </div>

      <div className="grid gap-7 px-6 py-6">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Event sponsors</div>
              <div className="text-xs text-zinc-500">Name + logo</div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => onSponsors([...sponsors, { name: "", logo: null }])}
            >
              Add sponsor
            </button>
          </div>

          {sponsors.length ? (
            <div className="grid gap-4">
              {sponsors.map((s, idx) => (
                <div key={idx} className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-zinc-700">Sponsor name</label>
                      <input
                        className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={s.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          onSponsors(sponsors.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                        }}
                        onBlur={() => onTouched((p) => ({ ...p, [`sponsor_${idx}_name`]: true }))}
                      />
                      {touched[`sponsor_${idx}_name`] && errors[`sponsor_${idx}_name`] ? (
                        <div className="text-xs text-rose-600">{errors[`sponsor_${idx}_name`]}</div>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-zinc-700">Logo</label>
                      {sponsorLogoPreviews[idx] ? (
                        <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
                          <div className="relative aspect-[16/9] w-full bg-zinc-100">
                            <img src={sponsorLogoPreviews[idx]} alt="Sponsor logo" className="h-full w-full object-contain" />
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <label className="relative inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute h-px w-px opacity-0"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              onSponsors(sponsors.map((x, i) => (i === idx ? { ...x, logo: file } : x)));
                              onTouched((p) => ({ ...p, [`sponsor_${idx}_logo`]: true }));
                            }}
                            onBlur={() => onTouched((p) => ({ ...p, [`sponsor_${idx}_logo`]: true }))}
                          />
                        </label>
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                          onClick={() => onSponsors(sponsors.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                      {touched[`sponsor_${idx}_logo`] && errors[`sponsor_${idx}_logo`] ? (
                        <div className="text-xs text-rose-600">{errors[`sponsor_${idx}_logo`]}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Event partners</div>
              <div className="text-xs text-zinc-500">Name + logo</div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => onPartners([...partners, { name: "", logo: null }])}
            >
              Add partner
            </button>
          </div>

          {partners.length ? (
            <div className="grid gap-4">
              {partners.map((p, idx) => (
                <div key={idx} className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-zinc-700">Partner name</label>
                      <input
                        className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={p.name}
                        onChange={(e) => {
                          const v = e.target.value;
                          onPartners(partners.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                        }}
                        onBlur={() => onTouched((pp) => ({ ...pp, [`partner_${idx}_name`]: true }))}
                      />
                      {touched[`partner_${idx}_name`] && errors[`partner_${idx}_name`] ? (
                        <div className="text-xs text-rose-600">{errors[`partner_${idx}_name`]}</div>
                      ) : null}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-xs font-semibold text-zinc-700">Logo</label>
                      {partnerLogoPreviews[idx] ? (
                        <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-white shadow-sm">
                          <div className="relative aspect-[16/9] w-full bg-zinc-100">
                            <img src={partnerLogoPreviews[idx]} alt="Partner logo" className="h-full w-full object-contain" />
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <label className="relative inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute h-px w-px opacity-0"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              onPartners(partners.map((x, i) => (i === idx ? { ...x, logo: file } : x)));
                              onTouched((pp) => ({ ...pp, [`partner_${idx}_logo`]: true }));
                            }}
                            onBlur={() => onTouched((pp) => ({ ...pp, [`partner_${idx}_logo`]: true }))}
                          />
                        </label>
                        <button
                          type="button"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                          onClick={() => onPartners(partners.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                      {touched[`partner_${idx}_logo`] && errors[`partner_${idx}_logo`] ? (
                        <div className="text-xs text-rose-600">{errors[`partner_${idx}_logo`]}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Event gallery</div>
              <div className="text-xs text-zinc-500">Optional images (max 10 recommended)</div>
            </div>
            <label className="relative inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50">
              Upload
              <input
                id={galleryInputId}
                type="file"
                accept="image/*"
                multiple
                className="absolute h-px w-px opacity-0"
                onChange={(e) => {
                  const list = e.target.files ? Array.from(e.target.files) : [];
                  const onlyImages = list.filter((f) => f.type.startsWith("image/"));
                  onGallery([...gallery, ...onlyImages].slice(0, 10));
                  onTouched((p) => ({ ...p, gallery: true }));
                  e.currentTarget.value = "";
                }}
                onBlur={() => onTouched((p) => ({ ...p, gallery: true }))}
              />
            </label>
          </div>

          {touched.gallery && errors.gallery ? (
            <div className="text-xs text-rose-600">{errors.gallery}</div>
          ) : null}

          {galleryPreviews.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {galleryPreviews.map((p, idx) => (
                <div
                  key={`${p.file.name}_${p.file.size}_${idx}`}
                  className="relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm"
                >
                  <div className="relative aspect-square w-full bg-zinc-100">
                    <img src={p.url} alt={p.file.name} className="h-full w-full object-cover" />
                  </div>
                  <button
                    type="button"
                    aria-label="Remove image"
                    className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 transition hover:bg-white"
                    onClick={() => onGallery(gallery.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
