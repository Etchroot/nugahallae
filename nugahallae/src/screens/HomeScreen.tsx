import { ListRow, NumericSpinner, TextField } from '@toss/tds-mobile'
import { GAMES } from '../games/registry'
import { PENALTY_MAX } from '../domain/settings'
import type { Settings } from '../domain/settings'
import './screens.css'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  onPickGame: (gameId: string) => void
}

export function HomeScreen({ settings, onChange, onPickGame }: Props) {
  return (
    <div className="sc-page">
      <h1 className="sc-title">누가할래</h1>
      <p className="sc-sub">폰 하나로 돌려가며 말을 뽑고, 게임으로 정해요.</p>

      <div className="sc-row">
        <span className="sc-row-label">인원수</span>
        <NumericSpinner
          size="medium"
          number={settings.playerCount}
          minNumber={2}
          maxNumber={10}
          onNumberChange={(n) => onChange({ ...settings, playerCount: Math.min(10, Math.max(2, n)) })}
          a11yProps={{ minusButtonAriaLabel: '인원 줄이기', plusButtonAriaLabel: '인원 늘리기' }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <TextField
          variant="line"
          label="벌칙"
          labelOption="sustain"
          placeholder="벌칙 (선택) 예: 커피 사기"
          maxLength={PENALTY_MAX}
          value={settings.penalty}
          onChange={(e) => onChange({ ...settings, penalty: e.target.value.slice(0, PENALTY_MAX) })}
        />
      </div>

      <h2 className="sc-section">게임</h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {GAMES.map((g) => (
          <ListRow
            key={g.id}
            left={<span className="sc-icon">{g.icon}</span>}
            contents={<ListRow.Texts type="2RowTypeA" top={g.title} bottom={g.summary} />}
            withArrow
            onClick={() => onPickGame(g.id)}
          />
        ))}
      </ul>
    </div>
  )
}
