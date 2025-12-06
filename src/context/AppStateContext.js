// src/context/AppStateContext.js

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from './AuthContext';

/**
 * Centralized Application State Management
 * Provides global state management for the entire application
 */

// Initial state
const initialState = {
  // User state
  user: null,
  isAuthenticated: false,
  
  // Cart state
  cart: {
    items: [],
    count: 0,
    total: 0,
    isLoading: false,
    error: null
  },
  
  // Products state
  products: {
    items: [],
    categories: [],
    isLoading: false,
    error: null,
    filters: {
      category: '',
      search: '',
      minPrice: '',
      maxPrice: '',
      inStock: false
    },
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0
    }
  },
  
  // Orders state
  orders: {
    items: [],
    isLoading: false,
    error: null,
    filters: {
      status: '',
      dateRange: {
        start: '',
        end: ''
      }
    }
  },
  
  // Notifications state
  notifications: {
    items: [],
    unreadCount: 0,
    isLoading: false,
    error: null
  },
  
  // UI state
  ui: {
    theme: 'light',
    sidebarOpen: false,
    loading: {
      global: false,
      operations: {}
    },
    modals: {
      login: false,
      register: false,
      product: false,
      cart: false
    },
    alerts: []
  },
  
  // Admin state
  admin: {
    dashboard: {
      stats: {},
      isLoading: false,
      error: null
    },
    inventory: {
      items: [],
      isLoading: false,
      error: null
    },
    users: {
      items: [],
      isLoading: false,
      error: null
    }
  }
};

// Action types
export const ActionTypes = {
  // Auth actions
  SET_USER: 'SET_USER',
  CLEAR_USER: 'CLEAR_USER',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  
  // Cart actions
  SET_CART_ITEMS: 'SET_CART_ITEMS',
  ADD_TO_CART: 'ADD_TO_CART',
  REMOVE_FROM_CART: 'REMOVE_FROM_CART',
  UPDATE_CART_ITEM: 'UPDATE_CART_ITEM',
  CLEAR_CART: 'CLEAR_CART',
  SET_CART_LOADING: 'SET_CART_LOADING',
  SET_CART_ERROR: 'SET_CART_ERROR',
  
  // Products actions
  SET_PRODUCTS: 'SET_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  SET_PRODUCTS_LOADING: 'SET_PRODUCTS_LOADING',
  SET_PRODUCTS_ERROR: 'SET_PRODUCTS_ERROR',
  SET_PRODUCTS_FILTERS: 'SET_PRODUCTS_FILTERS',
  SET_PRODUCTS_PAGINATION: 'SET_PRODUCTS_PAGINATION',
  
  // Orders actions
  SET_ORDERS: 'SET_ORDERS',
  ADD_ORDER: 'ADD_ORDER',
  UPDATE_ORDER: 'UPDATE_ORDER',
  SET_ORDERS_LOADING: 'SET_ORDERS_LOADING',
  SET_ORDERS_ERROR: 'SET_ORDERS_ERROR',
  SET_ORDERS_FILTERS: 'SET_ORDERS_FILTERS',
  
  // Notifications actions
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  SET_NOTIFICATIONS_LOADING: 'SET_NOTIFICATIONS_LOADING',
  SET_NOTIFICATIONS_ERROR: 'SET_NOTIFICATIONS_ERROR',
  
  // UI actions
  SET_THEME: 'SET_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_LOADING: 'SET_LOADING',
  SET_MODAL: 'SET_MODAL',
  ADD_ALERT: 'ADD_ALERT',
  REMOVE_ALERT: 'REMOVE_ALERT',
  CLEAR_ALERTS: 'CLEAR_ALERTS',
  
  // Admin actions
  SET_DASHBOARD_STATS: 'SET_DASHBOARD_STATS',
  SET_INVENTORY: 'SET_INVENTORY',
  SET_USERS: 'SET_USERS',
  SET_ADMIN_LOADING: 'SET_ADMIN_LOADING',
  SET_ADMIN_ERROR: 'SET_ADMIN_ERROR'
};

