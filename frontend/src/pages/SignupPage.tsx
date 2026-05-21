import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useNavigate, Link, useSearchParams } from "react-router-dom"
import { motion } from "framer-motion"
import { Mail, Lock, User, Building2, Eye, EyeOff, ArrowRight, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { apiFetch } from "@/lib/utils"
import { useAuth } from "@/auth/AuthProvider"

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    company: z.string().optional(),
    referralCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type SignupFormData = z.infer<typeof signupSchema>

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: "", color: "", width: "0%" }

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { label: "Weak", color: "bg-red", width: "25%" }
  if (score <= 3) return { label: "Fair", color: "bg-amber", width: "50%" }
  if (score <= 4) return { label: "Good", color: "bg-blue", width: "75%" }
  return { label: "Strong", color: "bg-green", width: "100%" }
}

export function SignupPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const urlReferralCode = searchParams.get("ref") || ""

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      company: "",
      referralCode: urlReferralCode,
    },
  })

  const password = watch("password")
  const strength = useMemo(() => getPasswordStrength(password), [password])

  const onSubmit = async (data: SignupFormData) => {
    setServerError(null)
    try {
      const res = await apiFetch<{
        token: string
        username: string
        role?: string
        client_id?: string
        client_name?: string
      }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          company: data.company || undefined,
          referral_code: data.referralCode || undefined,
        }),
      })
      localStorage.setItem("sp-token", res.token)
      localStorage.setItem(
        "sp-user",
        JSON.stringify({
          username: res.username,
          role: res.role,
          client_id: res.client_id,
          client_name: res.client_name,
        })
      )
      setAuth(res.token, {
        username: res.username,
        role: res.role,
        client_id: res.client_id,
        client_name: res.client_name,
      } as any)
      toast.success("Account created!", { description: "Welcome to SocialPulses!" })
      navigate("/", { replace: true })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Signup failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-border shadow-2xl overflow-hidden">
          <CardHeader className="pb-4 pt-8">
            <div className="flex flex-col items-center">
              <img src="/icon.svg" alt="SocialPulses" className="h-14 w-14 mb-3 logo-icon" />
              <h1 className="text-xl font-bold text-primary tracking-tight">SocialPulses</h1>
              <CardDescription className="mt-1">Create your account</CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                transition={{ duration: 0.25 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-start gap-2 rounded-lg bg-red/10 border border-red/20 px-3 py-2.5">
                  <span className="text-sm text-red flex-1">{serverError}</span>
                  <button
                    type="button"
                    onClick={() => setServerError(null)}
                    className="text-red/60 hover:text-red transition-colors shrink-0"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    placeholder="John Doe"
                    className="pl-10"
                    {...register("name")}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-red mt-1">{errors.name.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="john@example.com"
                    className="pl-10"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a strong password"
                    className="pl-10 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red mt-1">{errors.password.message}</p>
                )}

                {/* Password Strength Indicator */}
                {password && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: strength.width }}
                        transition={{ duration: 0.3 }}
                        className={`h-full rounded-full ${strength.color}`}
                      />
                    </div>
                    <p className={`text-xs ${strength.label === "Weak" ? "text-red" : strength.label === "Fair" ? "text-amber" : strength.label === "Good" ? "text-blue" : "text-green"}`}>
                      {strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    className="pl-10 pr-10"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Company (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="company">
                  Company <span className="text-muted">(optional)</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <Input
                    id="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Your company name"
                    className="pl-10"
                    {...register("company")}
                  />
                </div>
                {errors.company && (
                  <p className="text-xs text-red mt-1">{errors.company.message}</p>
                )}
              </div>

              {/* Referral Code (Optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="referralCode">
                  Referral Code <span className="text-muted">(optional)</span>
                </Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Enter referral code"
                    className="pl-10"
                    {...register("referralCode")}
                  />
                </div>
                {errors.referralCode && (
                  <p className="text-xs text-red mt-1">{errors.referralCode.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 text-base font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-accent font-medium hover:text-accent/80 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted mt-6">
          &copy; {new Date().getFullYear()} SocialPulses. All rights reserved.
        </p>
      </motion.div>
    </div>
  )
}
