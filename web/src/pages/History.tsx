import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { DemoTransaction } from '../api/fixtures'

export default function History() {
  const [txs, setTxs] = useState<DemoTransaction[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.wallet.listTransactions().then(setTxs).catch(() => setError('Could not load ledger history. Start the local API and refresh.'))
  }, [])

  return (
    <section>
      <div className="page-heading"><div><p className="eyebrow">ACCOUNT / AUDIT TRAIL</p><h1>Ledger</h1><p>Append-only entries recorded by the local demo server.</p></div></div>
      <div className="ledger-summary"><div><p className="section-kicker">TRANSACTION RECORD</p><p className="small">Opening balance is seeded demo data. No real deposits are represented.</p></div><span className="status-pill">{txs.length} ENTRIES</span></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Date / time</th><th>Entry</th><th>Amount</th><th>Record note</th></tr></thead>
        <tbody>{txs.length ? txs.map((t) => <tr key={t.id}>
          <td>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(t.at))}</td>
          <td><span className={`tx-kind ${t.kind}`}>{t.kind === 'seed' ? 'Demo seed' : t.kind}</span></td>
          <td className={t.amount < 0 ? 'neg' : 'pos'}>{t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}</td>
          <td>{t.note}</td>
        </tr>) : <tr><td colSpan={4} className="small">{error ? 'Ledger unavailable.' : 'No ledger entries yet.'}</td></tr>}</tbody>
      </table></div>
    </section>
  )
}
