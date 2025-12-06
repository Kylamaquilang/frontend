'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const reconnectSocket = useCallback(() => {
    // Disconnect current socket
    if (socket) {
      socket.disconnect();
    }
    
    // Get fresh token and reconnect
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔄 Reconnecting socket with fresh token');
      // Use environment variable for socket URL, fallback to localhost for development
      // IMPORTANT: Socket.io doesn't use /api path, so strip it if present
      let socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      socketUrl = socketUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
      const socketInstance = io(socketUrl, {
        auth: {
          token: `Bearer ${token}`
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Socket.io reconnected successfully');
        setIsConnected(true);
        setSocket(socketInstance);
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 Socket.io disconnected');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('🔌 Socket.io connection error:', error.message);
        setIsConnected(false);
      });
    }
  }, [socket]);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    console.log('🔍 SocketContext - Token from localStorage:', token ? 'Present' : 'Missing');
    console.log('🔍 SocketContext - Token value:', token ? `${token.substring(0, 20)}...` : 'null');
    
    // Only create socket if we have a token
    if (!token) {
      console.log('❌ SocketContext - No token found, skipping socket connection');
      return;
    }
    
    // Initialize Socket.io connection with auth token
    // Use environment variable for socket URL, fallback to localhost for development
    // IMPORTANT: Socket.io doesn't use /api path, so strip it if present
    let socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    socketUrl = socketUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const socketInstance = io(socketUrl, {
      auth: {
        token: `Bearer ${token}`
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket.io connected successfully');
      setIsConnected(true);
      setSocket(socketInstance);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket.io disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('🔌 Socket.io connection error:', error.message);
      setIsConnected(false);
      
      // If authentication error, clear invalid token
      if (error.message && error.message.includes('Authentication error')) {
        console.log('❌ Invalid token detected - clearing storage');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        socketInstance.disconnect();
        
        // Redirect to login if we're not already there
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
          console.log('🔄 Redirecting to login due to invalid token');
          window.location.href = '/auth/login';
        }
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []); // Empty dependency array - socket created once on mount

  // Listen for socket reconnection events (e.g., after login)
  useEffect(() => {
    const handleSocketReconnect = () => {
      console.log('🔄 Socket reconnection event received');
      reconnectSocket();
    };

    window.addEventListener('socket-reconnect', handleSocketReconnect);
    return () => {
      window.removeEventListener('socket-reconnect', handleSocketReconnect);
    };
  }, [reconnectSocket]);

  const joinUserRoom = (userId) => {
    if (socket && isConnected) {
      socket.emit('join-user-room', userId);
      console.log(`👤 Joined user room for user ${userId}`);
    } else {
      console.log(`👤 Socket not connected - cannot join user room for user ${userId}`);
    }
  };

  const joinAdminRoom = () => {
    if (socket && isConnected) {
      socket.emit('join-admin-room');
      console.log('👨‍💼 Joined admin room');
    } else {
      console.log('👨‍💼 Socket not connected - cannot join admin room');
    }
  };

  const emitCartUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('cart-update', data);
      console.log('🛒 Cart update sent via Socket.io');
    } else {
      console.log('🛒 Socket not connected - cart update not sent');
    }
  };

  const emitOrderUpdate = (data) => {
    if (socket && isConnected) {
      socket.emit('order-update', data);
      console.log('📦 Order update sent via Socket.io');
    } else {
      console.log('📦 Socket not connected - order update not sent');
    }
  };

  const emitNotification = (data) => {
    if (socket && isConnected) {
      socket.emit('notification', data);
      console.log('🔔 Notification sent via Socket.io');
    } else {
      console.log('🔔 Socket not connected - notification not sent');
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinUserRoom,
        joinAdminRoom,
        emitCartUpdate,
        emitOrderUpdate,
        emitNotification,
        reconnectSocket,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

