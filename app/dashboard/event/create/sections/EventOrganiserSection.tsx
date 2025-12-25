"use client";

import { useEffect, useId, useMemo } from "react";
import { Image, Profile } from "iconsax-react";

type HostDraft = {
  name: string;
  image: File | null;
  show: boolean;
  url: string;
};

type Props = {
  organiserName: string;
  organiserLogo: File | null;
  hosts: HostDraft[];
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  onName: (v: string) => void;
  onLogo: (v: File | null) => void;
  onHosts: (v: HostDraft[]) => void;
  onTouched: (v: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
};

export default function EventOrganiserSection(props: Props) {
  const { organiserName, organiserLogo, hosts, touched, errors, onName, onLogo, onHosts, onTouched } = props;

  const organiserLogoInputId = useId();
  const logoPreview = useMemo(() => (organiserLogo ? URL.createObjectURL(organiserLogo) : ""), [organiserLogo]);

  const hostImagePreviews = useMemo(() => {
    return hosts.map((h) => (h.image ? URL.createObjectURL(h.image) : ""));
  }, [hosts]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      for (const url of hostImagePreviews) if (url) URL.revokeObjectURL(url);
    };
  }, [hostImagePreviews, logoPreview]);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="text-base font-semibold tracking-tight">Organiser</div>
        <div className="mt-1 text-sm text-zinc-600">Host details.</div>
      </div>

      <div className="grid gap-5 px-6 py-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventOrganiserName">
            Event organiser (name)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Profile size={18} variant="Linear" color="#71717a" aria-hidden="true" />
            </span>
            <input
              id="eventOrganiserName"
              className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={organiserName}
              onChange={(e) => onName(e.target.value)}
              onBlur={() => onTouched((p) => ({ ...p, organiserName: true }))}
              required
            />
          </div>
          {touched.organiserName && errors.organiserName ? (
            <div className="text-xs text-rose-600">{errors.organiserName}</div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={organiserLogoInputId}>
            Event organiser (logo)
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
              <Image size={18} variant="Linear" color="#09090b" aria-hidden="true" />
              Upload logo
              <input
                id={organiserLogoInputId}
                type="file"
                accept="image/*"
                className="absolute h-px w-px opacity-0"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onLogo(file);
                  onTouched((p) => ({ ...p, organiserLogo: true }));
                  e.currentTarget.value = "";
                }}
                onBlur={() => onTouched((p) => ({ ...p, organiserLogo: true }))}
              />
            </label>
            {organiserLogo ? (
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                onClick={() => onLogo(null)}
              >
                Remove
              </button>
            ) : null}
          </div>

          {touched.organiserLogo && errors.organiserLogo ? (
            <div className="text-xs text-rose-600">{errors.organiserLogo}</div>
          ) : null}

          {logoPreview ? (
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
                <img src={logoPreview} alt="Organiser logo" className="h-full w-full object-cover" />
              </div>
              <div className="text-sm text-zinc-600">{organiserLogo?.name}</div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Hosts</div>
              <div className="text-xs text-zinc-500">Add multiple hosts with image, visibility and URL.</div>
            </div>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => onHosts([...(hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }]), { name: "", image: null, show: true, url: "" }])}
            >
              Add host
            </button>
          </div>

          {(hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }]).map((h, idx) => (
            <div key={idx} className="rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Host #{idx + 1}</div>
                {(hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }]).length > 1 ? (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                    onClick={() => {
                      const base = hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }];
                      const next = base.filter((_, i) => i !== idx);
                      onHosts(next.length ? next : [{ name: "", image: null, show: true, url: "" }]);
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-zinc-700">Name</label>
                  <input
                    className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={h.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      const base = hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }];
                      onHosts(base.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                    }}
                    placeholder="Optional"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-xs font-semibold text-zinc-700">URL</label>
                  <input
                    className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={h.url}
                    onChange={(e) => {
                      const v = e.target.value;
                      const base = hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }];
                      onHosts(base.map((x, i) => (i === idx ? { ...x, url: v } : x)));
                    }}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-xs font-semibold text-zinc-700">Image</div>
                  {hostImagePreviews[idx] ? (
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
                        <img src={hostImagePreviews[idx]} alt="Host" className="h-full w-full object-cover" />
                      </div>
                      <div className="text-sm text-zinc-600">{h.image?.name}</div>
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
                          const base = hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }];
                          onHosts(base.map((x, i) => (i === idx ? { ...x, image: file } : x)));
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {h.image ? (
                      <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                        onClick={() => {
                          const base = hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }];
                          onHosts(base.map((x, i) => (i === idx ? { ...x, image: null } : x)));
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-xs font-semibold text-zinc-700">Show/Hide</div>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                    onClick={() => {
                      const base = hosts.length ? hosts : [{ name: "", image: null, show: true, url: "" }];
                      onHosts(base.map((x, i) => (i === idx ? { ...x, show: !x.show } : x)));
                    }}
                  >
                    {h.show ? "Show" : "Hide"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
