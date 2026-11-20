"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { MONTH_NAMES, daysInMonth, type DateErrors, type DraftDate } from "@/lib/purchase";
import { cn } from "@/lib/utils";

interface PurchaseDateFieldsProps {
  idPrefix: string;
  value: DraftDate;
  onChange: (next: DraftDate) => void;
  errors?: DateErrors;
  /** Legend content, e.g. the ticker and company name. */
  legend: React.ReactNode;
  className?: string;
}

const control =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-base sm:text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/** Month (required) · Day (optional) · Year (required) · Amount invested (optional) for one stock purchase. */
export function PurchaseDateFields({ idPrefix, value, onChange, errors = {}, legend, className }: PurchaseDateFieldsProps) {
  // Changing month/year clears a day that no longer exists (e.g. 31 -> February).
  const update = (next: DraftDate) => {
    if (next.day && next.month && Number(next.day) > daysInMonth(Number(next.year) || 2000, Number(next.month))) {
      next = { ...next, day: "" };
    }
    onChange(next);
  };
  const set = (k: keyof DraftDate) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    update({ ...value, [k]: e.target.value });
  const maxDay = value.month ? daysInMonth(Number(value.year) || 2000, Number(value.month)) : 31;
  const err = (k: keyof DateErrors) => (errors[k] ? `${idPrefix}-${k}-error` : undefined);

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="mb-3 w-full text-sm font-medium">{legend}</legend>
      <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1.05fr)] gap-2">
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-month`} className="text-xs text-muted-foreground">
            Month
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-month`}
              value={value.month}
              onChange={set("month")}
              aria-invalid={!!errors.month || undefined}
              aria-describedby={err("month")}
              className={cn(control, "appearance-none pr-8", !value.month && "text-muted-foreground", errors.month && "border-destructive")}
            >
              <option value="">Month</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-day`} className="text-xs text-muted-foreground">
            Day <span aria-hidden="true">(opt.)</span>
            <span className="sr-only"> (optional)</span>
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-day`}
              value={value.day}
              onChange={set("day")}
              aria-invalid={!!errors.day || undefined}
              aria-describedby={err("day")}
              className={cn(control, "appearance-none pr-8", !value.day && "text-muted-foreground", errors.day && "border-destructive")}
            >
              <option value="">—</option>
              {Array.from({ length: maxDay }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-year`} className="text-xs text-muted-foreground">
            Year
          </label>
          <input
            id={`${idPrefix}-year`}
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            placeholder="YYYY"
            value={value.year}
            onChange={(e) => update({ ...value, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            aria-invalid={!!errors.year || undefined}
            aria-describedby={err("year")}
            className={cn(control, "font-mono tabular-nums placeholder:font-sans placeholder:text-muted-foreground", errors.year && "border-destructive")}
          />
        </div>
      </div>
      {(errors.month || errors.day || errors.year) && (
        <div className="mt-1.5 space-y-0.5 text-xs text-destructive">
          {errors.month && <p id={`${idPrefix}-month-error`}>{errors.month}</p>}
          {errors.day && <p id={`${idPrefix}-day-error`}>{errors.day}</p>}
          {errors.year && <p id={`${idPrefix}-year-error`}>{errors.year}</p>}
        </div>
      )}
      <div className="mt-3 space-y-1.5">
        <label htmlFor={`${idPrefix}-amount`} className="text-xs text-muted-foreground">
          Amount invested <span aria-hidden="true">(opt.)</span>
          <span className="sr-only"> (optional, in US dollars)</span>
        </label>
        <div className="relative max-w-[220px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
            $
          </span>
          <input
            id={`${idPrefix}-amount`}
            inputMode="decimal"
            autoComplete="off"
            placeholder="e.g. 2,500"
            value={value.amount}
            onChange={(e) => update({ ...value, amount: e.target.value.replace(/[^\d.,]/g, "").slice(0, 16) })}
            aria-invalid={!!errors.amount || undefined}
            aria-describedby={errors.amount ? `${idPrefix}-amount-error` : `${idPrefix}-amount-hint`}
            className={cn(control, "pl-7 font-mono tabular-nums placeholder:font-sans placeholder:text-muted-foreground", errors.amount && "border-destructive")}
          />
        </div>
        {errors.amount ? (
          <p id={`${idPrefix}-amount-error`} className="text-xs text-destructive">
            {errors.amount}
          </p>
        ) : (
          <p id={`${idPrefix}-amount-hint`} className="text-xs text-muted-foreground">
            Lets us show your gain in dollars, not just %.
          </p>
        )}
      </div>
    </fieldset>
  );
}
