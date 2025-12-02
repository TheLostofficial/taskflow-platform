/* import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import websocketService from '../services/websocket';

export const useWebSocket = () => {
  const { isAuthenticated, token } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('🚀 Инициализация WebSocket с токеном');
      websocketService.connect(token);

      // Запрос разрешения на уведомления
      websocketService.requestNotificationPermission();
    }

    return () => {
      console.log('🧹 Очистка WebSocket');
      websocketService.disconnect();
    };
  }, [isAuthenticated, token]);

  return websocketService;
}; */