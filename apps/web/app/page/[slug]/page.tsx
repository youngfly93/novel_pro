import DynamicPageClient from "./page-client";

// Required for static export with dynamic routes
export async function generateStaticParams() {
  // Return empty array - dynamic pages will be handled at runtime
  return [];
}

export default function DynamicPage() {
  return <DynamicPageClient />;
}
