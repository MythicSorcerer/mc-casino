import { createServer } from 'node:http'
import { randomInt, randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT ?? 3000)
const dbPath = resolve(process.env.DATABASE_PATH ?? `${here}/../data/demo.sqlite`)
const demoUserId = 'local-demo-user'
const adminToken = process.env.ADMIN_TOKEN ?? ''
const maxBodyBytes = 8192
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173'])

// Use the system SQLite CLI to avoid a native package dependency. Each call is
// one SQLite process; settlement uses BEGIN IMMEDIATE so concurrent wagers
// serialize before checking the cached balance and writing ledger entries.
await mkdir(dirname(dbPath), { recursive: true })
const schema = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL CHECK (balance >= 0),
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('seed', 'wager', 'payout')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  game_id TEXT,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, operation_id, kind)
);
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  game TEXT NOT NULL,
  wager INTEGER NOT NULL CHECK (wager > 0),
  choice TEXT NOT NULL,
  outcome TEXT NOT NULL,
  payout INTEGER NOT NULL CHECK (payout >= 0),
  created_at TEXT NOT NULL,
  UNIQUE(user_id, operation_id)
);
-- Additive local-demo game state. These tables are created safely for an
-- existing demo.sqlite and never replace the append-only economy ledger.
CREATE TABLE IF NOT EXISTS game_actions (
  user_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  action TEXT NOT NULL,
  request_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, operation_id)
);
CREATE TABLE IF NOT EXISTS crash_rounds (
  game_id TEXT PRIMARY KEY REFERENCES games(id),
  user_id TEXT NOT NULL,
  started_at_ms INTEGER NOT NULL,
  crash_at_ms INTEGER NOT NULL,
  crash_multiplier REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('running','crashed','cashed_out')),
  payout INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS one_running_crash_per_user ON crash_rounds(user_id) WHERE status='running';
