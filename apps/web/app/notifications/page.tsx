'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '@/components/layout/AppLayout'
import { Button, Card, CardContent, EmptyState } from '@/components/ui/index'
import { notificationApi } from '@/lib/api'
import { formatRelativeTime } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'
import { Bell, CheckCheck, Calendar, Coins, User, FileText, Home, MessageSquare, AlertCircle } from 'lucide-react'

const NOTIF_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
  EMAIL: { icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  WHATSAPP: { icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  IN_APP: { icon: Bell, color: 'text-gold', bg: 'bg-gold/15' },
}

const TYPE_ICONS: Record<string, any> = {
  followup: Calendar,
  payment: Coins,
  lead: User,
  booking: FileText,
  visit: Home,
  invoice: AlertCircle,
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll({ limit: 50 }),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All notifications marked as read') },
  })

  const notifications = data?.data?.data || []
  const unreadCount = data?.data?.meta?.unreadCount || 0

  const unread = notifications.filter((n: any) => !n.isRead)
  const read = notifications.filter((n: any) => n.isRead)

  const NotifItem = ({ notif }: { notif: any }) => {
    const channelInfo = NOTIF_ICONS[notif.channel] || NOTIF_ICONS.IN_APP
    const Icon = channelInfo.icon

    return (
      <div
        className={`flex items-start gap-3 p-4 border-b border-navy-border/50 last:border-0 cursor-pointer transition-colors hover:bg-navy-light/20 ${!notif.isRead ? 'bg-gold/3' : ''}`}
        onClick={() => !notif.isRead && markReadMutation.mutate(notif.id)}
      >
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${channelInfo.bg}`}>
          <Icon className={`w-4 h-4 ${channelInfo.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${notif.isRead ? 'text-slate-light' : 'text-white'}`}>{notif.title}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-slate whitespace-nowrap">{formatRelativeTime(notif.createdAt)}</span>
              {!notif.isRead && <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />}
            </div>
          </div>
          <p className="text-xs text-slate mt-0.5 leading-relaxed">{notif.message}</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      title="Notifications"
      subtitle={`${unreadCount} unread`}
      actions={
        unreadCount > 0 ? (
          <Button
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="w-3.5 h-3.5" />}
            loading={markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate()}
          >
            Mark all read
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <Card><CardContent className="py-12 text-center text-slate text-sm">Loading notifications...</CardContent></Card>
      ) : notifications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Bell className="w-10 h-10" />}
            title="No notifications"
            description="You're all caught up! Notifications will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {unread.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate uppercase tracking-wide mb-2 px-1">
                Unread ({unread.length})
              </h3>
              <Card className="divide-y divide-navy-border/50 overflow-hidden">
                {unread.map((n: any) => <NotifItem key={n.id} notif={n} />)}
              </Card>
            </div>
          )}

          {read.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-slate uppercase tracking-wide mb-2 px-1">
                Earlier
              </h3>
              <Card className="divide-y divide-navy-border/50 overflow-hidden opacity-70">
                {read.slice(0, 20).map((n: any) => <NotifItem key={n.id} notif={n} />)}
              </Card>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  )
}