// Reducer function
const appStateReducer = (state, action) => {
  switch (action.type) {
    // Auth actions
    case ActionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload
      };
    
    case ActionTypes.CLEAR_USER:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        cart: initialState.cart
      };
    
    case ActionTypes.SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: action.payload
      };
    
    // Cart actions
    case ActionTypes.SET_CART_ITEMS:
      const items = action.payload;
      const count = items.reduce((sum, item) => sum + item.quantity, 0);
      const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        ...state,
        cart: {
          ...state.cart,
          items,
          count,
          total,
          error: null
        }
      };
    
    case ActionTypes.ADD_TO_CART:
      const existingItem = state.cart.items.find(
        item => item.product_id === action.payload.product_id && 
                item.size === action.payload.size
      );
      
      let newItems;
      if (existingItem) {
        newItems = state.cart.items.map(item =>
          item.product_id === action.payload.product_id && item.size === action.payload.size
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
      } else {
        newItems = [...state.cart.items, action.payload];
      }
      
      const newCount = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const newTotal = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        ...state,
        cart: {
          ...state.cart,
          items: newItems,
          count: newCount,
          total: newTotal
        }
      };
    
    case ActionTypes.REMOVE_FROM_CART:
      const filteredItems = state.cart.items.filter(
        item => !(item.product_id === action.payload.product_id && item.size === action.payload.size)
      );
      const filteredCount = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      const filteredTotal = filteredItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        ...state,
        cart: {
          ...state.cart,
          items: filteredItems,
          count: filteredCount,
          total: filteredTotal
        }
      };
    
    case ActionTypes.UPDATE_CART_ITEM:
      const updatedItems = state.cart.items.map(item =>
        item.product_id === action.payload.product_id && item.size === action.payload.size
          ? { ...item, quantity: action.payload.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      const updatedCount = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const updatedTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        ...state,
        cart: {
          ...state.cart,
          items: updatedItems,
          count: updatedCount,
          total: updatedTotal
        }
      };
    
    case ActionTypes.CLEAR_CART:
      return {
        ...state,
        cart: initialState.cart
      };
    
    case ActionTypes.SET_CART_LOADING:
      return {
        ...state,
        cart: {
          ...state.cart,
          isLoading: action.payload
        }
      };
    
    case ActionTypes.SET_CART_ERROR:
      return {
        ...state,
        cart: {
          ...state.cart,
          error: action.payload,
          isLoading: false
        }
      };
    
    // Products actions
    case ActionTypes.SET_PRODUCTS:
      return {
        ...state,
        products: {
          ...state.products,
          items: action.payload,
          error: null
        }
      };
    
    case ActionTypes.ADD_PRODUCT:
      return {
        ...state,
        products: {
          ...state.products,
          items: [...state.products.items, action.payload]
        }
      };
    
    case ActionTypes.UPDATE_PRODUCT:
      return {
        ...state,
        products: {
          ...state.products,
          items: state.products.items.map(item =>
            item.id === action.payload.id ? action.payload : item
          )
        }
      };
    
    case ActionTypes.DELETE_PRODUCT:
      return {
        ...state,
        products: {
          ...state.products,
          items: state.products.items.filter(item => item.id !== action.payload)
        }
      };
    
    case ActionTypes.SET_PRODUCTS_LOADING:
      return {
        ...state,
        products: {
          ...state.products,
          isLoading: action.payload
        }
      };
    
    case ActionTypes.SET_PRODUCTS_ERROR:
      return {
        ...state,
        products: {
          ...state.products,
          error: action.payload,
          isLoading: false
        }
      };
    
    case ActionTypes.SET_PRODUCTS_FILTERS:
      return {
        ...state,
        products: {
          ...state.products,
          filters: {
            ...state.products.filters,
            ...action.payload
          }
        }
      };
    
    case ActionTypes.SET_PRODUCTS_PAGINATION:
      return {
        ...state,
        products: {
          ...state.products,
          pagination: {
            ...state.products.pagination,
            ...action.payload
          }
        }
      };
    
    // Orders actions
    case ActionTypes.SET_ORDERS:
      return {
        ...state,
        orders: {
          ...state.orders,
          items: action.payload,
          error: null
        }
      };
    
    case ActionTypes.ADD_ORDER:
      return {
        ...state,
        orders: {
          ...state.orders,
          items: [action.payload, ...state.orders.items]
        }
      };
    
    case ActionTypes.UPDATE_ORDER:
      return {
        ...state,
        orders: {
          ...state.orders,
          items: state.orders.items.map(item =>
            item.id === action.payload.id ? action.payload : item
          )
        }
      };
    
    case ActionTypes.SET_ORDERS_LOADING:
      return {
        ...state,
        orders: {
          ...state.orders,
          isLoading: action.payload
        }
      };
    
    case ActionTypes.SET_ORDERS_ERROR:
      return {
        ...state,
        orders: {
          ...state.orders,
          error: action.payload,
          isLoading: false
        }
      };
    
    case ActionTypes.SET_ORDERS_FILTERS:
      return {
        ...state,
        orders: {
          ...state.orders,
          filters: {
            ...state.orders.filters,
            ...action.payload
          }
        }
      };
    
    // Notifications actions
    case ActionTypes.SET_NOTIFICATIONS:
      const notifications = action.payload;
      const unreadCount = notifications.filter(n => !n.read).length;
      
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: notifications,
          unreadCount,
          error: null
        }
      };
    
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: [action.payload, ...state.notifications.items],
          unreadCount: state.notifications.unreadCount + 1
        }
      };
    
    case ActionTypes.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: state.notifications.items.map(item =>
            item.id === action.payload ? { ...item, read: true } : item
          ),
          unreadCount: Math.max(0, state.notifications.unreadCount - 1)
        }
      };
    
    case ActionTypes.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          items: [],
          unreadCount: 0
        }
      };
    
    case ActionTypes.SET_NOTIFICATIONS_LOADING:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          isLoading: action.payload
        }
      };
    
    case ActionTypes.SET_NOTIFICATIONS_ERROR:
      return {
        ...state,
        notifications: {
          ...state.notifications,
          error: action.payload,
          isLoading: false
        }
      };
    
    // UI actions
    case ActionTypes.SET_THEME:
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload
        }
      };
    
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen
        }
      };
    
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          loading: {
            ...state.ui.loading,
            ...action.payload
          }
        }
      };
    
    case ActionTypes.SET_MODAL:
      return {
        ...state,
        ui: {
          ...state.ui,
          modals: {
            ...state.ui.modals,
            [action.payload.name]: action.payload.open
          }
        }
      };
    
    case ActionTypes.ADD_ALERT:
      return {
        ...state,
        ui: {
          ...state.ui,
          alerts: [...state.ui.alerts, action.payload]
        }
      };
    
    case ActionTypes.REMOVE_ALERT:
      return {
        ...state,
        ui: {
          ...state.ui,
          alerts: state.ui.alerts.filter(alert => alert.id !== action.payload)
        }
      };
    
    case ActionTypes.CLEAR_ALERTS:
      return {
        ...state,
        ui: {
          ...state.ui,
          alerts: []
        }
      };
    
    // Admin actions
    case ActionTypes.SET_DASHBOARD_STATS:
      return {
        ...state,
        admin: {
          ...state.admin,
          dashboard: {
            ...state.admin.dashboard,
            stats: action.payload,
            error: null
          }
        }
      };
    
    case ActionTypes.SET_INVENTORY:
      return {
        ...state,
        admin: {
          ...state.admin,
          inventory: {
            ...state.admin.inventory,
            items: action.payload,
            error: null
          }
        }
      };
    
    case ActionTypes.SET_USERS:
      return {
        ...state,
        admin: {
          ...state.admin,
          users: {
            ...state.admin.users,
            items: action.payload,
            error: null
          }
        }
      };
    
    case ActionTypes.SET_ADMIN_LOADING:
      return {
        ...state,
        admin: {
          ...state.admin,
          [action.payload.section]: {
            ...state.admin[action.payload.section],
            isLoading: action.payload.loading
          }
        }
      };
    
    case ActionTypes.SET_ADMIN_ERROR:
      return {
        ...state,
        admin: {
          ...state.admin,
          [action.payload.section]: {
            ...state.admin[action.payload.section],
            error: action.payload.error,
            isLoading: false
          }
        }
      };
    
    default:
      return state;
  }
};

