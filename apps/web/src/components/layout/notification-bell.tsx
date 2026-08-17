"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2, X } from "lucide-react"
import { api } from "@/lib/api"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  data: string | null
  createdAt: string
}

function getNotificationUrl(notification: Notification): string | null {
  if (!notification.data) return null
  try {
    const data = JSON.parse(notification.data)
    if (notification.type === "SPLIT_INVITE" || notification.type === "SPLIT_EXPENSE" || notification.type === "SPLIT_SETTLEMENT") {
      if (data.groupId) return `/dashboard/splits/${data.groupId}`
    }
    if (notification.type.startsWith("TAG_BUDGET")) {
      if (data.tagId) return `/dashboard/events/${data.tagId}`
    }
  } catch {}
  return null
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  function loadUnreadCount() {
    api<{ count: number }>("/notifications/unread-count")
      .then((res) => setUnreadCount(res.count))
      .catch(() => {})
  }

  function loadNotifications() {
    api<{ notifications: Notification[]; total: number }>("/notifications?take=10")
      .then((res) => setNotifications(res.notifications))
      .catch(() => {})
  }

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (open) loadNotifications()
  }, [open])

  async function markAsRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" })
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      loadUnreadCount()
    } catch {}
  }

  async function markAllRead() {
    try {
      await api("/notifications/mark-all-read", { method: "PATCH", body: JSON.stringify({}) })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {}
  }

  async function deleteNotification(id: string) {
    try {
      await api(`/notifications/${id}`, { method: "DELETE" })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      loadUnreadCount()
    } catch {}
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.read) {
      await markAsRead(notification.id)
    }
    const url = getNotificationUrl(notification)
    if (url) {
      setOpen(false)
      router.push(url)
    }
  }

  function getIcon(type: string) {
    if (type.startsWith("TAG_BUDGET")) return "📊"
    if (type === "SPLIT_INVITE") return "👥"
    if (type === "SPLIT_EXPENSE") return "💰"
    if (type === "SPLIT_SETTLEMENT") return "✅"
    return "🔔"
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notificaciones"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-1rem)] sm:w-80 sm:max-w-[calc(100vw-2rem)] max-h-[70vh] sm:max-h-96 overflow-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white">Notificaciones</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Marcar todo como leido
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No tienes notificaciones</p>
                <Link
                  href="/dashboard/events"
                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                >
                  Ver eventos con presupuesto
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map((n) => {
                  const url = getNotificationUrl(n)
                  const Wrapper = url ? "button" : "div"
                  return (
                    <Wrapper
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !n.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                      } ${url ? "cursor-pointer" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg shrink-0 mt-0.5">{getIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.read ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-1">
                            {new Date(n.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(n.id) }}
                              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                              aria-label="Marcar como leido"
                            >
                              <Check className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                            aria-label="Eliminar notificacion"
                          >
                            <X className="h-4 w-4 text-gray-400" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </Wrapper>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}