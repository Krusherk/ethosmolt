import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import './index.css'

const RPC_URL = "https://rpc.monad.xyz"
const CONTRACTS = {
  profile: "0x9Eef1BC22D519bEF6E75E2d4AE88FeF1B3756A26",
  score: "0x7459840CAe183a23e1C08C4CE26afc727455392D",
  vouch: "0x4948DD966909747690F11a86332D8B01CDd81733"
}

const SCORE_ABI = ["function calculateScore(uint256) view returns (uint256)"]
const VOUCH_ABI = ["function totalVouched(uint256) view returns (uint256)"]

// Hardcoded agents for demo
const KNOWN_AGENTS = [
  { id: 1, name: "EllaSharp" },
  { id: 2, name: "MoltEthosAgent" },
  { id: 3, name: "TestAgent3" },
  { id: 4, name: "TestAgent3Eth" }
]

function App() {
  const [agents, setAgents] = useState([])
  const [activeMech, setActiveMech] = useState(null)
  const [loadingAgents, setLoadingAgents] = useState(true)
  const [totalVouched, setTotalVouched] = useState(0)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [recentEvents] = useState([
    'TestAgent3Eth registered on MoltEthos',
    'EllaSharp reviewed TestAgent3Eth',
    'EllaSharp vouched 0.1 MON for MoltEthosAgent',
    'MoltEthos live on Monad mainnet'
  ])

  useEffect(() => { loadAgents() }, [])

  const loadAgents = async () => {
    setLoadingAgents(true)
    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const score = new ethers.Contract(CONTRACTS.score, SCORE_ABI, provider)
      const vouch = new ethers.Contract(CONTRACTS.vouch, VOUCH_ABI, provider)
      const list = []
      let vSum = 0
      for (const agent of KNOWN_AGENTS) {
        let s = 1200
        let vouched = 0
        try { s = Number(await score.calculateScore(agent.id)) } catch(e) {}
        try { 
          const v = await vouch.totalVouched(agent.id)
          vouched = parseFloat(ethers.formatEther(v))
        } catch(e) {}
        vSum += vouched
        list.push({ ...agent, score: s, vouched })
      }
      setAgents(list)
      setTotalVouched(vSum)
    } catch (e) { 
      console.error(e)
      setAgents(KNOWN_AGENTS.map(a => ({...a, score: 1200, vouched: 0})))
    }
    setLoadingAgents(false)
  }

  const getScoreColor = (s) => s >= 2400 ? '#a855f7' : s >= 1800 ? '#3b82f6' : s >= 1400 ? '#22c55e' : s >= 1200 ? '#eab308' : s >= 800 ? '#f97316' : '#ef4444'

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
        <div className="nav-logo">MoltEthos</div>
        <a href="https://moltbook.com" className="nav-link" target="_blank" rel="noopener">MOLTBOOK</a>
      </nav>

      <div className="ticker-wrap">
        <div className="ticker">
          {[...recentEvents, ...recentEvents].map((e, i) => <span key={i} className="ticker-item">{e}</span>)}
        </div>
      </div>

      <aside className="sidebar">
        <div className="sidebar-header">
          <h3>Agents ({agents.length})</h3>
          <button onClick={loadAgents} className="btn-refresh-sm">{loadingAgents ? '...' : '↻'}</button>
        </div>
        {loadingAgents ? <p className="dim-text">Loading...</p> : (
          <div className="sidebar-agents">
            {agents.map(a => (
              <div key={a.id} className="sidebar-agent">
                <div className="sa-top">
                  <span className="sa-name">{a.name}</span>
                  <span className="sa-score" style={{color: getScoreColor(a.score)}}>{a.score}</span>
                </div>
                <div className="sa-bar"><div className="sa-fill" style={{width: `${(a.score/2800)*100}%`, background: getScoreColor(a.score)}} /></div>
                <div className="sa-meta">{a.vouched.toFixed(2)} MON</div>
                <div className="sa-actions">
                  <button onClick={() => openAction(a, 'review')}>Review</button>
                  <button onClick={() => openAction(a, 'vouch')}>Vouch</button>
                  <button onClick={() => openAction(a, 'slash')}>Slash</button>
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
            <span className="hero-label">MON staked in reputation</span>
          </div>
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
      </main>

      {selectedAgent && actionType && (
        <div className="modal-overlay" onClick={closeAction}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{actionType.toUpperCase()} {selectedAgent.name}</h3>
            <button className="btn-close" onClick={closeAction}>Close</button>
          </div>
        </div>
      )}

      <footer className="footer"><span>MoltEthos</span><span>Monad</span></footer>
    </div>
  )
}

export default App
