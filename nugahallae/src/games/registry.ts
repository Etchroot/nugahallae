import type { GameDefinition } from './types'
import { RouletteGame } from './roulette/RouletteGame'
import { PourGame } from './pour/PourGame'
import { LadderGame } from './ladder/LadderGame'
import { CrocGame } from './croc/CrocGame'
import { BombGame } from './bomb/BombGame'
import { BalloonGame } from './balloon/BalloonGame'
import { UpdownGame } from './updown/UpdownGame'
import { TowerGame } from './tower/TowerGame'
import { TimerGame } from './timer/TimerGame'
import { ReactionGame } from './reaction/ReactionGame'
import { TapGame } from './tap/TapGame'

export const GAMES: GameDefinition[] = [
  {
    id: 'roulette',
    icon: '🎡',
    title: '돌림판',
    summary: '걸리면 통과, 끝까지 남으면 벌칙',
    rule: '차례대로 돌림판을 돌려요. 화살표가 가리킨 말은 통과! 마지막까지 남은 말이 벌칙이에요.',
    tint: '#fff4d6',
    badge: '인기',
    Component: RouletteGame,
  },
  {
    id: 'pour',
    icon: '🥛',
    title: '잔 채우기',
    summary: '꾹 눌러 붓기, 넘치게 하면 벌칙',
    rule: '차례대로 잔에 물을 부어요. 꾹 누르면 콸콸, 살짝 탭하면 한 방울! 한 방울이라도 부어야 넘길 수 있고, 넘치게 한 사람이 벌칙이에요.',
    tint: '#e3f2ff',
    badge: 'NEW',
    Component: PourGame,
  },
  {
    id: 'ladder',
    icon: '🪜',
    title: '사다리 타기',
    summary: '벌칙 칸은 딱 하나',
    rule: '차례대로 내 말을 눌러 사다리를 내려가요. 아래 칸 중 벌칙은 딱 하나! 벌칙 칸에 도착한 사람이 걸려요.',
    tint: '#e8f8ef',
    Component: LadderGame,
  },
  {
    id: 'croc',
    icon: '🐊',
    title: '악어 이빨',
    summary: '아픈 이빨 누르면 콱!',
    rule: '돌아가며 악어 이빨을 하나씩 눌러요. 숨겨진 아픈 이빨을 누르면 악어가 콱! 물린 사람이 벌칙이에요.',
    tint: '#e6f6e6',
    Component: CrocGame,
  },
  {
    id: 'bomb',
    icon: '💣',
    title: '폭탄 돌리기',
    summary: '언제 터질지 몰라요',
    rule: '불을 붙이면 폭탄이 돌아가요. 내 차례에 7번 연타해야 다음 사람에게 넘어가요. 손에서 터지면 벌칙이에요.',
    tint: '#ffe8ec',
    Component: BombGame,
  },
  {
    id: 'balloon',
    icon: '🎈',
    title: '풍선 터뜨리기',
    summary: '내 차례에 터지면 벌칙',
    rule: '내 차례에 펌프를 1~3번 누르고 넘겨요(최소 1번). 풍선은 언제 터질지 몰라요. 터뜨린 사람이 벌칙이에요.',
    tint: '#ffeaf6',
    Component: BalloonGame,
  },
  {
    id: 'updown',
    icon: '🔢',
    title: '숫자 폭탄',
    summary: '업다운! 폭탄 숫자를 피해라',
    rule: '1~100 사이에 폭탄 숫자가 숨어 있어요. 돌아가며 범위 안의 숫자를 부르면 UP/DOWN으로 범위가 좁혀져요. 폭탄 숫자를 부른 사람이 벌칙이에요.',
    tint: '#efe8ff',
    Component: UpdownGame,
  },
  {
    id: 'tower',
    icon: '🧱',
    title: '블록 탑',
    summary: '하나씩 빼다 무너뜨리면 벌칙',
    rule: '돌아가며 블록을 하나씩 빼요. 맨 윗줄은 못 빼고, 한 줄에 마지막 남은 블록도 못 빼요. 뺄수록 탑이 불안해져요. 무너뜨린 사람이 벌칙이에요.',
    tint: '#fbeee0',
    Component: TowerGame,
  },
  {
    id: 'timer',
    icon: '⏱️',
    title: '타이머 멈추기',
    summary: '목표 시간에 가장 먼 사람',
    rule: '목표 시간이 정해져요. 시작을 누르고 목표 시간이라고 생각될 때 멈추세요. 1.5초가 지나면 숫자가 가려져요. 목표에서 가장 먼 사람이 벌칙이에요.',
    tint: '#e3f7f4',
    Component: TimerGame,
  },
  {
    id: 'reaction',
    icon: '⚡',
    title: '반응속도',
    summary: '제일 느린 사람',
    rule: '화면을 누르면 빨간색으로 바뀌어요. 초록색이 되는 순간 최대한 빨리 탭! 빨간색일 때 누르면 부정출발이에요. 가장 느린 사람이 벌칙이에요.',
    tint: '#e5effa',
    Component: ReactionGame,
  },
  {
    id: 'tap',
    icon: '👆',
    title: '연타 대결',
    summary: '5초 동안 가장 적게 누른 사람',
    rule: '내 차례에 버튼을 누르면 3초 카운트다운 후 5초 동안 연타! 가장 적게 누른 사람이 벌칙이에요.',
    tint: '#fff0e3',
    Component: TapGame,
  },
]

export function findGame(id: string): GameDefinition | undefined {
  return GAMES.find((g) => g.id === id)
}
