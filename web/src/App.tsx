import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { TopBar } from './components/TopBar'
import { useMatch } from './game/useMatch'
import { FightPage } from './pages/FightPage'
import { GaragePage } from './pages/GaragePage'
import { MyProfileRoute, ProfilePage } from './pages/ProfilePage'
import { StatsPage } from './pages/StatsPage'

export default function App() {
  // One live match for the whole app, so the fight page, rankings and scoreboard always agree.
  const match = useMatch()
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="min-h-screen">
      <TopBar match={match} />

      <Routes>
        <Route path="/" element={<FightPage match={match} onPlaced={setToast} />} />
        <Route path="/stats" element={<StatsPage match={match} />} />
        <Route path="/garage" element={<GaragePage />} />
        <Route path="/me" element={<MyProfileRoute />} />
        <Route path="/u/:id" element={<ProfilePage />} />
      </Routes>

      <footer className="border-t border-line py-5 text-center text-lg text-mute">
        Monad testnet · MON here is play money with no value and can't be bought or cashed out.
      </footer>

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
