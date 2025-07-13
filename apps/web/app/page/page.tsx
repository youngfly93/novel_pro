"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Generate a unique slug using timestamp
    const timestamp = Date.now();
    const slug = `untitled-${timestamp}`;

    // Immediately redirect to the new page
    router.replace(`/page/${slug}`);
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
    </div>
  );
}
