import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Notification({ type, message, onClose, duration = 3000 }: NotificationProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertTriangle,
  };
  
  const Icon = icons[type];
  
  const colors = {
    success: 'border-l-green-600 bg-green-900/90 text-green-100',
    error: 'border-l-red-600 bg-red-900/90 text-red-100',
    info: 'border-l-gold bg-gold/10 text-gold',
    warning: 'border-l-yellow-600 bg-yellow-900/90 text-yellow-100',
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg border-l-4 shadow-lg backdrop-blur-sm",
        "animate-slide-in-right duration-300",
        "min-w-[300px] max-w-md",
        colors[type]
      )}
      data-testid={`notification-${type}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <p className="flex-1 text-sm font-medium text-white">
        {message}
      </p>
      <button
        onClick={onClose}
        className="text-white/70 hover:text-white transition-colors"
        data-testid="button-close-notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Array<{ id: string; type: NotificationType; message: string }>;
  onRemove: (id: string) => void;
}

export function NotificationContainer({ notifications, onRemove }: NotificationContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
}
