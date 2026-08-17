"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DateRange {
  startDate: string
  endDate: string
}

interface DateRangePickerProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const PRESETS = [
  { label: "Este mes", value: "current-month" },
  { label: "Mes anterior", value: "last-month" },
  { label: "Ultimos 3 meses", value: "last-3-months" },
  { label: "Ultimos 6 meses", value: "last-6-months" },
  { label: "Este ano", value: "current-year" },
  { label: "Personalizado", value: "custom" },
]

function getPresetRange(preset: string): DateRange {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (preset) {
    case "current-month":
      return {
        startDate: new Date(year, month, 1).toISOString().split("T")[0],
        endDate: new Date(year, month + 1, 0).toISOString().split("T")[0],
      }
    case "last-month":
      return {
        startDate: new Date(year, month - 1, 1).toISOString().split("T")[0],
        endDate: new Date(year, month, 0).toISOString().split("T")[0],
      }
    case "last-3-months":
      return {
        startDate: new Date(year, month - 2, 1).toISOString().split("T")[0],
        endDate: new Date(year, month + 1, 0).toISOString().split("T")[0],
      }
    case "last-6-months":
      return {
        startDate: new Date(year, month - 5, 1).toISOString().split("T")[0],
        endDate: new Date(year, month + 1, 0).toISOString().split("T")[0],
      }
    case "current-year":
      return {
        startDate: new Date(year, 0, 1).toISOString().split("T")[0],
        endDate: new Date(year, 11, 31).toISOString().split("T")[0],
      }
    default:
      return {
        startDate: new Date(year, month, 1).toISOString().split("T")[0],
        endDate: new Date(year, month + 1, 0).toISOString().split("T")[0],
      }
  }
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState("current-month")

  function handlePresetChange(newPreset: string) {
    setPreset(newPreset)
    if (newPreset !== "custom") {
      onChange(getPresetRange(newPreset))
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Periodo</Label>
        <Select value={preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preset === "custom" && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Desde</Label>
            <Input
              type="date"
              value={value.startDate}
              onChange={(e) =>
                onChange({ ...value, startDate: e.target.value })
              }
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              type="date"
              value={value.endDate}
              onChange={(e) =>
                onChange({ ...value, endDate: e.target.value })
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
