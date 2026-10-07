const base = process.env.BASE_URL ?? 'http://127.0.0.1:3000'
const op = (p) => `${p}_${crypto.randomUUID().replaceAll('-', '')}`
async function post(path, body) {
  const r = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return { status: r.status, body: await r.json() }
}
const get = async (path) => (await fetch(base + path)).json()
const wallet = async () => (await get('/api/wallet')).balance

let failures = 0
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`)
  if (!cond) failures++
}

// Coinflip concurrency: two distinct ops, each debits exactly once.
const b0 = await wallet()
const [c1, c2] = await Promise.all([
  post('/api/games/coinflip', { wager: 100, choice: 'heads', operationId: op('cf1') }),
  post('/api/games/coinflip', { wager: 100, choice: 'tails', operationId: op('cf2') }),
])
const b1 = await wallet()
check('coinflip two concurrent settle once each', b0 - b1 === 200 - c1.body.payout - c2.body.payout, `delta=${b0 - b1}`)

// Same operation id raced concurrently must settle once.
const shared = op('shared')
const raced = await Promise.all(Array.from({ length: 5 }, () => post('/api/games/coinflip', { wager: 50, choice: 'heads', operationId: shared })))
const b2 = await wallet()
check('same op raced settles once', b1 - b2 === 50 - raced[0].body.payout, `delta=${b1 - b2} payouts=${raced.map(r => r.body.payout).join(',')} replays=${raced.filter(r => r.body.replay).length}`)
check('raced responses agree on outcome', new Set(raced.map(r => r.body.gameId)).size === 1)

// Roulette replay + invalid bet
const rop = op('rl')
const r1 = await post('/api/games/roulette', { wager: 25, betType: 'color', betValue: 'red', operationId: rop })
const r2 = await post('/api/games/roulette', { wager: 25, betType: 'color', betValue: 'red', operationId: rop })
check('roulette replay', r2.body.outcomeNumber === r1.body.outcomeNumber && r2.body.payout === r1.body.payout)
const rBad = await post('/api/games/roulette', { wager: 25, betType: 'color', betValue: 'purple', operationId: op('rlbad') })
check('roulette rejects bad bet', rBad.status === 400, JSON.stringify(rBad.body))

// Crash: start, immediate cashout race before crash
const cop = op('cr')
const cStart = await post('/api/games/crash/start', { wager: 100, operationId: cop })
check('crash start', cStart.body.status === 'running', JSON.stringify(cStart.body))
const cashId = cStart.body.gameId
const cash = await post('/api/games/crash/cashout', { gameId: cashId, operationId: op('crcash') })
check('crash cashout or terminal', ['cashed_out', 'crashed'].includes(cash.body.status), JSON.stringify(cash.body))
const crashGet = await get('/api/games/crash')
check('crash state readable', Boolean(crashGet) && crashGet.status !== undefined)

// Second crash start while none running
const cStart2 = await post('/api/games/crash/start', { wager: 10, operationId: op('cr2') })
check('crash restart ok or already running', cStart2.status === 200 || cStart2.status === 409, JSON.stringify(cStart2.body))
if (cStart2.status === 200) {
  const g = cStart2.body.gameId
  await post('/api/games/crash/cashout', { gameId: g, operationId: op('cr2cash') })
}

// Chicken full flow
const ks = await post('/api/games/chicken/start', { wager: 100, operationId: op('ks') })
check('chicken start', ks.body.status === 'active', JSON.stringify(ks.body))
let kGame = ks.body.gameId
for (let i = 0; i < 5; i++) {
  const st = await post('/api/games/chicken/step', { gameId: kGame, operationId: op('kstep') })
  if (st.body.status !== 'active') break
}
const kc = await post('/api/games/chicken/cashout', { gameId: kGame, operationId: op('kcash') })
check('chicken terminal', ['cashed_out', 'lost'].includes(kc.body.status) || kc.status === 409, JSON.stringify(kc.body))

// Lottery buy + draw
const lt = await post('/api/games/lottery/tickets', { count: 2, operationId: op('lt') })
check('lottery buy', lt.status === 200 && lt.body.ticketsOwned === 2, JSON.stringify(lt.body).slice(0, 120))
const draw = await post('/api/games/lottery/draw', {})
check('lottery draw', draw.status === 200 && draw.body.status === 'drawn', JSON.stringify(draw.body).slice(0, 160))
const draw2 = await post('/api/games/lottery/draw', {})
check('lottery draw replay', draw2.body.replay === true, JSON.stringify(draw2.body).slice(0, 120))
const lt2 = await post('/api/games/lottery/tickets', { count: 1, operationId: op('lt2') })
check('new lottery opens after draw', lt2.status === 200 && lt2.body.status === 'open', JSON.stringify(lt2.body).slice(0, 160))

// Balance consistency: ledger sums to current balance
const txs = await (await fetch(base + '/api/transactions')).json()
const seed = txs.find(t => t.kind === 'seed')
const sum = txs.reduce((a, t) => a + Number(t.amount), 0)
const walletNow = await wallet()
check('ledger sums to wallet balance', sum === walletNow, `sum=${sum} wallet=${walletNow}`)

// Bad content type / oversize / bad origin
const ct = await fetch(base + '/api/games/coinflip', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })
check('rejects non-json content type', ct.status === 415)
const org = await fetch(base + '/api/wallet', { headers: { origin: 'http://evil.example' } })
check('rejects foreign origin', org.status === 403)

console.log(failures ? `FAILURES: ${failures}` : 'ALL PASS')
process.exit(failures ? 1 : 0)
