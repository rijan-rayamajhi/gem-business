"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type CatalogueStatus = "draft" | "pending" | "rejected" | "verified";

type CatalogueItem = {
  id: string;
  title?: string;
  description?: string;
  offerDetails?: string;
  imageUrls?: string[];
  status?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function asCatalogueStatus(value: unknown): CatalogueStatus | null {
  return value === "draft" || value === "pending" || value === "rejected" || value === "verified"
    ? value
    : null;
}

function badgeClass(status: CatalogueStatus) {
  if (status === "draft") return "border-zinc-900/10 bg-zinc-100 text-zinc-700";
  if (status === "pending") return "border-yellow-500/20 bg-yellow-500/10 text-yellow-700";
  if (status === "rejected") return "border-rose-500/20 bg-rose-500/10 text-rose-700";
  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700";
}

function isSafeImgUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  return v.startsWith("https://") || v.startsWith("http://");
}

export default function DashboardCatalogueDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const [item, setItem] = useState<CatalogueItem | null>(null);
  const [loadState, setLoadState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState<string>("");

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOfferDetails, setFormOfferDetails] = useState("");
  const [formStatus, setFormStatus] = useState<CatalogueStatus>("draft");

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!id) {
      setLoadState({ status: "error", message: "Missing catalogue id." });
      return;
    }

    if (!token) {
      setLoadState({ status: "error", message: "Missing authentication token." });
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      setLoadState({ status: "loading" });

      try {
        const res = await fetch(`/api/catalogue/${encodeURIComponent(id)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; item?: unknown; message?: string }
          | null;

        if (!res.ok || !data?.ok || !data.item || typeof data.item !== "object") {
          setLoadState({
            status: "error",
            message: data?.message || "Failed to load catalogue.",
          });
          return;
        }

        const obj = data.item as Record<string, unknown>;
        const title = typeof obj.title === "string" ? obj.title : "";
        const description = typeof obj.description === "string" ? obj.description : "";
        const offerDetails = typeof obj.offerDetails === "string" ? obj.offerDetails : "";
        const status = typeof obj.status === "string" ? obj.status : "";
        const imageUrls = Array.isArray(obj.imageUrls) ? obj.imageUrls.filter(isSafeImgUrl) : [];

        const nextItem = {
          id: typeof obj.id === "string" ? obj.id : id,
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          ...(offerDetails ? { offerDetails } : {}),
          ...(imageUrls.length ? { imageUrls } : {}),
          ...(status ? { status } : {}),
          ...("createdAt" in obj ? { createdAt: obj.createdAt } : {}),
          ...("updatedAt" in obj ? { updatedAt: obj.updatedAt } : {}),
        } satisfies CatalogueItem;

        setItem(nextItem);
        setFormTitle(nextItem.title ?? "");
        setFormDescription(nextItem.description ?? "");
        setFormOfferDetails(nextItem.offerDetails ?? "");
        setFormStatus(asCatalogueStatus(nextItem.status) ?? "draft");
        setActionError("");
        setEditOpen(false);

        setLoadState({ status: "idle" });
      } catch {
        setLoadState({ status: "error", message: "Failed to load catalogue." });
      }
    };
    void run();
    return () => controller.abort();
  }, [id]);

  const status = asCatalogueStatus(item?.status) ?? "draft";
  const images = useMemo(() => (Array.isArray(item?.imageUrls) ? item?.imageUrls ?? [] : []), [item]);

  const token = (() => {
    try {
      return sessionStorage.getItem("gem_id_token");
    } catch {
      return null;
    }
  })();

  const canAct = Boolean(token) && Boolean(id) && loadState.status === "idle" && Boolean(item);
  const currentStatus = asCatalogueStatus(item?.status) ?? "draft";
  const isLocked = currentStatus === "pending" || currentStatus === "verified";

  const onVerifyNow = async () => {
    if (!canAct || !token || !item) return;
    const currentStatus = asCatalogueStatus(item.status) ?? "draft";
    if (currentStatus !== "draft") return;

    const confirmed = window.confirm(
      "Submit this catalogue for verification? Status will change to pending."
    );
    if (!confirmed) return;

    setVerifying(true);
    setActionError("");
    try {
      const res = await fetch(`/api/catalogue/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "pending" }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setActionError(data?.message || "Failed to submit for verification.");
        return;
      }

      setItem({ ...item, status: "pending" });
      setFormStatus("pending");
      setEditOpen(false);
    } catch {
      setActionError("Failed to submit for verification.");
    } finally {
      setVerifying(false);
    }
  };

  const onSave = async () => {
    if (!canAct || !token || !item || isLocked) return;

    setSaving(true);
    setActionError("");
    try {
      const res = await fetch(`/api/catalogue/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          offerDetails: formOfferDetails,
          status: formStatus,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setActionError(data?.message || "Failed to save changes.");
        return;
      }

      setItem({
        ...item,
        title: formTitle,
        description: formDescription,
        offerDetails: formOfferDetails,
        status: formStatus,
      });
      setEditOpen(false);
    } catch {
      setActionError("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!canAct || !token || isLocked) return;
    const confirmed = window.confirm("Delete this catalogue? This cannot be undone.");
    if (!confirmed) return;

    setDeleting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/catalogue/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setActionError(data?.message || "Failed to delete catalogue.");
        return;
      }

      router.push("/dashboard/catalogue");
    } catch {
      setActionError("Failed to delete catalogue.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catalogue details</h1>
          <p className="mt-1 text-sm text-zinc-600">All available details for this catalogue.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
            onClick={() => router.back()}
          >
            Back
          </button>

          {(asCatalogueStatus(item?.status) ?? "draft") === "draft" ? (
            <button
              type="button"
              disabled={!canAct || saving || deleting || verifying}
              className="h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-500/15 disabled:opacity-50"
              onClick={onVerifyNow}
            >
              {verifying ? "Verifying…" : "Verify now"}
            </button>
          ) : null}

          <button
            type="button"
            disabled={!canAct || deleting || verifying || isLocked}
            className="h-10 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
            onClick={() => {
              if (!item) return;
              if (isLocked) return;
              setActionError("");
              setEditOpen((v) => !v);
              setFormTitle(item.title ?? "");
              setFormDescription(item.description ?? "");
              setFormOfferDetails(item.offerDetails ?? "");
              setFormStatus(asCatalogueStatus(item.status) ?? "draft");
            }}
          >
            {editOpen ? "Close edit" : "Edit"}
          </button>

          <button
            type="button"
            disabled={!canAct || saving || deleting || verifying || isLocked}
            className="h-10 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-500/15 disabled:opacity-50"
            onClick={onDelete}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

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

      {loadState.status === "idle" && item ? (
        <div className="mt-6 grid gap-4">
          <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
            {editOpen ? (
              <div className="border-b border-zinc-900/10 p-4 sm:p-6">
                <div className="grid gap-4">
                  <div>
                    <div className="text-xs font-medium text-zinc-500">Title</div>
                    <input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                    />
                  </div>

                <div>
                  <div className="text-xs font-medium text-zinc-500">Description</div>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-zinc-500">Status</div>
                  <select
                    value={formStatus}
                    onChange={(e) => {
                      const v = asCatalogueStatus(e.target.value);
                      if (v) setFormStatus(v);
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>

                <div>
                  <div className="text-xs font-medium text-zinc-500">Offer details (HTML)</div>
                  <div className="mt-1">
                    <RichTextEditor
                      value={formOfferDetails || "<p></p>"}
                      onChange={(next: string) => setFormOfferDetails(next)}
                    />
                  </div>
                </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={saving || deleting}
                      className="h-10 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
                      onClick={() => {
                        setEditOpen(false);
                        setActionError("");
                        setFormTitle(item.title ?? "");
                        setFormDescription(item.description ?? "");
                        setFormOfferDetails(item.offerDetails ?? "");
                        setFormStatus(asCatalogueStatus(item.status) ?? "draft");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving || deleting}
                      className="h-10 rounded-xl border border-zinc-900/10 bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:opacity-50"
                      onClick={onSave}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="border-b border-zinc-900/10 p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-500">Title</div>
                  <div className="mt-1 text-lg font-semibold text-zinc-950">
                    {item.title || "Untitled"}
                  </div>
                </div>

                <div className="inline-flex items-center gap-2">
                  <div
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(
                      status
                    )}`}
                  >
                    {status}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-medium text-zinc-500">Description</div>
                <div className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">
                  {item.description || ""}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="text-sm font-semibold text-zinc-950">Images</div>
              {images.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {images.map((url) => (
                    <div
                      key={url}
                      className="overflow-hidden rounded-xl border border-zinc-900/10 bg-zinc-100"
                    >
                      <img
                        src={url}
                        alt={item.title || "Catalogue"}
                        className="h-48 w-full object-cover"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-zinc-600">No images.</div>
              )}

              <div className="mt-6">
                <div className="text-sm font-semibold text-zinc-950">Offer details</div>
                {item.offerDetails ? (
                  <div
                    className="prose prose-zinc mt-2 max-w-none"
                    dangerouslySetInnerHTML={{ __html: item.offerDetails }}
                  />
                ) : (
                  <div className="mt-2 text-sm text-zinc-600">No offer details.</div>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-900/10 bg-white p-4">
                  <div className="text-xs font-medium text-zinc-500">Catalogue ID</div>
                  <div className="mt-1 break-all text-sm font-semibold text-zinc-950">{item.id}</div>
                </div>

                <div className="rounded-xl border border-zinc-900/10 bg-white p-4">
                  <div className="text-xs font-medium text-zinc-500">Raw fields</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    createdAt / updatedAt (if present)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {status === "verified" ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-base font-semibold text-emerald-800">Boost ads</div>
                  <div className="mt-1 text-sm text-emerald-800/80">
                    Promote this verified catalogue with ads to reach more customers.
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  onClick={() => router.push(`/dashboard/boost-ads?catalogueId=${encodeURIComponent(item.id)}`)}
                >
                  Boost Ads
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
