import { useEffect, useState } from 'react'
import { GAMES, findGame } from '../games/registry'
import type { GameDefinition } from '../games/types'
import { PIECES } from '../domain/pieces'
import { isSoundEnabled, loadSound, playClick, setSoundEnabled } from '../platform/sound'
import './screens.css'

interface Props {
  onPickGame: (gameId: string) => void
  /** 최근 한 게임 id(최신순). 검색 중에는 보이지 않는다 */
  recent?: string[]
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

function ClearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
      {on ? (
        <>
          <path d="M15.5 9a4.2 4.2 0 010 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 6.5a8 8 0 010 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  )
}

function GameCard({ g, testId, onPick }: { g: GameDefinition; testId: string; onPick: (id: string) => void }) {
  return (
    <button type="button" className="hm-card" data-testid={testId} onClick={() => onPick(g.id)}>
      {g.badge && (
        <span className={`hm-badge ${g.badge === 'NEW' ? 'hm-badge-new' : 'hm-badge-hot'}`}>{g.badge}</span>
      )}
      <span className="hm-ico" style={{ background: g.tint ?? '#f2f4f6' }} aria-hidden="true">
        {g.icon}
      </span>
      <span className="hm-name">{g.title}</span>
      <span className="hm-desc">{g.summary}</span>
    </button>
  )
}

export function HomeScreen({ onPickGame, recent = [] }: Props) {
  const [query, setQuery] = useState('')
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  useEffect(() => {
    let alive = true
    void loadSound().then((on) => {
      if (alive) setSoundOn(on)
    })
    return () => {
      alive = false
    }
  }, [])
  const q = query.trim().toLowerCase()
  const shown = q
    ? GAMES.filter((g) => (g.title + ' ' + g.summary).toLowerCase().includes(q))
    : GAMES
  const recentGames = q
    ? []
    : recent
        .map((id) => findGame(id))
        .filter((g) => g !== undefined)
        .slice(0, 2)

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
            className="hm-input"
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            placeholder="어떤 게임 할까요?"
            aria-label="게임 검색"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className="hm-clear" aria-label="검색어 지우기" onClick={() => setQuery('')}>
              <ClearIcon />
            </button>
          )}
        </label>
      </section>

      <section className="hm-body">
        {recentGames.length > 0 && (
          <>
            <div className="hm-sec">
              <h2>최근 한 게임</h2>
            </div>
            <ul className="hm-grid hm-recent">
              {recentGames.map((g) => (
                <li key={g.id}>
                  <GameCard g={g} testId="recent-card" onPick={onPickGame} />
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="hm-sec">
          <h2>게임 고르기</h2>
          <span className="hm-sec-end">
            <span>{shown.length}개</span>
            <button
              type="button"
              className="hm-sound"
              aria-label={soundOn ? '소리 끄기' : '소리 켜기'}
              aria-pressed={soundOn}
              onClick={() => {
                const next = !soundOn
                setSoundEnabled(next)
                setSoundOn(next)
                if (next) playClick()
              }}
            >
              <SoundIcon on={soundOn} />
            </button>
          </span>
        </div>
        {shown.length === 0 ? (
          <p className="hm-empty" role="status">
            {`'${query.trim()}'에 맞는 게임이 없어요`}
          </p>
        ) : (
          <ul className="hm-grid">
            {shown.map((g) => (
              <li key={g.id}>
                <GameCard g={g} testId="game-card" onPick={onPickGame} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
