import type { ReactNode } from "react";

const INPUT =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-brand";

function Label({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  step,
  min,
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  step?: string;
  min?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Label label={label} hint={hint}>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? undefined}
        className={INPUT}
      />
    </Label>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  rows = 4,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  rows?: number;
  hint?: string;
}) {
  return (
    <Label label={label} hint={hint}>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? undefined}
        className={`${INPUT} resize-y`}
      />
    </Label>
  );
}

export function Select({
  name,
  label,
  defaultValue,
  options,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <Label label={label} hint={hint}>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        className={`${INPUT} cursor-pointer`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

export function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2.5">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-brand"
      />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </label>
  );
}

/** Formu iki sütuna bölür — geniş ekranda sahələr yan-yana. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}

export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
