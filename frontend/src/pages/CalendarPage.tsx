import { useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight, Send, Clock, CalendarDays } from "lucide-react"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CalendarPost {
  id: string
  content: string
  platform: string
  scheduled_at: string
  status: string
}

interface CalendarDay {
  date: string
  day: number
  isCurrentMonth: boolean
  isToday: boolean
  posts: CalendarPost[]
}

interface CalendarData {
  year: number
  month: number
  days: CalendarDay[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getMonthName(month: number): string {
  return new Date(2000, month - 1).toLocaleString("en-US", { month: "long" })
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay()
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// ---------------------------------------------------------------------------
// CalendarPage
// ---------------------------------------------------------------------------
export function CalendarPage() {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  const { data, isLoading } = useQuery<CalendarData>({
    queryKey: ["calendar", currentYear, currentMonth],
    queryFn: () => apiFetch<CalendarData>(`/calendar?year=${currentYear}&month=${currentMonth}`),
  })

  const days = data?.days ?? []

  // Build calendar grid helpers
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const totalDays = getDaysInMonth(currentYear, currentMonth)
  const blanks = Array.from({ length: firstDay })

  // If API returned no days (no posts), generate all days client-side
  const calendarDays: CalendarDay[] = days.length > 0 ? days : Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
    const d = new Date(currentYear, currentMonth - 1, dayNum)
    const today = new Date()
    return {
      date: dateStr,
      day: dayNum,
      isCurrentMonth: true,
      isToday: d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate(),
      posts: [],
    }
  })

  const goToPrevMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 1) { setCurrentYear((y) => y - 1); return 12 }
      return m - 1
    })
    setSelectedDay(null)
  }, [])

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((m) => {
      if (m === 12) { setCurrentYear((y) => y + 1); return 1 }
      return m + 1
    })
    setSelectedDay(null)
  }, [])

  const goToToday = useCallback(() => {
    const d = new Date()
    setCurrentYear(d.getFullYear())
    setCurrentMonth(d.getMonth() + 1)
    setSelectedDay(null)
  }, [])

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6 pb-12"
    >
      {/* ── Month Navigation ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-primary tracking-tight min-w-[180px] text-center">
            {getMonthName(currentMonth)} {currentYear}
          </h1>
          <Button variant="ghost" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <Button variant="secondary" size="sm" onClick={goToToday}>
          Today
        </Button>
      </motion.div>

      {/* ── Calendar Grid ── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {dayLabels.map((label) => (
                <div
                  key={label}
                  className="text-center text-xs font-medium text-muted uppercase tracking-wider py-2"
                >
                  {label}
                </div>
              ))}
            </div>

            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Leading blank cells */}
                {blanks.map((_, i) => (
                  <div key={`blank-${i}`} className="aspect-square w-full" />
                ))}

                {/* Day cells */}
                {calendarDays.map((day) => {
                  const isSelected =
                    selectedDay?.date === day.date
                  const hasPosts = day.posts.length > 0

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDay(isSelected ? null : day)}
                      className={cn(
                        "relative flex flex-col items-center justify-center aspect-square w-full rounded-lg text-sm transition-all duration-200",
                        day.isCurrentMonth
                          ? "text-primary"
                          : "text-muted/40",
                        isSelected && "ring-2 ring-accent bg-accent/10",
                        !isSelected && day.isToday && "ring-2 ring-accent/50",
                        !isSelected && !day.isToday && day.isCurrentMonth && "hover:bg-surface-3",
                        hasPosts && !isSelected && "bg-surface-2"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          day.isToday && "text-accent"
                        )}
                      >
                        {day.day}
                      </span>
                      {hasPosts && (
                        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-blue" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Empty Month ── */}
      {!isLoading && calendarDays.every(d => d.posts.length === 0) && !selectedDay && (
        <motion.div variants={itemVariants}>
          <EmptyState
            icon={<CalendarDays className="h-8 w-8 text-muted" />}
            title="No posts this month"
            description="Schedule your first post to see it on the calendar. Click below to start creating."
            action={
              <Button onClick={() => window.location.href = "/compose"} className="gap-2">
                <Send className="h-4 w-4" />
                Create your first post
              </Button>
            }
          />
        </motion.div>
      )}

      {/* ── Selected Day Posts Sidebar ── */}
      {selectedDay && (
        <motion.div
          variants={itemVariants}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Posts for {getMonthName(currentMonth)} {selectedDay.day}, {currentYear}
                <Badge variant="secondary" className="ml-2 text-[10px]">
                  {selectedDay.posts.length} post{selectedDay.posts.length !== 1 ? "s" : ""}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDay.posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Send className="h-6 w-6 text-muted mb-2" />
                  <p className="text-sm text-muted">No posts scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDay.posts.map((post) => (
                    <Card key={post.id} className="bg-surface-2 border-border/50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-secondary capitalize">{post.platform}</span>
                          <Badge
                            variant={
                              post.status === "scheduled"
                                ? "info"
                                : post.status === "published"
                                  ? "success"
                                  : post.status === "failed"
                                    ? "danger"
                                    : "warning"
                            }
                            className="ml-auto text-[10px]"
                          >
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-primary leading-relaxed">{post.content}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted">
                          <Clock className="h-3 w-3" />
                          {new Date(post.scheduled_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}
