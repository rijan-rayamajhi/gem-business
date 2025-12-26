"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string };

type BusinessLocation = {
  id: string;
  fullAddress: string;
  contactNumber?: string;
  shopImageUrl?: string;
  geo?: { lat: number; lng: number };
  businessHours?: unknown;
};

type BusinessProfile = {
  status?: string;
  businessName?: string;
  businessDescription?: string;
  businessCategory?: string;
  otherCategoryName?: string;
  vehicleTypes?: string[];
  shopType?: string;
  brands?: string[];
  suggestedBrandName?: string;
  suggestedBrandLogoUrl?: string;
  businessType?: string;
  email?: string;
  website?: string;
  gstNumber?: string;
  gstDocumentUrl?: string;
  businessRole?: string;
  name?: string;
  contactNo?: string;
  whatsappNo?: string;
  businessLogoUrl?: string;
  businessLocations?: BusinessLocation[];
  primaryBusinessLocationId?: string;
  primaryShopImage?: unknown;
};

type RegisterResponse = {
  ok?: boolean;
  uid?: unknown;
  business?: unknown;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUrl(value: string) {
  try {
    const parsed = new URL(value);
    void parsed;
    return true;
  } catch {
    return false;
  }
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((v) => typeof v === "string");
}

function normalizeBusinessLocation(value: unknown): BusinessLocation | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const id = typeof obj.id === "string" ? obj.id : "";
  const fullAddress = typeof obj.fullAddress === "string" ? obj.fullAddress : "";
  const contactNumber = typeof obj.contactNumber === "string" ? obj.contactNumber : "";
  const shopImageUrl = typeof obj.shopImageUrl === "string" ? obj.shopImageUrl : "";

  const geo = (() => {
    const g = obj.geo;
    if (!g || typeof g !== "object") return null;
    const rec = g as Record<string, unknown>;
    const lat = typeof rec.lat === "number" ? rec.lat : null;
    const lng = typeof rec.lng === "number" ? rec.lng : null;
    if (lat === null || lng === null) return null;
    return { lat, lng };
  })();

  if (!id) return null;

  return {
    id,
    fullAddress,
    ...(contactNumber ? { contactNumber } : {}),
    ...(shopImageUrl ? { shopImageUrl } : {}),
    ...(geo ? { geo } : {}),
    ...("businessHours" in obj ? { businessHours: obj.businessHours } : {}),
  };
}

function DataRow(props: { label: string; value: ReactNode }) {
  const { label, value } = props;
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-zinc-900/10 bg-white p-4">
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="break-words text-sm font-semibold text-zinc-950">{value}</div>
    </div>
  );
}

type BusinessHoursDay = {
  open?: boolean;
  from?: string;
  to?: string;
};

type BusinessHours = {
  timezone?: string;
  enabled?: boolean;
  days?: Record<string, BusinessHoursDay>;
};

function normalizeBusinessHours(value: unknown): BusinessHours | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const timezone = typeof obj.timezone === "string" ? obj.timezone : undefined;
  const enabled = typeof obj.enabled === "boolean" ? obj.enabled : undefined;
  const daysRaw = obj.days;
  const days = (() => {
    if (!daysRaw || typeof daysRaw !== "object") return undefined;
    const rec = daysRaw as Record<string, unknown>;
    const out: Record<string, BusinessHoursDay> = {};
    for (const [k, v] of Object.entries(rec)) {
      if (!v || typeof v !== "object") continue;
      const day = v as Record<string, unknown>;
      out[k] = {
        ...(typeof day.open === "boolean" ? { open: day.open } : {}),
        ...(typeof day.from === "string" ? { from: day.from } : {}),
        ...(typeof day.to === "string" ? { to: day.to } : {}),
      };
    }
    return out;
  })();

  return { ...(timezone ? { timezone } : {}), ...(typeof enabled === "boolean" ? { enabled } : {}), ...(days ? { days } : {}) };
}

function dayLabel(key: string) {
  const k = key.toLowerCase();
  if (k === "mon") return "Mon";
  if (k === "tue") return "Tue";
  if (k === "wed") return "Wed";
  if (k === "thu") return "Thu";
  if (k === "fri") return "Fri";
  if (k === "sat") return "Sat";
  if (k === "sun") return "Sun";
  return key;
}

