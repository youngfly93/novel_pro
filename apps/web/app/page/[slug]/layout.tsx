import type { ReactNode } from 'react';

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // Return empty array - dynamic pages will be handled at runtime
  return [];
}

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return children;
}