"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";

type GoogleMapsApi = {
  maps?: {
    places?: {
      Autocomplete: new (
        input: HTMLInputElement,
        opts: { fields: string[] }
      ) => {
        addListener: (eventName: string, handler: () => void) => unknown;
        getPlace: () => Record<string, unknown>;
      };
    };
    Map: new (
      el: HTMLElement,
      opts: {
        center: { lat: number; lng: number };
        zoom: number;
        disableDefaultUI: boolean;
        zoomControl: boolean;
      }
    ) => {
      setCenter: (center: { lat: number; lng: number }) => void;
      setZoom: (zoom: number) => void;
    };
    Marker: new (opts: { position: { lat: number; lng: number }; map: unknown }) => {
      setPosition: (center: { lat: number; lng: number }) => void;
    };
    event: {
      removeListener: (listener: unknown) => void;
    };
  };
};

type EventDraft = {
  id: string;
  title: string;
  type: string;
  tags: string[];
  description: string;
  info: string;
  startDateTime: string;
  endDateTime: string;
  location: {
    address: string;
    placeId?: string;
    lat?: number;
    lng?: number;
  };
  hostOrganizer: string;
  sponsorsPartners: string;
};

type LocationValue = EventDraft["location"];

type Props = {
  open?: boolean;
  onClose: () => void;
  onCreate: (event: EventDraft) => void;
  variant?: "modal" | "page";
};

type FieldErrors = Partial<Record<keyof Omit<EventDraft, "id" | "location" | "tags">, string>> & {
  tags?: string;
  location?: string;
  endDateTime?: string;
};

function safeTrim(value: string) {
  return value.trim();
}

function isValidDateTime(value: string) {
  return Boolean(value) && !Number.isNaN(new Date(value).getTime());
}

function toEventDraftId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function parseLocalInputToDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function useGoogleMapsScript(apiKey?: string | null) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!apiKey) {
      queueMicrotask(() => setStatus("error"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-gem-google-maps="true"]'
    );

    const googleApi = (window as unknown as { google?: GoogleMapsApi }).google;
    if (googleApi?.maps?.places) {
      queueMicrotask(() => setStatus("ready"));
      return;
    }

    if (existing) {
      queueMicrotask(() => setStatus("loading"));
      const onLoad = () => setStatus("ready");
      const onError = () => setStatus("error");
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", onError);
      return () => {
        existing.removeEventListener("load", onLoad);
        existing.removeEventListener("error", onError);
      };
    }

    queueMicrotask(() => setStatus("loading"));
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.gemGoogleMaps = "true";
    script.onload = () => setStatus("ready");
    script.onerror = () => setStatus("error");
    document.head.appendChild(script);

    return () => {
      script.onload = null;
      script.onerror = null;
    };
  }, [apiKey]);

  return status;
}

