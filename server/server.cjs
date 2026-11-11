// Server locale: serve la build web, proxy Gemini e sincronizzazione dati. Solo 127.0.0.1.
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')

const PORT = 3105
const HOME = process.env.USERPROFILE || os.homedir()
const ENV_PATH = path.join(HOME, '.app-personali', 'gemini.env')
const DATA_PATH = path.join(HOME, '.app-personali', 'data', 'life-analytics.json')
const DIST = path.join(__dirname, '..', 'dist')
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png' }

function readConfig() {
  let text
  try { text = fs.readFileSync(ENV_PATH, 'utf8') } catch { return { error: `File di configurazione non trovato: ${ENV_PATH}` } }
  const cfg = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=\s*(.*?)\s*$/)
    if (m) cfg[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  if (!cfg.GEMINI_API_KEY) return { error: 'GEMINI_API_KEY mancante nel file gemini.env.' }
  if (!cfg.GEMINI_MODEL) return { error: 'GEMINI_MODEL mancante nel file gemini.env.' }
  return { key: cfg.GEMINI_API_KEY, model: cfg.GEMINI_MODEL }
}

async function askGemini(prompt) {
  const cfg = readConfig()
  if (cfg.error) return { ok: false, error: cfg.error }
  const scrub = (s) => String(s).split(cfg.key).join('***')
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.model)}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.key },
        body: JSON.stringify({ contents: [{ parts: [{ text: String(prompt) }] }] }),
        signal: AbortSignal.timeout(90000),
      },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: scrub(`Errore Gemini (${res.status}): ${data?.error?.message || 'risposta non valida'}`) }
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
    if (!text) return { ok: false, error: 'Gemini ha risposto senza testo.' }
    return { ok: true, text }
  } catch (e) {
    return { ok: false, error: scrub(`Impossibile contattare Gemini: ${e.message}`) }
  }
}

function readData() {
  try { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) } catch { return { version: 0, data: null } }
}

function body(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => { size += c.length; if (size > 20e6) { reject(new Error('too big')); req.destroy() } else chunks.push(c) })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch (e) { reject(e) } })
    req.on('error', reject)
  })
}

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  try {
    if (url.pathname === '/api/gemini' && req.method === 'POST') {
      const { prompt } = await body(req)
      return send(res, 200, await askGemini(prompt))
    }
    if (url.pathname === '/api/data') {
      if (req.method === 'GET') return send(res, 200, readData())
      if (req.method === 'PUT') {
        const { baseVersion, data } = await body(req)
        const cur = readData()
        if ((baseVersion || 0) !== cur.version) return send(res, 409, { error: 'conflict', version: cur.version })
        const next = { version: Date.now(), data }
        fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
        if (cur.data) { // backup giornaliero (una copia al giorno, ultimi 14 giorni)
          const dir = path.join(path.dirname(DATA_PATH), 'backups')
          fs.mkdirSync(dir, { recursive: true })
          const f = path.join(dir, `life-analytics-${new Date().toISOString().slice(0, 10)}.json`)
          if (!fs.existsSync(f)) fs.copyFileSync(DATA_PATH, f)
          fs.readdirSync(dir).filter((n) => n.startsWith('life-analytics-')).sort().slice(0, -14).forEach((n) => fs.unlinkSync(path.join(dir, n)))
        }
        fs.writeFileSync(DATA_PATH, JSON.stringify(next))
        return send(res, 200, { version: next.version })
      }
    }
    if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' })
    let file = path.normalize(path.join(DIST, decodeURIComponent(url.pathname)))
    if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html')
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  } catch (e) {
    send(res, 500, { error: 'errore del server' })
  }
})

server.on('error', (e) => { if (e.code === 'EADDRINUSE') process.exit(0); else throw e })
server.listen(PORT, '127.0.0.1')
