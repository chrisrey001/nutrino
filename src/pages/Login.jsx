import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NutrinoLogo from '../components/NutrinoLogo'

export default function Login() {
  const { signInWithOtp, user } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error: err } = await signInWithOtp(email.trim().toLowerCase())
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <NutrinoLogo />
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Check your email</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              We sent a sign-in link to <strong className="text-gray-700">{email}</strong>.<br />
              Tap it to continue. The link expires in 1 hour.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="text-sm text-green-600 font-medium"
            >
              Wrong email? Go back
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sign in to Nutrino</h1>
              <p className="text-sm text-gray-400 mt-1">New here? We'll create your account automatically.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoCapitalize="off"
                  autoCorrect="off"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-12 bg-green-600 text-white rounded-2xl font-semibold text-sm disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send me a sign-in link'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                No password needed — we email you a one-tap sign-in link.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
