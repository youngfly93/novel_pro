"use client";

import { Button } from "@/components/tailwind/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/tailwind/ui/card";
import { ArrowLeft, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PageData {
  title: string;
  content: any;
  createdAt: string;
  updatedAt: string;
}

interface PagesList {
  [slug: string]: PageData;
}

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PagesList>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPages = () => {
      const savedPages = localStorage.getItem('novel-pages');
      if (savedPages) {
        setPages(JSON.parse(savedPages));
      }
      setIsLoading(false);
    };

    loadPages();
  }, []);

  const createNewPage = () => {
    const pageName = prompt("Enter page name:");
    if (pageName && pageName.trim()) {
      const slug = pageName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      router.push(`/page/${slug}`);
    }
  };

  const deletePage = (slug: string) => {
    if (confirm('Are you sure you want to delete this page?')) {
      const updatedPages = { ...pages };
      delete updatedPages[slug];
      localStorage.setItem('novel-pages', JSON.stringify(updatedPages));
      setPages(updatedPages);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const pageEntries = Object.entries(pages).sort(([, a], [, b]) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4 p-4 max-w-screen-lg mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
          
          <h1 className="text-2xl font-semibold flex-1">All Pages</h1>
          
          <Button onClick={createNewPage} className="gap-2">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="max-w-screen-lg mx-auto">
          {pageEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No pages yet</h3>
              <p className="text-gray-600 mb-4">Create your first page to get started</p>
              <Button onClick={createNewPage} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Page
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pageEntries.map(([slug, page]) => (
                <Card key={slug} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate">
                          {page.title || 'Untitled Page'}
                        </CardTitle>
                        <CardDescription className="text-sm">
                          Updated {formatDate(page.updatedAt)}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deletePage(slug);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/page/${slug}`} className="block">
                      <div className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">Open page</span>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}