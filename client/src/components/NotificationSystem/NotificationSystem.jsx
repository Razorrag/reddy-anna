import React, { useState, useEffect, createContext, useContext } from 'react';
import './NotificationSystem.css';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const newNotification = {
      id,
      message,
      type,
      isVisible: false
    };

    setNotifications(prev => [...prev, newNotification]);

    // Trigger animation
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isVisible: true } : notif
        )
      );
    }, 100);

    // Auto remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, isVisible: false } : notif
        )
      );

      setTimeout(() => {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
      }, 300);
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <NotificationSystem notifications={notifications} />
    </NotificationContext.Provider>
  );
};

const NotificationSystem = ({ notifications }) => {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification ${notification.type} ${notification.isVisible ? 'show' : ''}`}
        >
          {notification.message}
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;