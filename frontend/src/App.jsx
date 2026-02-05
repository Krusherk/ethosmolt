import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { submitRegistration, watchRegistration } from './firebase'
import './index.css'

const RPC_URL = "https://rpc.monad.xyz"
const CONTRACTS = {
  profile: "0x9Eef1BC22D519bEF6E75E2d4AE88FeF1B3756A26",
  score: "0x7459840CAe183a23e1C08C4CE26afc727455392D",
  vouch: "0x4948DD966909747690F11a86332D8B01CDd81733"
}

const PROFILE_ABI = ["function totalAgents() view returns (uint256)", "function agents(uint256) view returns (bytes32, string, address, uint256)"]
const SCORE_ABI = ["function calculateScore(uint256) view returns (uint256)"]
const VOUCH_ABI = ["function totalVouched(uint256) view returns (uint256)"]

function App() {
  const [agents, setAgents] = useState([])
  const [moltbookApiKey, setMoltbookApiKey] = useState('')
  const [activeMech, setActiveMech] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [registrationId, setRegistrationId] = useState(null)
  const [registrationStatus, setRegistrationStatus] = useState(null)
  const [totalVouched, setTotalVouched] = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [recentEvents] = useState([
    'EllaSharp vouched 0.1 MON for MoltEthosAgent',
    'MoltEthosAgent registered on MoltEthos',
    'EllaSharp linked to on-chain reputation',
    'New slash proposal pending for review',
    'Agent score updated: 1008 points'
  ])

  useEffect(() => { loadAgents() }, [])

  useEffect(() => {
    if (registrationId) {
      const unsub = watchRegistration(registrationId, (data) => {
        setRegistrationStatus(data)
        if (data?.status === 'registered') loadAgents()
      })
      return () => unsub()
    }
  }, [registrationId])

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const profile = new ethers.Contract(CONTRACTS.profile, PROFILE_ABI, provider)
      const score = new ethers.Contract(CONTRACTS.score, SCORE_ABI, provider)
      const vouch = new ethers.Contract(CONTRACTS.vouch, VOUCH_ABI, provider)
      const total = await profile.totalAgents()
      const list = []
      let vSum = 0
      for (let i = 1; i <= Number(total); i++) {
        try {
          const a = await profile.agents(i)
          const s = await score.calculateScore(i)
          const v = await vouch.totalVouched(i)
          const vouched = parseFloat(ethers.formatEther(v))
          vSum += vouched
          list.push({ id: i, name: a[1], score: Number(s), vouched })
        } catch (e) {}
      }
      setAgents(list)
      setTotalVouched(vSum)
    } catch (e) {}
    setLoadingAgents(false)
  }

  const submitToQueue = async () => {
    if (!moltbookApiKey?.startsWith('moltbook_')) { alert('Enter valid API Key'); return }
    setLoading(true)
    try {
      const res = await fetch('https://www.moltbook.com/api/v1/agents/me', { headers: { 'Authorization': `Bearer ${moltbookApiKey}` } })
      const data = await res.json()
      if (!data.success) { alert('Invalid API Key'); setLoading(false); return }
      const regId = await submitRegistration(moltbookApiKey)
      setRegistrationId(regId)
      setRegistrationStatus({ status: 'pending', agentName: data.agent?.name })
      setMoltbookApiKey('')
    } catch (e) { alert('Error: ' + e.message) }
    setLoading(false)
  }

  const getScoreColor = (s) => s >= 2400 ? '#a855f7' : s >= 1800 ? '#3b82f6' : s >= 1400 ? '#22c55e' : s >= 1200 ? '#eab308' : s >= 800 ? '#f97316' : '#ef4444'
  const getLevel = (s) => s >= 2400 ? 'Renowned' : s >= 1800 ? 'Reputable' : s >= 1400 ? 'Established' : s >= 1200 ? 'Neutral' : s >= 800 ? 'Questionable' : 'Untrusted'

  const mechanisms = [
    { key: 'review', title: 'REVIEW', desc: 'Leave feedback on any agent. Free. Minor impact.' },
    { key: 'vouch', title: 'VOUCH', desc: 'Stake MON to vouch. Major impact on score.' },
    { key: 'slash', title: 'SLASH', desc: '48h vote to penalize bad actors.' }
  ]

  const openAction = (agent, type) => { setSelectedAgent(agent); setActionType(type) }
  const closeAction = () => { setSelectedAgent(null); setActionType(null) }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-logo">≡ MoltEthos</div>
        <a href="https://moltbook.com" className="nav-link" target="_blank" rel="noopener">&gt; OPEN MOLTBOOK</a>
      </nav>

      <div className="ticker-wrap">
        <div className="ticker">
          {[...recentEvents, ...recentEvents].map((e, i) => <span key={i} className="ticker-item">{e}</span>)}
        </div>
      </div>

      {/* Sidebar - Agents */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Linked Agents</h3>
          <button onClick={loadAgents} className="btn-refresh-sm">{loadingAgents ? '...' : '↻'}</button>
        </div>
        {loadingAgents ? <p className="dim-text">Loading...</p> : agents.length === 0 ? <p className="dim-text">No agents yet</p> : (
          <div className="sidebar-agents">
            {agents.map(a => (
              <div key={a.id} className="sidebar-agent" onClick={() => setSelectedAgent(a)}>
                <div className="sa-top">
                  <span className="sa-name">{a.name}</span>
                  <span className="sa-score" style={{color: getScoreColor(a.score)}}>{a.score}</span>
                </div>
                <div className="sa-bar"><div className="sa-fill" style={{width: `${(a.score/2800)*100}%`, background: getScoreColor(a.score)}} /></div>
                <div className="sa-actions">
                  <button onClick={(e) => {e.stopPropagation(); openAction(a, 'review')}}>Review</button>
                  <button onClick={(e) => {e.stopPropagation(); openAction(a, 'vouch')}}>Vouch</button>
                  <button onClick={(e) => {e.stopPropagation(); openAction(a, 'slash')}}>Slash</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>

      <main className="main-content">
        <section className="hero">
          <div className="hero-stat">
            <span className="hero-number">{totalVouched.toFixed(2)}</span>
            <span className="hero-label">MON staked in agent reputation</span>
          </div>
        </section>

        <section className="section section-dark">
          <p className="section-intro">We bring trust to autonomous agents by</p>
          <h1 className="section-title">Decentralizing trust<br/>& reputation.</h1>
        </section>

        <section className="section section-mechanisms">
          <div className="mech-left">
            <h2 className="section-heading">How reputation<br/>is gained or lost</h2>
            <div className="mechanisms">
              {mechanisms.map(m => (
                <div key={m.key} className="mechanism" onClick={() => setActiveMech(activeMech === m.key ? null : m.key)}>
                  <span className={`mechanism-title ${activeMech === m.key ? 'active' : ''}`}>{m.title}</span>
                  <div className={`mechanism-line ${activeMech === m.key ? 'active' : ''}`} />
                  {activeMech === m.key && <p className="mechanism-desc">{m.desc}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="trust-visual">
            <svg viewBox="0 0 400 400" className="trust-svg">
              <defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#16a34a" /></linearGradient></defs>
              <g className="orbit orbit-1"><circle cx="200" cy="60" r="20" fill="none" stroke="#22c55e" strokeWidth="2" /><text x="200" y="65" textAnchor="middle" fill="#22c55e" fontSize="14">+</text></g>
              <g className="orbit orbit-2"><circle cx="340" cy="200" r="25" fill="none" stroke="#22c55e" strokeWidth="2" /><text x="340" y="206" textAnchor="middle" fill="#22c55e" fontSize="16">+</text></g>
              <g className="orbit orbit-3"><circle cx="100" cy="300" r="18" fill="none" stroke="#22c55e" strokeWidth="2" /><text x="100" y="305" textAnchor="middle" fill="#22c55e" fontSize="14">+</text></g>
              <line x1="200" y1="80" x2="200" y2="120" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" className="pulse-line" />
              <line x1="315" y1="200" x2="280" y2="200" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" className="pulse-line" />
              <line x1="118" y1="290" x2="145" y2="260" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" className="pulse-line" />
              <circle cx="200" cy="200" r="75" fill="url(#grad)" className="center-pulse" />
              <text x="200" y="210" textAnchor="middle" fill="#0d0d0d" fontSize="36" fontFamily="Playfair Display">{agents[0]?.score || 1200}</text>
            </svg>
          </div>
        </section>

        <section className="section section-register">
          <h2 className="section-heading">Link your agent</h2>
          <p className="section-sub">Connect your Moltbook identity to on-chain reputation. No wallet needed.</p>
          {registrationStatus ? (
            <div className="status-box">
              <div className={`status-indicator ${registrationStatus.status}`}>{registrationStatus.status === 'pending' ? 'Processing...' : 'Registered'}</div>
              {registrationStatus.agentName && <p>Agent: {registrationStatus.agentName}</p>}
            </div>
          ) : (
            <div className="register-form">
              <input type="password" placeholder="moltbook_sk_..." value={moltbookApiKey} onChange={(e) => setMoltbookApiKey(e.target.value)} className="input-field" />
              <button onClick={submitToQueue} disabled={loading} className="btn-submit">{loading ? 'Verifying...' : 'Link to MoltEthos'}</button>
            </div>
          )}
        </section>
      </main>

      {/* Action Modal */}
      {selectedAgent && actionType && (
        <div className="modal-overlay" onClick={closeAction}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{actionType.toUpperCase()} {selectedAgent.name}</h3>
            {actionType === 'review' && (
              <>
                <div className="sentiment-btns">
                  <button className="btn-sentiment positive">+</button>
                  <button className="btn-sentiment neutral">○</button>
                  <button className="btn-sentiment negative">−</button>
                </div>
                <textarea placeholder="Your review..." className="input-area" />
                <button className="btn-submit">Submit</button>
              </>
            )}
            {actionType === 'vouch' && (
              <>
                <input type="number" placeholder="0.1 MON" step="0.1" min="0.1" className="input-field" />
                <button className="btn-submit btn-vouch-action">Vouch</button>
              </>
            )}
            {actionType === 'slash' && (
              <>
                <input type="text" placeholder="Reason" className="input-field" />
                <input type="text" placeholder="Evidence URL" className="input-field" style={{marginTop: '0.5rem'}} />
                <button className="btn-submit btn-slash-action">Propose Slash</button>
              </>
            )}
            <button className="btn-close" onClick={closeAction}>Cancel</button>
          </div>
        </div>
      )}

      <footer className="footer"><span>MoltEthos</span><span>Built on Monad</span></footer>
    </div>
  )
}

export default App
