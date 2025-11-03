"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronDown, Eye, Star, Send } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"

export type Business = {
  id: string
  businessName: string
  businessType: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string | null
  formattedAddress: string | null
  phone: string | null
  email: string | null
  reviewStatus: string
  googleRating: number | null
  googleReviewCount: number | null
  confidenceScore: number | null
  createdAt: string
}

// Business actions cell component
function BusinessActionsCell({ business }: { business: Business }) {
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  const handleSendToTelegram = async (e: React.MouseEvent) => {
    e.preventDefault()
    setSending(true)

    try {
      const response = await fetch('/api/telegram/send-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          alertType: 'contact_ready',
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Sent to Telegram!',
          description: `Business info for "${business.businessName}" sent successfully`,
        })
      } else {
        toast({
          title: 'Failed to send',
          description: data.error || 'Could not send to Telegram',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSendToTelegram}
        disabled={sending}
      >
        <Send className={`h-4 w-4 mr-2 ${sending ? 'animate-pulse' : ''}`} />
        {sending ? 'Sending...' : 'Telegram'}
      </Button>
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/leads/${business.id}`}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Link>
      </Button>
    </div>
  )
}

export const columns: ColumnDef<Business>[] = [
  {
    accessorKey: "businessName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Business Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const business = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{row.getValue("businessName")}</span>
          {business.businessType && (
            <span className="text-xs text-gray-500">{business.businessType}</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "address",
    header: "Location",
    cell: ({ row }) => {
      const business = row.original

      // Use formattedAddress if available (from Google Maps API)
      if (business.formattedAddress) {
        return (
          <div className="text-sm max-w-[250px]">
            <div className="font-medium truncate">{business.formattedAddress}</div>
          </div>
        )
      }

      // Otherwise build address from components
      const addressParts = []
      if (business.address) addressParts.push(business.address)
      if (business.city) addressParts.push(business.city)
      if (business.state) addressParts.push(business.state)
      if (business.zipCode) addressParts.push(business.zipCode)

      return (
        <div className="text-sm max-w-[250px]">
          {business.address && (
            <div className="font-medium truncate">{business.address}</div>
          )}
          {(business.city || business.state || business.zipCode) && (
            <div className="text-muted-foreground text-xs truncate">
              {business.city}{business.city && business.state && ', '}
              {business.state} {business.zipCode}
            </div>
          )}
          {!addressParts.length && (
            <span className="text-muted-foreground italic">No address</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "googleRating",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Rating
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const rating = row.getValue("googleRating") as number | null
      const reviewCount = row.original.googleReviewCount

      if (!rating) return <span className="text-gray-400 text-sm">No rating</span>

      return (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="font-medium">{Number(rating).toFixed(1)}</span>
          {reviewCount && (
            <span className="text-xs text-gray-500">({reviewCount})</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "phone",
    header: "Contact",
    cell: ({ row }) => {
      const business = row.original
      return (
        <div className="text-sm">
          {business.phone && <div>{business.phone}</div>}
          {business.email && (
            <div className="text-gray-500 text-xs truncate max-w-[150px]">
              {business.email}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "reviewStatus",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("reviewStatus") as string

      const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
        pending_review: { label: "Pending", variant: "secondary" },
        approved: { label: "Approved", variant: "default" },
        rejected: { label: "Rejected", variant: "destructive" },
      }

      const config = statusConfig[status] || { label: status, variant: "outline" }

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: "confidenceScore",
    header: "AI Score",
    cell: ({ row }) => {
      const score = row.getValue("confidenceScore") as number | null

      if (!score) return <span className="text-gray-400 text-sm">-</span>

      const percentage = Math.round(score * 100)
      const color = percentage >= 80 ? "text-green-600" : percentage >= 60 ? "text-yellow-600" : "text-red-600"

      return <span className={`font-medium ${color}`}>{percentage}%</span>
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const business = row.original
      return <BusinessActionsCell business={business} />
    },
  },
]

interface BusinessDataTableProps {
  data: Business[]
}

export function BusinessDataTable({ data }: BusinessDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  })

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center py-3 sm:py-4 gap-3 sm:gap-4 px-4 sm:px-0">
        <Input
          placeholder="Search businesses..."
          value={(table.getColumn("businessName")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("businessName")?.setFilterValue(event.target.value)
          }
          className="w-full sm:max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto sm:ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No businesses found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 py-3 sm:py-4 px-4 sm:px-0">
        <div className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
          Showing {table.getRowModel().rows.length} of {data.length} business(es)
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="min-h-[44px]"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="min-h-[44px]"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
