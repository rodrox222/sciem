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
      <DialogContent className="sm:max-w-[425px] border-border bg-card text-card-foreground rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground font-bold text-lg">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm mt-2 leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {showCancel && onCancel && (
            <Button variant="outline" onClick={onCancel} className="cursor-pointer">
              {cancelText}
            </Button>
          )}
          <Button
            variant={variant}
            onClick={onConfirm}
            className={`cursor-pointer ${
              variant === 'default' ? 'bg-sci-blue hover:opacity-90 text-white font-semibold' : ''
            }`}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmModal