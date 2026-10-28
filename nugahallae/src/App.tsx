import { useEffect, useRef, useState } from 'react'
import { backActionFor } from './app/flow'
import type { Screen } from './app/flow'
import { ConfirmDialog } from './components/ConfirmDialog'
import { closeApp, onBack } from './platform/sdk'
import './App.css'

type Confirm = 'close' | 'quitGame' | null

const PLACEHOLDER: Record<Screen['name'], string> = {
  home: '홈',
  prepare: '준비',
  play: '플레이',
  result: '결과',
}

function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [confirm, setConfirm] = useState<Confirm>(null)
  const screenRef = useRef(screen)
  screenRef.current = screen

  useEffect(() => {
    return onBack(() => {
      const action = backActionFor(screenRef.current)
      if (action.kind === 'confirmClose') setConfirm('close')
      else if (action.kind === 'confirmQuitGame') setConfirm('quitGame')
      else setScreen(action.screen)
    })
  }, [])

  return (
    <>
      <main>{PLACEHOLDER[screen.name]}</main>
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
          setConfirm(null)
          setScreen({ name: 'home' })
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}

export default App