CREATE TABLE IF NOT EXISTS chicken_rounds (
  game_id TEXT PRIMARY KEY REFERENCES games(id),
  user_id TEXT NOT NULL,
  step INTEGER NOT NULL DEFAULT 0,
  multiplier REAL NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL CHECK(status IN ('active','lost','cashed_out')),
  payout INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_chicken_per_user ON chicken_rounds(user_id) WHERE status='active';
CREATE TABLE IF NOT EXISTS lotteries (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK(status IN ('open','drawn')),
  winning_ticket INTEGER,
  winner_user_id TEXT,
  payout INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  drawn_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_lottery ON lotteries(status) WHERE status='open';
CREATE TABLE IF NOT EXISTS lottery_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_id TEXT NOT NULL REFERENCES lotteries(id),
  user_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(user_id, operation_id, id)
);
CREATE TABLE IF NOT EXISTS lottery_operations (
  user_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  request_json TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, operation_id)
);
CREATE TRIGGER IF NOT EXISTS transactions_no_update
BEFORE UPDATE ON transactions BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS transactions_no_delete
BEFORE DELETE ON transactions BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
INSERT OR IGNORE INTO wallets(user_id, balance, updated_at)
VALUES ('${demoUserId}', 12450, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
INSERT OR IGNORE INTO transactions(id,user_id,operation_id,kind,amount,balance_after,note,created_at)
VALUES ('demo-seed','${demoUserId}','demo-seed','seed',12450,12450,'Local demo starting balance',strftime('%Y-%m-%dT%H:%M:%fZ','now'));
`
await sqlite(['-batch', dbPath], schema)

const games = [
  { id: 'coinflip', name: 'Coinflip', blurb: 'Heads or tails, settled by the server.', emoji: '🪙', status: 'playable' },
  { id: 'roulette', name: 'Roulette', blurb: 'Red, black, or zero.', emoji: '🎰', status: 'playable' },
  { id: 'lottery', name: 'Lottery', blurb: 'Buy tickets, wait for the draw.', emoji: '🎟', status: 'playable' },
  { id: 'crash', name: 'Crash', blurb: 'Cash out before the multiplier crashes.', emoji: '📈', status: 'playable' },
  { id: 'chicken', name: 'Chicken', blurb: 'Step forward, or cash out early.', emoji: '🐔', status: 'playable' },
]

const server = createServer(async (req, res) => {
  setHeaders(res, req)
  if (req.method === 'OPTIONS') return send(res, 204, '')
  const origin = req.headers.origin
  if (origin && !allowedOrigins.has(origin)) return json(res, 403, { error: 'Origin not allowed' })
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  try {
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, mode: 'local-demo' })
    if (req.method === 'GET' && url.pathname === '/api/session') return json(res, 200, { displayName: 'DemoPlayer', minecraftUuid: null, demo: true })
    if (req.method === 'GET' && url.pathname === '/api/games') return json(res, 200, games)
    if (req.method === 'GET' && url.pathname === '/api/wallet') {
      const rows = await query(`SELECT balance FROM wallets WHERE user_id=${q(demoUserId)};`)
      return json(res, 200, { balance: Number(rows[0]?.balance ?? 0), currency: 'server-coins', demo: true })
    }
    if (req.method === 'GET' && url.pathname === '/api/transactions') {
      const rows = await query(`SELECT id,created_at AS at,kind,amount,note FROM transactions WHERE user_id=${q(demoUserId)} ORDER BY created_at DESC LIMIT 100;`)
      return json(res, 200, rows.map((row) => ({ ...row, amount: Number(row.amount) })))
    }
    if (req.method === 'POST' && url.pathname === '/api/games/coinflip') return await playCoinflip(req, res)
    if (req.method === 'POST' && url.pathname === '/api/games/roulette') return await playRoulette(req, res)
    if (url.pathname === '/api/games/crash' && req.method === 'GET') return await getCrash(res)
    if (url.pathname === '/api/games/crash/start' && req.method === 'POST') return await startCrash(req, res)
    if (url.pathname === '/api/games/crash/cashout' && req.method === 'POST') return await cashoutCrash(req, res)
    if (url.pathname === '/api/games/chicken' && req.method === 'GET') return await getChicken(res)
    if (url.pathname === '/api/games/chicken/start' && req.method === 'POST') return await startChicken(req, res)
    if (url.pathname === '/api/games/chicken/step' && req.method === 'POST') return await stepChicken(req, res)
    if (url.pathname === '/api/games/chicken/cashout' && req.method === 'POST') return await cashoutChicken(req, res)
    if (url.pathname === '/api/games/lottery' && req.method === 'GET') return await getLottery(res)
    if (url.pathname === '/api/games/lottery/tickets' && req.method === 'POST') return await buyLotteryTickets(req, res)
    if (url.pathname === '/api/games/lottery/draw' && req.method === 'POST') return await drawLottery(req, res)
    return json(res, 404, { error: 'Not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed'
    const status = message === 'Insufficient balance' ? 409
      : message === 'Request body too large' ? 413
        : message === 'Unsupported content type' ? 415
      : message === 'Origin not allowed' ? 403
      : message === 'Insufficient balance' || message.includes('already running') || message.includes('already drawn') || message.includes('constraint failed') || message.includes('not active') ? 409
            : message.startsWith('Invalid') ? 400 : 500
    if (status === 500) console.error('Request failed:', message)
    return json(res, status, { error: status === 500 ? 'Request failed' : message })
  }
})

server.listen(port, '127.0.0.1', () => console.log(`Mythic's Casino local demo API on http://127.0.0.1:${port}`))

async function playCoinflip(req, res) {
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw new Error('Unsupported content type')
  const body = await readJson(req)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request body')
  const wager = body.wager
  const choice = body.choice
  const operationId = body.operationId
  if (!Number.isSafeInteger(wager) || wager < 1 || wager > 10000) throw new Error('Invalid wager (must be an integer from 1 to 10000)')
  if (choice !== 'heads' && choice !== 'tails') throw new Error('Invalid choice')
  if (typeof operationId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(operationId)) throw new Error('Invalid operation id')

  const now = new Date().toISOString()
  const existing = await query(`SELECT id,wager,choice,outcome,payout FROM games WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)};`)
  if (existing.length) {
    const prior = existing[0]
    if (Number(prior.wager) !== wager || prior.choice !== choice) throw new Error('Operation id was already used for a different wager')
    const settlement = await query(`SELECT balance_after FROM transactions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)} ORDER BY CASE kind WHEN 'payout' THEN 0 ELSE 1 END LIMIT 1;`)
    return json(res, 200, { gameId: prior.id, game: 'coinflip', wager, choice, outcome: prior.outcome, payout: Number(prior.payout), balance: Number(settlement[0].balance_after), demo: true, replay: true })
  }
  const gameId = randomUUID()
  const outcome = randomInt(0, 2) === 0 ? 'heads' : 'tails'
  const payout = outcome === choice ? Math.floor(wager * 1.95) : 0
  const ops = [
    `BEGIN IMMEDIATE;`,
    `CREATE TEMP TABLE IF NOT EXISTS settlement_guard(ok INTEGER NOT NULL CHECK(ok=1));`,
    `DELETE FROM settlement_guard;`,
    `INSERT INTO settlement_guard(ok) SELECT CASE WHEN balance>=${wager} THEN 1 ELSE 0 END FROM wallets WHERE user_id=${q(demoUserId)};`,
    `INSERT INTO games(id,user_id,operation_id,game,wager,choice,outcome,payout,created_at)
      VALUES (${q(gameId)},${q(demoUserId)},${q(operationId)},'coinflip',${wager},${q(choice)},${q(outcome)},${payout},${q(now)});`,
    `UPDATE wallets SET balance=balance-${wager},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM settlement_guard)=1;`,
    `INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at)
      SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'wager',-${wager},balance,${q(gameId)},'Coinflip wager',${q(now)}
      FROM wallets WHERE user_id=${q(demoUserId)} AND changes()=1;`,
    `UPDATE wallets SET balance=balance+${payout},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND ${payout}>0 AND (SELECT ok FROM settlement_guard)=1;`,
    `INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at)
      SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'payout',${payout},balance,${q(gameId)},'Coinflip payout',${q(now)}
      FROM wallets WHERE user_id=${q(demoUserId)} AND ${payout}>0;`,
    `SELECT 'RESULT|'||w.balance||'|'||g.outcome||'|'||g.payout||'|'||g.id
      FROM wallets w JOIN games g ON g.user_id=w.user_id AND g.operation_id=${q(operationId)}
      WHERE w.user_id=${q(demoUserId)};`,
    `COMMIT;`,
  ].join('\n')
  let output
  try {
    output = await sqlite(['-batch', '-bail', '-separator', '|', dbPath], ops)
  } catch (error) {
    // Two requests can race between the preflight lookup and BEGIN IMMEDIATE.
    // The unique operation key lets the later request recover the committed
    // result instead of settling or charging twice.
    const raced = await query(`SELECT id,wager,choice,outcome,payout FROM games WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)};`)
    if (raced.length) {
      const prior = raced[0]
      if (Number(prior.wager) !== wager || prior.choice !== choice) throw new Error('Operation id was already used for a different wager')
      const settlement = await query(`SELECT balance_after FROM transactions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)} ORDER BY CASE kind WHEN 'payout' THEN 0 ELSE 1 END LIMIT 1;`)
      return json(res, 200, { gameId: prior.id, game: 'coinflip', wager, choice, outcome: prior.outcome, payout: Number(prior.payout), balance: Number(settlement[0].balance_after), demo: true, replay: true })
    }
    if (String(error?.message).includes('CHECK constraint failed')) throw new Error('Insufficient balance')
    throw error
  }
  const resultLine = output.split('\n').find((line) => line.startsWith('RESULT|'))
  if (!resultLine) throw new Error('Insufficient balance')
  const [, balance, finalOutcome, finalPayout, finalGameId] = resultLine.split('|')
  return json(res, 200, { gameId: finalGameId, game: 'coinflip', wager, choice, outcome: finalOutcome, payout: Number(finalPayout), balance: Number(balance), demo: true })
}

// Demo rules: roulette uses a European 0..36 wheel. Red/black and low/high
// return 2x gross, a straight number returns 36x gross (including zero).
async function playRoulette(req, res) {
  const body = await readGameBody(req)
  const wager = validWager(body.wager)
  const operationId = validOperationId(body.operationId)
  const betType = body.betType
  const betValue = body.betValue
  if (!((betType === 'color' && ['red', 'black', 'green'].includes(betValue)) ||
        (betType === 'number' && Number.isInteger(betValue) && betValue >= 0 && betValue <= 36) ||
        (betType === 'range' && ['low', 'high'].includes(betValue)))) throw new Error('Invalid roulette bet')
  const requestJson = JSON.stringify({ wager, betType, betValue })
  const priorAction = await getAction(operationId, 'roulette', requestJson)
  if (priorAction) return json(res, 200, priorAction)
  const outcomeNumber = randomInt(0, 37)
  const outcome = outcomeNumber === 0 ? 'green' : rouletteRed.has(outcomeNumber) ? 'red' : 'black'
  const won = betType === 'color' ? betValue === outcome
    : betType === 'number' ? betValue === outcomeNumber
      : betValue === 'low' ? outcomeNumber >= 1 && outcomeNumber <= 18 : outcomeNumber >= 19 && outcomeNumber <= 36
  const payout = won ? (betType === 'number' || betValue === 'green' ? wager * 36 : wager * 2) : 0
  const gameId = randomUUID()
  const now = new Date().toISOString()
  const sql = settlementPrefix(wager) + `
    INSERT INTO games(id,user_id,operation_id,game,wager,choice,outcome,payout,created_at)
    VALUES(${q(gameId)},${q(demoUserId)},${q(operationId)},'roulette',${wager},${q(`${betType}:${betValue}`)},${q(String(outcomeNumber))},${payout},${q(now)});
    UPDATE wallets SET balance=balance-${wager},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM settlement_guard)=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at)
    SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'wager',-${wager},balance,${q(gameId)},'Roulette wager',${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    UPDATE wallets SET balance=balance+${payout},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND ${payout}>0;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at)
    SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'payout',${payout},balance,${q(gameId)},'Roulette payout',${q(now)} FROM wallets WHERE user_id=${q(demoUserId)} AND ${payout}>0;
    INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at)
    SELECT ${q(demoUserId)},${q(operationId)},'roulette',${q(requestJson)},json_object('gameId',${q(gameId)},'game','roulette','wager',${wager},'betType',${q(betType)},'betValue',${sqlValue(betValue)},'outcome',${q(outcome)},'outcomeNumber',${outcomeNumber},'payout',${payout},'balance',balance,'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)};
    COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'roulette', requestJson)
  return json(res, 200, JSON.parse(rows.split('\n').at(-1)))
}

// Crash grows exponentially at 1.06x per 100 ms from a server-picked point.
// Cashout is accepted only when the request reaches the server before crashAt.
async function getCrash(res) {
  const round = (await query(`SELECT c.*,g.wager FROM crash_rounds c JOIN games g ON g.id=c.game_id WHERE c.user_id=${q(demoUserId)} ORDER BY g.created_at DESC LIMIT 1;`))[0]
  if (!round) return json(res, 200, { gameId: null, wager: null, startedAt: null, crashAt: null, multiplier: 1, status: 'idle', balance: await walletBalance(), demo: true })
  if (round.status === 'running' && Date.now() >= Number(round.crash_at_ms)) await crashRound(round.game_id)
  const updated = (await query(`SELECT c.*,g.wager FROM crash_rounds c JOIN games g ON g.id=c.game_id WHERE c.game_id=${q(round.game_id)};`))[0]
  return json(res, 200, { ...crashDto(updated), balance: await walletBalance() })
}

async function startCrash(req, res) {
  const body = await readGameBody(req)
  const wager = validWager(body.wager)
  const operationId = validOperationId(body.operationId)
  const requestJson = JSON.stringify({ wager })
  const prior = await getAction(operationId, 'crash-start', requestJson)
  if (prior) return json(res, 200, prior)
  const active = (await query(`SELECT game_id,crash_at_ms FROM crash_rounds WHERE user_id=${q(demoUserId)} AND status='running';`))[0]
  if (active && Date.now() >= Number(active.crash_at_ms)) await crashRound(active.game_id)
  const stillActive = (await query(`SELECT game_id FROM crash_rounds WHERE user_id=${q(demoUserId)} AND status='running';`))[0]
  if (stillActive) throw new Error('A crash round is already running')
  const gameId = randomUUID()
  const now = Date.now()
  const crashMultiplier = randomInt(105, 2001) / 100
  const duration = Math.max(1, Math.ceil(Math.log(crashMultiplier) / Math.log(1.06) * 100))
  const crashAt = now + duration
  const createdAt = new Date(now).toISOString()
  const sql = settlementPrefix(wager) + `
    INSERT INTO games(id,user_id,operation_id,game,wager,choice,outcome,payout,created_at) VALUES(${q(gameId)},${q(demoUserId)},${q(operationId)},'crash',${wager},'cashout','running',0,${q(createdAt)});
    INSERT INTO crash_rounds(game_id,user_id,started_at_ms,crash_at_ms,crash_multiplier,status) VALUES(${q(gameId)},${q(demoUserId)},${now},${crashAt},${crashMultiplier},'running');
    UPDATE wallets SET balance=balance-${wager},updated_at=${q(createdAt)} WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM settlement_guard)=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at) SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'wager',-${wager},balance,${q(gameId)},'Crash wager',${q(createdAt)} FROM wallets WHERE user_id=${q(demoUserId)};
    INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},'crash-start',${q(requestJson)},json_object('gameId',${q(gameId)},'wager',${wager},'startedAt',${q(new Date(now).toISOString())},'crashAt',${q(new Date(crashAt).toISOString())},'multiplier',1.0,'status','running','balance',balance,'demo',json('true')),${q(createdAt)} FROM wallets WHERE user_id=${q(demoUserId)};
    SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'crash-start', requestJson)
  return json(res, 200, JSON.parse(rows.split('\n').at(-1)))
}

