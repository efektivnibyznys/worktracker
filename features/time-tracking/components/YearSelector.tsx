'use client'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useAvailableYears } from '../hooks/useYearlyEntries'

interface YearSelectorProps {
    value: number
    onChange: (year: number) => void
}

export function YearSelector({ value, onChange }: YearSelectorProps) {
    const { years, isLoading } = useAvailableYears()
    const currentYear = new Date().getFullYear()

    return (
        <Select
            value={value.toString()}
            onValueChange={(v) => onChange(parseInt(v))}
            disabled={isLoading}
        >
            <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rok" />
            </SelectTrigger>
            <SelectContent>
                {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                        {year} {year === currentYear && '(aktuální)'}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
