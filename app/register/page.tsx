"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

type BusinessStatus = "draft" | "submitted" | "pending" | "verified" | "rejected";

function asBusinessStatus(value: unknown): BusinessStatus | null {
  return value === "draft" ||
    value === "submitted" ||
    value === "pending" ||
    value === "verified" ||
    value === "rejected"
    ? value
    : null;
}

type FormState = {
  email: string;
  website: string;
  gstNumber: string;
  businessName: string;
  businessDescription: string;
  businessType: "online" | "offline" | "both" | "";
  businessRole: "owner" | "manager" | "employee" | "";
  name: string;
  contactNo: string;
  whatsappNo: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type BusinessDraftResponse = {
  ok?: boolean;
  business?:
    | {
        status?: string;
        businessName?: string;
        businessDescription?: string;
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
      }
    | null;
};

const initialForm: FormState = {
  email: "",
  website: "",
  gstNumber: "",
  businessName: "",
  businessDescription: "",
  businessType: "",
  businessRole: "",
  name: "",
  contactNo: "",
  whatsappNo: "",
};

type FieldKey = keyof FormState;

type FieldErrors = Partial<Record<FieldKey, string>> & {
  businessLogo?: string;
  gstDocument?: string;
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

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [businessLogoFile, setBusinessLogoFile] = useState<File | null>(null);
  const [existingBusinessLogoUrl, setExistingBusinessLogoUrl] = useState<string>("");
  const [gstDocumentFile, setGstDocumentFile] = useState<File | null>(null);
  const [existingGstDocumentUrl, setExistingGstDocumentUrl] = useState<string>("");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const businessLogoPreviewUrl = useMemo(() => {
    return businessLogoFile ? URL.createObjectURL(businessLogoFile) : null;
  }, [businessLogoFile]);

  useEffect(() => {
    return () => {
      if (businessLogoPreviewUrl) URL.revokeObjectURL(businessLogoPreviewUrl);
    };
  }, [businessLogoPreviewUrl]);

  const fieldErrors = useMemo((): FieldErrors => {
    const errors: FieldErrors = {};

    if (!form.businessName.trim()) errors.businessName = "Business name is required.";
    if (!form.businessDescription.trim())
      errors.businessDescription = "Business description is required.";
    if (!form.businessType) errors.businessType = "Business type is required.";

    if (!form.email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(form.email)) errors.email = "Please enter a valid email.";

    if (!form.website.trim()) errors.website = "Website is required.";
    else if (!isValidUrl(form.website.trim()))
      errors.website = "Please enter a valid website URL.";

    if (!form.gstNumber.trim()) errors.gstNumber = "GST number is required.";
    if (!gstDocumentFile && !existingGstDocumentUrl)
      errors.gstDocument = "GST document is required.";

    if (!businessLogoFile && !existingBusinessLogoUrl)
      errors.businessLogo = "Business logo is required.";

    if (!form.businessRole) errors.businessRole = "Business role is required.";
    if (!form.name.trim()) errors.name = "Name is required.";
    if (!form.contactNo.trim()) errors.contactNo = "Contact number is required.";
    if (!form.whatsappNo.trim()) errors.whatsappNo = "WhatsApp number is required.";

    return errors;
  }, [businessLogoFile, existingBusinessLogoUrl, existingGstDocumentUrl, form, gstDocumentFile]);

  const validationError = useMemo(() => {
    const firstError = Object.values(fieldErrors).find(Boolean);
    return firstError ?? null;
  }, [fieldErrors]);

  const canSubmit = submitState.status !== "submitting" && !validationError;

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) return;

    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await fetch("/api/register", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (!res.ok) return;

        const data = (await res.json().catch(() => null)) as BusinessDraftResponse | null;
        if (!data?.ok || !data.business) return;

        const status = asBusinessStatus(data.business?.status);
        if (status === "submitted" || status === "pending") {
          router.replace("/register/verification");
          return;
        }
        if (status === "verified") {
          router.replace("/dashboard/catalogue");
          return;
        }
        if (status === "rejected") {
          router.replace("/register/rejected");
          return;
        }

        setForm((prev) => ({
          ...prev,
          email: data.business?.email ?? "",
          website: data.business?.website ?? "",
          gstNumber: data.business?.gstNumber ?? "",
          businessName: data.business?.businessName ?? "",
          businessDescription: data.business?.businessDescription ?? "",
          businessType: (data.business?.businessType ?? "") as FormState["businessType"],
          businessRole: (data.business?.businessRole ?? "") as FormState["businessRole"],
          name: data.business?.name ?? "",
          contactNo: data.business?.contactNo ?? "",
          whatsappNo: data.business?.whatsappNo ?? "",
        }));

        setExistingBusinessLogoUrl(
          typeof data.business?.businessLogoUrl === "string" ? data.business.businessLogoUrl : ""
        );

        setExistingGstDocumentUrl(
          typeof data.business?.gstDocumentUrl === "string" ? data.business.gstDocumentUrl : ""
        );
      } catch {
        // ignore
      }
    };

    void run();
    return () => controller.abort();
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (validationError) {
      setTouched({
        businessLogo: true,
        businessName: true,
        businessDescription: true,
        businessType: true,
        email: true,
        website: true,
        gstNumber: true,
        gstDocument: true,
        businessRole: true,
        name: true,
        contactNo: true,
        whatsappNo: true,
      });
      setSubmitState({ status: "error", message: validationError });
      return;
    }

    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      setSubmitState({
        status: "error",
        message: "Please open this page from the mobile app.",
      });
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const payload = new FormData();
      if (businessLogoFile) payload.append("businessLogo", businessLogoFile);
      payload.append("businessName", form.businessName.trim());
      payload.append("businessDescription", form.businessDescription.trim());
      payload.append("businessType", form.businessType);
      payload.append("email", form.email.trim().toLowerCase());
      payload.append("website", form.website.trim());
      payload.append("gstNumber", form.gstNumber.trim());
      if (gstDocumentFile) payload.append("gstDocument", gstDocumentFile);
      payload.append("businessRole", form.businessRole);
      payload.append("name", form.name.trim());
      payload.append("contactNo", form.contactNo.trim());
      payload.append("whatsappNo", form.whatsappNo.trim());

      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: payload,
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok) {
        setSubmitState({
          status: "error",
          message: data?.message || "Registration failed. Please try again.",
        });
        return;
      }

      setSubmitState({
        status: "success",
        message: data?.message || "Draft saved.",
      });

      router.push("/register/category");
    } catch {
      setSubmitState({
        status: "error",
        message: "Network error. Please try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
        </div>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-12">
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Premium onboarding
              </div>

              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Register to get started
              </h1>
              <p className="max-w-xl text-pretty text-sm leading-7 text-zinc-600 sm:text-base">
                Create your account and we’ll reach out with next steps for your
                project.
              </p>

              <div className="grid gap-3">
                {[
                  "Fast response, typically same day",
                  "Clear next steps and timelines",
                  "High-touch, premium support",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-2 border-b border-zinc-900/10 py-3 text-sm text-zinc-700 last:border-b-0"
                  >
                    <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <div>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-zinc-950/10 via-zinc-700/5 to-zinc-200/10 blur-2xl" />
              <div className="grid gap-2">
                <div>
                  <div className="text-lg font-semibold tracking-tight">Registration</div>
                  <div className="mt-1 text-sm text-zinc-600">
                    Tell us about your business.
                  </div>
                </div>

                <form className="grid gap-4" onSubmit={onSubmit}>
                  <div className="grid gap-3">
                    <div className="text-sm font-medium">Business logo</div>

                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-gradient-to-tr from-zinc-950/70 via-zinc-700/40 to-zinc-300/40 p-[1px] shadow-sm">
                        <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-white text-zinc-600">
                          {businessLogoPreviewUrl ? (
                            <Image
                              src={businessLogoPreviewUrl}
                              alt="Business logo preview"
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : existingBusinessLogoUrl ? (
                            <Image
                              src={existingBusinessLogoUrl}
                              alt="Business logo"
                              width={64}
                              height={64}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="text-xs font-semibold">Logo</span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <label
                          className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                        >
                          Choose from gallery
                          <input
                            id="businessLogo"
                            name="businessLogo"
                            type="file"
                            accept="image/*"
                            className="absolute h-px w-px opacity-0"
                            onChange={(e) => {
                              const nextFile = e.target.files?.[0] ?? null;
                              setBusinessLogoFile(nextFile);
                              setTouched((prev) => ({ ...prev, businessLogo: true }));
                            }}
                          />
                        </label>
                        <div className="text-xs text-zinc-500">
                          PNG/JPG recommended.
                        </div>
                        {touched.businessLogo && fieldErrors.businessLogo && (
                          <div className="text-xs text-rose-600">{fieldErrors.businessLogo}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="businessName">
                      Business name
                    </label>
                    <input
                      id="businessName"
                      className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                      value={form.businessName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          businessName: e.target.value,
                        }))
                      }
                      onBlur={() => setTouched((prev) => ({ ...prev, businessName: true }))}
                      required
                    />
                    {touched.businessName && fieldErrors.businessName && (
                      <div className="text-xs text-rose-600">{fieldErrors.businessName}</div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="businessDescription"
                    >
                      Business description
                    </label>
                    <textarea
                      id="businessDescription"
                      className="min-h-[96px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                      value={form.businessDescription}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          businessDescription: e.target.value,
                        }))
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, businessDescription: true }))
                      }
                      required
                    />
                    {touched.businessDescription && fieldErrors.businessDescription && (
                      <div className="text-xs text-rose-600">
                        {fieldErrors.businessDescription}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="businessType"
                      >
                        Business type
                      </label>
                      <select
                        id="businessType"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={form.businessType}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            businessType: e.target.value as FormState["businessType"],
                          }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, businessType: true }))}
                        required
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                        <option value="both">Both</option>
                      </select>
                      {touched.businessType && fieldErrors.businessType && (
                        <div className="text-xs text-rose-600">{fieldErrors.businessType}</div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="email">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={form.email}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                        autoComplete="email"
                        required
                      />
                      {touched.email && fieldErrors.email && (
                        <div className="text-xs text-rose-600">{fieldErrors.email}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="website">
                      Website
                    </label>
                    <input
                      id="website"
                      type="url"
                      className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                      value={form.website}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, website: e.target.value }))
                      }
                      onBlur={() => setTouched((prev) => ({ ...prev, website: true }))}
                      placeholder="https://"
                      required
                    />
                    {touched.website && fieldErrors.website && (
                      <div className="text-xs text-rose-600">{fieldErrors.website}</div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium" htmlFor="gstNumber">
                      GST number
                    </label>
                    <input
                      id="gstNumber"
                      className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                      value={form.gstNumber}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, gstNumber: e.target.value }))
                      }
                      onBlur={() => setTouched((prev) => ({ ...prev, gstNumber: true }))}
                      required
                    />
                    {touched.gstNumber && fieldErrors.gstNumber && (
                      <div className="text-xs text-rose-600">{fieldErrors.gstNumber}</div>
                    )}
                  </div>

                  <div className="grid gap-3">
                    <div className="text-sm font-medium">GST document</div>
                    <div className="flex items-center gap-4">
                      <label className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
                        Choose file
                        <input
                          id="gstDocument"
                          name="gstDocument"
                          type="file"
                          accept="application/pdf,image/*"
                          className="absolute h-px w-px opacity-0"
                          onChange={(e) => {
                            const nextFile = e.target.files?.[0] ?? null;
                            setGstDocumentFile(nextFile);
                            setTouched((prev) => ({ ...prev, gstDocument: true }));
                          }}
                        />
                      </label>

                      <div className="min-w-0 text-sm text-zinc-600">
                        {gstDocumentFile ? (
                          <div className="truncate">{gstDocumentFile.name}</div>
                        ) : existingGstDocumentUrl ? (
                          <a
                            className="truncate underline"
                            href={existingGstDocumentUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View uploaded document
                          </a>
                        ) : (
                          <div className="text-zinc-500">No file selected</div>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500">
                      PDF or image. Max 5MB.
                    </div>
                    {touched.gstDocument && fieldErrors.gstDocument && (
                      <div className="text-xs text-rose-600">{fieldErrors.gstDocument}</div>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="businessRole"
                      >
                        Business role
                      </label>
                      <select
                        id="businessRole"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={form.businessRole}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            businessRole: e.target.value as FormState["businessRole"],
                          }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, businessRole: true }))}
                        required
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="employee">Employee</option>
                      </select>
                      {touched.businessRole && fieldErrors.businessRole && (
                        <div className="text-xs text-rose-600">{fieldErrors.businessRole}</div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium" htmlFor="name">
                        Name
                      </label>
                      <input
                        id="name"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={form.name}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                        autoComplete="name"
                        required
                      />
                      {touched.name && fieldErrors.name && (
                        <div className="text-xs text-rose-600">{fieldErrors.name}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="contactNo"
                      >
                        Contact no.
                      </label>
                      <input
                        id="contactNo"
                        type="tel"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={form.contactNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            contactNo: e.target.value,
                          }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, contactNo: true }))}
                        autoComplete="tel"
                        required
                      />
                      {touched.contactNo && fieldErrors.contactNo && (
                        <div className="text-xs text-rose-600">{fieldErrors.contactNo}</div>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="whatsappNo"
                      >
                        WhatsApp no.
                      </label>
                      <input
                        id="whatsappNo"
                        type="tel"
                        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                        value={form.whatsappNo}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            whatsappNo: e.target.value,
                          }))
                        }
                        onBlur={() => setTouched((prev) => ({ ...prev, whatsappNo: true }))}
                        autoComplete="tel"
                        required
                      />
                      {touched.whatsappNo && fieldErrors.whatsappNo && (
                        <div className="text-xs text-rose-600">{fieldErrors.whatsappNo}</div>
                      )}
                    </div>
                  </div>

                  {(submitState.status === "error" ||
                    submitState.status === "success") && (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
                        submitState.status === "success"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                          : "border-rose-500/20 bg-rose-500/10 text-rose-700"
                      }`}
                      role="status"
                    >
                      {submitState.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={!canSubmit}
                  >
                    {submitState.status === "submitting"
                      ? "Continuing…"
                      : "Continue"}
                  </button>

                  <div className="text-center text-xs text-zinc-500">
                    By continuing, you agree to be contacted about your project.
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
