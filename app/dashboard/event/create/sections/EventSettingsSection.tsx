"use client";

type Props = {
  unlockQrAtVenue: boolean;
  groupsEnabled: boolean;
  vehicleVerified: boolean;
  onUnlockQrAtVenue: (v: boolean) => void;
  onGroupsEnabled: (v: boolean) => void;
  onVehicleVerified: (v: boolean) => void;
};

function ToggleRow(props: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { label, hint, value, onChange } = props;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-900">{label}</div>
        <div className="mt-0.5 text-xs font-medium text-zinc-500">{hint}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={
          "relative inline-flex h-7 w-12 items-center rounded-full border transition " +
          (value
            ? "border-zinc-950 bg-zinc-950"
            : "border-zinc-900/10 bg-zinc-200")
        }
        onClick={() => onChange(!value)}
      >
        <span
          className={
            "inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition " +
            (value ? "translate-x-5" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}

export default function EventSettingsSection(props: Props) {
  const {
    unlockQrAtVenue,
    groupsEnabled,
    vehicleVerified,
    onUnlockQrAtVenue,
    onGroupsEnabled,
    onVehicleVerified,
  } = props;

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-900/10 bg-white shadow-sm">
      <div className="border-b border-zinc-900/10 px-6 py-5">
        <div className="text-base font-semibold tracking-tight">Event Settings</div>
        <div className="mt-1 text-sm text-zinc-600">Control access and verification options.</div>
      </div>

      <div className="grid gap-4 px-6 py-6">
        <ToggleRow
          label="UnLock QR code at Venue"
          hint="User can only see QR code in venue"
          value={unlockQrAtVenue}
          onChange={onUnlockQrAtVenue}
        />
        <ToggleRow
          label="Groups"
          hint="Allows user to select groups"
          value={groupsEnabled}
          onChange={onGroupsEnabled}
        />
        <ToggleRow
          label="Vehicle Verified"
          hint="Only verified vehicle user registration"
          value={vehicleVerified}
          onChange={onVehicleVerified}
        />
      </div>
    </div>
  );
}
