import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { NotificationContainerExternal } from '../components/Notification/Notification';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType) => void;
  notifications: Notification[];
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const value: NotificationContextType = {
    showNotification,
    notifications,
    removeNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainerExternal notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
