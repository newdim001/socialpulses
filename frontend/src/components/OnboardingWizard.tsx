import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useOnboardingStore } from "@/store/onboardingStore"

// ---------------------------------------------------------------------------
// Icon imports — keep in a map to prevent tree-shaking
// ---------------------------------------------------------------------------
import {
  Sparkles, User, Store, Building2, Briefcase, Users, Heart, MoreHorizontal,
  Monitor, Smartphone, Palette, Layers, Cpu, Camera, Share2, MessageSquare,
  Video, Film, Image, MessageCircle, Globe, Globe2, ShoppingBag,
  ArrowRight, Check, X, ChevronRight,
} from "lucide-react"

const roleIcons: Record<string, any> = { User, Store, Building2, Briefcase, Users, Heart, MoreHorizontal }
const toolIcons: Record<string, any> = { Monitor, Layers, Palette, Smartphone, Cpu, MoreHorizontal }
const channelIcons: Record<string, any> = { Camera, Share2, MessageSquare, Briefcase, Video, Film, Image, MessageCircle, Globe, Globe2, ShoppingBag }

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
const roles = [
  { id: "solo-creator", label: "Solo creator", iconKey: "User" },
  { id: "small-business", label: "Small business owner", iconKey: "Store" },
  { id: "marketing-team", label: "Part of a company marketing team", iconKey: "Building2" },
  { id: "freelancer", label: "Freelancer/consultant", iconKey: "Briefcase" },
  { id: "agency", label: "Marketing agency", iconKey: "Users" },
  { id: "nonprofit", label: "Non-profit", iconKey: "Heart" },
  { id: "other", label: "Other", iconKey: "MoreHorizontal" },
]

const tools = [
  { id: "none", label: "None (post directly)", iconKey: "Monitor" },
  { id: "meta", label: "Meta Business Suite", iconKey: "Layers" },
  { id: "smm-existing", label: "Existing SMM tools", iconKey: "Palette" },
  { id: "niche-tools", label: "Niche platform tools", iconKey: "Smartphone" },
  { id: "ai-platforms", label: "AI Platforms", iconKey: "Cpu" },
  { id: "other-tools", label: "Other", iconKey: "MoreHorizontal" },
]

