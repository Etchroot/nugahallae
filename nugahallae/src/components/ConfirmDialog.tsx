import { ConfirmDialog as TdsConfirmDialog } from '@toss/tds-mobile'

interface Props {
  open: boolean
  title: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, confirmLabel, cancelLabel, onConfirm, onCancel }: Props) {
  return (
    <TdsConfirmDialog
      open={open}
      title={title}
      closeOnBackEvent={false}
      onClose={onCancel}
      cancelButton={
        <TdsConfirmDialog.CancelButton onClick={onCancel}>{cancelLabel}</TdsConfirmDialog.CancelButton>
      }
      confirmButton={
        <TdsConfirmDialog.ConfirmButton onClick={onConfirm}>{confirmLabel}</TdsConfirmDialog.ConfirmButton>
      }
    />
  )
}
