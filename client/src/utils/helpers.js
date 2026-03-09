import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { STATUS_COLORS, PRIORITY_COLORS, CATEGORY_ICONS } from './constants'

export const formatDate = (date, fmt = 'MMM d, yyyy') => {
  if (!date) return 'N/A'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, fmt)
  } catch { return 'Invalid date' }
}

export const formatRelativeTime = (date) => {
  if (!date) return ''
  try {
    return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, { addSuffix: true })
  } catch { return '' }
}

export const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.Submitted
export const getPriorityColor = (priority) => PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium
export const getCategoryIcon = (category) => CATEGORY_ICONS[category] || CATEGORY_ICONS.Other

export const getConfidenceColor = (confidence) => {
  const val = confidence * 100
  if (val >= 80) return { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', bar: 'bg-violet-500' }
  if (val >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500' }
  return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', bar: 'bg-red-400' }
}

export const generateComplaintId = () => {
  const year = new Date().getFullYear()
  const num = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')
  return `CMP-${year}-${num}`
}

export const truncateText = (text, maxLen = 80) => {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

export const getWorkloadLevel = (count) => {
  if (count <= 2) return { label: 'Normal', color: 'bg-green-500', textColor: 'text-green-700' }
  if (count <= 5) return { label: 'Busy', color: 'bg-yellow-500', textColor: 'text-yellow-700' }
  return { label: 'Overloaded', color: 'bg-red-500', textColor: 'text-red-700' }
}

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
