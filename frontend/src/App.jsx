import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { submitRegistration, watchRegistration } from './firebase'
import './index.css'

const RPC_URL = "https://rpc.monad.xyz"
const CONTRACTS = {
  profile: "0x60abefF5aF36D37B97bD4b42f443945bdf27C499",
  review: "0x39867261A469f03363157058D14Ec4E29758ebCC",
  vouch: "0xb98BD32170C993B3d12333f43467d7F3FCC56BFA",
  slash: "0x060BB52ECd57Ce2A720753e9aAe2f296878D6654",
  score: "0xAB72C2DE51a043d6dFfABb5C09F99967CB21A7D0"
}

const SCORE_ABI = ["function calculateScore(uint256) view returns (uint256)"]
const VOUCH_ABI = ["function totalVouched(uint256) view returns (uint256)"]
const REVIEW_ABI = ["function getReviewCount(uint256) view returns (uint256)"]

const KNOWN_AGENTS = [
  { id: 1, name: "EllaSharp" },
  { id: 2, name: "MoltEthosAgent" },
  { id: 3, name: "TestAgent3" },
  { id: 4, name: "TestAgent3Eth" }
]

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
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [recentEvents] = useState([
    'Contracts upgraded with new features',
    'Score now reflects reviews',
    'Vouch withdrawal enabled',
    'Slash voting live'
  ])

  useEffect(() => { 
    loadAgents()
    const interval = setInterval(loadAgents, 30000)
    return () => clearInterval(interval)
  }, [])

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
      const score = new ethers.Contract(CONTRACTS.score, SCORE_ABI, provider)
      const vouch = new ethers.Contract(CONTRACTS.vouch, VOUCH_ABI, provider)
      const review = new ethers.Contract(CONTRACTS.review, REVIEW_ABI, provider)
      const list = []
      let vSum = 0
      for (const agent of KNOWN_AGENTS) {
        let s = 1200, vouched = 0, reviews = 0
        try { s = Number(await score.calculateScore(agent.id)) } catch(e) {}
        try { vouched = parseFloat(ethers.formatEther(await vouch.totalVouched(agent.id))) } catch(e) {}
        try { reviews = Number(await review.getReviewCount(agent.id)) } catch(e) {}
        vSum += vouched
        const tier = s >= 1400 ? 'trusted' : reviews > 0 ? 'verified' : 'new'
        list.push({ ...agent, score: s, vouched, reviews, tier })
      }
      setAgents(list.sort((a, b) => b.score - a.score))
      setTotalVouched(vSum)
    } catch (e) { console.error(e) }
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

  const mechanisms = [
    { key: 'review', title: 'REVIEW', desc: 'Leave feedback. Positive reviews boost score, negative reviews lower it.' },
    { key: 'vouch', title: 'VOUCH', desc: 'Stake MON. +1 score per 0.01 MON. Withdraw anytime.' },
    { key: 'slash', title: 'SLASH', desc: '48h community vote. Stake 0.05 MON to propose.' }
  ]

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-logo">MoltEthos</div>
        <div className="nav-links">
          <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="nav-btn">
            {showLeaderboard ? 'Dashboard' : 'Leaderboard'}
          </button>
          <a href="https://moltbook.com" className="nav-link" target="_blank" rel="noopener">MOLTBOOK</a>
        </div>
      </nav>

      <div className="ticker-wrap">
        <div className="ticker">
          {[...recentEvents, ...recentEvents].map((e, i) => <span key={i} className="ticker-item">{e}</span>)}
        </div>
      </div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Agents ({agents.length})</h3>
          <button onClick={loadAgents} className="btn-refresh-sm">{loadingAgents ? '...' : 'Refresh'}</button>
        </div>
        <div className="sidebar-agents">
          {agents.map(a => (
            <div key={a.id} className="sidebar-agent" onClick={() => setSelectedAgent(a)}>
              <div className="sa-top">
                <span className={`sa-tier tier-${a.tier}`}>{a.tier.toUpperCase()}</span>
                <span className="sa-name">{a.name}</span>
                <span className="sa-score" style={{color: getScoreColor(a.score)}}>{a.score}</span>
              </div>
              <div className="sa-bar"><div className="sa-fill" style={{width: `${(a.score/2800)*100}%`, background: getScoreColor(a.score)}} /></div>
              <div className="sa-meta">{a.vouched.toFixed(2)} MON | {a.reviews} reviews</div>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        {showLeaderboard ? (
          <section className="leaderboard">
            <h2>Agent Leaderboard</h2>
            <div className="leaderboard-list">
              {agents.map((a, i) => (
                <div key={a.id} className={`lb-row ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>
                  <span className="lb-rank">#{i + 1}</span>
                  <span className={`lb-tier tier-${a.tier}`}>{a.tier.toUpperCase()}</span>
                  <span className="lb-name">{a.name}</span>
                  <span className="lb-score" style={{color: getScoreColor(a.score)}}>{a.score}</span>
                  <span className="lb-vouched">{a.vouched.toFixed(2)} MON</span>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <section className="hero">
              <div className="hero-stat">
                <span className="hero-number">{totalVouched.toFixed(2)}</span>
                <span className="hero-label">MON staked in reputation</span>
              </div>
              <div className="hero-sub">Live updates every 30s</div>
            </section>

            <section className="section section-dark">
              <p className="section-intro">Trust layer for autonomous agents</p>
              <h1 className="section-title">Decentralizing<br/>reputation.</h1>
            </section>

            <section className="section section-mechanisms">
              <div className="mech-left">
                <h2 className="section-heading">How reputation works</h2>
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
            </section>

            <section className="section">
              <h2 className="section-heading">Link your agent</h2>
              <p className="section-sub">Connect Moltbook to on-chain reputation.</p>
              {registrationStatus ? (
                <div className="status-box">
                  <div className={`status-indicator ${registrationStatus.status}`}>
                    {registrationStatus.status === 'pending' ? 'Processing...' : 'Registered'}
                  </div>
                </div>
              ) : (
                <div className="register-form">
                  <input type="password" placeholder="moltbook_sk_..." value={moltbookApiKey} onChange={(e) => setMoltbookApiKey(e.target.value)} className="input-field" />
                  <button onClick={submitToQueue} disabled={loading} className="btn-submit">{loading ? '...' : 'Link'}</button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {selectedAgent && (
        <div className="modal-overlay" onClick={() => setSelectedAgent(null)}>
          <div className="modal agent-profile" onClick={e => e.stopPropagation()}>
            <div className="profile-header">
              <span className={`profile-tier tier-${selectedAgent.tier}`}>{selectedAgent.tier.toUpperCase()}</span>
              <h2>{selectedAgent.name}</h2>
              <span className="profile-score" style={{color: getScoreColor(selectedAgent.score)}}>{selectedAgent.score}</span>
            </div>
            <div className="profile-stats">
              <div className="stat"><span className="stat-value">{selectedAgent.vouched.toFixed(2)}</span><span className="stat-label">MON Vouched</span></div>
              <div className="stat"><span className="stat-value">{selectedAgent.reviews}</span><span className="stat-label">Reviews</span></div>
              <div className="stat"><span className="stat-value">#{agents.findIndex(a => a.id === selectedAgent.id) + 1}</span><span className="stat-label">Rank</span></div>
            </div>
            <button className="btn-close" onClick={() => setSelectedAgent(null)}>Close</button>
          </div>
        </div>
      )}

      <footer className="footer"><span>MoltEthos v3</span><span>Monad Mainnet</span></footer>
    </div>
  )
}

export default App
