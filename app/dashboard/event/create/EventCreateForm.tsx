"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import EventBasicsSection from "./sections/EventBasicsSection";
import EventContentSection from "./sections/EventContentSection";
import EventOrganiserSection from "./sections/EventOrganiserSection";
import EventMediaPartiesSection from "./sections/EventMediaPartiesSection";
import EventSettingsSection from "./sections/EventSettingsSection";
import EventTicketsSection from "./sections/EventTicketsSection";

export type TicketDraft = {
  title: string;
  description: string;
  price: string;
  discountPercent: string;
  quantity: string;
  couponCode: string;
};

export type PartyDraft = {
  name: string;
  logo: File | null;
};

export type HostDraft = {
  name: string;
  image: File | null;
  show: boolean;
  url: string;
};

export type FaqDraft = {
  question: string;
  answer: string;
};

type StepKey = "details" | "content" | "media" | "tickets";

function safeTrim(value: string) {
  return value.trim();
}

function parseNumberOrNull(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function EventCreateForm() {
  const router = useRouter();

  const steps = useMemo(
    () =>
      [
        { key: "details", title: "Event details", subtitle: "Basics, schedule and banner." },
        { key: "content", title: "Policies & content", subtitle: "Terms and about." },
        {
          key: "media",
          title: "Organiser, Sponsors & Gallery",
          subtitle: "Brand assets and partners.",
        },
        { key: "tickets", title: "Tickets", subtitle: "Pricing and availability." },
      ] as const,
    []
  );

  const [stepIndex, setStepIndex] = useState(0);
  const activeStep = steps[stepIndex]?.key ?? "details";
  const activeStepMeta = steps[stepIndex] ?? steps[0];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [launchDateTime, setLaunchDateTime] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationShow, setLocationShow] = useState(true);
  const [locationRadiusKm, setLocationRadiusKm] = useState("");
  const [locationPlaceId, setLocationPlaceId] = useState<string | undefined>(undefined);
  const [locationLat, setLocationLat] = useState<number | undefined>(undefined);
  const [locationLng, setLocationLng] = useState<number | undefined>(undefined);

  const [banner, setBanner] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const [unlockQrAtVenue, setUnlockQrAtVenue] = useState(false);
  const [groupsEnabled, setGroupsEnabled] = useState(false);
  const [vehicleVerified, setVehicleVerified] = useState(false);

  const [termsHtml, setTermsHtml] = useState("<p></p>");
  const [aboutHtml, setAboutHtml] = useState("<p></p>");
  const [thingsToKnow, setThingsToKnow] = useState("");
  const [amenities, setAmenities] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [faqs, setFaqs] = useState<FaqDraft[]>([{ question: "", answer: "" }]);

  const [organiserName, setOrganiserName] = useState("");
  const [organiserLogo, setOrganiserLogo] = useState<File | null>(null);
  const [hosts, setHosts] = useState<HostDraft[]>([{ name: "", image: null, show: true, url: "" }]);

  const [sponsors, setSponsors] = useState<PartyDraft[]>([]);
  const [partners, setPartners] = useState<PartyDraft[]>([]);
  const [gallery, setGallery] = useState<File[]>([]);

  const [tickets, setTickets] = useState<TicketDraft[]>([
    { title: "", description: "", price: "", discountPercent: "", quantity: "", couponCode: "" },
  ]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = useMemo(() => {
    const next: Record<string, string> = {};

    if (!safeTrim(title)) next.title = "Event title is required.";
    if (!safeTrim(description)) next.description = "Event description is required.";

    if (!launchDateTime) next.launchDateTime = "Launch date & time is required.";
    if (!startDateTime) next.startDateTime = "Start date & time is required.";
    if (!endDateTime) next.endDateTime = "End date & time is required.";

    if (startDateTime && endDateTime) {
      const s = new Date(startDateTime).getTime();
      const e = new Date(endDateTime).getTime();
      if (Number.isFinite(s) && Number.isFinite(e) && e < s) {
        next.endDateTime = "End date/time must be after start date/time.";
      }
    }
    if (!safeTrim(locationAddress)) next.locationAddress = "Event location is required.";

    if (!banner) next.banner = "Event banner is required.";
    else if (!banner.type.startsWith("image/")) next.banner = "Event banner must be an image.";

    if (tags.length < 1) next.tags = "Add at least 1 tag (max 5).";

    if (!safeTrim(organiserName)) next.organiserName = "Organiser name is required.";
    if (organiserLogo && !organiserLogo.type.startsWith("image/")) {
      next.organiserLogo = "Organiser logo must be an image.";
    }

    if (gallery.some((f) => !f.type.startsWith("image/"))) {
      next.gallery = "Gallery files must be images.";
    }

    for (let i = 0; i < sponsors.length; i++) {
      const s = sponsors[i];
      if (!safeTrim(s.name)) next[`sponsor_${i}_name`] = "Sponsor name is required.";
      if (!s.logo) next[`sponsor_${i}_logo`] = "Sponsor logo is required.";
    }

    for (let i = 0; i < partners.length; i++) {
      const p = partners[i];
      if (!safeTrim(p.name)) next[`partner_${i}_name`] = "Partner name is required.";
      if (!p.logo) next[`partner_${i}_logo`] = "Partner logo is required.";
    }

    if (tickets.length < 1) next.tickets = "Add at least 1 ticket.";

    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      if (!safeTrim(t.title)) next[`ticket_${i}_title`] = "Ticket title is required.";
      if (!safeTrim(t.description)) next[`ticket_${i}_description`] = "Ticket description is required.";
      const price = parseNumberOrNull(t.price);
      if (price === null || price < 0) next[`ticket_${i}_price`] = "Ticket price must be 0 or more.";
      const qty = parseNumberOrNull(t.quantity);
      if (qty === null || qty < 0) next[`ticket_${i}_quantity`] = "Ticket quantity must be 0 or more.";
      if (t.discountPercent) {
        const dp = parseNumberOrNull(t.discountPercent);
        if (dp === null || dp < 0 || dp > 100) next[`ticket_${i}_discountPercent`] = "Discount must be 0-100.";
      }
    }

    return next;
  }, [aboutHtml, amenities, banner, buttonText, description, endDateTime, gallery, launchDateTime, locationAddress, locationName, locationRadiusKm, organiserLogo, organiserName, partners, sponsors, startDateTime, tags.length, tickets, thingsToKnow, title, termsHtml]);

  const canSubmit = Object.keys(errors).length === 0;

  const detailsErrorKeys = useMemo(
    () => ["title", "description", "launchDateTime", "startDateTime", "endDateTime", "locationAddress", "banner", "tags"],
    []
  );

  const mediaErrorKeys = useMemo(() => {
    const keys = ["organiserName", "organiserLogo", "gallery"];
    for (let i = 0; i < sponsors.length; i++) {
      keys.push(`sponsor_${i}_name`, `sponsor_${i}_logo`);
    }
    for (let i = 0; i < partners.length; i++) {
      keys.push(`partner_${i}_name`, `partner_${i}_logo`);
    }
    return keys;
  }, [partners.length, sponsors.length]);

  const ticketsErrorKeys = useMemo(() => {
    const keys = ["tickets"];
    for (let i = 0; i < tickets.length; i++) {
      keys.push(
        `ticket_${i}_title`,
        `ticket_${i}_description`,
        `ticket_${i}_price`,
        `ticket_${i}_quantity`,
        `ticket_${i}_discountPercent`
      );
    }
    return keys;
  }, [tickets.length]);

  function hasAnyErrors(keys: string[]) {
    return keys.some((k) => Boolean(errors[k]));
  }

  function touchStep(step: StepKey) {
    setTouched((p) => {
      const next = { ...p };

      if (step === "details") {
        next.title = true;
        next.description = true;
        next.launchDateTime = true;
        next.startDateTime = true;
        next.endDateTime = true;
        next.locationAddress = true;
        next.banner = true;
        next.tags = true;
      }

      if (step === "media") {
        next.organiserName = true;
        next.organiserLogo = true;
        next.gallery = true;
        for (let i = 0; i < sponsors.length; i++) {
          next[`sponsor_${i}_name`] = true;
          next[`sponsor_${i}_logo`] = true;
        }
        for (let i = 0; i < partners.length; i++) {
          next[`partner_${i}_name`] = true;
          next[`partner_${i}_logo`] = true;
        }
      }

      if (step === "tickets") {
        next.tickets = true;
        for (let i = 0; i < tickets.length; i++) {
          next[`ticket_${i}_title`] = true;
          next[`ticket_${i}_description`] = true;
          next[`ticket_${i}_price`] = true;
          next[`ticket_${i}_quantity`] = true;
          next[`ticket_${i}_discountPercent`] = true;
        }
      }

      return next;
    });
  }

  const canGoNext = useMemo(() => {
    if (activeStep === "details") return !hasAnyErrors(detailsErrorKeys);
    if (activeStep === "content") return true;
    if (activeStep === "media") return !hasAnyErrors(mediaErrorKeys);
    if (activeStep === "tickets") return canSubmit;
    return false;
  }, [activeStep, canSubmit, detailsErrorKeys, mediaErrorKeys, ticketsErrorKeys]);

  const progressWidth = useMemo(() => {
    if (steps.length <= 1) return "0%";
    const v = Math.min(1, Math.max(0, stepIndex / (steps.length - 1)));
    return `${Math.round(v * 100)}%`;
  }, [stepIndex, steps.length]);

  async function submit(status: "draft" | "pending") {
    setTouched((p) => ({
      ...p,
      title: true,
      description: true,
      launchDateTime: true,
      startDateTime: true,
      endDateTime: true,
      locationAddress: true,
      banner: true,
      tags: true,
      organiserName: true,
      organiserLogo: true,
      gallery: true,
      tickets: true,
    }));

    // Ensure per-item field errors (sponsors/partners/tickets) are displayed when attempting to submit.
    setTouched((p) => {
      const next = { ...p };

      for (let i = 0; i < sponsors.length; i++) {
        next[`sponsor_${i}_name`] = true;
        next[`sponsor_${i}_logo`] = true;
      }
      for (let i = 0; i < partners.length; i++) {
        next[`partner_${i}_name`] = true;
        next[`partner_${i}_logo`] = true;
      }
      for (let i = 0; i < tickets.length; i++) {
        next[`ticket_${i}_title`] = true;
        next[`ticket_${i}_description`] = true;
        next[`ticket_${i}_price`] = true;
        next[`ticket_${i}_quantity`] = true;
        next[`ticket_${i}_discountPercent`] = true;
      }

      return next;
    });

    if (!canSubmit || !banner) return;

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

    try {
      const form = new FormData();
      form.set("title", safeTrim(title));
      form.set("description", safeTrim(description));
      form.set("launchDateTime", launchDateTime);
      form.set("startDateTime", startDateTime);
      form.set("endDateTime", endDateTime);
      form.set("locationAddress", safeTrim(locationAddress));
      form.set("locationName", safeTrim(locationName));
      form.set("locationShow", locationShow ? "true" : "false");
      form.set("locationRadiusKm", safeTrim(locationRadiusKm));
      if (locationPlaceId) form.set("locationPlaceId", locationPlaceId);
      if (typeof locationLat === "number") form.set("locationLat", String(locationLat));
      if (typeof locationLng === "number") form.set("locationLng", String(locationLng));

      form.set("unlockQrAtVenue", unlockQrAtVenue ? "true" : "false");
      form.set("groupsEnabled", groupsEnabled ? "true" : "false");
      form.set("vehicleVerified", vehicleVerified ? "true" : "false");
      form.set("tags", JSON.stringify(tags));
      form.set("termsHtml", termsHtml);
      form.set("aboutHtml", aboutHtml);
      form.set("thingsToKnow", thingsToKnow);
      form.set("amenities", amenities);
      form.set("buttonText", buttonText);
      form.set(
        "faqs",
        JSON.stringify(
          faqs
            .map((f) => ({ question: safeTrim(f.question), answer: safeTrim(f.answer) }))
            .filter((f) => f.question || f.answer)
        )
      );

      const normalizedHosts = hosts
        .map((h) => ({ name: safeTrim(h.name), show: Boolean(h.show), url: safeTrim(h.url), image: h.image }))
        .filter((h) => h.name || h.url || h.image);
      form.set(
        "hosts",
        JSON.stringify(
          normalizedHosts.map((h) => ({
            name: h.name,
            show: h.show,
            url: h.url,
            hasImage: Boolean(h.image),
          }))
        )
      );
      for (const h of normalizedHosts) {
        if (h.image) form.append("hostImages", h.image);
      }
      form.set("organiserName", safeTrim(organiserName));
      form.set("status", status);

      form.set("banner", banner);
      if (organiserLogo) form.set("organiserLogo", organiserLogo);

      form.set("sponsorNames", JSON.stringify(sponsors.map((s) => safeTrim(s.name))));
      for (const s of sponsors) if (s.logo) form.append("sponsorLogos", s.logo);

      form.set("partnerNames", JSON.stringify(partners.map((p) => safeTrim(p.name))));
      for (const p of partners) if (p.logo) form.append("partnerLogos", p.logo);

      for (const img of gallery) form.append("gallery", img);

      const normalizedTickets = tickets.map((t) => ({
        title: safeTrim(t.title),
        description: safeTrim(t.description),
        price: Number(t.price),
        ...(t.discountPercent ? { discountPercent: Number(t.discountPercent) } : {}),
        quantity: Number(t.quantity),
        ...(safeTrim(t.couponCode) ? { couponCode: safeTrim(t.couponCode) } : {}),
      }));
      form.set("tickets", JSON.stringify(normalizedTickets));

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = (await res.json().catch(() => null)) as
        | { ok: true; id: string; status: string; message?: string }
        | { ok: false; message?: string }
        | null;

      if (!res.ok || !data || data.ok !== true) {
        const message = data && "message" in data && typeof data.message === "string"
          ? data.message
          : "Failed to create event.";
        setSubmitError(message);
        return;
      }

      router.replace("/dashboard/event");
    } catch {
      setSubmitError("Failed to create event.");
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
              onClick={() => router.push("/dashboard/event")}
            >
              ✕
            </button>

            <div className="grid gap-1">
              <div className="text-lg font-semibold tracking-tight">Create Event</div>
              <div className="text-sm font-semibold text-zinc-900">
                Step {stepIndex + 1} of {steps.length} — {activeStepMeta.title}
              </div>
              <div className="text-sm text-zinc-600">{activeStepMeta.subtitle}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();

            if (activeStep === "details") {
              touchStep("details");
              if (!hasAnyErrors(detailsErrorKeys)) setStepIndex((p) => Math.min(p + 1, steps.length - 1));
              return;
            }

            if (activeStep === "content") {
              setStepIndex((p) => Math.min(p + 1, steps.length - 1));
              return;
            }

            if (activeStep === "media") {
              touchStep("media");
              if (!hasAnyErrors(mediaErrorKeys)) setStepIndex((p) => Math.min(p + 1, steps.length - 1));
              return;
            }

            void submit("pending");
          }}
        >
          {submitError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
              {submitError}
            </div>
          ) : null}

          {activeStep === "details" ? (
            <div className="grid gap-6">
              <EventBasicsSection
                title={title}
                description={description}
                launchDateTime={launchDateTime}
                startDateTime={startDateTime}
                endDateTime={endDateTime}
                locationAddress={locationAddress}
                locationName={locationName}
                locationShow={locationShow}
                locationRadiusKm={locationRadiusKm}
                locationPlaceId={locationPlaceId}
                locationLat={locationLat}
                locationLng={locationLng}
                banner={banner}
                tags={tags}
                touched={touched}
                errors={errors}
                onTitle={setTitle}
                onDescription={setDescription}
                onLaunchDateTime={setLaunchDateTime}
                onStartDateTime={setStartDateTime}
                onEndDateTime={setEndDateTime}
                onLocationAddress={setLocationAddress}
                onLocationName={setLocationName}
                onLocationShow={setLocationShow}
                onLocationRadiusKm={setLocationRadiusKm}
                onLocationPlaceId={setLocationPlaceId}
                onLocationLat={setLocationLat}
                onLocationLng={setLocationLng}
                onBanner={setBanner}
                onTags={setTags}
                onTouched={setTouched}
              />

              <EventSettingsSection
                unlockQrAtVenue={unlockQrAtVenue}
                groupsEnabled={groupsEnabled}
                vehicleVerified={vehicleVerified}
                onUnlockQrAtVenue={setUnlockQrAtVenue}
                onGroupsEnabled={setGroupsEnabled}
                onVehicleVerified={setVehicleVerified}
              />
            </div>
          ) : null}

          {activeStep === "content" ? (
            <EventContentSection
              termsHtml={termsHtml}
              aboutHtml={aboutHtml}
              thingsToKnow={thingsToKnow}
              amenities={amenities}
              buttonText={buttonText}
              faqs={faqs}
              onTerms={setTermsHtml}
              onAbout={setAboutHtml}
              onThingsToKnow={setThingsToKnow}
              onAmenities={setAmenities}
              onButtonText={setButtonText}
              onFaqs={setFaqs}
            />
          ) : null}

          {activeStep === "media" ? (
            <div className="grid gap-6">
              <EventOrganiserSection
                organiserName={organiserName}
                organiserLogo={organiserLogo}
                hosts={hosts}
                touched={touched}
                errors={errors}
                onName={setOrganiserName}
                onLogo={setOrganiserLogo}
                onHosts={setHosts}
                onTouched={setTouched}
              />

              <EventMediaPartiesSection
                sponsors={sponsors}
                partners={partners}
                gallery={gallery}
                touched={touched}
                errors={errors}
                onSponsors={setSponsors}
                onPartners={setPartners}
                onGallery={setGallery}
                onTouched={setTouched}
              />
            </div>
          ) : null}

          {activeStep === "tickets" ? (
            <EventTicketsSection
              tickets={tickets}
              touched={touched}
              errors={errors}
              onTickets={setTickets}
              onTouched={setTouched}
            />
          ) : null}

          <div className="mt-2 border-t border-zinc-200 pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {stepIndex > 0 ? (
                  <button
                    type="button"
                    className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 sm:w-auto"
                    onClick={() => setStepIndex((p) => Math.max(0, p - 1))}
                    disabled={isSubmitting}
                  >
                    Back
                  </button>
                ) : null}

                <button
                  type="button"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  onClick={() => void submit("draft")}
                  disabled={!canSubmit || isSubmitting}
                >
                  Save Draft
                </button>
              </div>

              <button
                type="submit"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={isSubmitting}
              >
                {activeStep === "tickets" ? (isSubmitting ? "Submitting..." : "Submit for verification") : "Next"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
