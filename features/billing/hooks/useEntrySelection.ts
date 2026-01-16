import { useState, useCallback, useMemo } from 'react'

/**
 * Hook for managing multi-select of entries for invoicing
 *
 * Usage:
 * ```tsx
 * const { selectedIds, toggle, isSelected, hasSelection } = useEntrySelection()
 *
 * // Toggle selection on click
 * <Checkbox checked={isSelected(entry.id)} onChange={() => toggle(entry.id)} />
 *
 * // Select all visible entries
 * <Button onClick={() => selectAll(entries.map(e => e.id))}>Vybrat vše</Button>
 *
 * // Show action bar when something is selected
 * {hasSelection && <FloatingActionBar count={selectedCount} />}
 * ```
 */
export function useEntrySelection(initialIds: string[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialIds)
  )

  /**
   * Toggle selection of a single entry
   */
  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /**
   * Select all entries (replaces current selection)
   */
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  /**
   * Add multiple entries to selection
   */
  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
  }, [])

  /**
   * Remove multiple entries from selection
   */
  const deselectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }, [])

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  /**
   * Check if an entry is selected
   */
  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  )

  /**
   * Toggle select all / deselect all
   */
  const toggleAll = useCallback((allIds: string[]) => {
    setSelectedIds(prev => {
      // If all are selected, deselect all
      const allSelected = allIds.every(id => prev.has(id))
      if (allSelected) {
        return new Set()
      }
      // Otherwise select all
      return new Set(allIds)
    })
  }, [])

  /**
   * Check if all provided IDs are selected
   */
  const areAllSelected = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return false
      return ids.every(id => selectedIds.has(id))
    },
    [selectedIds]
  )

  /**
   * Check if some (but not all) provided IDs are selected
   */
  const areSomeSelected = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return false
      const selectedCount = ids.filter(id => selectedIds.has(id)).length
      return selectedCount > 0 && selectedCount < ids.length
    },
    [selectedIds]
  )

  // Convert Set to Array for external use
  const selectedArray = useMemo(
    () => Array.from(selectedIds),
    [selectedIds]
  )

  return {
    /** Array of selected entry IDs */
    selectedIds: selectedArray,

    /** Number of selected entries */
    selectedCount: selectedIds.size,

    /** Whether any entry is selected */
    hasSelection: selectedIds.size > 0,

    /** Toggle selection of single entry */
    toggle,

    /** Select all provided IDs (replaces current selection) */
    selectAll,

    /** Add multiple IDs to current selection */
    selectMultiple,

    /** Remove multiple IDs from current selection */
    deselectMultiple,

    /** Clear all selections */
    clearSelection,

    /** Check if specific ID is selected */
    isSelected,

    /** Toggle between select all / deselect all */
    toggleAll,

    /** Check if all provided IDs are selected */
    areAllSelected,

    /** Check if some (but not all) provided IDs are selected */
    areSomeSelected
  }
}
