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
      <DialogContent className="sm:max-w-[460px] border-border bg-card text-card-foreground rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-sci-navy font-bold text-lg leading-tight">
            {title}
          </DialogTitle>
          <DialogDescription asChild className="text-muted-foreground text-sm mt-2 leading-relaxed">
            <div>{description}</div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {showCancel && onCancel && (
            <Button variant="outline" onClick={onCancel} className="cursor-pointer border-border">
              {cancelText}
            </Button>
          )}
          <Button
            variant={variant}
            onClick={onConfirm}
            className={`cursor-pointer ${
              variant === 'destructive'
                ? 'bg-sci-red hover:opacity-90 text-white font-semibold'
                : 'bg-sci-blue hover:opacity-90 text-white font-semibold'
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