"use client"

import { Button } from "@/components/ui/button"

interface PaginacionProps {
  page: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}

/** Controles de paginacion compartidos por las tablas de finanzas. */
export function Paginacion({ page, pageSize, total, onChange }: PaginacionProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-1">
      <span className="text-xs text-gray-400">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="border-gray-600 text-gray-300 h-7 w-7 p-0"
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </Button>
        <span className="text-xs text-gray-400 px-2">
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="border-gray-600 text-gray-300 h-7 w-7 p-0"
          disabled={page === totalPages}
          onClick={() => onChange(page + 1)}
        >
          ›
        </Button>
      </div>
    </div>
  )
}