const channels = [
  { id: "instagram", label: "Instagram", iconKey: "Camera" },
  { id: "facebook", label: "Facebook", iconKey: "Share2" },
  { id: "twitter", label: "Twitter/X", iconKey: "MessageSquare" },
  { id: "linkedin", label: "LinkedIn", iconKey: "Briefcase" },
  { id: "tiktok", label: "TikTok", iconKey: "Video" },
  { id: "youtube", label: "YouTube", iconKey: "Film" },
  { id: "pinterest", label: "Pinterest", iconKey: "Image" },
  { id: "threads", label: "Threads", iconKey: "MessageCircle" },
  { id: "bluesky", label: "Bluesky", iconKey: "Globe" },
  { id: "mastodon", label: "Mastodon", iconKey: "Globe2" },
  { id: "google-business", label: "Google Business", iconKey: "ShoppingBag" },
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OnboardingWizardProps {
  isOpen: boolean
  onComplete: () => void
}

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function OnboardingWizard({ isOpen, onComplete }: OnboardingWizardProps) {
  const {
    currentStep,
    role,
    tools: selectedTools,
    channelsFocus,
    setStep,
    setRole,
    addTool,
    removeTool,
    addChannel,
    removeChannel,
    completeOnboarding,
    skipOnboarding,
  } = useOnboardingStore()

  const [direction, setDirection] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const totalSteps = 5

  const goNext = () => { setDirection(1); if (currentStep < totalSteps) setStep(currentStep + 1) }
  const handleSkip = async () => {
    setSubmitting(true)
    try { await skipOnboarding(); onComplete() }
    catch { useOnboardingStore.getState().setStep(0); onComplete() }
    finally { setSubmitting(false) }
  }
  const handleFinish = async () => {
    setSubmitting(true)
    try { await completeOnboarding({ role, tools: selectedTools, channels_focus: channelsFocus }); onComplete() }
    catch { useOnboardingStore.getState().setStep(0); onComplete() }
    finally { setSubmitting(false) }
  }
  const toggleTool = (t: string) => { if (selectedTools.includes(t)) removeTool(t); else addTool(t) }
  const toggleChannel = (c: string) => { if (channelsFocus.includes(c)) removeChannel(c); else addChannel(c) }
  const RI = (k: string) => roleIcons[k]
  const TI = (k: string) => toolIcons[k]
  const CI = (k: string) => channelIcons[k]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-300",
                        i + 1 === currentStep ? "bg-[#8b5cf6] w-3" : i + 1 < currentStep ? "bg-[#8b5cf6]/50" : "bg-gray-200"
                      )}
                    />
                  ))}
                </div>
                <button onClick={handleSkip} disabled={submitting}
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="overflow-hidden flex-1 flex flex-col">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", damping: 28, stiffness: 300 }}
                    className="px-6 pb-6 pt-4 overflow-y-auto flex-1"
                  >
                    {/* Step 1: Welcome */}
                    {currentStep === 1 && (
                      <div className="text-center space-y-5 min-h-[260px] flex flex-col items-center justify-center">
                        <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] items-center justify-center shadow-lg shadow-purple-500/10">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900">Welcome to SocialPulses</h1>
                          <p className="text-gray-500 mt-2 text-sm">Let's get you set up in just a few quick steps.</p>
                        </div>
                        <Button onClick={goNext} size="lg" className="bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white px-10 gap-2 h-12 text-base">
                          Next <ChevronRight className="h-5 w-5" />
                        </Button>
                        <div className="mt-3">
                          <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip setup</button>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Role */}
                    {currentStep === 2 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">How would you describe yourself?</h2>
                          <p className="text-sm text-gray-500 mt-1">Help us tailor your experience.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {roles.map((r) => {
                            const s = role === r.id
                            const Icon = RI(r.iconKey)
                            return (
                              <button key={r.id} onClick={() => setRole(role === r.id ? null : r.id)}
                                className={cn(
                                  "flex items-center gap-3 w-full text-left rounded-xl p-3.5 border transition-all duration-200",
                                  s ? "border-[#8b5cf6] bg-purple-50 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                )}
                              >
                                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s ? "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]" : "bg-gray-100")}>
                                  <Icon className={cn("h-4 w-4", s ? "text-white" : "text-gray-400")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{r.label}</p>
                                </div>
                                {s && <div className="h-5 w-5 rounded-full bg-[#8b5cf6] flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-white" /></div>}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip</button>
                          <Button onClick={goNext} className="gap-1.5 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white">Continue <ChevronRight className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Tools */}
                    {currentStep === 3 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">What tools do you use?</h2>
                          <p className="text-sm text-gray-500 mt-1">Select all that apply.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5">
                          {tools.map((t) => {
                            const s = selectedTools.includes(t.id)
                            const Icon = TI(t.iconKey)
                            return (
                              <button key={t.id} onClick={() => toggleTool(t.id)}
                                className={cn(
                                  "flex items-center gap-3 w-full text-left rounded-xl p-3.5 border transition-all duration-200",
                                  s ? "border-[#8b5cf6] bg-purple-50 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                )}
                              >
                                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s ? "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]" : "bg-gray-100")}>
                                  <Icon className={cn("h-4 w-4", s ? "text-white" : "text-gray-400")} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900">{t.label}</p>
                                </div>
                                {s && <div className="h-5 w-5 rounded-full bg-[#8b5cf6] flex items-center justify-center shrink-0"><Check className="h-3 w-3 text-white" /></div>}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip</button>
                          <Button onClick={goNext} className="gap-1.5 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white">Continue <ChevronRight className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Channels */}
                    {currentStep === 4 && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">What social channels are in focus?</h2>
                          <p className="text-sm text-gray-500 mt-1">Select the platforms you plan to use.</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {channels.map((ch) => {
                            const s = channelsFocus.includes(ch.id)
                            const Icon = CI(ch.iconKey)
                            return (
                              <button key={ch.id} onClick={() => toggleChannel(ch.id)}
                                className={cn(
                                  "flex flex-col items-center gap-2 rounded-xl p-3.5 border transition-all duration-200 text-center",
                                  s ? "border-[#8b5cf6] bg-purple-50 shadow-[0_0_0_1px_rgba(139,92,246,0.3)]" : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                )}
                              >
                                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", s ? "bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]" : "bg-gray-100")}>
                                  <Icon className={cn("h-4 w-4", s ? "text-white" : "text-gray-400")} />
                                </div>
                                <span className={cn("text-xs font-medium", s ? "text-[#8b5cf6]" : "text-gray-400")}>{ch.label}</span>
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <button onClick={handleSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip</button>
                          <Button onClick={goNext} className="gap-1.5 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white">Continue <ChevronRight className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Done */}
                    {currentStep === 5 && (
                      <div className="text-center space-y-5 min-h-[260px] flex flex-col items-center justify-center">
                        <div className="inline-flex h-16 w-16 rounded-2xl bg-green-100 items-center justify-center">
                          <Check className="h-8 w-8 text-green-600" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold text-gray-900">Your workspace is ready!</h1>
                          <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto">You're all set. Start scheduling and publishing content across your channels.</p>
                        </div>
                        <Button onClick={handleFinish} disabled={submitting} size="lg" className="bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white px-10 gap-2 h-12 text-base">
                          {submitting ? (
                            <span className="flex items-center gap-2">
                              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Setting up...
                            </span>
                          ) : (
                            <>Go to Dashboard <ArrowRight className="h-5 w-5" /></>
                          )}
                        </Button>
                        <button onClick={handleSkip} disabled={submitting} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip setup</button>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default OnboardingWizard
