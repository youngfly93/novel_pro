"use client";

import { Button } from "@/components/tailwind/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/tailwind/ui/card";
import Sidebar from "@/components/sidebar";
import { Menu, FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebar } from "@/contexts/sidebar-context";

interface PageData {
  title: string;
  content: any;
  createdAt: string;
  updatedAt: string;
  parentSlug?: string;
  isSubPage?: boolean;
}

interface PagesList {
  [slug: string]: PageData;
}

export default function PagesListPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PagesList>({});
  const [isLoading, setIsLoading] = useState(true);
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();

  useEffect(() => {
    const loadPages = () => {
      const savedPages = localStorage.getItem("novel-pages");
      if (savedPages) {
        setPages(JSON.parse(savedPages));
      }
      setIsLoading(false);
    };

    loadPages();
  }, []);

  const createNewPage = () => {
    try {
      // Generate a unique slug using timestamp
      const timestamp = Date.now();
      const slug = `untitled-${timestamp}`;

      router.push(`/page/${slug}`);
    } catch (error) {
      console.error("创建页面时出错:", error);
      alert("创建页面失败，请重试");
    }
  };

  const deletePage = (slug: string) => {
    const result = confirm("确定要删除此页面吗？");
    if (result) {
      try {
        const updatedPages = { ...pages };
        delete updatedPages[slug];
        localStorage.setItem("novel-pages", JSON.stringify(updatedPages));
        setPages(updatedPages);
      } catch (error) {
        console.error("删除页面时出错:", error);
        alert("删除页面失败，请重试");
      }
    }
    // 如果用户取消，什么都不做
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const pageEntries = Object.entries(pages).sort(
    ([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : ""}`}>
        {/* Header */}
        <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className={`flex items-center gap-4 ${sidebarOpen ? "px-4 py-4 max-w-none" : "p-4 max-w-4xl mx-auto"}`}>
            <Button variant="ghost" size="sm" onClick={toggleSidebar} className="gap-2">
              <Menu className="h-4 w-4" />
            </Button>

            <h1 className="text-2xl font-semibold flex-1">All Pages</h1>

            <Button onClick={createNewPage} className="gap-2">
              <Plus className="h-4 w-4" />
              New Page
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className={`${sidebarOpen ? "p-4" : "p-4"}`}>
          <div className={`${sidebarOpen ? "max-w-none" : "max-w-4xl mx-auto"}`}>
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
                          <CardTitle className="text-lg truncate">{page.title || "Untitled Page"}</CardTitle>
                          <CardDescription className="text-sm">Updated {formatDate(page.updatedAt)}</CardDescription>
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
    </div>
  );
}
