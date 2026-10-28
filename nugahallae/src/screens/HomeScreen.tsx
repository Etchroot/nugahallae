import { useState } from 'react'
import { GAMES } from '../games/registry'
import { PIECES } from '../domain/pieces'
import './screens.css'

interface Props {
  onPickGame: (gameId: string) => void
}

const STICKERS = ['fox', 'frog', 'penguin', 'chick', 'pig']
  .map((id) => PIECES.find((p) => p.id === id))
  .filter((p) => p !== undefined)

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function HomeScreen({ onPickGame }: Props) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = q
    ? GAMES.filter((g) => (g.title + ' ' + g.summary).toLowerCase().includes(q))
    : GAMES

  return (
    <div className="hm-page">
      <section className="hm-hero">
        {STICKERS.map((p, i) => (
          <span key={p.id} className={`hm-sticker hm-s${i + 1}`} aria-hidden="true">
            {p.emoji}
          </span>
        ))}
        <p className="hm-eyebrow">폰 하나로 정하는</p>
        <h1 className="hm-title">누가할래</h1>
        <p className="hm-copy">
          오늘의 벌칙,
          <br />
          게임 한 판으로 끝!
        </p>
        <label className="hm-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            placeholder="어떤 게임 할까요?"
            aria-label="게임 검색"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </section>

      <section className="hm-body">
        <div className="hm-sec">
          <h2>게임 고르기</h2>
          <span>{shown.length}개</span>
        </div>
        {shown.length === 0 ? (
          <p className="hm-empty" role="status">
            {`'${query.trim()}'에 맞는 게임이 없어요`}
          </p>
        ) : (
          <ul className="hm-grid">
            {shown.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="hm-card"
                  data-testid="game-card"
                  onClick={() => onPickGame(g.id)}
                >
                  {g.badge && (
                    <span className={`hm-badge ${g.badge === 'NEW' ? 'hm-badge-new' : 'hm-badge-hot'}`}>
                      {g.badge}
                    </span>
                  )}
                  <span className="hm-ico" style={{ background: g.tint ?? '#f2f4f6' }} aria-hidden="true">
                    {g.icon}
                  </span>
                  <span className="hm-name">{g.title}</span>
                  <span className="hm-desc">{g.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
