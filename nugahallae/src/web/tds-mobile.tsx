// 데모 웹 빌드(`vite --mode web`) 전용: @toss/tds-mobile 대신 쓰는 최소 대체 부품.
// TDS(Toss Design System, 토스 디자인 시스템: 토스 앱의 버튼·화면 부품 모음)는 앱인토스 밖에서 실행되지 않으므로, 앱이 쓰는 부품만 같은 이름·props로 흉내 낸다.
// 토스용 빌드(`npm run build`)에는 포함되지 않는다.
import type { ChangeEvent, ReactNode } from 'react'
import './tds-web.css'

interface ButtonProps {
  children: ReactNode
  onClick?: () => void
  color?: 'primary' | 'dark'
  variant?: 'fill' | 'weak'
  display?: 'block' | 'full'
}

export function Button({ children, onClick, color = 'primary', variant = 'fill', display }: ButtonProps) {
  const cls = ['wb-btn', `wb-btn--${color}-${variant}`, display === 'full' ? 'wb-btn--full' : '']
  return (
    <button type="button" className={cls.join(' ')} onClick={onClick}>
      {children}
    </button>
  )
}

interface BottomCTAProps {
  children: ReactNode
  onClick?: () => void
  fixed?: boolean
}

function BottomCTABase({ children, onClick }: BottomCTAProps) {
  return (
    <div className="wb-cta">
      <Button display="full" onClick={onClick}>
        {children}
      </Button>
    </div>
  )
}

function BottomCTADouble({ leftButton, rightButton }: { leftButton: ReactNode; rightButton: ReactNode; fixed?: boolean }) {
  return (
    <div className="wb-cta wb-cta--double">
      {leftButton}
      {rightButton}
    </div>
  )
}

export const BottomCTA = Object.assign(BottomCTABase, { Double: BottomCTADouble })

interface ListRowProps {
  left?: ReactNode
  contents: ReactNode
  withArrow?: boolean
  onClick?: () => void
}

function ListRowBase({ left, contents, withArrow, onClick }: ListRowProps) {
  return (
    <li>
      <button type="button" className="wb-row" onClick={onClick}>
        {left}
        <span className="wb-row__contents">{contents}</span>
        {withArrow && (
          <svg className="wb-row__arrow" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </li>
  )
}

function ListRowTexts({ top, bottom }: { top: ReactNode; bottom?: ReactNode; type?: string }) {
  return (
    <>
      <span className="wb-row__top">{top}</span>
      {bottom && <span className="wb-row__bottom">{bottom}</span>}
    </>
  )
}

export const ListRow = Object.assign(ListRowBase, { Texts: ListRowTexts })

interface NumericSpinnerProps {
  number: number
  minNumber: number
  maxNumber: number
  onNumberChange: (n: number) => void
  size?: string
  a11yProps?: { minusButtonAriaLabel?: string; plusButtonAriaLabel?: string }
}

export function NumericSpinner({ number, minNumber, maxNumber, onNumberChange, a11yProps }: NumericSpinnerProps) {
  return (
    <div className="wb-spinner">
      <button
        type="button"
        aria-label={a11yProps?.minusButtonAriaLabel}
        disabled={number <= minNumber}
        onClick={() => onNumberChange(number - 1)}
      >
        −
      </button>
      <span className="wb-spinner__value">{number}</span>
      <button
        type="button"
        aria-label={a11yProps?.plusButtonAriaLabel}
        disabled={number >= maxNumber}
        onClick={() => onNumberChange(number + 1)}
      >
        +
      </button>
    </div>
  )
}

interface TextFieldProps {
  label?: string
  placeholder?: string
  maxLength?: number
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
  variant?: string
  labelOption?: string
}

export function TextField({ label, placeholder, maxLength, value, onChange }: TextFieldProps) {
  return (
    <label className="wb-field">
      {label && <span className="wb-field__label">{label}</span>}
      <input placeholder={placeholder} maxLength={maxLength} value={value} onChange={onChange} />
    </label>
  )
}

interface ConfirmDialogProps {
  open: boolean
  title: ReactNode
  onClose?: () => void
  closeOnBackEvent?: boolean
  cancelButton: ReactNode
  confirmButton: ReactNode
}

function ConfirmDialogBase({ open, title, onClose, cancelButton, confirmButton }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="wb-dim" onClick={onClose}>
      <div className="wb-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <p className="wb-dialog__title">{title}</p>
        <div className="wb-dialog__buttons">
          {cancelButton}
          {confirmButton}
        </div>
      </div>
    </div>
  )
}

function DialogButton(kind: 'cancel' | 'confirm') {
  return function DialogButtonInner({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
    return (
      <Button display="full" color={kind === 'cancel' ? 'dark' : 'primary'} variant={kind === 'cancel' ? 'weak' : 'fill'} onClick={onClick}>
        {children}
      </Button>
    )
  }
}

export const ConfirmDialog = Object.assign(ConfirmDialogBase, {
  CancelButton: DialogButton('cancel'),
  ConfirmButton: DialogButton('confirm'),
})
