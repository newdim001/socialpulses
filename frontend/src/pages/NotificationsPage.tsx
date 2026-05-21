import { useState } from "react"
import { motion } from "framer-motion"
import {
  Bell,
  BellOff,
  CheckCheck,
  MessageCircle,
  Heart,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Megaphone,
  Clock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

interface Notification {
  id: number
  type: "like" | "comment" | "follow" | "alert" | "milestone" | "mention" | "reminder"
  title: string
  message: string
  timestamp: string
  read: boolean
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    type: "like",
    title: "New Likes",
    message: "Your latest post received 24 new likes",
    timestamp: "5 min ago",
    read: false,
  },
  {
    id: 2,
    type: "comment",
    title: "New Comment",
    message: "Alex M. commented on your Instagram post: 'Great content!'",
    timestamp: "18 min ago",
    read: false,
  },
  {
    id: 3,
    type: "follow",
    title: "New Follower",
    message: "Sarah K. started following you on Twitter",
    timestamp: "1 hour ago",
    read: false,
  },
  {
    id: 4,
    type: "milestone",
    title: "Milestone Reached",
    message: "Your Facebook page reached 5,000 followers!",
    timestamp: "3 hours ago",
    read: false,
  },
  {
    id: 5,
    type: "alert",
    title: "Engagement Drop Detected",
    message: "Engagement rate on Instagram dropped by 12% this week",
    timestamp: "5 hours ago",
    read: false,
  },
  {
    id: 6,
    type: "mention",
    title: "You Were Mentioned",
    message: "@techcrunch mentioned your account in a post",
    timestamp: "Yesterday at 3:42 PM",
    read: true,
  },
  {
    id: 7,
    type: "reminder",
    title: "Scheduled Post Published",
    message: "Your scheduled post 'Product Launch' went live on all platforms",
    timestamp: "Yesterday at 2:00 PM",
    read: true,
  },
  {
    id: 8,
    type: "like",
    title: "Engagement Summary",
    message: "Weekly summary: +340 likes, +89 comments, +12 shares across all platforms",
    timestamp: "2 days ago",
    read: true,
  },
]

const notificationIcons: Record<Notification["type"], { icon: React.ComponentType<{ className?: string }>; bgClass: string; color: string }> = {
  like: { icon: Heart, bgClass: "bg-red/10", color: "text-red" },
  comment: { icon: MessageCircle, bgClass: "bg-blue/10", color: "text-blue" },
  follow: { icon: UserPlus, bgClass: "bg-green/10", color: "text-green" },
  alert: { icon: AlertTriangle, bgClass: "bg-amber/10", color: "text-amber" },
  milestone: { icon: TrendingUp, bgClass: "bg-accent/10", color: "text-accent" },
  mention: { icon: Megaphone, bgClass: "bg-purple/10", color: "text-purple" },
  reminder: { icon: CalendarDays, bgClass: "bg-surface-3", color: "text-secondary" },
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 p-6 pb-12"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-primary tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-[10px] px-2 py-0.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            Stay updated on activity, alerts, and milestones
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            className="gap-2"
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </motion.div>

      {notifications.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-xl bg-surface-3 flex items-center justify-center mb-4">
                <BellOff className="h-8 w-8 text-muted" />
              </div>
              <p className="text-sm font-medium text-primary">All caught up!</p>
              <p className="text-xs text-muted mt-1">
                You have no notifications at this time.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted">
              Showing {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
            </p>
          </div>

          {notifications.map((notification) => {
            const iconConfig = notificationIcons[notification.type]
            const IconComponent = iconConfig.icon

            return (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors ${
                  !notification.read
                    ? "border-accent/20 bg-accent/[0.02]"
                    : "opacity-70 hover:opacity-100"
                }`}
                onClick={() => markAsRead(notification.id)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div
                    className={`h-10 w-10 rounded-lg ${iconConfig.bgClass} flex items-center justify-center shrink-0 mt-0.5`}
                  >
                    <IconComponent className={`h-5 w-5 ${iconConfig.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-primary flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-accent shrink-0" />
                        )}
                      </p>
                      <span className="text-[10px] text-muted whitespace-nowrap">
                        {notification.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