async function cashoutCrash(req, res) {
  const body = await readGameBody(req)
  const gameId = validId(body.gameId)
  const operationId = validOperationId(body.operationId)
  const requestJson = JSON.stringify({ gameId })
  const prior = await getAction(operationId, 'crash-cashout', requestJson)
  if (prior) return json(res, 200, prior)
  const round = (await query(`SELECT * FROM crash_rounds WHERE game_id=${q(gameId)} AND user_id=${q(demoUserId)};`))[0]
  if (!round) throw new Error('Invalid game id')
  const now = Date.now()
  if (round.status === 'running' && now < Number(round.crash_at_ms)) {
    const multiplier = crashMultiplierAt(round, now)
    const payout = Math.floor(Number(round.wager ?? (await gameWager(gameId))) * multiplier)
    return json(res, 200, await finishCrash(gameId, operationId, requestJson, 'cashed_out', multiplier, payout))
  }
  if (round.status === 'running') await crashRound(gameId)
  const final = (await query(`SELECT c.*,g.wager FROM crash_rounds c JOIN games g ON g.id=c.game_id WHERE c.game_id=${q(gameId)};`))[0]
  const finalStatus = final.status === 'cashed_out' ? 'cashed_out' : 'crashed'
  return json(res, 200, await recordCrashAction(gameId, operationId, requestJson, finalStatus, Number(final.crash_multiplier), Number(final.payout ?? 0)))
}

