import './globals.css';

export const metadata = {
  title: 'Food Decision Maker',
  description: 'App that helps you decide what to eat',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
