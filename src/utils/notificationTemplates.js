// User-facing notification templates for the school product e-commerce system
// These notifications are friendly, clear, and concise

export const notificationTemplates = {
  // Order Updates
  orderConfirmed: (orderId) => ({
    id: `order_confirmed_${orderId}`,
    type: 'order',
    title: 'Order Confirmed',
    message: `Your order #${orderId} has been confirmed and is being prepared.`,
    timestamp: new Date(),
    read: false,
    priority: 'high'
  }),

  orderReady: (orderId) => ({
    id: `order_ready_${orderId}`,
    type: 'order',
    title: 'Ready for Pickup',
    message: `Your order #${orderId} is ready for pickup at the school office.`,
    timestamp: new Date(),
    read: false,
    priority: 'high'
  }),

  orderShipped: (orderId) => ({
    id: `order_shipped_${orderId}`,
    type: 'order',
    title: 'Order Shipped',
    message: `Your order #${orderId} has been shipped and is on its way.`,
    timestamp: new Date(),
    read: false,
    priority: 'medium'
  }),

  // Payment Updates
  paymentPending: (orderId) => ({
    id: `payment_pending_${orderId}`,
    type: 'payment',
    title: 'Payment Pending',
    message: `Payment for order #${orderId} is pending. Please complete your payment.`,
    timestamp: new Date(),
    read: false,
    priority: 'high'
  }),

  paymentSuccess: (orderId) => ({
    id: `payment_success_${orderId}`,
    type: 'payment',
    title: 'Payment Successful',
    message: `Payment for order #${orderId} has been processed successfully.`,
    timestamp: new Date(),
    read: false,
    priority: 'medium'
  }),

  paymentFailed: (orderId) => ({
    id: `payment_failed_${orderId}`,
    type: 'payment',
    title: 'Payment Failed',
    message: `Payment for order #${orderId} failed. Please try again or contact support.`,
    timestamp: new Date(),
    read: false,
    priority: 'high'
  }),

  // Engagement
  thankYou: (orderId) => ({
    id: `thank_you_${orderId}`,
    type: 'engagement',
    title: 'Thank You',
    message: `Thank you for your order #${orderId}. We appreciate your business!`,
    timestamp: new Date(),
    read: false,
    priority: 'low'
  }),

  feedbackRequest: (orderId) => ({
    id: `feedback_request_${orderId}`,
    type: 'engagement',
    title: 'Share Your Experience',
    message: `How was your experience with order #${orderId}? We'd love your feedback!`,
    timestamp: new Date(),
    read: false,
    priority: 'low'
  }),

  // Product Updates
  productBackInStock: (productName) => ({
    id: `product_back_${productName.replace(/\s+/g, '_')}`,
    type: 'product',
    title: 'Back in Stock',
    message: `${productName} is now back in stock and available for order.`,
    timestamp: new Date(),
    read: false,
    priority: 'medium'
  }),

  // System Notifications
  welcomeMessage: () => ({
    id: 'welcome_message',
    type: 'system',
    title: 'Welcome',
    message: 'Welcome to our school product store! Browse our latest uniforms and accessories.',
    timestamp: new Date(),
    read: false,
    priority: 'low'
  }),

  maintenanceNotice: () => ({
    id: 'maintenance_notice',
    type: 'system',
    title: 'Scheduled Maintenance',
    message: 'Our system will be under maintenance tonight from 11 PM to 1 AM.',
    timestamp: new Date(),
    read: false,
    priority: 'medium'
  })
};

// Timestamp formatting utility
export const formatTimestamp = (timestamp) => {
  // Safety check for undefined, null, or invalid timestamp
  if (!timestamp) {
    return 'No date';
  }

  // Convert to Date object if it's not already
  const date = new Date(timestamp);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just Now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (days < 7) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
};

// Generate sample notifications for demo
export const generateSampleNotifications = () => {
  const notifications = [];
  
  // Add some recent notifications
  notifications.push(notificationTemplates.orderConfirmed('ORD202509240001'));
  notifications.push(notificationTemplates.paymentSuccess('ORD202509240001'));
  notifications.push(notificationTemplates.orderReady('ORD202509240002'));
  notifications.push(notificationTemplates.thankYou('ORD202509240002'));
  notifications.push(notificationTemplates.feedbackRequest('ORD202509240001'));
  
  // Add more notifications for pagination testing
  notifications.push(notificationTemplates.orderConfirmed('ORD202509240003'));
  notifications.push(notificationTemplates.paymentSuccess('ORD202509240003'));
  notifications.push(notificationTemplates.orderReady('ORD202509240004'));
  notifications.push(notificationTemplates.thankYou('ORD202509240004'));
  notifications.push(notificationTemplates.feedbackRequest('ORD202509240003'));
  
  notifications.push(notificationTemplates.orderConfirmed('ORD202509240005'));
  notifications.push(notificationTemplates.paymentSuccess('ORD202509240005'));
  notifications.push(notificationTemplates.orderReady('ORD202509240006'));
  notifications.push(notificationTemplates.thankYou('ORD202509240006'));
  notifications.push(notificationTemplates.feedbackRequest('ORD202509240005'));
  
  notifications.push(notificationTemplates.orderConfirmed('ORD202509240007'));
  notifications.push(notificationTemplates.paymentSuccess('ORD202509240007'));
  notifications.push(notificationTemplates.orderReady('ORD202509240008'));
  notifications.push(notificationTemplates.thankYou('ORD202509240008'));
  notifications.push(notificationTemplates.feedbackRequest('ORD202509240007'));
  
  // Add some older notifications
  const olderDate = new Date();
  olderDate.setDate(olderDate.getDate() - 2);
  notifications.push({
    ...notificationTemplates.productBackInStock('PE Uniform'),
    timestamp: olderDate
  });
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  notifications.push({
    ...notificationTemplates.welcomeMessage(),
    timestamp: weekAgo,
    read: true
  });
  
  return notifications;
};
