import './globals.css'; // Ensure standard global styles with tailwind imports exist here

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-white antialiased">{children}</body>
    </html>
  );
}