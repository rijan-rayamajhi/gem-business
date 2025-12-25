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
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { label, value, onChange } = props;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-900/10 bg-zinc-50 p-4">
      <div className="text-sm font-semibold text-zinc-900">{label}</div>
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-900/10 bg-white px-4 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50"
        onClick={() => onChange(!value)}
      >
        {value ? "True" : "False"}
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
        <ToggleRow label="UnLock QR code at Venue" value={unlockQrAtVenue} onChange={onUnlockQrAtVenue} />
        <ToggleRow label="Groups" value={groupsEnabled} onChange={onGroupsEnabled} />
        <ToggleRow label="Vehicle Verified" value={vehicleVerified} onChange={onVehicleVerified} />
      </div>
    </div>
  );
}
