import { Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import LoadingPage from './pages/Loading'
import QuizPage from './pages/Quiz'
import ResultsPage from './pages/Results'
import SharePage from './pages/Share'
import SimulationPage from './pages/Simulation'
import StressTestPage from './pages/StressTest'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route path="/simulation" element={<SimulationPage />} />
      <Route path="/loading" element={<LoadingPage />} />
      <Route path="/results/:sessionId" element={<ResultsPage />} />
      <Route path="/stress/:sessionId" element={<StressTestPage />} />
      <Route path="/share/:sessionId" element={<SharePage />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  )
}

export default App
