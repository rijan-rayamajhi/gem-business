"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Calendar, Clock, Image, Location, NoteText, Tag, Text, Video } from "iconsax-react";

type GoogleMapsApi = {
  maps?: {
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
      fitBounds: (bounds: unknown) => void;
    };
    Marker: new (opts: {
      position: { lat: number; lng: number };
      map: unknown;
      draggable?: boolean;
    }) => {
      setPosition: (center: { lat: number; lng: number }) => void;
      addListener: (eventName: string, handler: () => void) => unknown;
      getPosition: () => { lat: () => number; lng: () => number } | null;
    };
    Circle: new (opts: {
      map: unknown;
      center: { lat: number; lng: number };
      radius: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      fillColor?: string;
      fillOpacity?: number;
    }) => {
      setCenter: (center: { lat: number; lng: number }) => void;
      setRadius: (radius: number) => void;
      setMap: (map: unknown | null) => void;
      getBounds: () => unknown | null;
    };
    Geocoder: new () => {
      geocode: (
        req: { location: { lat: number; lng: number } },
        cb: (results: Array<{ formatted_address?: string }> | null, status: string) => void
      ) => void;
    };
    event: {
      removeListener: (listener: unknown) => void;
    };
  };
};

function useGoogleMapsScript(apiKey?: string | null) {
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!apiKey) {
      queueMicrotask(() => setStatus("error"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-gem-google-maps="true"]');

    const googleApi = (window as unknown as { google?: GoogleMapsApi }).google;
    if (googleApi?.maps) {
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
    )}`;
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

type Props = {
  title: string;
  description: string;
  launchDateTime: string;
  startDateTime: string;
  endDateTime: string;
  locationAddress: string;
  locationShow: boolean;
  locationRadiusKm: string;
  locationPlaceId?: string;
  locationLat?: number;
  locationLng?: number;
  banner: File | null;
  eventVideo: File | null;
  tags: string[];
  touched: Record<string, boolean>;
  errors: Record<string, string>;
  onTitle: (v: string) => void;
  onDescription: (v: string) => void;
  onLaunchDateTime: (v: string) => void;
  onStartDateTime: (v: string) => void;
  onEndDateTime: (v: string) => void;
  onLocationAddress: (v: string) => void;
  onLocationShow: (v: boolean) => void;
  onLocationRadiusKm: (v: string) => void;
  onLocationPlaceId: (v: string | undefined) => void;
  onLocationLat: (v: number | undefined) => void;
  onLocationLng: (v: number | undefined) => void;
  onBanner: (v: File | null) => void;
  onEventVideo: (file: File | null, error: string) => void;
  onTags: (v: string[]) => void;
  onTouched: (v: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
};

function safeTrim(value: string) {
  return value.trim();
}

export default function EventBasicsSection(props: Props) {
  const {
    title,
    description,
    launchDateTime,
    startDateTime,
    endDateTime,
    locationAddress,
    locationShow,
    locationRadiusKm,
    locationPlaceId,
    locationLat,
    locationLng,
    banner,
    eventVideo,
    tags,
    touched,
    errors,
    onTitle,
    onDescription,
    onLaunchDateTime,
    onStartDateTime,
    onEndDateTime,
    onLocationAddress,
    onLocationShow,
    onLocationRadiusKm,
    onLocationPlaceId,
    onLocationLat,
    onLocationLng,
    onBanner,
    onEventVideo,
    onTags,
    onTouched,
  } = props;

  const bannerInputId = useId();
  const videoInputId = useId();
  const [tagDraft, setTagDraft] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unavailable">("idle");
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<{
    setCenter: (center: { lat: number; lng: number }) => void;
    setZoom: (zoom: number) => void;
    fitBounds: (bounds: unknown) => void;
  } | null>(null);
  const markerRef = useRef<{
    setPosition: (center: { lat: number; lng: number }) => void;
    addListener: (eventName: string, handler: () => void) => unknown;
    getPosition: () => { lat: () => number; lng: () => number } | null;
  } | null>(null);
  const markerDragListenerRef = useRef<unknown | null>(null);
  const circleRef = useRef<{
    setCenter: (center: { lat: number; lng: number }) => void;
    setRadius: (radius: number) => void;
    setMap: (map: unknown | null) => void;
    getBounds: () => unknown | null;
  } | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const googleStatus = useGoogleMapsScript(googleMapsApiKey);

  const bannerPreview = useMemo(() => (banner ? URL.createObjectURL(banner) : ""), [banner]);
  const videoPreview = useMemo(() => (eventVideo ? URL.createObjectURL(eventVideo) : ""), [eventVideo]);

  useEffect(() => {
    return () => {
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [bannerPreview]);

  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  async function validateAndSetVideo(file: File | null) {
    if (!file) {
      onEventVideo(null, "");
      return;
    }

    if (!file.type.startsWith("video/")) {
      onEventVideo(null, "Event video must be a video.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const duration = await new Promise<number>((resolve, reject) => {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.src = objectUrl;
        const cleanup = () => {
          el.onloadedmetadata = null;
          el.onerror = null;
        };
        el.onloadedmetadata = () => {
          cleanup();
          resolve(el.duration);
        };
        el.onerror = () => {
          cleanup();
          reject(new Error("Failed to read video metadata"));
        };
      });

      if (!Number.isFinite(duration) || duration <= 0) {
        onEventVideo(null, "Unable to read video duration.");
        return;
      }

      if (duration > 10) {
        onEventVideo(null, "Video must be 10 seconds or less.");
        return;
      }

      onEventVideo(file, "");
    } catch {
      onEventVideo(null, "Unable to read video duration.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function requestCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }

    setGeoStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          setGeoStatus("unavailable");
          return;
        }
        onLocationLat(lat);
        onLocationLng(lng);
        onLocationPlaceId(undefined);
        setGeoStatus("granted");
      },
      () => {
        setGeoStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  useEffect(() => {
    if (typeof locationLat === "number" && typeof locationLng === "number") return;

    requestCurrentLocation();
  }, [locationLat, locationLng, onLocationLat, onLocationLng, onLocationPlaceId]);

  useEffect(() => {
    if (googleStatus !== "ready") return;
    if (typeof locationLat !== "number" || typeof locationLng !== "number") return;
    if (safeTrim(locationAddress)) return;

    const googleAny = (window as unknown as { google?: GoogleMapsApi }).google;
    const maps = googleAny?.maps;
    if (!maps?.Geocoder) return;

    const geocoder = new maps.Geocoder();
    geocoder.geocode({ location: { lat: locationLat, lng: locationLng } }, (results, status) => {
      if (status !== "OK" || !results || !results.length) return;
      const addr = results[0]?.formatted_address;
      if (typeof addr === "string" && addr.trim()) onLocationAddress(addr);
    });
  }, [googleStatus, locationAddress, locationLat, locationLng, onLocationAddress]);

  useEffect(() => {
    if (googleStatus !== "ready") return;

    const el = mapElRef.current;
    if (!el) return;

    const googleAny = (window as unknown as { google?: GoogleMapsApi }).google;
    const maps = googleAny?.maps;
    if (!maps?.Map || !maps?.Marker) return;

    const hasCoords = typeof locationLat === "number" && typeof locationLng === "number";
    if (!hasCoords) return;

    const center = { lat: locationLat as number, lng: locationLng as number };

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new maps.Map(el, {
        center,
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
      });
    } else {
      mapInstanceRef.current.setCenter(center);
      mapInstanceRef.current.setZoom(15);
    }

    if (!markerRef.current && mapInstanceRef.current) {
      markerRef.current = new maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        draggable: true,
      });
    } else if (markerRef.current) {
      markerRef.current.setPosition(center);
    }

    if (markerDragListenerRef.current && maps.event) {
      maps.event.removeListener(markerDragListenerRef.current);
      markerDragListenerRef.current = null;
    }

    if (markerRef.current) {
      markerDragListenerRef.current = markerRef.current.addListener("dragend", () => {
        const pos = markerRef.current?.getPosition();
        if (!pos) return;
        const lat = pos.lat();
        const lng = pos.lng();
        onLocationLat(lat);
        onLocationLng(lng);
        onLocationPlaceId(undefined);
        onTouched((p) => ({ ...p, locationAddress: true }));

        if (maps.Geocoder) {
          const geocoder = new maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status !== "OK" || !results || !results.length) return;
            const addr = results[0]?.formatted_address;
            if (typeof addr === "string" && addr.trim()) onLocationAddress(addr);
          });
        }
      });
    }

    return () => {
      if (markerDragListenerRef.current && maps.event) {
        maps.event.removeListener(markerDragListenerRef.current);
        markerDragListenerRef.current = null;
      }
    };
  }, [googleStatus, locationLat, locationLng, onLocationAddress, onLocationLat, onLocationLng, onLocationPlaceId, onTouched]);

  const radiusMeters = useMemo(() => {
    const raw = safeTrim(locationRadiusKm);
    if (!raw) return null;
    const km = Number(raw);
    if (!Number.isFinite(km) || km <= 0) return null;
    return km * 1000;
  }, [locationRadiusKm]);

  useEffect(() => {
    if (googleStatus !== "ready") return;
    const map = mapInstanceRef.current;
    if (!map) return;
    const googleAny = (window as unknown as { google?: GoogleMapsApi }).google;
    const maps = googleAny?.maps;
    if (!maps?.Circle) return;
    if (typeof locationLat !== "number" || typeof locationLng !== "number") return;

    const center = { lat: locationLat, lng: locationLng };

    if (radiusMeters === null) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      return;
    }

    if (!circleRef.current) {
      circleRef.current = new maps.Circle({
        map,
        center,
        radius: radiusMeters,
        strokeColor: "#09090b",
        strokeOpacity: 0.25,
        strokeWeight: 2,
        fillColor: "#09090b",
        fillOpacity: 0.08,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusMeters);
      circleRef.current.setMap(map);
    }

    const bounds = circleRef.current.getBounds();
    if (bounds) {
      try {
        map.fitBounds(bounds);
      } catch {
        // ignore
      }
    }
  }, [googleStatus, locationLat, locationLng, radiusMeters]);

  function addTag(raw: string) {
    const tag = safeTrim(raw).replace(/,+$/, "");
    if (!tag) return;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    if (tags.length >= 5) return;
    onTags([...tags, tag]);
    onTouched((p) => ({ ...p, tags: true }));
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="text-base font-semibold tracking-tight">Event details</div>
        <div className="mt-1 text-sm text-zinc-600">Basic information and schedule.</div>
      </div>

      <div className="grid gap-5 px-6 py-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventTitle">
            Event title
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Text size={18} variant="Linear" color="#71717a" aria-hidden="true" />
            </span>
            <input
              id="eventTitle"
              className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={title}
              onChange={(e) => onTitle(e.target.value)}
              onBlur={() => onTouched((p) => ({ ...p, title: true }))}
              placeholder="Eg: Sunday Cycling Meetup – Bangalore"
              required
            />
          </div>
          {touched.title && errors.title ? (
            <div className="text-xs text-rose-600">{errors.title}</div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={videoInputId}>
            Event video (max 10s) - optional
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
              <Video size={18} variant="Linear" color="#09090b" aria-hidden="true" />
              Upload video
              <input
                id={videoInputId}
                type="file"
                accept="video/*"
                className="absolute h-px w-px opacity-0"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onTouched((p) => ({ ...p, eventVideo: true }));
                  void validateAndSetVideo(file);
                  e.currentTarget.value = "";
                }}
                onBlur={() => onTouched((p) => ({ ...p, eventVideo: true }))}
              />
            </label>
            <div className="text-xs text-zinc-500">Optional</div>
          </div>

          {touched.eventVideo && errors.eventVideo ? (
            <div className="text-xs text-rose-600">{errors.eventVideo}</div>
          ) : null}

          {videoPreview ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
              <div className="relative aspect-[16/9] w-full bg-zinc-100">
                <video src={videoPreview} className="h-full w-full object-cover" controls playsInline />
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventDescription">
            Event description
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-2.5 text-zinc-500">
              <NoteText size={18} variant="Linear" color="#71717a" aria-hidden="true" />
            </span>
            <textarea
              id="eventDescription"
              ref={descriptionRef}
              className="min-h-[64px] w-full resize-none rounded-xl border border-zinc-900/10 bg-white px-3 py-2 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={description}
              onChange={(e) => {
                onDescription(e.target.value);
                const el = descriptionRef.current;
                if (!el) return;
                requestAnimationFrame(() => {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                });
              }}
              onBlur={() => onTouched((p) => ({ ...p, description: true }))}
              placeholder="What is this event about?"
              required
            />
          </div>
          {touched.description && errors.description ? (
            <div className="text-xs text-rose-600">{errors.description}</div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="eventLaunchDateTime">
              Launch Date Time
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                <Calendar size={18} variant="Linear" color="#71717a" aria-hidden="true" />
              </span>
              <input
                id="eventLaunchDateTime"
                type="datetime-local"
                className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                value={launchDateTime}
                onChange={(e) => onLaunchDateTime(e.target.value)}
                onBlur={() => onTouched((p) => ({ ...p, launchDateTime: true }))}
                required
              />
            </div>
            {touched.launchDateTime && errors.launchDateTime ? (
              <div className="text-xs text-rose-600">{errors.launchDateTime}</div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="eventStartDateTime">
              Start Date Time
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
                <Clock size={18} variant="Linear" color="#71717a" aria-hidden="true" />
              </span>
              <input
                id="eventStartDateTime"
                type="datetime-local"
                className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                value={startDateTime}
                onChange={(e) => onStartDateTime(e.target.value)}
                onBlur={() => onTouched((p) => ({ ...p, startDateTime: true }))}
                required
              />
            </div>
            {touched.startDateTime && errors.startDateTime ? (
              <div className="text-xs text-rose-600">{errors.startDateTime}</div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventEndDateTime">
            End Date Time
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Clock size={18} variant="Linear" color="#71717a" aria-hidden="true" />
            </span>
            <input
              id="eventEndDateTime"
              type="datetime-local"
              className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={endDateTime}
              onChange={(e) => onEndDateTime(e.target.value)}
              onBlur={() => onTouched((p) => ({ ...p, endDateTime: true }))}
              required
            />
          </div>
          {touched.endDateTime && errors.endDateTime ? (
            <div className="text-xs text-rose-600">{errors.endDateTime}</div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventLocation">
            Event location
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">
              <Location size={18} variant="Linear" color="#71717a" aria-hidden="true" />
            </span>
            <input
              id="eventLocation"
              className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 pl-10 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
              value={locationAddress}
              readOnly
              onBlur={() => onTouched((p) => ({ ...p, locationAddress: true }))}
              placeholder="Fetching current location…"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={requestCurrentLocation}
              disabled={geoStatus === "requesting"}
            >
              {geoStatus === "requesting" ? "Getting location…" : "Use current location"}
            </button>

            {geoStatus === "denied" ? (
              <div className="text-xs text-rose-600">Location permission denied. Allow it in browser settings and try again.</div>
            ) : geoStatus === "unavailable" ? (
              <div className="text-xs text-rose-600">Location is unavailable on this device/browser.</div>
            ) : null}
          </div>

          {touched.locationAddress && errors.locationAddress ? (
            <div className="text-xs text-rose-600">{errors.locationAddress}</div>
          ) : null}

          {googleStatus === "error" ? (
            <div className="text-xs text-rose-600">
              Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map picker.
            </div>
          ) : null}

          {googleStatus === "loading" ? (
            <div className="text-xs text-zinc-500">Loading map…</div>
          ) : null}

          {googleStatus === "ready" ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
              <div ref={mapElRef} className="h-[240px] w-full bg-zinc-100" />
              <div className="border-t border-zinc-900/10 px-3 py-2 text-xs text-zinc-600">
                We pinned your current location. Drag the pin to change.
                {typeof locationLat === "number" && typeof locationLng === "number" ? (
                  <span className="ml-2 text-zinc-500">
                    ({locationLat.toFixed(6)}, {locationLng.toFixed(6)})
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="eventLocationRadius">
                Radius (km)
              </label>
              <input
                id="eventLocationRadius"
                inputMode="decimal"
                className="h-10 w-full rounded-xl border border-zinc-900/10 bg-white px-3 text-sm shadow-sm outline-none transition focus:border-zinc-900/20 focus:bg-zinc-50"
                value={locationRadiusKm}
                onChange={(e) => onLocationRadiusKm(e.target.value)}
                onBlur={() => onTouched((p) => ({ ...p, locationRadiusKm: true }))}
                placeholder="Required"
                required
              />
              {touched.locationRadiusKm && errors.locationRadiusKm ? (
                <div className="text-xs text-rose-600">{errors.locationRadiusKm}</div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-900/10 bg-white px-3 py-2 shadow-sm">
            <div className="min-w-0">
              <div className="text-sm font-medium">Show/Hide</div>
              <div className="mt-0.5 text-xs font-medium text-zinc-500">
                Controls whether this event location & radius is visible to users.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={locationShow}
              className={
                "relative inline-flex h-7 w-12 items-center rounded-full border transition " +
                (locationShow
                  ? "border-zinc-950 bg-zinc-950"
                  : "border-zinc-900/10 bg-zinc-200")
              }
              onClick={() => onLocationShow(!locationShow)}
            >
              <span
                className={
                  "inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition " +
                  (locationShow ? "translate-x-5" : "translate-x-1")
                }
              />
            </button>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={bannerInputId}>
            Event banner
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50">
              <Image size={18} variant="Linear" color="#09090b" aria-hidden="true" />
              Upload banner
              <input
                id={bannerInputId}
                type="file"
                accept="image/*"
                className="absolute h-px w-px opacity-0"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  onBanner(file);
                  onTouched((p) => ({ ...p, banner: true }));
                }}
                onBlur={() => onTouched((p) => ({ ...p, banner: true }))}
                required
              />
            </label>
            <div className="text-xs text-zinc-500">Recommended: 1600×900</div>
          </div>

          {touched.banner && errors.banner ? (
            <div className="text-xs text-rose-600">{errors.banner}</div>
          ) : null}

          {bannerPreview ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-900/10 bg-white shadow-sm">
              <div className="relative aspect-[16/9] w-full bg-zinc-100">
                <img src={bannerPreview} alt="Banner" className="h-full w-full object-cover" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="eventTags">
            Event tags (max 5)
          </label>
          <div className="rounded-xl border border-zinc-900/10 bg-white px-3 py-2 shadow-sm transition focus-within:border-zinc-900/20 focus-within:bg-zinc-50">
            <div className="flex flex-wrap gap-2">
              <span className="pointer-events-none flex items-center py-1 text-zinc-500">
                <Tag size={18} variant="Linear" color="#71717a" aria-hidden="true" />
              </span>
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-900/10 bg-white px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
                  onClick={() => {
                    onTags(tags.filter((t) => t !== tag));
                    onTouched((p) => ({ ...p, tags: true }));
                  }}
                  title="Remove"
                >
                  <span className="max-w-[220px] truncate">{tag}</span>
                  <span className="text-zinc-500">×</span>
                </button>
              ))}

              <input
                id="eventTags"
                className="min-w-[140px] flex-1 bg-transparent py-1 text-sm outline-none"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                placeholder={tags.length ? "Add another" : "Add at least 1"}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag(tagDraft);
                    setTagDraft("");
                  }
                  if (e.key === "Backspace" && !tagDraft && tags.length) {
                    onTags(tags.slice(0, -1));
                    onTouched((p) => ({ ...p, tags: true }));
                  }
                }}
                onBlur={() => {
                  if (tagDraft) {
                    addTag(tagDraft);
                    setTagDraft("");
                  }
                }}
                disabled={tags.length >= 5}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-zinc-500">{tags.length}/5</div>
            {touched.tags && errors.tags ? (
              <div className="text-xs text-rose-600">{errors.tags}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
