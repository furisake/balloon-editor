'use client'

import { useState } from 'react'
import { RiDeleteBinLine } from '@remixicon/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

export function ShelfWork({
  contributor,
  title,
  workId,
}: {
  contributor: string
  title: string
  workId: string
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRemoved, setIsRemoved] = useState(false)

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `「${title}」を本棚から削除してもよろしいですか？\n保存された読書位置も削除されます。`,
    )
    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch('/api/aozora/position', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId }),
      })
      if (!response.ok) throw new Error('Failed to remove work')

      setIsRemoved(true)
      router.refresh()
    } catch {
      window.alert('本を削除できませんでした。時間をおいて再度お試しください。')
      setIsDeleting(false)
    }
  }

  if (isRemoved) return null

  return (
    <li className="relative">
      <Link
        className="bg-background grid min-h-30 content-end rounded-[0.25rem_0.5rem_0.5rem_0.25rem] border pt-10 pr-[0.8rem] pb-[0.8rem] pl-4 shadow-[0_5px_12px_oklch(0_0_0/7%)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_oklch(0_0_0/11%)]"
        href={`/reader/${workId}`}
        title={`${title}の続きを読む`}
      >
        <strong className="line-clamp-2 overflow-hidden text-[0.86rem] leading-[1.45]">
          {title}
        </strong>
        <small className="mt-[0.35rem] overflow-hidden text-[0.65rem] text-ellipsis whitespace-nowrap">
          {contributor}
        </small>
      </Link>
      <Button
        aria-label={`${title}を本棚から削除`}
        className="absolute top-2 right-2 rounded-full shadow-sm"
        disabled={isDeleting}
        onClick={handleDelete}
        size="icon-xs"
        title="本棚から削除"
        type="button"
        variant="destructive"
      >
        <RiDeleteBinLine aria-hidden="true" />
      </Button>
    </li>
  )
}
