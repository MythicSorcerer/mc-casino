import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Games from './pages/Games'
import Wallet from './pages/Wallet'
import History from './pages/History'
import Coinflip from './pages/Coinflip'
import Roulette from './pages/Roulette'
import Crash from './pages/Crash'
import Lottery from './pages/Lottery'
import Chicken from './pages/Chicken'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/coinflip" element={<Coinflip />} />
          <Route path="/games/roulette" element={<Roulette />} />
          <Route path="/games/crash" element={<Crash />} />
          <Route path="/games/lottery" element={<Lottery />} />
          <Route path="/games/chicken" element={<Chicken />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<section><h1>Page not found</h1><p className="small">That demo route does not exist.</p></section>} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
