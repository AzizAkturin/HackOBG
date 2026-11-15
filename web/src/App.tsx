import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { TopBar } from './components/TopBar'
import { useRound } from './game/useRound'
import { FightPage } from './pages/FightPage'
import { GaragePage } from './pages/GaragePage'
import { MyProfileRoute, ProfilePage } from './pages/ProfilePage'
import { StatsPage } from './pages/StatsPage'

export default function App() {
  const round = useRound()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="min-h-screen">
      <TopBar />

      <Routes>
        <Route path="/" element={<FightPage round={round} onPlaced={setToast} />} />
        <Route path="/stats" element={<StatsPage round={round} />} />
        <Route path="/garage" element={<GaragePage />} />
        <Route path="/me" element={<MyProfileRoute />} />
        <Route path="/u/:id" element={<ProfilePage />} />
      </Routes>

      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50">
        {toast && (
          <p className="pop btn-pixel whitespace-nowrap bg-green px-5 py-3 font-display font-bold uppercase tracking-widest text-white">
            ✓ {toast}
          </p>
        )}
      </div>
    </div>
  )
}