function LocationPicker({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const status = useGoogleMapsScript(apiKey);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<{ setPosition: (center: { lat: number; lng: number }) => void } | null>(
    null
  );
  const mapInstanceRef = useRef<{
    setCenter: (center: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
  } | null>(null);

  useEffect(() => {
    if (status !== "ready") return;

    const googleAny = (window as unknown as { google?: GoogleMapsApi }).google;
    const input = inputRef.current;
    const maps = googleAny?.maps;
    if (!maps?.places || !input) return;

    const autocomplete = new maps.places.Autocomplete(input, {
      fields: ["place_id", "formatted_address", "geometry", "name"],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const placeObj = place && typeof place === "object" ? (place as Record<string, unknown>) : {};
      const formattedAddress =
        typeof placeObj.formatted_address === "string" ? placeObj.formatted_address : "";
      const name = typeof placeObj.name === "string" ? placeObj.name : "";
      const geometry =
        placeObj.geometry && typeof placeObj.geometry === "object"
          ? (placeObj.geometry as Record<string, unknown>)
          : null;
      const location =
        geometry && typeof geometry.location === "object" && geometry.location
          ? (geometry.location as Record<string, unknown>)
          : null;
      const latFn = location?.lat;
      const lngFn = location?.lng;
      const lat = typeof latFn === "function" ? (latFn as () => unknown)() : undefined;
      const lng = typeof lngFn === "function" ? (lngFn as () => unknown)() : undefined;

      const address = formattedAddress || name || input.value || value.address;

      onChange({
        address,
        placeId: typeof placeObj.place_id === "string" ? placeObj.place_id : undefined,
        lat: typeof lat === "number" ? lat : undefined,
        lng: typeof lng === "number" ? lng : undefined,
      });

      if (typeof lat === "number" && typeof lng === "number") {
        const center = { lat, lng };
        if (!mapInstanceRef.current && mapRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center,
            zoom: 14,
            disableDefaultUI: true,
            zoomControl: true,
          });
        } else if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(center);
          mapInstanceRef.current.setZoom(14);
        }

        if (!markerRef.current && mapInstanceRef.current) {
          markerRef.current = new maps.Marker({
            position: center,
            map: mapInstanceRef.current,
          });
        } else if (markerRef.current) {
          markerRef.current.setPosition(center);
        }
      }
    });

    return () => {
      if (listener) maps.event.removeListener(listener);
    };
  }, [onChange, status, value.address]);

  useEffect(() => {
    if (status !== "ready") return;
    const googleAny = (window as unknown as { google?: GoogleMapsApi }).google;
    const maps = googleAny?.maps;
    if (!maps || !mapRef.current) return;

    if (typeof value.lat !== "number" || typeof value.lng !== "number") return;

    const center = { lat: value.lat, lng: value.lng };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(mapRef.current, {
        center,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(14);
    }

    if (!markerRef.current && mapInstanceRef.current) {
      markerRef.current = new maps.Marker({
        position: center,
        map: mapInstanceRef.current,
      });
    } else if (markerRef.current) {
      markerRef.current.setPosition(center);
    }
  }, [status, value.lat, value.lng]);

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor="eventLocation">
        Location
      </label>

      <input
        id="eventLocation"
        ref={inputRef}
        className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        placeholder={
          status === "ready"
            ? "Search location"
            : !apiKey
              ? "Google Maps key missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map search."
              : status === "loading"
                ? "Loading Google Maps…"
                : "Google Maps failed to load. You can still type the address."
        }
        autoComplete="off"
      />

      {status !== "ready" ? (
        <div className="text-xs text-zinc-500">
          {!apiKey
            ? "Google Maps key missing. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map search."
            : status === "loading"
              ? "Loading Google Maps…"
              : "Google Maps failed to load. You can still type the address."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-zinc-50">
          <div ref={mapRef} className="h-40 w-full" />
        </div>
      )}
    </div>
  );
}

