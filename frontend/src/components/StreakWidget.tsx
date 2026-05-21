import { useQuery } from "@tanstack/react-query"
import { Flame, CheckCircle2, Edit3 } from "lucide-react"
import { apiFetch, cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StreakData {
  current_streak: number
  longest_streak: number
  total_posts: number
  posted_today: boolean
  streak_dates: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getWeekDates(): Date[] {
  const today = new Date()
  const day = today.getDay() // 0=Sun, 1=Mon, ...
  // Calculate Monday of current week
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const week: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    week.push(d)
  }
  return week
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// StreakWidget
// ---------------------------------------------------------------------------
export function StreakWidget() {
  const { data, isLoading } = useQuery<StreakData>({
    queryKey: ["streaks"],
    queryFn: () => apiFetch("/streaks"),
  })

  const weekDates = getWeekDates()
  const today = new Date()
  const streakSet = new Set(data?.streak_dates ?? [])

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        {/* Top row: flame + count */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-orange/10 flex items-center justify-center">
              <Flame className="h-5 w-5 text-orange" />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-6 w-12" />
              ) : (
                <p className="text-2xl font-bold text-primary">
                  {data?.current_streak ?? 0}
                </p>
              )}
              <p className="text-[10px] text-muted uppercase tracking-wider leading-tight">
                Day Streak
              </p>
            </div>
          </div>

          {/* Posted today status */}
          {!isLoading && data && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
                data.posted_today
                  ? "bg-green/10 text-green"
                  : "bg-amber/10 text-amber"
              )}
            >
              {data.posted_today ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Posted today
                </>
              ) : (
                <a
                  href="/compose"
                  className="flex items-center gap-1.5 hover:underline"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Post something!
                </a>
              )}
            </div>
          )}
        </div>

        {/* Mini calendar: current week */}
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-[10px] text-muted text-center font-medium"
              >
                {name}
              </div>
            ))}
            {weekDates.map((d) => {
              const isToday = isSameDay(d, today)
              const dateStr = toDateStr(d)
              const hasPost = streakSet.has(dateStr)
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "relative flex items-center justify-center h-7 w-full rounded-md text-xs font-medium transition-colors",
                    isToday && "ring-1 ring-accent bg-accent/5",
                    "text-secondary"
                  )}
                >
                  {d.getDate()}
                  {hasPost && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom stats row */}
        {!isLoading && data && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <div className="text-xs">
              <span className="text-primary font-semibold">{data.longest_streak}</span>
              <span className="text-muted ml-1">best</span>
            </div>
            <div className="text-xs">
              <span className="text-primary font-semibold">{data.total_posts}</span>
              <span className="text-muted ml-1">total posts</span>
            </div>
          </div>
        )}

        {/* Loading skeleton for bottom row */}
        {isLoading && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
