import { CartProvider } from '@/context/CartContext';
import { AuthProvider } from '@/context/auth-context';
import { NotificationProvider } from '@/context/NotificationContext';
import { SocketProvider } from '@/context/SocketContext';
import ServerStatusBanner from '@/components/common/ServerStatusBanner';
import { Poppins } from 'next/font/google';
import './globals.css';
import '../styles/sweetalert-custom.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata = {
  title: 'CPC ESSEN',
  description: 'Login page for ESSEN system',
  icons: {
    icon: '/images/cpc.png', // favicon for browsers
    apple: '/images/cpc.png', // iOS home screen
  },
};



export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <ServerStatusBanner />
        <SocketProvider>
          <AuthProvider>
            <CartProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </CartProvider>
          </AuthProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
