import { useEffect, useRef, useState } from 'react'
import { backActionFor } from './app/flow'
import type { Screen } from './app/flow'
import { ConfirmDialog } from './components/ConfirmDialog'
import { closeApp, getUserKey, onBack, storageGet, storageSet } from './platform/sdk'
import { loadSound, playClick, stopAllSounds, unlockAudio } from './platform/sound'
import { initAds } from './platform/ads'
import { TopBanner } from './components/TopBanner'
import { EMPTY_HISTORY, loadHistory, recordPlay, saveHistory } from './domain/history'
import type { History } from './domain/history'
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './domain/settings'
import type { Settings } from './domain/settings'
import type { Piece } from './domain/pieces'
import { findGame } from './games/registry'
import { HomeScreen } from './screens/HomeScreen'
import { PrepareScreen } from './screens/PrepareScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ResultScreen } from './screens/ResultScreen'
import './App.css'

const UID_KEY = 'nugahallae:uid'

type Confirm = 'quitGame' | null

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [history, setHistory] = useState<History>(EMPTY_HISTORY)
  const [adsReady, setAdsReady] = useState(false)
  const screenRef = useRef(screen)
  screenRef.current = screen
  const confirmRef = useRef(confirm)
  confirmRef.current = confirm
  const touchedRef = useRef(false)
  // 그만할까요 창이 열린 채 게임이 끝나면 걸린 말을 잠시 쥐고 있다가 계속하기 때 결과로 보낸다.
  const heldLoserRef = useRef<Piece | null>(null)

  useEffect(() => {
    let alive = true
    void loadSettings().then((s) => {
      if (alive && !touchedRef.current) setSettings(s)
    })
    return () => {
      alive = false
    }
  }, [])

  // 배너 광고 SDK는 앱에서 한 번만 초기화한다. 지원하지 않는 환경(웹 데모·구버전 토스)이면 조용히 건너뛴다.
  useEffect(() => {
    let alive = true
    void initAds().then((ok) => {
      if (alive) setAdsReady(ok)
    })
    return () => {
      alive = false
    }
  }, [])

  // 효과음: 저장된 켜짐/꺼짐을 불러오고, 버튼을 누를 때 기본 클릭음을 낸다.
  // data-silent 안의 버튼(동물 카드·게임 화면처럼 자기 소리가 있는 것)과 비활성 버튼은 소리를 내지 않는다.
  // 단 data-silent 안이라도 data-click이 붙은 버튼(다음 사람 등)은 기본 클릭음을 낸다.
  // 앱이 백그라운드로 가면 울리던 소리를 모두 끈다.
  useEffect(() => {
    void loadSound()
    const onDown = (e: PointerEvent) => {
      unlockAudio()
      const el = (e.target as Element | null)?.closest?.('button,[role="button"]')
      if (!el || (el as HTMLButtonElement).disabled) return
      if (el.closest('[data-silent]') && !el.closest('[data-click]')) return
      playClick()
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') stopAllSounds()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  // 사용자 식별키: 시작할 때 한 번만 확인해 저장한다(화면에 보이지 않고, 실패해도 앱은 그대로 동작).
  useEffect(() => {
    void (async () => {
      try {
        const key = await getUserKey()
        if (key && (await storageGet(UID_KEY)) !== key) await storageSet(UID_KEY, key)
      } catch {
        // 무시
      }
    })()
  }, [])

  useEffect(() => {
    let alive = true
    void loadHistory().then((h) => {
      if (alive) setHistory((cur) => (cur === EMPTY_HISTORY ? h : cur))
    })
    return () => {
      alive = false
    }
  }, [])

  const startPlay = (gameId: string, order: Piece[]) => {
    setHistory((cur) => {
      const next = recordPlay(cur, gameId)
      void saveHistory(next)
      return next
    })
    setScreen({ name: 'play', gameId, order })
  }

  useEffect(() => {
    return onBack(() => {
      if (confirmRef.current !== null) {
        cancelConfirmRef.current()
        return
      }
      const action = backActionFor(screenRef.current)
      if (action.kind === 'close') closeApp()
      else if (action.kind === 'confirmQuitGame') setConfirm('quitGame')
      else setScreen(action.screen)
    })
  }, [])

  const changeSettings = (next: Settings) => {
    touchedRef.current = true
    setSettings(next)
    void saveSettings(next)
  }

  useEffect(() => {
    if (screen.name !== 'play') {
      heldLoserRef.current = null
      if (confirmRef.current === 'quitGame') setConfirm(null)
    }
  }, [screen.name])

  const finishGame = (gameId: string, loser: Piece) => {
    if (confirmRef.current === 'quitGame') heldLoserRef.current = loser
    else setScreen({ name: 'result', gameId, loser })
  }

  const cancelConfirm = () => {
    setConfirm(null)
    const held = heldLoserRef.current
    heldLoserRef.current = null
    const cur = screenRef.current
    if (held && cur.name === 'play') setScreen({ name: 'result', gameId: cur.gameId, loser: held })
  }
  const cancelConfirmRef = useRef(cancelConfirm)
  cancelConfirmRef.current = cancelConfirm

  const game = screen.name === 'home' ? undefined : findGame(screen.gameId)
  const goHome = () => setScreen({ name: 'home' })

  let body
  if (screen.name === 'home' || !game) {
    body = (
      <HomeScreen
        recent={history.recent}
        onPickGame={(gameId) => {
          touchedRef.current = true
          setScreen({ name: 'prepare', gameId })
        }}
      />
    )
  } else if (screen.name === 'prepare') {
    body = (
      <PrepareScreen
        key={screen.gameId}
        game={game}
        initialCount={settings.playerCount}
        onCountChosen={(playerCount) => changeSettings({ ...settings, playerCount })}
        onStart={(order) => startPlay(screen.gameId, order)}
      />
    )
  } else if (screen.name === 'play') {
    body = (
      <PlayScreen
        game={game}
        order={screen.order}
        onFinish={(loser) => finishGame(screen.gameId, loser)}
      />
    )
  } else {
    body = (
      <ResultScreen
        loser={screen.loser}
        onAgain={() => setScreen({ name: 'prepare', gameId: screen.gameId })}
        onOtherGame={goHome}
      />
    )
  }

  // 배너는 홈·준비·결과 화면 맨 위에만 둔다. 게임 진행 화면은 터치 영역이 많고 스크롤이 없어서 광고를 두지 않는다
  // (비게임 출시 기준 "스크롤 가능한 화면에만", 광고 정책 "게임 플레이 영역과 인접 배치 금지").
  const showBanner = adsReady && screen.name !== 'play'

  return (
    <>
      <div className="app-shell">
        {showBanner && <TopBanner />}
        <main className="app-body">{body}</main>
      </div>
      <ConfirmDialog
        open={confirm === 'quitGame'}
        title="게임을 그만할까요?"
        confirmLabel="그만하기"
        cancelLabel="계속하기"
        onConfirm={() => {
          heldLoserRef.current = null
          setConfirm(null)
          setScreen({ name: 'home' })
        }}
        onCancel={cancelConfirm}
      />
    </>
  )
}

export default App
