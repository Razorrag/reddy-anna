import React from 'react';
import { useNotification } from '../../contexts/NotificationContext';

const NotificationSystem: React.FC = () => {
  const { notifications } = useNotification();
  
  return (
    <div className="fixed top-4 right-4 z-[1000] space-y-2">
              {notifications.map((notification) => (
        <div 
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg max-w-sm w-full transform transition-all duration-300
            ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
            ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
            ${notification.type === 'warning' ? 'bg-yellow-500 text-black' : ''}
            ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
          `}
        >
          <div className="font-semibold">{notification.message}</div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
