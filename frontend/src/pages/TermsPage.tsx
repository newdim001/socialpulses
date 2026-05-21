import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Scale } from "lucide-react"

export function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d0d24] to-[#1a0a2e]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 via-blue-400 to-pink-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <span className="text-white font-semibold text-lg">SocialPulses</span>
        </Link>
        <Link
          to="/login"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Sign In
        </Link>
      </nav>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto px-6 py-12"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Scale className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
        </div>
        <p className="text-gray-400 mb-2">Last updated: May 13, 2026</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using SocialPulses ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>SocialPulses provides a social media management platform that allows users to schedule, publish, and analyze content across multiple social media platforms including but not limited to YouTube, Instagram, TikTok, Twitter/X, LinkedIn, Facebook, and others.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>You must be at least 18 years old to use the Platform</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must provide accurate, current, and complete registration information</li>
              <li>You are responsible for all activity under your account</li>
              <li>Notify us immediately of any unauthorized use at <a href="mailto:support@socialpulses.io" className="text-purple-400 hover:text-purple-300 underline">support@socialpulses.io</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Subscriptions &amp; Billing</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Paid plans are billed monthly or annually as selected during checkout</li>
              <li>Payments are processed securely by Stripe</li>
              <li>Plans auto-renew unless canceled before the renewal date</li>
              <li>Refunds are provided at our discretion within 14 days of purchase</li>
              <li>We may change pricing with 30 days notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Platform for any illegal purpose or in violation of any laws</li>
              <li>Post content that infringes on others intellectual property rights</li>
              <li>Post spam, malware, or harmful content</li>
              <li>Attempt to bypass rate limits, security measures, or access restrictions</li>
              <li>Use the Platform to harass, abuse, or harm others</li>
              <li>Violate the terms of service of any connected social media platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Third-Party Services</h2>
            <p>The Platform integrates with third-party services including:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google/YouTube:</strong> Subject to <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">YouTube Terms of Service</a></li>
              <li><strong>Instagram/Meta:</strong> Subject to Meta Platform Terms</li>
              <li><strong>TikTok:</strong> Subject to TikTok Developer Terms</li>
              <li><strong>Stripe:</strong> Subject to Stripe Services Agreement for payment processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
            <p>The Platform, its logo, branding, and software are owned by SocialPulses. You retain ownership of any content you create using the Platform. By using the Platform, you grant us a limited license to access and post content to your connected accounts solely as directed by you.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
            <p>SocialPulses is provided "as is" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the Platform. Our total liability is limited to the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p>We may suspend or terminate your access to the Platform at any time for violation of these Terms or for any reason with reasonable notice. Upon termination, your access to the Platform will cease, and your data will be handled according to our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Platform. Continued use after changes take effect constitutes acceptance of the new Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">11. Governing Law</h2>
            <p>These Terms are governed by the laws of Malaysia. Any disputes shall be resolved in the courts of Malaysia.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">12. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:support@socialpulses.io" className="text-purple-400 hover:text-purple-300 underline">support@socialpulses.io</a>.</p>
          </section>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">&copy; {new Date().getFullYear()} SocialPulses. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