function BusinessHoursView(props: { value: unknown }) {
  const hours = normalizeBusinessHours(props.value);
  if (!hours) return null;

  const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const days = hours.days ?? {};

  return (
    <div className="mt-2 rounded-xl border border-zinc-900/10 bg-zinc-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs font-semibold text-zinc-900">
          {typeof hours.enabled === "boolean" ? (hours.enabled ? "Enabled" : "Disabled") : ""}
        </div>
        <div className="text-xs text-zinc-600">{hours.timezone || ""}</div>
      </div>

      <div className="mt-3 grid gap-2">
        {order.map((k) => {
          const d = days[k];
          const open = d?.open === true;
          const from = typeof d?.from === "string" ? d?.from : "";
          const to = typeof d?.to === "string" ? d?.to : "";
          const time = open && from && to ? `${from} - ${to}` : open ? "Open" : "Closed";
          return (
            <div key={k} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <div className="text-xs font-semibold text-zinc-900">{dayLabel(k)}</div>
              <div className={"text-xs font-semibold " + (open ? "text-emerald-700" : "text-zinc-600")}>
                {time}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardBusinessProfilePage() {
  const router = useRouter();

  const [tokenCheck, setTokenCheck] = useState<{ status: "checking" } | { status: "ready"; token: string | null }>(
    { status: "checking" }
  );

  const [loadState, setLoadState] = useState<LoadState>({ status: "idle" });
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [rawBusiness, setRawBusiness] = useState<Record<string, unknown> | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string>("");

  const [businessLogoFile, setBusinessLogoFile] = useState<File | null>(null);
  const [gstDocumentFile, setGstDocumentFile] = useState<File | null>(null);

  const [form, setForm] = useState(() => ({
    businessName: "",
    businessDescription: "",
    suggestedBrandName: "",
    suggestedBrandLogoUrl: "",
    email: "",
    website: "",
    gstNumber: "",
    name: "",
    contactNo: "",
    whatsappNo: "",
  }));

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    setTokenCheck({ status: "ready", token });
  }, []);

  const token = tokenCheck.status === "ready" ? tokenCheck.token : null;
  const showMissingToken = tokenCheck.status === "ready" && !token;

  const loadBusiness = async (params: { token: string; signal: AbortSignal }) => {
    const { token, signal } = params;
    const res = await fetch("/api/register", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });

    const data = (await res.json().catch(() => null)) as RegisterResponse | null;
    if (!res.ok || !data?.ok) {
      throw new Error("Failed to load business.");
    }

    if (!data.business) {
      setBusiness(null);
      setRawBusiness(null);
      return;
    }

    if (typeof data.business !== "object") {
      throw new Error("Invalid business payload.");
    }

    const b = data.business as Record<string, unknown>;

    const locationsRaw = Array.isArray(b.businessLocations) ? b.businessLocations : [];
    const businessLocations = locationsRaw
      .map(normalizeBusinessLocation)
      .filter((v): v is BusinessLocation => Boolean(v));

    const next: BusinessProfile = {
      status: normalizeString(b.status) || undefined,
      businessName: normalizeString(b.businessName) || undefined,
      businessDescription: normalizeString(b.businessDescription) || undefined,
      businessCategory: normalizeString(b.businessCategory) || undefined,
      otherCategoryName: normalizeString(b.otherCategoryName) || undefined,
      vehicleTypes: normalizeStringArray(b.vehicleTypes),
      shopType: normalizeString(b.shopType) || undefined,
      brands: normalizeStringArray(b.brands),
      suggestedBrandName: normalizeString(b.suggestedBrandName) || undefined,
      suggestedBrandLogoUrl: normalizeString(b.suggestedBrandLogoUrl) || undefined,
      businessType: normalizeString(b.businessType) || undefined,
      email: normalizeString(b.email) || undefined,
      website: normalizeString(b.website) || undefined,
      gstNumber: normalizeString(b.gstNumber) || undefined,
      gstDocumentUrl: normalizeString(b.gstDocumentUrl) || undefined,
      businessRole: normalizeString(b.businessRole) || undefined,
      name: normalizeString(b.name) || undefined,
      contactNo: normalizeString(b.contactNo) || undefined,
      whatsappNo: normalizeString(b.whatsappNo) || undefined,
      businessLogoUrl: normalizeString(b.businessLogoUrl) || undefined,
      businessLocations,
      primaryBusinessLocationId: normalizeString(b.primaryBusinessLocationId) || undefined,
      ...("primaryShopImage" in b ? { primaryShopImage: b.primaryShopImage } : {}),
    };

    setBusiness(next);
    setRawBusiness(b);
  };

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();
    const run = async () => {
      setLoadState({ status: "loading" });
      try {
        await loadBusiness({ token, signal: controller.signal });
        setLoadState({ status: "idle" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load business.";
        setLoadState({ status: "error", message });
      }
    };

    void run();
    return () => controller.abort();
  }, [token]);

  const canEdit = Boolean(token) && loadState.status === "idle";

  const businessLogoPreviewUrl = useMemo(() => {
    return businessLogoFile ? URL.createObjectURL(businessLogoFile) : null;
  }, [businessLogoFile]);

  useEffect(() => {
    return () => {
      if (businessLogoPreviewUrl) URL.revokeObjectURL(businessLogoPreviewUrl);
    };
  }, [businessLogoPreviewUrl]);

  const gstDocPreviewUrl = useMemo(() => {
    return gstDocumentFile ? URL.createObjectURL(gstDocumentFile) : null;
  }, [gstDocumentFile]);

  useEffect(() => {
    return () => {
      if (gstDocPreviewUrl) URL.revokeObjectURL(gstDocPreviewUrl);
    };
  }, [gstDocPreviewUrl]);

  const onOpenEdit = () => {
    if (!business) return;

    setActionError("");
    setEditOpen(true);
    setBusinessLogoFile(null);
    setGstDocumentFile(null);

    setForm({
      businessName: business.businessName ?? "",
      businessDescription: business.businessDescription ?? "",
      suggestedBrandName: business.suggestedBrandName ?? "",
      suggestedBrandLogoUrl: business.suggestedBrandLogoUrl ?? "",
      email: business.email ?? "",
      website: business.website ?? "",
      gstNumber: business.gstNumber ?? "",
      name: business.name ?? "",
      contactNo: business.contactNo ?? "",
      whatsappNo: business.whatsappNo ?? "",
    });
  };

  const onCancelEdit = () => {
    setEditOpen(false);
    setActionError("");
    setBusinessLogoFile(null);
    setGstDocumentFile(null);
  };

  const validationError = useMemo(() => {
    if (!form.businessName.trim()) return "Business name is required.";
    if (!form.businessDescription.trim()) return "Business description is required.";

    if (!form.email.trim()) return "Email is required.";
    if (!isValidEmail(form.email)) return "Please enter a valid email.";

    if (!form.website.trim()) return "Website is required.";
    if (!isValidUrl(form.website.trim())) return "Please enter a valid website URL.";

    if (!form.gstNumber.trim()) return "GST number is required.";

    if (!form.name.trim()) return "Name is required.";
    if (!form.contactNo.trim()) return "Contact number is required.";
    if (!form.whatsappNo.trim()) return "WhatsApp number is required.";

    if (form.suggestedBrandName.trim() || form.suggestedBrandLogoUrl.trim()) {
      if (!form.suggestedBrandName.trim() || !form.suggestedBrandLogoUrl.trim()) {
        return "Please provide both suggested brand name and logo URL.";
      }
      if (!isValidUrl(form.suggestedBrandLogoUrl.trim())) {
        return "Suggested brand logo URL is invalid.";
      }
    }

    return null;
  }, [form]);

  const onSave = async () => {
    if (!token) return;
    if (!canEdit) return;
    if (validationError) {
      setActionError(validationError);
      return;
    }

    setSaving(true);
    setActionError("");

    try {
      const payload = new FormData();
      payload.append("businessName", form.businessName.trim());
      payload.append("businessDescription", form.businessDescription.trim());
      payload.append("email", form.email.trim().toLowerCase());
      payload.append("website", form.website.trim());
      payload.append("gstNumber", form.gstNumber.trim());
      payload.append("name", form.name.trim());
      payload.append("contactNo", form.contactNo.trim());
      payload.append("whatsappNo", form.whatsappNo.trim());

      if (form.suggestedBrandName.trim() || form.suggestedBrandLogoUrl.trim()) {
        payload.append("suggestedBrandName", form.suggestedBrandName.trim());
        payload.append("suggestedBrandLogoUrl", form.suggestedBrandLogoUrl.trim());
      } else {
        payload.append("suggestedBrandName", "");
        payload.append("suggestedBrandLogoUrl", "");
      }

      if (businessLogoFile) payload.append("businessLogo", businessLogoFile);
      if (gstDocumentFile) payload.append("gstDocument", gstDocumentFile);

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setActionError(data?.message || "Failed to save changes.");
        return;
      }

      const controller = new AbortController();
      await loadBusiness({ token, signal: controller.signal });
      setEditOpen(false);
    } catch {
      setActionError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const locations = business?.businessLocations ?? [];

  const rawJson = useMemo(() => {
    if (!rawBusiness) return "";
    try {
      return JSON.stringify(rawBusiness, null, 2);
    } catch {
      return "";
    }
  }, [rawBusiness]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            aria-label="Close"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-900/10 bg-white text-lg font-semibold leading-none text-zinc-900 shadow-sm transition hover:bg-zinc-50"
            onClick={() => router.push("/dashboard/catalogue")}
          >
            ✕
          </button>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Business Profile</h1>
            <p className="mt-1 text-sm text-zinc-600">View and update your business details.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canEdit || saving || !business}
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => {
              if (editOpen) onCancelEdit();
              else onOpenEdit();
            }}
          >
            {editOpen ? "Close edit" : "Edit"}
          </button>

          {editOpen ? (
            <button
              type="button"
              disabled={!canEdit || saving}
              className="h-10 rounded-xl border border-zinc-900/10 bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:opacity-50"
              onClick={onSave}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </div>

      {tokenCheck.status === "checking" ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          Loading…
        </div>
      ) : null}

      {showMissingToken ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          Missing authentication token.
        </div>
      ) : null}

      {loadState.status === "loading" ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white/60 px-4 py-3 text-sm text-zinc-600 shadow-sm">
          Loading…
        </div>
      ) : null}

      {loadState.status === "error" ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {loadState.message}
        </div>
      ) : null}

      {actionError ? (
        <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {actionError}
        </div>
      ) : null}

      {loadState.status === "idle" && !business && token ? (
        <div className="mt-6 rounded-2xl border border-zinc-900/10 bg-white px-4 py-4 text-sm text-zinc-700 shadow-sm">
          No business found for this account.
        </div>
      ) : null}

      {loadState.status === "idle" && business ? (
        <div className="mt-6 grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
            {editOpen ? (
              <div className="border-b border-zinc-900/10 p-4 sm:p-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Business logo</div>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-2xl border border-zinc-900/10 bg-zinc-50">
                        {businessLogoPreviewUrl ? (
                          <img
                            src={businessLogoPreviewUrl}
                            alt="Business logo preview"
                            className="h-full w-full object-cover"
                          />
                        ) : business.businessLogoUrl ? (
                          <img
                            src={business.businessLogoUrl}
                            alt="Business logo"
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs font-semibold text-zinc-600">
                            Logo
                          </div>
                        )}
                      </div>

                      <label className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                        Choose from gallery
                        <input
                          type="file"
                          accept="image/*"
                          className="absolute h-px w-px opacity-0"
                          onChange={(e) => {
                            const nextFile = e.target.files?.[0] ?? null;
                            setBusinessLogoFile(nextFile);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="businessName">
                      Business name
                    </label>
                    <input
                      id="businessName"
                      className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                      value={form.businessName}
                      onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="businessDescription">
                      Business description
                    </label>
                    <textarea
                      id="businessDescription"
                      className="min-h-[96px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm"
                      value={form.businessDescription}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, businessDescription: e.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="website">
                        Website
                      </label>
                      <input
                        id="website"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.website}
                        onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="gstNumber">
                        GST number
                      </label>
                      <input
                        id="gstNumber"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.gstNumber}
                        onChange={(e) => setForm((prev) => ({ ...prev, gstNumber: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <div className="text-sm font-medium">GST document</div>
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-xl border border-zinc-900/10 bg-zinc-50">
                          {gstDocPreviewUrl ? (
                            <img
                              src={gstDocPreviewUrl}
                              alt="GST document preview"
                              className="h-full w-full object-cover"
                            />
                          ) : business.gstDocumentUrl ? (
                            <img
                              src={business.gstDocumentUrl}
                              alt="GST document"
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-xs font-semibold text-zinc-600">
                              Doc
                            </div>
                          )}
                        </div>

                        <label className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="absolute h-px w-px opacity-0"
                            onChange={(e) => {
                              const nextFile = e.target.files?.[0] ?? null;
                              setGstDocumentFile(nextFile);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="name">
                        Contact person name
                      </label>
                      <input
                        id="name"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="contactNo">
                        Contact number
                      </label>
                      <input
                        id="contactNo"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.contactNo}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, contactNo: e.target.value }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="whatsappNo">
                        WhatsApp number
                      </label>
                      <input
                        id="whatsappNo"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.whatsappNo}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, whatsappNo: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="suggestedBrandName">
                        Suggested brand name
                      </label>
                      <input
                        id="suggestedBrandName"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.suggestedBrandName}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, suggestedBrandName: e.target.value }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="suggestedBrandLogoUrl">
                        Suggested brand logo URL
                      </label>
                      <input
                        id="suggestedBrandLogoUrl"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                        value={form.suggestedBrandLogoUrl}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, suggestedBrandLogoUrl: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {validationError ? (
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                      {validationError}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-2xl border border-zinc-900/10 bg-zinc-50">
                    {business.businessLogoUrl ? (
                      <img
                        src={business.businessLogoUrl}
                        alt={business.businessName || "Business"}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-sm font-semibold text-zinc-600">
                        BP
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">{business.businessName || "Business"}</div>
                    <div className="mt-0.5 text-sm text-zinc-600">{business.status || ""}</div>
                  </div>
                </div>

                {business.businessCategory ? (
                  <div className="inline-flex items-center rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-semibold text-zinc-700">
                    {business.businessCategory}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DataRow label="Business description" value={<span className="whitespace-pre-wrap">{business.businessDescription || ""}</span>} />
            <DataRow label="Business type" value={business.businessType || ""} />
            <DataRow label="Email" value={business.email || ""} />
            <DataRow label="Website" value={business.website || ""} />
            <DataRow label="GST number" value={business.gstNumber || ""} />
            <DataRow label="GST document" value={business.gstDocumentUrl ? (
              <a className="text-zinc-950 underline" href={business.gstDocumentUrl} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : ""} />
            <DataRow label="Business category" value={business.businessCategory || ""} />
            <DataRow label="Other category name" value={business.otherCategoryName || ""} />
            <DataRow label="Vehicle types" value={(business.vehicleTypes ?? []).join(", ")} />
            <DataRow label="Shop type" value={business.shopType || ""} />
            <DataRow label="Brands" value={(business.brands ?? []).join(", ")} />
            <DataRow label="Suggested brand" value={business.suggestedBrandName || ""} />
            <DataRow label="Suggested brand logo" value={business.suggestedBrandLogoUrl ? (
              <a className="text-zinc-950 underline" href={business.suggestedBrandLogoUrl} target="_blank" rel="noreferrer">
                Open
              </a>
            ) : ""} />
            <DataRow label="Your role" value={business.businessRole || ""} />
            <DataRow label="Contact person" value={business.name || ""} />
            <DataRow label="Contact number" value={business.contactNo || ""} />
            <DataRow label="WhatsApp number" value={business.whatsappNo || ""} />
            <DataRow label="Primary location" value={business.primaryBusinessLocationId || ""} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
            <div className="border-b border-zinc-900/10 p-4 sm:p-6">
              <div className="text-base font-semibold">Locations</div>
              <div className="mt-1 text-sm text-zinc-600">All business locations linked to this profile.</div>
            </div>
            <div className="p-4 sm:p-6">
              {locations.length ? (
                <div className="grid gap-3">
                  {locations.map((loc) => (
                    <div key={loc.id} className="rounded-2xl border border-zinc-900/10 bg-white p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-zinc-950">{loc.fullAddress || "(No address)"}</div>
                          <div className="mt-1 text-xs text-zinc-600">ID: {loc.id}</div>
                          {loc.contactNumber ? (
                            <div className="mt-2 text-sm text-zinc-700">Contact: {loc.contactNumber}</div>
                          ) : null}
                          {loc.geo ? (
                            <div className="mt-1 text-xs text-zinc-600">Geo: {loc.geo.lat}, {loc.geo.lng}</div>
                          ) : null}
                        </div>

                        {loc.shopImageUrl ? (
                          <div className="h-20 w-28 overflow-hidden rounded-xl border border-zinc-900/10 bg-zinc-100">
                            <img
                              src={loc.shopImageUrl}
                              alt="Shop"
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : null}
                      </div>

                      {loc.businessHours ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-semibold text-zinc-950">Business hours</summary>
                          <BusinessHoursView value={loc.businessHours} />
                        </details>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-zinc-600">No locations.</div>
              )}
            </div>
          </div>

          {rawJson ? (
            <details className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
              <summary className="cursor-pointer border-b border-zinc-900/10 px-4 py-3 text-sm font-semibold text-zinc-950 sm:px-6">
                Raw business data
              </summary>
              <pre className="overflow-auto bg-zinc-950 p-4 text-xs text-zinc-100 sm:p-6">{rawJson}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
