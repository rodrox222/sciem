import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel?: () => void
  variant?: 'default' | 'destructive'
  showCancel?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Continuar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'default',
  showCancel = true,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900 font-semibold text-lg">{title}</DialogTitle>
          <DialogDescription className="text-slate-600 text-sm mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex gap-2 justify-end">
          {showCancel && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button
            variant={variant}
            onClick={onConfirm}
            className={variant === 'default' ? 'bg-[#003770] hover:bg-[#002850] text-white' : ''}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}