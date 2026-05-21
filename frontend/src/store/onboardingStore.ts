import { create } from "zustand"
import { persist } from "zustand/middleware"
import { apiFetch } from "@/lib/utils"

interface OnboardingState {
  onboardingCompleted: boolean
  currentStep: number
  role: string | null
  tools: string[]
  channelsFocus: string[]

  setStep: (step: number) => void
  setRole: (role: string | null) => void
  addTool: (tool: string) => void
  removeTool: (tool: string) => void
  setTools: (tools: string[]) => void
  addChannel: (channel: string) => void
  removeChannel: (channel: string) => void
  setChannels: (channels: string[]) => void
  completeOnboarding: (data?: Record<string, unknown>) => Promise<void>
  skipOnboarding: () => Promise<void>
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      currentStep: 1,
      role: null,
      tools: [],
      channelsFocus: [],

      setStep: (step) => set({ currentStep: step }),
      setRole: (role) => set({ role }),

      addTool: (tool) =>
        set((state) => ({
          tools: state.tools.includes(tool) ? state.tools : [...state.tools, tool],
        })),
      removeTool: (tool) =>
        set((state) => ({
          tools: state.tools.filter((t) => t !== tool),
        })),
      setTools: (tools) => set({ tools }),

      addChannel: (channel) =>
        set((state) => ({
          channelsFocus: state.channelsFocus.includes(channel)
            ? state.channelsFocus
            : [...state.channelsFocus, channel],
        })),
      removeChannel: (channel) =>
        set((state) => ({
          channelsFocus: state.channelsFocus.filter((c) => c !== channel),
        })),
      setChannels: (channels) => set({ channelsFocus: channels }),

      completeOnboarding: async (data) => {
        await apiFetch("/auth/complete-onboarding", {
          method: "POST",
          body: JSON.stringify(data ?? {}),
        })
        set({ onboardingCompleted: true, currentStep: 0 })
      },

      skipOnboarding: async () => {
        await apiFetch("/auth/complete-onboarding", {
          method: "POST",
          body: JSON.stringify({}),
        })
        set({ onboardingCompleted: true, currentStep: 0 })
      },

      resetOnboarding: () =>
        set({
          onboardingCompleted: false,
          currentStep: 1,
          role: null,
          tools: [],
          channelsFocus: [],
        }),
    }),
    { name: "sp-onboarding" }
  )
)
