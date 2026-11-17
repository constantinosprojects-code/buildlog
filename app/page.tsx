'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErrorMsg(error.message)
    setLoading(false)
  }

  const handleSignUp = async () => {
    setLoading(true)
    setErrorMsg('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setErrorMsg(error.message)
    } else {
      alert('Account created! You can now sign in.')
    }
    setLoading(false)
  }

  // If NOT logged in, show the login/signup gate
  if (!session) {
    return (
      <main className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161b22] border border-gray-800 rounded-lg p-6 shadow-xl">
          <h1 className="text-2xl font-bold mb-2">BuildLog Access</h1>
          <p className="text-gray-400 text-sm mb-6">Sign in or create an account to manage your projects.</p>
          
          {errorMsg && <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-200">{errorMsg}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required
                className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-gray-400 mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required
                className="w-full bg-[#0d1117] border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded transition"
              >
                Sign In
              </button>
              <button 
                type="button" 
                onClick={handleSignUp}
                disabled={loading}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded transition"
              >
                Sign Up
              </button>
            </div>
          </form>
        </div>
      </main>
    )
  }

  // Once logged in, your standard dashboard renders here
  return (
    <div className="min-h-screen bg-[#0d1117] text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">BuildLog Dashboard</h1>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="bg-red-600/20 text-red-400 border border-red-800 px-3 py-1.5 rounded text-sm hover:bg-red-600/30 transition"
        >
          Sign Out
        </button>
      </div>
      {/* Insert your existing dashboard layout / project rendering components here */}
    </div>
  )
}