import './globals.css';

export const metadata = {
  title: 'PlastiFlow',
  description: 'Order tracking for plastic moulding businesses',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
