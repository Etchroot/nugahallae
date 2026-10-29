import { useEffect, useRef, useState } from 'react'
import { backActionFor } from './app/flow'
import type { Screen } from './app/flow'
import { ConfirmDialog } from './components/ConfirmDialog'
import { closeApp, getUserKey, onBack, storageGet, storageSet } from './platform/sdk'
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

type Confirm ='close' | 'quitGame' | null

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [confirm, setConfirm] = useState<Confirm>(null)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [history, setHistory] = useState<History>(EMPTY_HISTORY)
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
      if (action.kind === 'confirmClose') setConfirm('close')
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

  return (
    <>
      <main>{body}</main>
      <ConfirmDialog
        open={confirm === 'close'}
        title="누가할래를 닫을까요?"
        confirmLabel="닫기"
        cancelLabel="취소"
        onConfirm={() => {
          setConfirm(null)
          closeApp()
        }}
        onCancel={() => setConfirm(null)}
      />
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