// Context
const AppStateContext = createContext();

// Provider component
export const AppStateProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const { user } = useAuth();

  // Sync user state with auth context
  useEffect(() => {
    if (user) {
      dispatch({ type: ActionTypes.SET_USER, payload: user });
    } else {
      dispatch({ type: ActionTypes.CLEAR_USER });
    }
  }, [user]);

  // Persist cart to localStorage
  useEffect(() => {
    if (state.cart.items.length > 0) {
      localStorage.setItem('cart', JSON.stringify(state.cart.items));
    }
  }, [state.cart.items]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart);
        dispatch({ type: ActionTypes.SET_CART_ITEMS, payload: cartItems });
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
        localStorage.removeItem('cart');
      }
    }
  }, []);

  // Persist theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', state.ui.theme);
  }, [state.ui.theme]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
      dispatch({ type: ActionTypes.SET_THEME, payload: savedTheme });
    }
  }, []);

  const value = {
    state,
    dispatch,
    
    // Auth actions
    setUser: (user) => dispatch({ type: ActionTypes.SET_USER, payload: user }),
    clearUser: () => dispatch({ type: ActionTypes.CLEAR_USER }),
    
    // Cart actions
    setCartItems: (items) => dispatch({ type: ActionTypes.SET_CART_ITEMS, payload: items }),
    addToCart: (item) => dispatch({ type: ActionTypes.ADD_TO_CART, payload: item }),
    removeFromCart: (item) => dispatch({ type: ActionTypes.REMOVE_FROM_CART, payload: item }),
    updateCartItem: (item) => dispatch({ type: ActionTypes.UPDATE_CART_ITEM, payload: item }),
    clearCart: () => dispatch({ type: ActionTypes.CLEAR_CART }),
    setCartLoading: (loading) => dispatch({ type: ActionTypes.SET_CART_LOADING, payload: loading }),
    setCartError: (error) => dispatch({ type: ActionTypes.SET_CART_ERROR, payload: error }),
    
    // Products actions
    setProducts: (products) => dispatch({ type: ActionTypes.SET_PRODUCTS, payload: products }),
    addProduct: (product) => dispatch({ type: ActionTypes.ADD_PRODUCT, payload: product }),
    updateProduct: (product) => dispatch({ type: ActionTypes.UPDATE_PRODUCT, payload: product }),
    deleteProduct: (id) => dispatch({ type: ActionTypes.DELETE_PRODUCT, payload: id }),
    setProductsLoading: (loading) => dispatch({ type: ActionTypes.SET_PRODUCTS_LOADING, payload: loading }),
    setProductsError: (error) => dispatch({ type: ActionTypes.SET_PRODUCTS_ERROR, payload: error }),
    setProductsFilters: (filters) => dispatch({ type: ActionTypes.SET_PRODUCTS_FILTERS, payload: filters }),
    setProductsPagination: (pagination) => dispatch({ type: ActionTypes.SET_PRODUCTS_PAGINATION, payload: pagination }),
    
    // Orders actions
    setOrders: (orders) => dispatch({ type: ActionTypes.SET_ORDERS, payload: orders }),
    addOrder: (order) => dispatch({ type: ActionTypes.ADD_ORDER, payload: order }),
    updateOrder: (order) => dispatch({ type: ActionTypes.UPDATE_ORDER, payload: order }),
    setOrdersLoading: (loading) => dispatch({ type: ActionTypes.SET_ORDERS_LOADING, payload: loading }),
    setOrdersError: (error) => dispatch({ type: ActionTypes.SET_ORDERS_ERROR, payload: error }),
    setOrdersFilters: (filters) => dispatch({ type: ActionTypes.SET_ORDERS_FILTERS, payload: filters }),
    
    // Notifications actions
    setNotifications: (notifications) => dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: notifications }),
    addNotification: (notification) => dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notification }),
    markNotificationRead: (id) => dispatch({ type: ActionTypes.MARK_NOTIFICATION_READ, payload: id }),
    clearNotifications: () => dispatch({ type: ActionTypes.CLEAR_NOTIFICATIONS }),
    setNotificationsLoading: (loading) => dispatch({ type: ActionTypes.SET_NOTIFICATIONS_LOADING, payload: loading }),
    setNotificationsError: (error) => dispatch({ type: ActionTypes.SET_NOTIFICATIONS_ERROR, payload: error }),
    
    // UI actions
    setTheme: (theme) => dispatch({ type: ActionTypes.SET_THEME, payload: theme }),
    toggleSidebar: () => dispatch({ type: ActionTypes.TOGGLE_SIDEBAR }),
    setLoading: (loading) => dispatch({ type: ActionTypes.SET_LOADING, payload: loading }),
    setModal: (name, open) => dispatch({ type: ActionTypes.SET_MODAL, payload: { name, open } }),
    addAlert: (alert) => dispatch({ type: ActionTypes.ADD_ALERT, payload: { ...alert, id: Date.now() } }),
    removeAlert: (id) => dispatch({ type: ActionTypes.REMOVE_ALERT, payload: id }),
    clearAlerts: () => dispatch({ type: ActionTypes.CLEAR_ALERTS }),
    
    // Admin actions
    setDashboardStats: (stats) => dispatch({ type: ActionTypes.SET_DASHBOARD_STATS, payload: stats }),
    setInventory: (inventory) => dispatch({ type: ActionTypes.SET_INVENTORY, payload: inventory }),
    setUsers: (users) => dispatch({ type: ActionTypes.SET_USERS, payload: users }),
    setAdminLoading: (section, loading) => dispatch({ type: ActionTypes.SET_ADMIN_LOADING, payload: { section, loading } }),
    setAdminError: (section, error) => dispatch({ type: ActionTypes.SET_ADMIN_ERROR, payload: { section, error } })
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

// Custom hook to use the context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

export default AppStateContext;