async function getChicken(res) {
  const round = (await query(`SELECT c.*,g.wager FROM chicken_rounds c JOIN games g ON g.id=c.game_id WHERE c.user_id=${q(demoUserId)} ORDER BY g.created_at DESC LIMIT 1;`))[0]
  return json(res, 200, { ...(round ? chickenDto(round) : { gameId: null, wager: null, step: 0, multiplier: 1, status: 'idle', payout: 0 }), balance: await walletBalance(), demo: true })
}

// With an 80% chance per crossing, this capped ladder keeps expected return
// below stake at each level while leaving room for rounding to whole coins.
const chickenMultipliers = [1, 1.15, 1.43, 1.79, 2.24, 2.8]
async function startChicken(req, res) {
  const body = await readGameBody(req)
  const wager = validWager(body.wager)
  const operationId = validOperationId(body.operationId)
  const requestJson = JSON.stringify({ wager })
  const prior = await getAction(operationId, 'chicken-start', requestJson)
  if (prior) return json(res, 200, prior)
  const id = randomUUID(), now = new Date().toISOString()
  const sql = settlementPrefix(wager) + `
    INSERT INTO games(id,user_id,operation_id,game,wager,choice,outcome,payout,created_at) VALUES(${q(id)},${q(demoUserId)},${q(operationId)},'chicken',${wager},'step','active',0,${q(now)});
    INSERT INTO chicken_rounds(game_id,user_id,status) VALUES(${q(id)},${q(demoUserId)},'active');
    UPDATE wallets SET balance=balance-${wager},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM settlement_guard)=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at) SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'wager',-${wager},balance,${q(id)},'Chicken wager',${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},'chicken-start',${q(requestJson)},json_object('gameId',${q(id)},'wager',${wager},'step',0,'multiplier',1.0,'status','active','payout',0,'balance',balance,'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'chicken-start', requestJson)
  return json(res, 200, JSON.parse(rows.split('\n').at(-1)))
}

async function stepChicken(req, res) {
  const body = await readGameBody(req), gameId = validId(body.gameId), operationId = validOperationId(body.operationId)
  const requestJson = JSON.stringify({ gameId })
  const prior = await getAction(operationId, 'chicken-step', requestJson)
  if (prior) return json(res, 200, prior)
  const round = (await query(`SELECT c.*,g.wager FROM chicken_rounds c JOIN games g ON g.id=c.game_id WHERE c.game_id=${q(gameId)} AND c.user_id=${q(demoUserId)};`))[0]
  if (!round || round.status !== 'active') throw new Error('Chicken round is not active')
  if (Number(round.step) >= chickenMultipliers.length - 1) throw new Error('The final crossing is reached; bank this run')
  const step = Number(round.step) + 1
  const success = randomInt(0, 5) !== 0 // 80% chance per crossing; fixed server-side rule.
  const status = success ? 'active' : 'lost'
  const multiplier = success ? chickenMultipliers[Math.min(step, chickenMultipliers.length - 1)] : Number(round.multiplier)
  const now = new Date().toISOString()
  const sql = `BEGIN IMMEDIATE;
    CREATE TEMP TABLE IF NOT EXISTS chicken_action_guard(ok INTEGER NOT NULL CHECK(ok=1)); DELETE FROM chicken_action_guard;
    UPDATE chicken_rounds SET step=${step},multiplier=${multiplier},status=${q(status)} WHERE game_id=${q(gameId)} AND user_id=${q(demoUserId)} AND status='active' AND step=${Number(round.step)};
    INSERT INTO chicken_action_guard(ok) SELECT changes();
    UPDATE games SET outcome=${q(status)} WHERE id=${q(gameId)} AND (SELECT ok FROM chicken_action_guard)=1;
    INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},'chicken-step',${q(requestJson)},json_object('gameId',${q(gameId)},'wager',${Number(round.wager)},'step',${step},'multiplier',${multiplier},'status',${q(status)},'payout',0,'balance',balance,'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'chicken-step', requestJson)
  return json(res, 200, JSON.parse(rows.split('\n').at(-1)))
}

