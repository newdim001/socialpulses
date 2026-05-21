import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { Users, Plus, Trash2, Unlink, Loader2 } from "lucide-react"
import { apiFetch, formatDate } from "@/lib/utils"
import { PlatformIcon, getPlatformColor } from "@/components/PlatformIcon"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"

// Types
interface Platform {
  id: number
  name: string
  display_name: string
  icon: string | null
  is_active: boolean
}

interface Account {
  id: number
  platform_id: number
  platform_name: string
  platform_display: string
  platform_icon: string | null
  platform_user_id: string
  platform_username: string | null
  display_name: string | null
  avatar_url: string | null
  is_active: boolean
  connected_at: string | null
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
}

function AccountsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyAccounts({ onConnect }: { onConnect: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="h-16 w-16 rounded-2xl bg-surface-3 flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-primary mb-1">No accounts connected</h3>
      <p className="text-sm text-muted max-w-xs mb-6">
        Connect your social media accounts to start managing your content from one place.
      </p>
      <Button onClick={onConnect}>
        <Plus className="h-4 w-4" />
        Connect Account
      </Button>
    </motion.div>
  )
}

function ConnectPlatformDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()

  const { data: platforms, isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => apiFetch<Platform[]>("/platforms"),
  })

  const connectMutation = useMutation({
    mutationFn: (platformName: string) =>
      apiFetch(`/auth/${platformName}/login`, { method: "GET" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      onOpenChange(false)
    },
  })

  const handleConnect = async (platform: Platform) => {
    try {
      const data = await apiFetch<{ url?: string; instructions?: string }>(
        `/auth/${platform.name}/login`, { method: "GET" }
      )
      if (data.url) {
        window.open(data.url, "_blank", "width=600,height=700")
        const checkInterval = setInterval(async () => {
          try {
            await queryClient.invalidateQueries({ queryKey: ["accounts"] })
            const accounts = queryClient.getQueryData<Account[]>(["accounts"])
            if (accounts?.some(a => a.platform_name === platform.name)) {
              clearInterval(checkInterval)
              onOpenChange(false)
            }
          } catch { /* continue polling */ }
        }, 2000)
        setTimeout(() => clearInterval(checkInterval), 120000)
      } else if (data.instructions) {
        alert(data.instructions)
        queryClient.invalidateQueries({ queryKey: ["accounts"] })
        onOpenChange(false)
      }
    } catch (err) {
      console.error(`Failed to connect ${platform.display_name}:`, err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent" />
            Connect Platform
          </DialogTitle>
          <DialogDescription>
            Select a platform to connect your account
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-4 max-h-[50vh] overflow-y-auto pr-1" style={{scrollbarWidth:'thin', scrollbarColor:'#3b3b5c transparent'}}>
          {platformsLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-xl border border-border p-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            ))
          ) : (
            platforms?.map((platform) => {
              const color = getPlatformColor(platform.name)
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => handleConnect(platform)}
                  disabled={connectMutation.isPending}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all duration-200 hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <PlatformIcon platform={platform.name} size={20} color={color} />
                  </div>
                  <span className="text-[10px] font-medium text-primary text-center leading-tight">
                    {platform.display_name}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {connectMutation.isPending && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary" size="sm">Cancel</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AccountCard({ account, onDisconnect }: { account: Account; onDisconnect: (id: number) => void }) {
  const color = getPlatformColor(account.platform_name)

  return (
    <motion.div variants={itemVariants}>
      <Card className="group relative overflow-hidden transition-colors hover:border-border-hover">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-lg"
                style={{ backgroundColor: `${color}15` }}
              >
                <PlatformIcon platform={account.platform_name} size={20} color={color} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-primary truncate">
                  {account.display_name || account.platform_username || "Connected"}
                </p>
                <p className="text-xs text-muted truncate">
                  {account.platform_username ? `@${account.platform_username.replace(/^@/, '')}` : account.platform_display}
                </p>
              </div>
            </div>
            <Badge variant={account.is_active ? "success" : "secondary"} className="text-[10px] shrink-0">
              {account.is_active ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>{account.platform_display}</span>
              {account.connected_at && (
                <>
                  <span className="text-border">·</span>
                  <span>Connected {formatDate(account.connected_at)}</span>
                </>
              )}
            </div>
            {account.is_active && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDisconnect(account.id)}
              >
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function AccountsPage() {
  const queryClient = useQueryClient()
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [disconnectId, setDisconnectId] = useState<number | null>(null)

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/accounts"),
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/accounts/${id}/disconnect`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      setDisconnectId(null)
    },
  })

  const connectedCount = accounts?.filter((a) => a.is_active).length ?? 0
  const totalCount = accounts?.length ?? 0

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 p-6 pb-12"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Accounts</h1>
          <p className="text-sm text-muted mt-1">
            Manage your connected social media accounts
            {!isLoading && (
              <span className="ml-1">· {connectedCount}/{totalCount} connected</span>
            )}
          </p>
        </div>
        <Button onClick={() => setConnectDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Connect Account
        </Button>
      </div>

      {isLoading ? (
        <AccountsSkeleton />
      ) : !accounts || accounts.length === 0 ? (
        <EmptyAccounts onConnect={() => setConnectDialogOpen(true)} />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} onDisconnect={(id) => setDisconnectId(id)} />
          ))}
        </motion.div>
      )}

      <ConnectPlatformDialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen} />

      <Dialog open={!!disconnectId} onOpenChange={(open) => !open && setDisconnectId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlink className="h-4 w-4 text-red" />
              Disconnect Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect this account? You can reconnect it at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDisconnectId(null)}>Cancel</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => disconnectId && disconnectMutation.mutate(disconnectId)}
              disabled={disconnectMutation.isPending}
              className="gap-2"
            >
              {disconnectMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
