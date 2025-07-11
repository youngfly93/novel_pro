"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import { ArrowLeft, Settings, Share } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PageData {
  title: string;
  content: any;
  createdAt: string;
  updatedAt: string;
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

  // Convert slug back to readable title
  const formatTitle = (slug: string) => {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    // Load page data from localStorage
    const loadPageData = () => {
      const savedPages = localStorage.getItem('novel-pages');
      const pages = savedPages ? JSON.parse(savedPages) : {};
      
      if (pages[slug]) {
        setPageData(pages[slug]);
        setTitle(pages[slug].title);
        // Don't show title input, go directly to editor
      } else {
        // Create new page
        const newPage: PageData = {
          title: 'Untitled',
          content: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        pages[slug] = newPage;
        localStorage.setItem('novel-pages', JSON.stringify(pages));
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
    
    const savedPages = localStorage.getItem('novel-pages');
    const pages = savedPages ? JSON.parse(savedPages) : {};
    
    pages[slug] = {
      ...pageData,
      content,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('novel-pages', JSON.stringify(pages));
    setPageData(pages[slug]);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (pageData) {
      const savedPages = localStorage.getItem('novel-pages');
      const pages = savedPages ? JSON.parse(savedPages) : {};
      
      pages[slug] = {
        ...pageData,
        title: newTitle,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('novel-pages', JSON.stringify(pages));
      setPageData(pages[slug]);
    }
  };

  const handleTitleSubmit = () => {
    if (title.trim() === '') {
      setTitle('Untitled');
      handleTitleChange('Untitled');
    } else {
      handleTitleChange(title);
    }
    setShowTitleInput(false);
    setIsNewPage(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4 max-w-screen-lg mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')}
            className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
          
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-2xl font-semibold bg-transparent border-none outline-none flex-1 text-white placeholder-gray-400"
            placeholder="Untitled Page"
          />
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700">
              <Share className="h-4 w-4" />
              Share
            </Button>
            <Link href="/settings">
              <Button variant="ghost" size="sm" className="gap-2 text-gray-300 hover:text-white hover:bg-gray-700">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 p-4 bg-gray-900">
        <div className="max-w-screen-lg mx-auto">
          <TailwindAdvancedEditor 
            initialContent={pageData?.content}
            onUpdate={savePageData}
            pageTitle={title}
            darkMode={true}
          />
        </div>
      </div>
    </div>
  );
}