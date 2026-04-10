import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'Forest BD Viewer',
    description: 'French forest data visualization',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="h-full" suppressHydrationWarning>
        <body
            className={`${inter.className} h-full overflow-hidden antialiased`}
            suppressHydrationWarning
        >
        <Providers>{children}</Providers>
        </body>
        </html>
    );
}