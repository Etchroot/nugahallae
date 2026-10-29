import type { GameDefinition } from '../types'
import { lazyGame } from '../lazyGame'

const definition: GameDefinition = {
  id: 'pour',
  icon: '🥛',
  title: '잔 채우기',
  summary: '꾹 눌러 붓기, 넘치게 하면 벌칙',
  rule: '차례대로 잔에 물을 부어요. 꾹 누르면 콸콸, 살짝 탭하면 한 방울! 한 방울이라도 부어야 넘길 수 있고, 넘치게 한 사람이 벌칙이에요.',
  tint: '#e3f2ff',
  order: 2,
  Component: lazyGame(() => import('./PourGame').then((m) => ({ default: m.PourGame }))),
}

export default definition
