"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { useRouter } from "next/navigation";
import { CloseCircle } from "iconsax-react";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

type FieldErrors = {
  images?: string;
  title?: string;
  description?: string;
  offerDetails?: string;
};

function safeTrim(value: string) {
  return value.trim();
}

export default function CatalogueCreatePage() {
  const router = useRouter();
  const imageInputId = useId();
  const offerDetailsId = useId();

  const [images, setImages] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offerDetails, setOfferDetails] = useState("<p></p>");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    images: false,
    title: false,
    description: false,
    offerDetails: false,
  });

  const imagePreviews = useMemo(() => {
    return images.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
  }, [images]);

  useEffect(() => {
    return () => {
      for (const p of imagePreviews) URL.revokeObjectURL(p.url);
    };
  }, [imagePreviews]);

  const errors: FieldErrors = useMemo(() => {
    const next: FieldErrors = {};

    if (images.length < 1) next.images = "Please add at least 1 image.";
    if (images.length > 5) next.images = "You can upload maximum 5 images.";
    if (!safeTrim(title)) next.title = "Title is required.";
    if (!safeTrim(description)) next.description = "Description is required.";

    const offerText = safeTrim(
      offerDetails
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
    );
    if (!offerText) next.offerDetails = "Offer details is required.";

    return next;
  }, [description, images.length, offerDetails, title]);

  const canSubmit = Object.keys(errors).length === 0;

  function onPickImages(nextFiles: FileList | null) {
    const list = nextFiles ? Array.from(nextFiles) : [];
    const onlyImages = list.filter((f) => f.type.startsWith("image/"));
    const merged = [...images, ...onlyImages].slice(0, 5);
    setImages(merged);
    setTouched((p) => ({ ...p, images: true }));
  }

  function onRemoveImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setTouched((p) => ({ ...p, images: true }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ images: true, title: true, description: true, offerDetails: true });
    if (!canSubmit) return;

    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      setSubmitError("Please open this page from the mobile app.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    const payload = {
      imagesCount: images.length,
      title: safeTrim(title),
      description: safeTrim(description),
      offerDetails: offerDetails,
    };

    try {
      const form = new FormData();
      form.set("title", payload.title);
      form.set("description", payload.description);
      form.set("offerDetails", payload.offerDetails);
      for (const image of images) form.append("images", image);

      const res = await fetch("/api/catalogue", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const data = (await res.json().catch(() => null)) as
        | { ok: true; id: string; status: string; message?: string }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !data || data.ok !== true) {
        const message = data && "message" in data && typeof data.message === "string"
          ? data.message
          : "Failed to create catalogue.";
        setSubmitError(message);
        return;
      }

      setSubmitSuccess(
        typeof data.message === "string" && data.message
          ? data.message
          : "Catalogue created."
      );
      setImages([]);
      setTitle("");
      setDescription("");
      setOfferDetails("<p></p>");
      setTouched({ images: false, title: false, description: false, offerDetails: false });

      router.replace("/dashboard/catalogue");
    } catch {
      setSubmitError("Failed to create catalogue.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="border-b border-zinc-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="Close"
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-900/10 bg-white text-lg font-semibold leading-none text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => router.push("/dashboard/catalogue")}
            >
              <CloseCircle size={20} variant="Linear" color="#09090b" aria-hidden="true" />
            </button>

            <div className="grid gap-1">
              <div className="text-lg font-semibold tracking-tight">Create Catalogue</div>
              <div className="text-sm text-zinc-600">
                Add images, details, and an offer description for your catalogue.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <form className="grid gap-6" onSubmit={onSubmit}>
          {submitError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
              {submitError}
            </div>
          ) : null}
          {submitSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-sm">
              {submitSuccess}
            </div>
          ) : null}
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor={imageInputId}>
              Image (min 1, max 5)
            </label>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                Upload images
                <input
                  id={imageInputId}
                  type="file"
                  accept="image/*"
                  multiple
                  className="absolute h-px w-px opacity-0"
                  onChange={(e) => {
                    onPickImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  onBlur={() => setTouched((p) => ({ ...p, images: true }))}
                />
              </label>
              <div className="min-w-0 text-sm text-zinc-600">
                {images.length ? `${images.length} selected` : "No image selected"}
              </div>
            </div>
            {touched.images && errors.images ? (
              <div className="text-xs text-rose-600">{errors.images}</div>
            ) : null}

            {images.length ? (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {imagePreviews.map((p, idx) => (
                  <div
                    key={`${p.file.name}_${p.file.size}_${idx}`}
                    className="relative overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm"
                  >
                    <div className="relative aspect-square w-full bg-zinc-100">
                      <img
                        src={p.url}
                        alt={p.file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      aria-label="Remove image"
                      className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-xs font-semibold text-zinc-900 shadow-sm ring-1 ring-zinc-900/10 transition hover:bg-white"
                      onClick={() => onRemoveImage(idx)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="catalogueTitle">
              Title
            </label>
            <input
              id="catalogueTitle"
              className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, title: true }))}
              required
            />
            {touched.title && errors.title ? (
              <div className="text-xs text-rose-600">{errors.title}</div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="catalogueDescription">
              Description
            </label>
            <textarea
              id="catalogueDescription"
              className="min-h-[110px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, description: true }))}
              required
            />
            {touched.description && errors.description ? (
              <div className="text-xs text-rose-600">{errors.description}</div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor={offerDetailsId}>
              Offer Details
            </label>
            <RichTextEditor
              id={offerDetailsId}
              value={offerDetails}
              onChange={(next: string) => {
                setOfferDetails(next);
                if (!touched.offerDetails) setTouched((p) => ({ ...p, offerDetails: true }));
              }}
            />
            {touched.offerDetails && errors.offerDetails ? (
              <div className="text-xs text-rose-600">{errors.offerDetails}</div>
            ) : null}
            <div className="text-xs text-zinc-500">Tip: highlight text then use toolbar.</div>
          </div>

          <div className="mt-2 border-t border-zinc-200 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Catalogue"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
