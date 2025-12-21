"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type BusinessLocation = {
  id: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  landmark: string;
  shopImageUrl?: string;
  contactNumber?: string;
};

type BusinessDraftResponse = {
  ok?: boolean;
  business?:
    | {
        status?: string;
        businessType?: string;
        businessLocations?: BusinessLocation[];
        primaryBusinessLocationId?: string;
      }
    | null;
};

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

type LoadState =
  | { status: "loading" }
  | { status: "ready"; businessType: "online" | "offline" | "both" | ""; locations: BusinessLocation[] }
  | { status: "error"; message: string };

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const REQUIRED_SCRIPT =
  "I confirm that I am the business owner/authorized representative and the information provided is true.";

export default function RegisterKycPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const [selfieVideoFile, setSelfieVideoFile] = useState<File | null>(null);
  const [locationVideoById, setLocationVideoById] = useState<Record<string, File | null>>({});

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [recordingTarget, setRecordingTarget] = useState<
    | { type: "selfie" }
    | { type: "location"; locationId: string }
    | null
  >(null);
  const recordingTargetRef = useRef<
    | { type: "selfie" }
    | { type: "location"; locationId: string }
    | null
  >(null);
  const recordingTimerRef = useRef<number | null>(null);

  const needsLocationVideos = useMemo(() => {
    if (state.status !== "ready") return false;
    return state.businessType === "offline" || state.businessType === "both";
  }, [state]);

  useEffect(() => {
    const token = (() => {
      try {
        return sessionStorage.getItem("gem_id_token");
      } catch {
        return null;
      }
    })();

    if (!token) {
      window.setTimeout(() => {
        setState({ status: "error", message: "Please open this page from the mobile app." });
      }, 0);
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      try {
        const res = await fetch("/api/register", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          setState({ status: "error", message: "Failed to load KYC details." });
          return;
        }

        const data = (await res.json().catch(() => null)) as BusinessDraftResponse | null;
        if (!data?.ok || !data.business) {
          setState({ status: "error", message: "Failed to load KYC details." });
          return;
        }

        const status = asBusinessStatus(data.business.status);
        if (status === "verified") {
          router.replace("/dashboard");
          return;
        }
        if (status === "rejected") {
          router.replace("/register/rejected");
          return;
        }
        if (status === "submitted" || status === "pending") {
          router.replace("/register/verification");
          return;
        }

        const bt = (data.business.businessType ?? "") as "online" | "offline" | "both" | "";
        const businessType = ["online", "offline", "both"].includes(bt) ? bt : "";
        const locations = Array.isArray(data.business.businessLocations)
          ? data.business.businessLocations
          : [];

        setState({ status: "ready", businessType, locations });
      } catch {
        setState({ status: "error", message: "Network error. Please try again." });
      }
    };

    void run();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop());
    };
  }, []);

  const validationError = useMemo(() => {
    if (state.status !== "ready") return null;
    if (!selfieVideoFile) return "Please record your 15s self video.";

    if (needsLocationVideos) {
      for (const loc of state.locations) {
        if (!locationVideoById[loc.id]) {
          return "Please record shop proof video for each location.";
        }
      }
    }

    return null;
  }, [locationVideoById, needsLocationVideos, selfieVideoFile, state]);

  async function startRecording(target: { type: "selfie" } | { type: "location"; locationId: string }) {
    if (recording) return;

    const durationSeconds = target.type === "selfie" ? 15 : 30;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: target.type === "selfie" ? "user" : "environment" },
        audio: true,
      });

      mediaStreamRef.current = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const capturedFor = recordingTargetRef.current;
        const file = new File(
          [blob],
          capturedFor?.type === "location"
            ? `location_${capturedFor.locationId}_${Date.now()}.webm`
            : `selfie_${Date.now()}.webm`,
          { type: blob.type },
        );

        if (capturedFor?.type === "location") {
          setLocationVideoById((prev) => ({ ...prev, [capturedFor.locationId]: file }));
        } else {
          setSelfieVideoFile(file);
        }
        setSubmitState({ status: "idle" });
        mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        recordingTargetRef.current = null;
        setRecordingTarget(null);

        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      recorderRef.current = recorder;
      recordingTargetRef.current = target;
      setRecordingTarget(target);
      setTimeLeft(durationSeconds);
      setRecording(true);
      recorder.start();

      const startedAt = Date.now();
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const timer = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, durationSeconds - elapsed);
        setTimeLeft(remaining);
        if (remaining <= 0) {
          window.clearInterval(timer);
          try {
            recorder.stop();
          } catch {
            // ignore
          }
          setRecording(false);
        }
      }, 250);
      recordingTimerRef.current = timer;
    } catch {
      setSubmitState({ status: "error", message: "Camera/microphone permission is required." });
    }
  }

  function stopRecording() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    try {
      recorderRef.current?.stop();
    } catch {
      // ignore
    }
    setRecording(false);
  }

  async function onSubmit() {
    if (submitState.status === "submitting") return;
    if (state.status !== "ready") return;

    if (validationError) {
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
      setSubmitState({ status: "error", message: "Please open this page from the mobile app." });
      return;
    }

    setSubmitState({ status: "submitting" });

    try {
      const payload = new FormData();
      payload.append("scriptText", REQUIRED_SCRIPT);
      payload.append("selfieVideo", selfieVideoFile as File);

      if (needsLocationVideos) {
        for (const loc of state.locations) {
          const file = locationVideoById[loc.id];
          if (file) payload.append(`locationVideo_${loc.id}`, file);
        }
      }

      const res = await fetch("/api/kyc", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!res.ok || !data?.ok) {
        setSubmitState({
          status: "error",
          message: data?.message || "KYC submission failed. Please try again.",
        });
        return;
      }

      setSubmitState({ status: "success", message: data?.message || "KYC submitted." });
      router.replace("/register/verification");
    } catch {
      setSubmitState({ status: "error", message: "Network error. Please try again." });
    }
  }

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-6 text-sm text-zinc-600 shadow-sm">
            Loading KYC…
          </div>
        </main>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-950">
        <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-6 text-sm text-rose-700 shadow-sm">
            {state.message}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 sm:w-auto"
              onClick={() => router.push("/register/preview")}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-zinc-950/20 via-zinc-700/10 to-zinc-200/15 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-[520px] w-[520px] rounded-full bg-gradient-to-tr from-zinc-950/0 via-zinc-700/10 to-zinc-950/0 blur-3xl" />
        </div>

        <main className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-12">
          <div className="grid gap-3 sm:gap-4">
            <div>
              <div className="text-lg font-semibold tracking-tight">KYC verification</div>
              <div className="mt-1 text-sm text-zinc-600">
                Record a short verification video.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-4 text-sm text-zinc-700 shadow-sm sm:p-5">
              <div className="text-sm font-semibold">Read this text in your self video</div>
              <div className="mt-2 rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm break-words">
                {REQUIRED_SCRIPT}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Self video must be 15 seconds.</div>
            </div>

            <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="text-sm font-semibold">Self video</div>
                <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => startRecording({ type: "selfie" })}
                    disabled={recording}
                  >
                    {recording && recordingTarget?.type === "selfie"
                      ? `Recording… ${timeLeft}s`
                      : "Record 15s"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={stopRecording}
                    disabled={!recording}
                  >
                    Stop
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-500">
                {selfieVideoFile ? `Recorded: ${selfieVideoFile.name}` : "No video recorded yet"}
              </div>
            </div>

            {needsLocationVideos ? (
              <div className="rounded-2xl border border-zinc-900/10 bg-white/60 p-4 shadow-sm sm:p-5">
                <div className="text-sm font-semibold">Shop location proof videos</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Record a 30s video for each location.
                </div>

                <div className="mt-4 grid gap-3">
                  {state.locations.map((loc, index) => {
                    const label =
                      loc.landmark?.trim() ||
                      [loc.city, loc.state].filter(Boolean).join(", ") ||
                      `Location ${index + 1}`;
                    return (
                      <div
                        key={loc.id}
                        className="rounded-2xl border border-zinc-900/10 bg-white/60 p-4 sm:p-5"
                      >
                        <div className="text-sm font-semibold">{label}</div>
                        <div className="mt-3 grid gap-2">
                          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                            <button
                              type="button"
                              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={() => startRecording({ type: "location", locationId: loc.id })}
                              disabled={recording}
                            >
                              {recording &&
                              recordingTarget?.type === "location" &&
                              recordingTarget.locationId === loc.id
                                ? `Recording… ${timeLeft}s`
                                : "Record 30s"}
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                              onClick={stopRecording}
                              disabled={!recording}
                            >
                              Stop
                            </button>
                          </div>

                          <div className="text-xs text-zinc-500">
                            {locationVideoById[loc.id]
                              ? `Recorded: ${locationVideoById[loc.id]?.name}`
                              : "No video recorded yet"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {(submitState.status === "error" || submitState.status === "success") && (
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
              type="button"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={onSubmit}
              disabled={submitState.status === "submitting" || Boolean(validationError)}
            >
              {submitState.status === "submitting" ? "Submitting…" : "Submit KYC"}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
