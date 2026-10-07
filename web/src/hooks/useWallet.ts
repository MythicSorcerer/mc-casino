import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'

export function useWallet() {
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    try {
      const summary = await api.wallet.getSummary()
      setBalance(summary.balance)
      setError('')
      window.dispatchEvent(new Event('wallet-updated'))
      return summary
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load the local wallet'
      setError(message)
      throw cause
    }
  }, [])
  useEffect(() => { void refresh().catch(() => {}) }, [refresh])
  return { balance, error, refresh }
}