async function cashoutChicken(req, res) {
  const body = await readGameBody(req), gameId = validId(body.gameId), operationId = validOperationId(body.operationId)
  const requestJson = JSON.stringify({ gameId })
  const prior = await getAction(operationId, 'chicken-cashout', requestJson)
  if (prior) return json(res, 200, prior)
  const round = (await query(`SELECT c.*,g.wager FROM chicken_rounds c JOIN games g ON g.id=c.game_id WHERE c.game_id=${q(gameId)} AND c.user_id=${q(demoUserId)};`))[0]
  if (!round || round.status !== 'active') throw new Error('Chicken round is not active')
  const payout = Math.floor(Number(round.wager) * Number(round.multiplier)), now = new Date().toISOString()
  const sql = `BEGIN IMMEDIATE;
    CREATE TEMP TABLE IF NOT EXISTS chicken_action_guard(ok INTEGER NOT NULL CHECK(ok=1)); DELETE FROM chicken_action_guard;
    UPDATE chicken_rounds SET status='cashed_out',payout=${payout} WHERE game_id=${q(gameId)} AND user_id=${q(demoUserId)} AND status='active';
    INSERT INTO chicken_action_guard(ok) SELECT changes();
    UPDATE games SET outcome='cashed_out',payout=${payout} WHERE id=${q(gameId)} AND (SELECT ok FROM chicken_action_guard)=1;
    UPDATE wallets SET balance=balance+${payout},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND changes()=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at) SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'payout',${payout},balance,${q(gameId)},'Chicken cashout payout',${q(now)} FROM wallets WHERE user_id=${q(demoUserId)} AND ${payout}>0 AND (SELECT ok FROM chicken_action_guard)=1;
    INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},'chicken-cashout',${q(requestJson)},json_object('gameId',${q(gameId)},'wager',${Number(round.wager)},'step',${Number(round.step)},'multiplier',${Number(round.multiplier)},'status','cashed_out','payout',${payout},'balance',balance,'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM chicken_action_guard)=1;
    SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'chicken-cashout', requestJson)
  return json(res, 200, JSON.parse(rows.split('\n').at(-1)))
}

const lotteryTicketPrice = 25
async function ensureLottery(createIfDrawn = false) {
  let lottery = (await query(`SELECT * FROM lotteries ORDER BY created_at DESC LIMIT 1;`))[0]
  if (!lottery || (createIfDrawn && lottery.status === 'drawn')) {
    const id = randomUUID(), now = new Date().toISOString()
    try {
      await sqlite(['-batch', '-bail', dbPath], `INSERT INTO lotteries(id,status,created_at) VALUES(${q(id)},'open',${q(now)});`)
      lottery = { id, status: 'open' }
    } catch (error) {
      const concurrent = (await query(`SELECT * FROM lotteries WHERE status='open' ORDER BY created_at DESC LIMIT 1;`))[0]
      if (!concurrent) throw error
      lottery = concurrent
    }
  }
  return lottery
}
async function lotteryDto(lottery) {
  const tickets = await query(`SELECT id,user_id FROM lottery_tickets WHERE lottery_id=${q(lottery.id)} ORDER BY id;`)
  const dto = { lotteryId: lottery.id, ticketPrice: lotteryTicketPrice, entries: tickets.map((t) => ({ ticketId: Number(t.id), displayName: 'DemoPlayer' })), entryCount: tickets.length, pool: tickets.length * lotteryTicketPrice, status: lottery.status }
  if (lottery.status === 'drawn' && lottery.winning_ticket) dto.winningTicket = Number(lottery.winning_ticket)
  return dto
}
async function getLottery(res) {
  const lottery = await ensureLottery()
  return json(res, 200, await lotteryDto(lottery))
}
async function buyLotteryTickets(req, res) {
  const body = await readGameBody(req), count = body.count, operationId = validOperationId(body.operationId)
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error('Invalid ticket count (must be an integer from 1 to 100)')
  const requestJson = JSON.stringify({ count })
  const prior = await query(`SELECT request_json,response_json FROM lottery_operations WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)};`)
  if (prior.length) {
    if (prior[0].request_json !== requestJson) throw new Error('Operation id was already used for a different request')
    const saved = JSON.parse(prior[0].response_json)
    const savedLottery = (await query(`SELECT * FROM lotteries WHERE id=${q(saved.lotteryId)};`))[0]
    return json(res, 200, { ...await lotteryDto(savedLottery), ticketsOwned: saved.ticketsOwned, balance: saved.balance, demo: true })
  }
  const lottery = await ensureLottery(true), wager = count * lotteryTicketPrice, now = new Date().toISOString()
  const opBase = `lottery:${operationId}`
  const ops = Array.from({ length: count }, () => `INSERT INTO lottery_tickets(lottery_id,user_id,operation_id,created_at) VALUES(${q(lottery.id)},${q(demoUserId)},${q(operationId)},${q(now)});`).join('\n')
  const sql = settlementPrefix(wager) + `
    CREATE TEMP TABLE IF NOT EXISTS lottery_state_guard(ok INTEGER NOT NULL CHECK(ok=1));
    DELETE FROM lottery_state_guard;
    INSERT INTO lottery_state_guard(ok) SELECT CASE WHEN status='open' THEN 1 ELSE 0 END FROM lotteries WHERE id=${q(lottery.id)};
    UPDATE wallets SET balance=balance-${wager},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM settlement_guard)=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at) SELECT ${q(randomUUID())},${q(demoUserId)},${q(opBase)},'wager',-${wager},balance,${q(lottery.id)},'Lottery ticket purchase',${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    ${ops}
    INSERT INTO lottery_operations(user_id,operation_id,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},${q(requestJson)},json_object('lotteryId',${q(lottery.id)},'ticketPrice',${lotteryTicketPrice},'ticketsOwned',${count},'balance',balance,'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    SELECT response_json FROM lottery_operations WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleLotteryOrReplay(sql, operationId, requestJson)
  const saved = JSON.parse(rows.split('\n').at(-1))
  const current = (await query(`SELECT * FROM lotteries WHERE id=${q(lottery.id)};`))[0]
  return json(res, 200, { ...await lotteryDto(current), ticketsOwned: count, balance: saved.balance, demo: true })
}
async function drawLottery(req, res) {
  // Optional local guard: set ADMIN_TOKEN to require the x-admin-token header
  // for draws. With no token configured this stays a single-account demo.
  if (adminToken && req.headers['x-admin-token'] !== adminToken) return json(res, 403, { error: 'A valid admin token is required to draw' })
  const lottery = await ensureLottery()
  if (lottery.status === 'drawn') {
    const balanceRows = await query(`SELECT balance_after FROM transactions WHERE operation_id=${q(`lottery-draw:${lottery.id}`)} AND kind='payout';`)
    const balance = Number(balanceRows[0]?.balance_after ?? await walletBalance())
    return json(res, 200, { lotteryId: lottery.id, status: 'drawn', winner: { displayName: 'DemoPlayer' }, winningTicket: Number(lottery.winning_ticket), payout: Number(lottery.payout), balance, demo: true, replay: true })
  }
  const tickets = await query(`SELECT id,user_id FROM lottery_tickets WHERE lottery_id=${q(lottery.id)} ORDER BY id;`)
  if (!tickets.length) throw new Error('Lottery has no tickets')
  const winner = tickets[randomInt(0, tickets.length)], payout = tickets.length * lotteryTicketPrice
  const now = new Date().toISOString(), operationId = `lottery-draw:${lottery.id}`
  const sql = `BEGIN IMMEDIATE;
    CREATE TEMP TABLE IF NOT EXISTS lottery_draw_guard(ok INTEGER NOT NULL CHECK(ok=1)); DELETE FROM lottery_draw_guard;
    INSERT INTO lottery_draw_guard(ok) SELECT CASE WHEN status='open' AND (SELECT COUNT(*) FROM lottery_tickets WHERE lottery_id=${q(lottery.id)})=${tickets.length} THEN 1 ELSE 0 END FROM lotteries WHERE id=${q(lottery.id)};
    UPDATE lotteries SET status='drawn',winning_ticket=${Number(winner.id)},winner_user_id=${q(winner.user_id)},payout=${payout},drawn_at=${q(now)} WHERE id=${q(lottery.id)} AND status='open';
    UPDATE wallets SET balance=balance+${payout},updated_at=${q(now)} WHERE user_id=${q(winner.user_id)} AND changes()=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at) SELECT ${q(randomUUID())},${q(winner.user_id)},${q(operationId)},'payout',${payout},balance,${q(lottery.id)},'Lottery jackpot payout',${q(now)} FROM wallets WHERE user_id=${q(winner.user_id)};
    COMMIT;`
  await sqlite(['-batch', '-bail', dbPath], sql)
  const balance = await walletBalance()
  return json(res, 200, { lotteryId: lottery.id, status: 'drawn', winner: { displayName: 'DemoPlayer' }, winningTicket: Number(winner.id), payout, balance, demo: true })
}

const rouletteRed = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])
function settlementPrefix(wager) {
  return `BEGIN IMMEDIATE; CREATE TEMP TABLE IF NOT EXISTS settlement_guard(ok INTEGER NOT NULL CHECK(ok=1)); DELETE FROM settlement_guard; INSERT INTO settlement_guard(ok) SELECT CASE WHEN balance>=${wager} THEN 1 ELSE 0 END FROM wallets WHERE user_id=${q(demoUserId)};`
}
async function readGameBody(req) {
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) throw new Error('Unsupported content type')
  const body = await readJson(req)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request body')
  return body
}
function validWager(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10000) throw new Error('Invalid wager (must be an integer from 1 to 10000)')
  return value
}
function validOperationId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(value)) throw new Error('Invalid operation id')
  return value
}
function validId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9-]{36}$/i.test(value)) throw new Error('Invalid game id')
  return value
}
function sqlValue(value) { return typeof value === 'number' ? String(value) : q(value) }
async function walletBalance() {
  const rows = await query(`SELECT balance FROM wallets WHERE user_id=${q(demoUserId)};`)
  return Number(rows[0]?.balance ?? 0)
}
async function getAction(operationId, action, requestJson) {
  const rows = await query(`SELECT action,request_json,response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)};`)
  if (!rows.length) return null
  if (rows[0].action !== action || rows[0].request_json !== requestJson) throw new Error('Operation id was already used for a different request')
  return JSON.parse(rows[0].response_json)
}
async function settleActionOrReplay(sql, operationId, action, requestJson) {
  try { return await sqlite(['-batch', '-bail', dbPath], sql) }
  catch (error) {
    // BEGIN IMMEDIATE serializes settlement, while the unique action key
    // protects the result. If a same-key request won the race, return its
    // committed response instead of surfacing a transient uniqueness error.
    const prior = await getAction(operationId, action, requestJson)
    if (prior) return JSON.stringify(prior)
    throw error
  }
}
async function settleLotteryOrReplay(sql, operationId, requestJson) {
  try { return await sqlite(['-batch', '-bail', dbPath], sql) }
  catch (error) {
    const rows = await query(`SELECT request_json,response_json FROM lottery_operations WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)};`)
    if (rows.length) {
      if (rows[0].request_json !== requestJson) throw new Error('Operation id was already used for a different request')
      return JSON.stringify(JSON.parse(rows[0].response_json))
    }
    throw error
  }
}
function crashMultiplierAt(round, now) {
  const ratio = Math.min(1, Math.max(0, (now - Number(round.started_at_ms)) / Math.max(1, Number(round.crash_at_ms) - Number(round.started_at_ms))))
  return Math.min(Number(round.crash_multiplier), Math.round(Math.exp(Math.log(Number(round.crash_multiplier)) * ratio) * 100) / 100)
}
function crashDto(round) {
  const now = Date.now()
  return { gameId: round.game_id, wager: Number(round.wager ?? 0), startedAt: new Date(Number(round.started_at_ms)).toISOString(), crashAt: new Date(Number(round.crash_at_ms)).toISOString(), multiplier: round.status === 'running' && now < Number(round.crash_at_ms) ? crashMultiplierAt(round, now) : Number(round.crash_multiplier), status: round.status, payout: Number(round.payout ?? 0), balance: undefined, demo: true }
}
async function gameWager(gameId) {
  const rows = await query(`SELECT wager FROM games WHERE id=${q(gameId)};`)
  return Number(rows[0]?.wager ?? 0)
}
async function crashRound(gameId) {
  const now = new Date().toISOString()
  await sqlite(['-batch', '-bail', dbPath], `BEGIN IMMEDIATE; UPDATE crash_rounds SET status='crashed' WHERE game_id=${q(gameId)} AND status='running'; UPDATE games SET outcome='crashed' WHERE id=${q(gameId)} AND changes()=1; COMMIT;`)
}
async function finishCrash(gameId, operationId, requestJson, status, multiplier, payout) {
  const now = new Date().toISOString(), wager = await gameWager(gameId)
  const sql = `BEGIN IMMEDIATE;
    UPDATE crash_rounds SET status='crashed' WHERE game_id=${q(gameId)} AND status='running' AND CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)>=crash_at_ms;
    UPDATE games SET outcome='crashed' WHERE id=${q(gameId)} AND changes()=1;
    UPDATE crash_rounds SET status='cashed_out',payout=${payout} WHERE game_id=${q(gameId)} AND status='running' AND CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)<crash_at_ms;
    CREATE TEMP TABLE IF NOT EXISTS crash_cashout_guard(ok INTEGER NOT NULL CHECK(ok IN (0,1))); DELETE FROM crash_cashout_guard;
    INSERT INTO crash_cashout_guard(ok) SELECT changes();
    UPDATE games SET outcome='cashed_out',payout=${payout} WHERE id=${q(gameId)} AND (SELECT ok FROM crash_cashout_guard)=1;
    UPDATE wallets SET balance=balance+${payout},updated_at=${q(now)} WHERE user_id=${q(demoUserId)} AND (SELECT ok FROM crash_cashout_guard)=1;
    INSERT INTO transactions(id,user_id,operation_id,kind,amount,balance_after,game_id,note,created_at) SELECT ${q(randomUUID())},${q(demoUserId)},${q(operationId)},'payout',${payout},balance,${q(gameId)},'Crash cashout payout',${q(now)} FROM wallets WHERE user_id=${q(demoUserId)} AND ${payout}>0 AND (SELECT ok FROM crash_cashout_guard)=1;
    INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},'crash-cashout',${q(requestJson)},json_object('gameId',${q(gameId)},'status',(SELECT status FROM crash_rounds WHERE game_id=${q(gameId)}),'payout',(SELECT payout FROM crash_rounds WHERE game_id=${q(gameId)}),'balance',balance,'multiplier',CASE WHEN (SELECT status FROM crash_rounds WHERE game_id=${q(gameId)})='cashed_out' THEN ROUND((SELECT payout FROM crash_rounds WHERE game_id=${q(gameId)})*1.0/${wager},2) ELSE (SELECT crash_multiplier FROM crash_rounds WHERE game_id=${q(gameId)}) END,'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)};
    SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'crash-cashout', requestJson)
  const dto = JSON.parse(rows.split('\n').at(-1))
  return dto
}
async function recordCrashAction(gameId, operationId, requestJson, status, multiplier, payout) {
  const now = new Date().toISOString(), wager = await gameWager(gameId)
  const effectiveMultiplier = status === 'cashed_out' && wager > 0 ? Math.round((payout / wager) * 100) / 100 : multiplier
  const sql = `BEGIN IMMEDIATE; INSERT INTO game_actions(user_id,operation_id,action,request_json,response_json,created_at) SELECT ${q(demoUserId)},${q(operationId)},'crash-cashout',${q(requestJson)},json_object('gameId',${q(gameId)},'status',${q(status)},'payout',${payout},'balance',balance,'multiplier',${effectiveMultiplier},'demo',json('true')),${q(now)} FROM wallets WHERE user_id=${q(demoUserId)}; SELECT response_json FROM game_actions WHERE user_id=${q(demoUserId)} AND operation_id=${q(operationId)}; COMMIT;`
  const rows = await settleActionOrReplay(sql, operationId, 'crash-cashout', requestJson)
  return JSON.parse(rows.split('\n').at(-1))
}
function chickenDto(round) {
  return { gameId: round.game_id, wager: Number(round.wager), step: Number(round.step), multiplier: Number(round.multiplier), status: round.status, payout: Number(round.payout ?? 0), demo: true }
}

async function sqlite(args, input) {
  // WAL allows one writer at a time. A racing writer fails fast with
  // SQLITE_BUSY; BEGIN IMMEDIATE transactions roll back cleanly, so retrying
  // the same script is safe (unique operation keys also protect replays).
  let lastError
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await sqliteOnce(args, input)
    } catch (error) {
      lastError = error
      if (!/database is locked|database busy|SQLITE_BUSY/i.test(String(error?.message))) throw error
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 25 * (attempt + 1)))
    }
  }
  throw lastError
}

function sqliteOnce(args, input) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn('sqlite3', args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolvePromise(stdout.trim()) : reject(new Error(stderr.trim() || 'SQLite operation failed')))
    child.stdin.end(input)
  })
}

async function query(sql) {
  const output = await sqlite(['-json', dbPath], sql)
  return output ? JSON.parse(output) : []
}

function q(value) { return `'${String(value).replaceAll("'", "''")}'` }
function setHeaders(res, req) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins.has(req.headers.origin) ? req.headers.origin : 'http://localhost:5173')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
function send(res, status, body) { res.writeHead(status); res.end(body) }
function json(res, status, data) { send(res, status, JSON.stringify(data)) }
function readJson(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = []
    let bytes = 0
    req.on('data', (chunk) => {
      bytes += chunk.length
      if (bytes > maxBodyBytes) {
        reject(new Error('Request body too large'))
        req.resume()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { reject(new Error('Invalid JSON')) }
    })
  })
}
