import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../../contexts/AppContext';
import { cn } from '../../lib/utils';

interface NotificationProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onClose: (id: string) => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ 
  id, 
  message, 
  type, 
  onClose, 
  duration = 5000 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose(id), 300); // Wait for animation to complete
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [id, onClose, duration]);
  
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  
  const Icon = icons[type];
  
  const typeStyles = {
    success: 'bg-green-500 text-white border-green-600',
    error: 'bg-red-500 text-white border-red-600',
    warning: 'bg-yellow-500 text-black border-yellow-600',
    info: 'bg-blue-500 text-white border-blue-600'
  };
  
  if (!isVisible) return null;
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm",
        "transform transition-all duration-300 ease-in-out",
        "min-w-[300px] max-w-md",
        "fixed top-4 right-4 z-[100]",
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        typeStyles[type]
      )}
      data-testid={`notification-${type}`}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <p className="flex-1 text-sm font-medium">
        {message}
      </p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => onClose(id), 300);
        }}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
        data-testid="button-close-notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Container component to manage all notifications
export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();
  
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Notification
            id={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={removeNotification}
          />
        </div>
      ))}
    </div>
  );
};

// Container component that accepts props for external notification management
interface NotificationContainerProps {
  notifications: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string }>;
  onRemove: (id: string) => void;
}

export const NotificationContainerExternal: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onRemove 
}) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Notification
            id={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={onRemove}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for easy notification usage
export const useNotification = () => {
  const { addNotification } = useNotifications();
  
  return {
    success: (message: string) => addNotification(message, 'success'),
    error: (message: string) => addNotification(message, 'error'),
    warning: (message: string) => addNotification(message, 'warning'),
    info: (message: string) => addNotification(message, 'info'),
    notify: addNotification
  };
};

export default NotificationContainer;
