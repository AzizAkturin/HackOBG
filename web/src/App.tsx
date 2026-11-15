import { useEffect, useState } from 'react'
import { Route, Routes } from 'react-router'
import { TopBar } from './components/TopBar'
import { useRound } from './game/useRound'
import { FightPage } from './pages/FightPage'
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
      <TopBar balance={round.balance} />

      <Routes>
        <Route path="/" element={<FightPage round={round} onPlaced={setToast} />} />
        <Route path="/stats" element={<StatsPage round={round} />} />
      </Routes>

      <footer className="border-t-2 border-dashed border-line py-5 text-center text-lg text-mute">
        Monad testnet · MON here is play money with no value and can't be bought or cashed out.
      </footer>

      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 z-50">
        {toast && (
          <p className="pop btn-pixel whitespace-nowrap bg-green px-5 py-3 font-display font-bold uppercase tracking-widest text-night">
            ✓ {toast}
          </p>
        )}
      </div>
    </div>
  )
}
