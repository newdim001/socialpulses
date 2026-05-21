import { useState } from "react"
import { useTheme } from "@/theme"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  User,
  Key,
  Sun,
  Moon,
  Monitor,
  Globe,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  Check,
  CheckCircle2,
  XCircle,
  CreditCard,
  Lock,
  Sparkles,
  ExternalLink,
  Copy,
} from "lucide-react"
import { toast } from "sonner"
import { apiFetch, cn } from "@/lib/utils"
import { PlatformIcon, getPlatformColor } from "@/components/PlatformIcon"
import { useAuth } from "@/auth/AuthProvider"
import { useSubscription } from "@/auth/SubscriptionProvider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Platform {
  id: number
  name: string
  display_name: string
  icon: string | null
  is_active: boolean
}

interface PlatformCredentialStatus {
  client_id_set: boolean
  client_secret_set: boolean
}

type PlatformCredentialsMap = Record<string, PlatformCredentialStatus>

interface ApiKey {
  id: number
  name: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  is_active: boolean
}

// ---------------------------------------------------------------------------
// Platform credential dialog
// ---------------------------------------------------------------------------

function AddPlatformDialog({ open, onOpenChange, existing, platforms }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existing: PlatformCredentialsMap
  platforms: Platform[]
}) {
  const queryClient = useQueryClient()
  const [selectedPlatform, setSelectedPlatform] = useState("")
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: (data: Record<string, { client_id: string; client_secret: string }>) =>
      apiFetch("/settings/platform-credentials", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "platform-credentials"] })
      reset()
      onOpenChange(false)
    },
    onError: (err: Error) => setError(err.message),
  })

  function reset() {
    setSelectedPlatform("")
    setClientId("")
    setClientSecret("")
    setShowSecret(false)
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!selectedPlatform) { setError("Please select a platform"); return }
    if (!clientId && !clientSecret) { setError("Enter at least Client ID or Client Secret"); return }
    mutation.mutate({ [selectedPlatform]: { client_id: clientId, client_secret: clientSecret } })
  }

  const availablePlatforms = (platforms || []).filter((p) => p.name !== "telegram")
  const selected = (platforms || []).find((p) => p.name === selectedPlatform)
  const platformColor = selected ? getPlatformColor(selected.name) : "#6b7280"

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent" />
            Add Platform Credentials
          </DialogTitle>
          <DialogDescription>Enter your API Client ID and Secret for this platform</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger><SelectValue placeholder="Select a platform" /></SelectTrigger>
              <SelectContent>
                {availablePlatforms.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={p.name} size={14} color={getPlatformColor(p.name)} />
                      <span>{p.display_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPlatform && (
            <>
              <div className="rounded-lg border border-border bg-surface-2 p-3 flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: platformColor + "15" }}>
                  <PlatformIcon platform={selectedPlatform} size={16} color={platformColor} />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">{selected?.display_name}</p>
                  {existing[selectedPlatform] && (
                    <p className="text-xs text-muted">{existing[selectedPlatform].client_id_set ? "Client ID set" : "No credentials"}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input id="client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Enter Client ID / API Key" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <div className="relative">
                  <Input id="client-secret" type={showSecret ? "text" : "password"} value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Enter Client Secret" className="pr-10" />
                  <button type="button" onClick={() => setShowSecret((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}
          {error && (
            <div className="rounded-lg border border-red/20 bg-red/10 p-3 text-xs text-red flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
            </div>
          )}
          {mutation.isPending && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving credentials...</div>
          )}
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="secondary" size="sm" type="button">Cancel</Button></DialogClose>
            <Button type="submit" size="sm" disabled={mutation.isPending || !selectedPlatform}>
              {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Credentials
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PlatformCredentialsSection() {
  const queryClient = useQueryClient()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: credentials, isLoading: credsLoading } = useQuery<PlatformCredentialsMap>({
    queryKey: ["settings", "platform-credentials"],
    queryFn: () => apiFetch<PlatformCredentialsMap>("/settings/platform-credentials"),
  })

  const { data: platforms, isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: () => apiFetch<Platform[]>("/platforms"),
  })

  const deleteMutation = useMutation({
    mutationFn: (platform: string) => apiFetch(`/settings/platform-credentials/${platform}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "platform-credentials"] })
      setDeleteConfirm(null)
    },
  })

  const isLoading = credsLoading || platformsLoading
  const creds = credentials ? Object.entries(credentials) : []
  const configuredPlatforms = creds.filter(([, v]) => v.client_id_set || v.client_secret_set)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Globe className="h-4 w-4 text-accent" /> Platform Credentials</CardTitle>
              <CardDescription>Configure OAuth API keys for each social platform</CardDescription>
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Platform
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-3 w-24 rounded" /><Skeleton className="h-3 w-16 rounded" /></div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : configuredPlatforms.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-surface-3 flex items-center justify-center mb-3"><Globe className="h-6 w-6 text-muted" /></div>
              <p className="text-sm text-muted mb-1 font-medium">No platform credentials configured</p>
              <p className="text-xs text-muted/70 mb-4 max-w-sm">Add your OAuth API Client ID and Secret for each social platform.</p>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> Add Platform
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {configuredPlatforms.map(([platform, status]) => {
                const pinfo = platforms?.find((p) => p.name === platform)
                const color = getPlatformColor(platform)
                const bothSet = status.client_id_set && status.client_secret_set
                return (
                  <div key={platform} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/50 p-3 transition-colors hover:border-border-hover">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: color + "15" }}>
                      <PlatformIcon platform={platform} size={16} color={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">{pinfo?.display_name ?? platform}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[10px]">
                          {status.client_id_set ? <span className="text-green flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" />ID</span> : <span className="text-muted flex items-center gap-0.5"><XCircle className="h-2.5 w-2.5" />ID</span>}
                        </span>
                        <span className="text-border">·</span>
                        <span className="flex items-center gap-1 text-[10px]">
                          {status.client_secret_set ? <span className="text-green flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" />Secret</span> : <span className="text-muted flex items-center gap-0.5"><XCircle className="h-2.5 w-2.5" />Secret</span>}
                        </span>
                      </div>
                    </div>
                    <Badge variant={bothSet ? "success" : "secondary"} className="text-[10px] shrink-0">{bothSet ? "Configured" : "Partial"}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-accent" onClick={() => setAddDialogOpen(true)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted hover:text-red" onClick={() => setDeleteConfirm(platform)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Always allow AddPlatformDialog — uses empty defaults if API failed */}
      <AddPlatformDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} existing={credentials} platforms={platforms} />

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-red" /> Clear Credentials</DialogTitle>
            <DialogDescription>Remove OAuth credentials for this platform. It will fall back to environment variables.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending} className="gap-2">
              {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ThemeSection() {
  const { preference, setTheme } = useTheme()
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sun className="h-4 w-4 text-accent" /> Theme Settings</CardTitle>
        <CardDescription>Choose your preferred appearance</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setTheme("system")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200", preference === "system" ? "border-accent bg-accent/5" : "border-border hover:border-border-hover bg-surface-2")}>
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center"><Monitor className="h-6 w-6 text-accent" /></div>
            <span className="text-xs font-medium text-primary">System</span>
          </button>
          <button type="button" onClick={() => setTheme("light")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200", preference === "light" ? "border-accent bg-accent/5" : "border-border hover:border-border-hover bg-surface-2")}>
            <div className="h-12 w-12 rounded-xl bg-amber/10 flex items-center justify-center"><Sun className="h-6 w-6 text-amber" /></div>
            <span className="text-xs font-medium text-primary">Light</span>
          </button>
          <button type="button" onClick={() => setTheme("dark")} className={cn("flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200", preference === "dark" ? "border-accent bg-accent/5" : "border-border hover:border-border-hover bg-surface-2")}>
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center"><Moon className="h-6 w-6 text-accent" /></div>
            <span className="text-xs font-medium text-primary">Dark</span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function ApiKeysSection() {
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null)

  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["settings", "api-keys"],
    queryFn: () => apiFetch<ApiKey[]>("/api/account/api-keys"),
  })

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch<{ full_key: string; id: number }>("/api/account/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (data) => {
      setCreatedKey(data.full_key)
      setNewKeyName("")
      queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] })
      toast.success("API key created!")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: number) =>
      apiFetch(`/api/account/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "api-keys"] })
      setRevokeConfirm(null)
      toast.success("API key revoked")
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })

  function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) return
    createMutation.mutate(newKeyName.trim())
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4 text-accent" /> API Keys
              </CardTitle>
              <CardDescription>Manage API keys for programmatic access</CardDescription>
            </div>
            <Button size="sm" className="gap-2 shrink-0" onClick={() => { setCreatedKey(null); setCreateDialogOpen(true) }}>
              <Plus className="h-3.5 w-3.5" /> Generate New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-surface-3 flex items-center justify-center mb-3">
                <Key className="h-6 w-6 text-muted" />
              </div>
              <p className="text-sm text-muted mb-1 font-medium">No API keys</p>
              <p className="text-xs text-muted/70 mb-4 max-w-sm">Generate an API key to access the SocialPulses API programmatically.</p>
              <Button variant="secondary" size="sm" className="gap-2" onClick={() => { setCreatedKey(null); setCreateDialogOpen(true) }}>
                <Plus className="h-3.5 w-3.5" /> Generate New Key
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-primary">{key.name}</p>
                    <p className="text-xs text-muted font-mono">{key.key_prefix}••••••••••••••••</p>
                    <p className="text-xs text-muted mt-1">Created {new Date(key.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => setRevokeConfirm(key.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create key dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(o) => { if (!o) { setCreateDialogOpen(false); setNewKeyName(""); setCreatedKey(null) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-accent" />
              {createdKey ? "API Key Generated" : "Generate New API Key"}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? "Copy this key now — you won't be able to see it again!"
                : "Enter a name to identify this API key."}
            </DialogDescription>
          </DialogHeader>
          {createdKey ? (
            <div className="py-2">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">⚠️ Copy your API key now</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2">You won't be able to see it again!</p>
                <div className="flex gap-2">
                  <code className="flex-1 bg-white dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded px-3 py-2 text-sm font-mono break-all">{createdKey}</code>
                  <Button size="sm" onClick={() => { navigator.clipboard.writeText(createdKey); toast.success("Copied!") }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="secondary" size="sm" onClick={() => { setCreateDialogOpen(false); setCreatedKey(null); setNewKeyName("") }}>
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleCreateKey} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production CI"
                  autoFocus
                />
              </div>
              {createMutation.isError && (
                <div className="rounded-lg border border-red/20 bg-red/10 p-3 text-xs text-red flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{createMutation.error.message}
                </div>
              )}
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="secondary" size="sm" type="button">Cancel</Button>
                </DialogClose>
                <Button type="submit" size="sm" disabled={createMutation.isPending || !newKeyName.trim()}>
                  {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Generate
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeConfirm} onOpenChange={(o) => !o && setRevokeConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-red" /> Revoke API Key</DialogTitle>
            <DialogDescription>This will permanently revoke this API key. Any services using it will lose access immediately.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setRevokeConfirm(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => revokeConfirm && revokeMutation.mutate(revokeConfirm)} disabled={revokeMutation.isPending} className="gap-2">
              {revokeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProfileSection() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      setSuccess("Password changed successfully!")
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setError("")
      setTimeout(() => setSuccess(""), 3000)
    },
    onError: (err: Error) => { setError(err.message); setSuccess("") },
  })

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError(""); setSuccess("")
    if (!currentPassword || !newPassword || !confirmPassword) { setError("All fields are required"); return }
    if (newPassword.length < 8) { setError("New password must be at least 8 characters"); return }
    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return }
    changePasswordMutation.mutate({ current_password: currentPassword, new_password: newPassword })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-accent" /> Account Information</CardTitle>
          <CardDescription>Your account details and preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center text-white text-sm font-bold">
              {user?.username?.slice(0, 2).toUpperCase() ?? "SP"}
            </div>
            <div>
              <p className="text-sm font-medium text-primary">{user?.username ?? "User"}</p>
              <p className="text-xs text-muted">Administrator</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Key className="h-4 w-4 text-accent" /> Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input id="current-password" type={showCurrent ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="pr-10" />
                <button type="button" onClick={() => setShowCurrent((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input id="new-password" type={showNew ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="pr-10" />
                <button type="button" onClick={() => setShowNew((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary">
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            </div>
            {error && <div className="rounded-lg border border-red/20 bg-red/10 p-3 text-xs text-red">{error}</div>}
            {success && <div className="rounded-lg border border-green/20 bg-green/10 p-3 text-xs text-green flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5" />{success}</div>}
            <Button type="submit" disabled={changePasswordMutation.isPending} className="gap-2">
              {changePasswordMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function SubscriptionSection() {
  const { subscription, features, tierFeatures, trialDaysLeft } = useSubscription()
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState("")
  const sub = subscription?.subscription

  const handleUpgrade = () => {
    window.location.href = "/billing"
  }

  const handlePortal = async () => {
    setPortalLoading(true)
    setPortalError("")
    try {
      const res = await apiFetch<{ url: string }>("/stripe/create-portal-session", {
        method: "POST",
      })
      if (res.url) {
        window.open(res.url, "_blank")
      }
    } catch (err: any) {
      setPortalError(err.message || "Failed to open billing portal")
    } finally {
      setPortalLoading(false)
    }
  }

  // Determine status badge
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" | "secondary" }> = {
    active: { label: "Active", variant: "success" },
    trialing: { label: "Trial", variant: "success" },
    past_due: { label: "Past Due", variant: "warning" },
    canceled: { label: "Canceled", variant: "danger" },
    cancelled: { label: "Canceled", variant: "danger" },
    expired: { label: "Expired", variant: "danger" },
    incomplete: { label: "Incomplete", variant: "warning" },
    unpaid: { label: "Unpaid", variant: "danger" },
  }

  const statusInfo = sub ? statusMap[sub.status] ?? { label: sub.status, variant: "secondary" as const } : null
  const planName = sub?.plan?.name ?? sub?.tier ?? "Free"
  const planPrice = sub?.plan?.price ?? 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-accent" />
                Plan: {planName}
              </CardTitle>
              <CardDescription>Your current subscription and plan details</CardDescription>
            </div>
            {statusInfo && (
              <Badge variant={statusInfo.variant} className="text-[10px] shrink-0">
                {statusInfo.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Price */}
          {planPrice > 0 && (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-primary">${planPrice}</span>
              <span className="text-sm text-muted">/month</span>
            </div>
          )}

          {/* Trial remaining */}
          {trialDaysLeft > 0 && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent shrink-0" />
              <p className="text-sm text-secondary">
                Free trial: <span className="font-semibold text-accent">{trialDaysLeft}</span> days remaining
              </p>
            </div>
          )}

          {/* Current period end */}
          {sub?.current_period_end && (
            <p className="text-xs text-muted">
              Current period ends: {new Date(sub.current_period_end).toLocaleDateString()}
            </p>
          )}

          {/* Canceled date */}
          {sub?.canceled_at && (
            <p className="text-xs text-muted">
              Canceled: {new Date(sub.canceled_at).toLocaleDateString()}
            </p>
          )}

          <Separator />

          {/* Features list */}
          <div>
            <h4 className="text-sm font-medium text-primary mb-3">Plan Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <FeatureItem label="AI Content Generator" enabled={!!tierFeatures.ai_content_generator} />
              <FeatureItem label="Social Listening" enabled={tierFeatures.social_listening} />
              <FeatureItem label="Campaigns" enabled={tierFeatures.campaigns} />
              <FeatureItem label="Team Collaboration" enabled={tierFeatures.team_collaboration} />
              <FeatureItem label="Auto-Reply" enabled={tierFeatures.auto_reply} />
              <FeatureItem label="Link in Bio" enabled={tierFeatures.link_in_bio} />
              <FeatureItem label="Idea Board" enabled={tierFeatures.idea_board} />
              <FeatureItem label="Advanced Analytics" enabled={tierFeatures.advanced_analytics} />
              <FeatureItem label="API Access" enabled={tierFeatures.api_access} />
              <FeatureItem label="Recurring Content" enabled={tierFeatures.recurring_content} />
              <FeatureItem label="Custom Workflows" enabled={tierFeatures.custom_workflows} />
              <FeatureItem
                label={`Max Accounts: ${tierFeatures.max_accounts}`}
                enabled={true}
              />
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button className="gap-2" onClick={handleUpgrade}>
              Upgrade Plan <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={handlePortal}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Manage Billing
            </Button>
          </div>

          {portalError && (
            <div className="rounded-lg border border-red/20 bg-red/10 p-3 text-xs text-red flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />{portalError}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
      enabled
        ? "border-border bg-surface-2/50 text-primary"
        : "border-border/50 bg-surface-1 text-muted/50"
    )}>
      {enabled ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green shrink-0" />
      ) : (
        <Lock className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="text-xs">{label}</span>
    </div>
  )
}

export function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8 p-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Manage your account, credentials, and preferences</p>
      </div>
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="platforms" className="gap-2"><Globe className="h-4 w-4" /> Platforms</TabsTrigger>
          <TabsTrigger value="theme" className="gap-2"><Sun className="h-4 w-4" /> Theme</TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-2"><Key className="h-4 w-4" /> API Keys</TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2"><CreditCard className="h-4 w-4" /> Subscription</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileSection /></TabsContent>
        <TabsContent value="platforms"><PlatformCredentialsSection /></TabsContent>
        <TabsContent value="theme"><ThemeSection /></TabsContent>
        <TabsContent value="api-keys"><ApiKeysSection /></TabsContent>
        <TabsContent value="subscription"><SubscriptionSection /></TabsContent>
      </Tabs>
    </motion.div>
  )
}
