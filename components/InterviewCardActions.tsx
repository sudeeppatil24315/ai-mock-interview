'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { deleteInterview } from '@/lib/actions/general.action'

interface InterviewCardActionsProps {
  interviewId: string
  userId: string
}

export function InterviewCardActions({ interviewId, userId }: InterviewCardActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)

    try {
      const result = await deleteInterview({ interviewId, userId })

      if (result.success) {
        toast.success('Interview deleted successfully')
        router.refresh()
      } else {
        toast.error(result.message || 'Failed to delete interview')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred while deleting the interview')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="absolute top-2 right-2 z-20 p-2 rounded-lg bg-red-500/80 hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
      title="Delete interview"
    >
      {isDeleting ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <Trash2 className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
      )}
    </button>
  )
}
