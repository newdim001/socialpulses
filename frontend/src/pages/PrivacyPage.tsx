import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { Shield } from "lucide-react"

export function PrivacyPage() {
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
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
        </div>
        <p className="text-gray-400 mb-2">Last updated: May 13, 2026</p>
        <div className="space-y-8 text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="mb-2">When you use SocialPulses, we collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong className="text-white">Account Information:</strong> Your name, email address, company name, and profile picture when you sign up or sign in via Google.</li>
              <li><strong className="text-white">Social Media Account Data:</strong> When you connect a social media account (YouTube, Instagram, TikTok, etc.), we receive read-only or write-access tokens for content scheduling and analytics.</li>
              <li><strong className="text-white">Content You Create:</strong> Posts, drafts, media uploads, and scheduling data you create within the platform.</li>
              <li><strong className="text-white">Usage Data:</strong> How you interact with the platform — page views, features used, session duration.</li>
              <li><strong className="text-white">Payment Information:</strong> If you subscribe, payment processing is handled by Stripe. We do not store full credit card numbers.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To provide, maintain, and improve the SocialPulses platform</li>
              <li>To schedule and publish content to your connected social media accounts</li>
              <li>To generate analytics and performance reports</li>
              <li>To process payments and manage subscriptions</li>
              <li>To communicate with you about updates, support, and promotional offers (with your consent)</li>
              <li>To detect and prevent abuse, fraud, or unauthorized access</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. YouTube API Services</h2>
            <p className="mb-2">SocialPulses uses YouTube API Services to enable video scheduling and publishing to YouTube channels. By connecting your YouTube account, you agree to the <a href="https://developers.google.com/youtube/terms/api-services-terms-of-service" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">YouTube Terms of Service</a>.</p>
            <p>SocialPulses&apos; use of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing &amp; Disclosure</h2>
            <p className="mb-2">We do not sell your personal information. We may share data only:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>With third-party services necessary for platform operation (Stripe for payments, cloud hosting providers)</li>
              <li>To comply with legal obligations or respond to lawful requests</li>
              <li>To protect the rights, property, or safety of SocialPulses, our users, or the public</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention &amp; Deletion</h2>
            <p className="mb-2">We retain your data for as long as your account is active. Upon account deletion:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Posts and scheduling data are permanently removed within 30 days</li>
              <li>Connected social media account tokens are revoked immediately</li>
              <li>Billing records are retained for 7 years as required by tax law</li>
              <li>Analytics data may be retained in aggregated, anonymized form</li>
            </ul>
            <p className="mt-2">To request deletion of your data, contact us at <a href="mailto:support@socialpulses.io" className="text-purple-400 hover:text-purple-300 underline">support@socialpulses.io</a>.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS), encrypted data at rest, and regular security audits. Access to your data is restricted to authorized personnel only.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="mb-2">Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data</li>
              <li>Object to or restrict processing</li>
              <li>Data portability</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes via email or through the platform. Continued use after changes constitutes acceptance of the updated policy.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@socialpulses.io" className="text-purple-400 hover:text-purple-300 underline">support@socialpulses.io</a>.</p>
          </section>
        </div>
      </motion.main>
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
