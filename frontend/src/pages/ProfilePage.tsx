import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import {
  User,
  Building2,
  Phone,
  MapPin,
  Mail,
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react"
import { apiFetch } from "@/lib/utils"
import { useAuth } from "@/auth/AuthProvider"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface ProfileData {
  username: string
  email: string
  role: string
  email_verified: boolean
  client_id: number | null
  client_name: string | null
  display_name: string | null
  avatar_url: string | null
  company: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  onboarding_completed: boolean
}

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda",
  "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize",
  "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil",
  "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad",
  "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d'Ivoire",
  "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia",
  "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
  "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands",
  "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
  "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan",
  "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe",
]

export function ProfilePage() {
  const { user: authUser } = useAuth()
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    display_name: "",
    company: "",
    phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  })

  const { data: profile, isLoading, error } = useQuery<ProfileData>({
    queryKey: ["profile"],
    queryFn: () => apiFetch("/profile"),
  })

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name || "",
        company: profile.company || "",
        phone: profile.phone || "",
        address_line1: profile.address_line1 || "",
        address_line2: profile.address_line2 || "",
        city: profile.city || "",
        state: profile.state || "",
        postal_code: profile.postal_code || "",
        country: profile.country || "",
      })
    }
  }, [profile])

  const updateProfile = useMutation({
    mutationFn: (data: typeof form) =>
      apiFetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] })
      toast.success("Profile updated successfully")
    },
    onError: () => {
      toast.error("Failed to update profile")
    },
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateProfile.mutateAsync(form)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red mx-auto mb-3" />
          <p className="text-secondary">Failed to load profile</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto space-y-6 px-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-primary tracking-tight">Profile</h1>
        <p className="text-sm text-muted mt-1">Manage your personal information and billing address</p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-accent" />
            Account Info
          </CardTitle>
          <CardDescription>
            Your account details synced from Google or signup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                className="h-16 w-16 rounded-full border-2 border-accent/30 object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-surface-3 flex items-center justify-center border-2 border-border">
                <User className="h-8 w-8 text-muted" />
              </div>
            )}
            <div>
              <p className="text-primary font-medium text-lg">
                {profile?.display_name || profile?.username || "User"}
              </p>
              <p className="text-secondary text-sm flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {profile?.email}
                {profile?.email_verified && (
                  <span className="flex items-center gap-1 text-green text-xs ml-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex gap-2 text-muted">
              <span>Role:</span>
              <span className="text-primary capitalize">{profile?.role}</span>
            </div>
            <div className="flex gap-2 text-muted">
              <span>Workspace:</span>
              <span className="text-primary">{profile?.client_name || "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal & Company Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-accent" />
            Personal & Company Details
          </CardTitle>
          <CardDescription>
            Your display name, company, and contact info
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                value={form.display_name}
                onChange={e => updateField("display_name", e.target.value)}
                placeholder="Your display name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={e => updateField("company", e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              <Phone className="h-3.5 w-3.5 inline mr-1.5 text-muted" />
              Phone Number
            </Label>
            <Input
              value={form.phone}
              onChange={e => updateField("phone", e.target.value)}
              placeholder="+1-555-123-4567"
              className="max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4 text-accent" />
            Billing Address
          </CardTitle>
          <CardDescription>
            Used for invoices and payment methods
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Address Line 1</Label>
            <Input
              value={form.address_line1}
              onChange={e => updateField("address_line1", e.target.value)}
              placeholder="123 Main Street"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Address Line 2</Label>
            <Input
              value={form.address_line2}
              onChange={e => updateField("address_line2", e.target.value)}
              placeholder="Suite, Apt, Floor (optional)"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={e => updateField("city", e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-1.5">
              <Label>State / Province</Label>
              <Input
                value={form.state}
                onChange={e => updateField("state", e.target.value)}
                placeholder="CA"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input
                value={form.postal_code}
                onChange={e => updateField("postal_code", e.target.value)}
                placeholder="94105"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              <Globe className="h-3.5 w-3.5 inline mr-1.5 text-muted" />
              Country
            </Label>
            <Select
              value={form.country}
              onValueChange={(v) => updateField("country", v)}
            >
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Select country..." />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end pb-8">
        <Button
          onClick={handleSave}
          disabled={isSaving || updateProfile.isPending}
        >
          {isSaving || updateProfile.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </motion.div>
  )
}