function MediaPicker({
  label,
  accept,
  files,
  onChange,
}: {
  label: string;
  accept: string;
  files: File[];
  onChange: (next: File[]) => void;
}) {
  const id = useId();

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-center gap-3">
        <label className="relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
          Add files
          <input
            id={id}
            type="file"
            multiple
            accept={accept}
            className="absolute h-px w-px opacity-0"
            onChange={(e) => {
              const next = Array.from(e.target.files ?? []);
              onChange([...files, ...next]);
              e.currentTarget.value = "";
            }}
          />
        </label>

        <div className="min-w-0 text-sm text-zinc-600">
          {files.length ? `${files.length} selected` : "No files selected"}
        </div>
      </div>

      {files.length ? (
        <div className="grid gap-2">
          <div className="grid gap-1">
            {files.slice(0, 6).map((f) => (
              <div
                key={`${f.name}_${f.lastModified}`}
                className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-xl border border-zinc-900/10 bg-white px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-900">
                    <span className="block break-all [overflow-wrap:anywhere]">
                      {f.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {(f.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-zinc-900/10 bg-white px-2 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    onChange(
                      files.filter(
                        (x) =>
                          !(x.name === f.name && x.lastModified === f.lastModified)
                      )
                    );
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {files.length > 6 && (
            <div className="text-xs text-zinc-500">
              +{files.length - 6} more
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TagsInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addTag(raw: string) {
    const tag = safeTrim(raw);
    if (!tag) return;
    if (value.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    if (value.length >= 5) return;
    onChange([...value, tag]);
  }

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor="eventTags">
        Event tags
      </label>

      <div className="rounded-xl border border-zinc-900/10 bg-white px-3 py-2 shadow-sm transition focus-within:border-zinc-900/20 focus-within:bg-zinc-50">
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              title="Remove"
            >
              <span className="max-w-[220px] truncate">{tag}</span>
              <span className="text-zinc-500">×</span>
            </button>
          ))}

          <input
            id="eventTags"
            ref={inputRef}
            className="min-w-[120px] flex-1 bg-transparent py-1 text-sm outline-none"
            value={draft}
            placeholder={value.length ? "Add another" : "Add up to 5"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTag(draft);
                setDraft("");
              }
              if (e.key === "Backspace" && !draft && value.length) {
                onChange(value.slice(0, -1));
              }
            }}
            onBlur={() => {
              if (draft) {
                addTag(draft);
                setDraft("");
              }
            }}
            disabled={value.length >= 5}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">{value.length}/5</div>
        {error ? <div className="text-xs text-rose-600">{error}</div> : null}
      </div>
    </div>
  );
}

export default function EventFormModal({ open, onClose, onCreate, variant = "modal" }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [info, setInfo] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [location, setLocation] = useState<LocationValue>({ address: "" });
  const [mediaImages, setMediaImages] = useState<File[]>([]);
  const [mediaVideos, setMediaVideos] = useState<File[]>([]);
  const [hostOrganizer, setHostOrganizer] = useState("");
  const [sponsorsPartners, setSponsorsPartners] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitState, setSubmitState] = useState<
    | { status: "idle" }
    | { status: "saving" }
    | { status: "error"; message: string }
  >({ status: "idle" });

  const titleRef = useRef<HTMLInputElement | null>(null);

  const active = variant === "modal" ? Boolean(open) : true;

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(() => titleRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (variant !== "modal" || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, variant]);

  useEffect(() => {
    if (variant !== "modal" || !open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, variant]);

  const errors = useMemo((): FieldErrors => {
    const next: FieldErrors = {};

    if (!safeTrim(title)) next.title = "Event title is required.";
    if (!safeTrim(type)) next.type = "Event type is required.";
    if (!safeTrim(description)) next.description = "Event description is required.";

    if (!isValidDateTime(startDateTime)) next.startDateTime = "Start date & time is required.";
    if (!isValidDateTime(endDateTime)) next.endDateTime = "End date & time is required.";

    const start = parseLocalInputToDate(startDateTime);
    const end = parseLocalInputToDate(endDateTime);
    if (start && end && end.getTime() <= start.getTime()) {
      next.endDateTime = "End date/time must be after start date/time.";
    }

    if (!safeTrim(location.address)) next.location = "Location is required.";
    if (!safeTrim(hostOrganizer)) next.hostOrganizer = "Host & organizer is required.";

    if (tags.length > 5) next.tags = "Max 5 tags.";

    return next;
  }, [description, endDateTime, hostOrganizer, location.address, startDateTime, tags.length, title, type]);

  const validationError = useMemo(() => {
    const firstError = Object.values(errors).find(Boolean);
    return firstError ?? null;
  }, [errors]);

  const canSubmit = submitState.status !== "saving" && !validationError;

  function resetForm() {
    setTitle("");
    setType("");
    setTags([]);
    setDescription("");
    setInfo("");
    setStartDateTime("");
    setEndDateTime("");
    setLocation({ address: "" });
    setMediaImages([]);
    setMediaVideos([]);
    setHostOrganizer("");
    setSponsorsPartners("");
    setTouched({});
    setSubmitState({ status: "idle" });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (validationError) {
      setTouched({
        title: true,
        type: true,
        tags: true,
        description: true,
        info: true,
        startDateTime: true,
        endDateTime: true,
        location: true,
        hostOrganizer: true,
        sponsorsPartners: true,
      });
      setSubmitState({ status: "error", message: validationError });
      return;
    }

    setSubmitState({ status: "saving" });

    const draft: EventDraft = {
      id: toEventDraftId(),
      title: safeTrim(title),
      type: safeTrim(type),
      tags,
      description: safeTrim(description),
      info: safeTrim(info),
      startDateTime,
      endDateTime,
      location: {
        address: safeTrim(location.address),
        placeId: location.placeId,
        lat: location.lat,
        lng: location.lng,
      },
      hostOrganizer: safeTrim(hostOrganizer),
      sponsorsPartners: safeTrim(sponsorsPartners),
    };

    try {
      void mediaImages;
      void mediaVideos;
      onCreate(draft);
      resetForm();
      onClose();
    } catch {
      setSubmitState({ status: "error", message: "Failed to create event. Please try again." });
    }
  }

  if (variant === "modal" && !open) return null;

  const form = (
    <form
      className={
        variant === "modal"
          ? "max-h-[82vh] overflow-x-hidden overflow-y-auto px-5 py-5"
          : "px-5 py-5"
      }
      onSubmit={onSubmit}
    >
            <div className="grid gap-5">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="eventTitle">
                  Event Title
                </label>
                <input
                  id="eventTitle"
                  ref={titleRef}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="eventType">
                    Event Type
                  </label>
                  <select
                    id="eventType"
                    className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, type: true }))}
                    required
                  >
                    <option value="" disabled>
                      Select
                    </option>
                    <option value="Meetup">Meetup</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Expo">Expo</option>
                    <option value="Webinar">Webinar</option>
                    <option value="Other">Other</option>
                  </select>
                  {touched.type && errors.type ? (
                    <div className="text-xs text-rose-600">{errors.type}</div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Attachments & Media</div>
                  <div className="text-xs text-zinc-500">Add images and videos.</div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <MediaPicker
                  label="Images"
                  accept="image/*"
                  files={mediaImages}
                  onChange={setMediaImages}
                />
                <MediaPicker
                  label="Videos"
                  accept="video/*"
                  files={mediaVideos}
                  onChange={setMediaVideos}
                />
              </div>

              <TagsInput
                value={tags}
                onChange={(next) => {
                  setTags(next);
                  setTouched((p) => ({ ...p, tags: true }));
                }}
                error={touched.tags ? errors.tags : undefined}
              />

              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="eventDescription">
                  Event Description
                </label>
                <textarea
                  id="eventDescription"
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
                <label className="text-sm font-medium" htmlFor="eventInfo">
                  Event info
                </label>
                <textarea
                  id="eventInfo"
                  className="min-h-[92px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                  value={info}
                  onChange={(e) => setInfo(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, info: true }))}
                  placeholder="Optional details (agenda, dress code, price, etc.)"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="eventStart">
                    Start Date and time
                  </label>
                  <input
                    id="eventStart"
                    type="datetime-local"
                    className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, startDateTime: true }))}
                    required
                  />
                  {touched.startDateTime && errors.startDateTime ? (
                    <div className="text-xs text-rose-600">{errors.startDateTime}</div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="eventEnd">
                    End Date and time
                  </label>
                  <input
                    id="eventEnd"
                    type="datetime-local"
                    className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, endDateTime: true }))}
                    required
                  />
                  {touched.endDateTime && errors.endDateTime ? (
                    <div className="text-xs text-rose-600">{errors.endDateTime}</div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-2">
                <LocationPicker
                  value={location}
                  onChange={(next) => {
                    setLocation(next);
                    setTouched((p) => ({ ...p, location: true }));
                  }}
                />
                {touched.location && errors.location ? (
                  <div className="text-xs text-rose-600">{errors.location}</div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="eventHost">
                    Host & Organizer
                  </label>
                  <input
                    id="eventHost"
                    className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={hostOrganizer}
                    onChange={(e) => setHostOrganizer(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, hostOrganizer: true }))}
                    placeholder="Company or person"
                    required
                  />
                  {touched.hostOrganizer && errors.hostOrganizer ? (
                    <div className="text-xs text-rose-600">{errors.hostOrganizer}</div>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium" htmlFor="eventSponsors">
                    Sponsors & Partners
                  </label>
                  <input
                    id="eventSponsors"
                    className="h-11 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none ring-0 transition focus:border-zinc-900/20 focus:bg-zinc-50"
                    value={sponsorsPartners}
                    onChange={(e) => setSponsorsPartners(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, sponsorsPartners: true }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {submitState.status === "error" ? (
                <div
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 shadow-sm"
                  role="status"
                >
                  {submitState.message}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-6 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    resetForm();
                    onClose();
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canSubmit}
                >
                  {submitState.status === "saving" ? "Saving…" : "Create event"}
                </button>
              </div>

              <div className="text-center text-xs text-zinc-500">
                You can edit and publish later.
              </div>
            </div>
    </form>
  );

  if (variant === "page") {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-900/10 px-5 py-4">
            <div>
              <div className="text-base font-semibold tracking-tight">Create event</div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Fill details to publish later.
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          {form}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-zinc-950/45"
        onClick={onClose}
      />

      <div className="absolute inset-0 flex items-end justify-center">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full overflow-hidden rounded-t-3xl border border-zinc-900/10 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-900/10 px-5 py-4">
            <div>
              <div className="text-base font-semibold tracking-tight">Create event</div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Fill details to publish later.
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          {form}
        </div>
      </div>
    </div>
  );
}

export type { EventDraft };
