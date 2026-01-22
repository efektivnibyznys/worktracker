'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Archive } from 'lucide-react'
import { useArchiveStats } from '../hooks/useYearlyEntries'
import { formatTime } from '@/lib/utils/time'
import { formatCurrency } from '@/lib/utils/currency'

interface ArchiveSectionProps {
    onYearSelect: (year: number) => void
}

export function ArchiveSection({ onYearSelect }: ArchiveSectionProps) {
    const [isOpen, setIsOpen] = useState(false)
    const { archiveStats, hasArchive, isLoading } = useArchiveStats()

    if (!hasArchive) return null

    return (
        <Card className="bg-white shadow-md">
            <CardHeader
                className="cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Archive className="h-5 w-5 text-gray-500" />
                        <CardTitle className="text-xl font-bold">Archiv</CardTitle>
                        <span className="text-sm text-gray-500">
                            ({archiveStats.length} {archiveStats.length === 1 ? 'rok' : 'let'})
                        </span>
                    </div>
                    {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-4 text-gray-500">Načítání...</div>
                    ) : (
                        <div className="space-y-3">
                            {archiveStats.map((stat) => (
                                <div
                                    key={stat.year}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div>
                                        <span className="font-semibold text-lg">{stat.year}</span>
                                        <span className="text-gray-500 ml-2">
                                            ({stat.entryCount} záznamů)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="font-medium">{formatTime(stat.totalMinutes)}</div>
                                            <div className="text-sm text-gray-500">{formatCurrency(stat.totalAmount)}</div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onYearSelect(stat.year)}
                                        >
                                            Zobrazit
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    )
}
