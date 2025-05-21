
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="bg-white border-amber-200 shadow-md">
            <div className="grid gap-1">
              {title && <ToastTitle className="text-amber-700">{title}</ToastTitle>}
              {description && (
                <ToastDescription className="text-amber-600">{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport className="p-4 md:p-6 md:max-w-sm" />
    </ToastProvider>
  )
}
