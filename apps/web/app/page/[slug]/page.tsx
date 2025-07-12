"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import Sidebar from "@/components/sidebar";
import { Menu, Settings, Share, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PageData {
  title: string;
  content: any;
  createdAt: string;
  updatedAt: string;
  parentSlug?: string;
  isSubPage?: boolean;
}

export default function DynamicPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [isNewPage, setIsNewPage] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [parentPage, setParentPage] = useState<PageData | null>(null);

  // Convert slug back to readable title
  const formatTitle = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  useEffect(() => {
    // Load page data from localStorage
    const loadPageData = () => {
      const savedPages = localStorage.getItem("novel-pages");
      const pages = savedPages ? JSON.parse(savedPages) : {};

      if (pages[slug]) {
        const currentPageData = pages[slug];
        setPageData(currentPageData);
        setTitle(currentPageData.title);
        
        // Load parent page data if this is a sub page
        if (currentPageData.parentSlug && pages[currentPageData.parentSlug]) {
          setParentPage(pages[currentPageData.parentSlug]);
        }
        // Don't show title input, go directly to editor
      } else {
        // Create new page
        const newPage: PageData = {
          title: "Untitled",
          content: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        pages[slug] = newPage;
        localStorage.setItem("novel-pages", JSON.stringify(pages));
        setPageData(newPage);
        setTitle(newPage.title);
        // Don't show title input, go directly to editor
      }
      setIsLoading(false);
    };

    loadPageData();
  }, [slug]);

  const savePageData = (content: any) => {
    if (!pageData) return;

    const savedPages = localStorage.getItem("novel-pages");
    const pages = savedPages ? JSON.parse(savedPages) : {};

    pages[slug] = {
      ...pageData,
      content,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem("novel-pages", JSON.stringify(pages));
    setPageData(pages[slug]);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (pageData) {
      const savedPages = localStorage.getItem("novel-pages");
      const pages = savedPages ? JSON.parse(savedPages) : {};

      pages[slug] = {
        ...pageData,
        title: newTitle,
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem("novel-pages", JSON.stringify(pages));
      setPageData(pages[slug]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col items-center gap-4 py-4 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Header */}
        <div className={`flex flex-col w-full max-w-4xl gap-2 sm:mb-[calc(10vh)] ${sidebarOpen ? 'px-4' : 'px-4 sm:px-5'}`}>
          {/* Top row with menu and actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="gap-2"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-2">
                <Share className="h-4 w-4" />
                Share
              </Button>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>

          {/* Breadcrumb navigation for sub pages */}
          {pageData?.isSubPage && parentPage && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Link 
                href={pageData.parentSlug ? `/page/${pageData.parentSlug}` : '/'}
                className="hover:text-gray-900 transition-colors"
              >
                {parentPage.title || 'Untitled'}
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900">{title || 'Untitled'}</span>
            </div>
          )}

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-semibold bg-transparent border-none outline-none w-full placeholder-gray-400"
            placeholder="Untitled Page"
          />
        </div>

        {/* Editor */}
        <TailwindAdvancedEditor
          initialContent={pageData?.content}
          onUpdate={savePageData}
          pageTitle={title}
          darkMode={false}
        />
      </div>
    </div>
  );
}
