"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/tailwind/ui/button";
import { Home, FileText, Plus, Settings, X, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

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

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pages, setPages] = useState<PagesList>({});
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadPages = () => {
      const savedPages = localStorage.getItem("novel-pages");
      if (savedPages) {
        setPages(JSON.parse(savedPages));
      }
    };

    const loadCollapsedState = () => {
      const savedCollapsedState = localStorage.getItem("novel-collapsed-pages");
      if (savedCollapsedState) {
        setCollapsedPages(new Set(JSON.parse(savedCollapsedState)));
      }
    };

    loadPages();
    loadCollapsedState();

    // Listen for storage changes to update pages list
    const handleStorageChange = () => {
      loadPages();
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check periodically for changes from the same tab
    const interval = setInterval(loadPages, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const togglePageCollapse = (slug: string) => {
    const newCollapsedPages = new Set(collapsedPages);
    if (newCollapsedPages.has(slug)) {
      newCollapsedPages.delete(slug);
    } else {
      newCollapsedPages.add(slug);
    }
    setCollapsedPages(newCollapsedPages);
    localStorage.setItem("novel-collapsed-pages", JSON.stringify(Array.from(newCollapsedPages)));
  };

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

  const deletePage = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const result = confirm("确定要删除此页面吗？");
    if (result) {
      try {
        const updatedPages = { ...pages };
        delete updatedPages[slug];
        localStorage.setItem("novel-pages", JSON.stringify(updatedPages));
        setPages(updatedPages);

        // If currently on the deleted page, redirect to home
        if (pathname === `/page/${slug}`) {
          router.push("/");
        }
      } catch (error) {
        console.error("删除页面时出错:", error);
        alert("删除页面失败，请重试");
      }
    }
    // 如果用户取消，什么都不做
  };

  const isCurrentPage = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path.startsWith("/page/") && pathname === path) return true;
    return false;
  };

  // Organize pages into hierarchy
  const allPageEntries = Object.entries(pages);

  // Get parent pages
  const parentPages = allPageEntries
    .filter(([, page]) => !page.isSubPage)
    .sort(([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Get sub pages grouped by parent
  const subPagesByParent = allPageEntries
    .filter(([, page]) => page.isSubPage && page.parentSlug)
    .reduce(
      (acc, [slug, page]) => {
        const parentSlug = page.parentSlug!;
        if (!acc[parentSlug]) acc[parentSlug] = [];
        acc[parentSlug].push([slug, page]);
        return acc;
      },
      {} as Record<string, [string, PageData][]>,
    );

  // Sort sub pages by update time
  Object.keys(subPagesByParent).forEach((parentSlug) => {
    subPagesByParent[parentSlug].sort(
      ([, a], [, b]) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  });

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
          onKeyDown={(e) => e.key === "Escape" && onToggle()}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
        fixed top-0 left-0 h-full bg-gray-50 border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        w-64 flex flex-col
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-700" />
            <span className="font-semibold text-gray-900">Novel Pro</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="lg:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Home */}
          <Link href="/">
            <Button variant={isCurrentPage("/") ? "secondary" : "ghost"} className="w-full justify-start gap-3">
              <Home className="h-4 w-4" />
              主页
            </Button>
          </Link>

          {/* Main Pages with Hierarchy */}
          <div className="space-y-1">
            {parentPages.map(([slug, page]) => {
              const hasSubPages = subPagesByParent[slug] && subPagesByParent[slug].length > 0;
              const isCollapsed = collapsedPages.has(slug);

              return (
                <div key={slug} className="space-y-1">
                  {/* Parent Page */}
                  <div className="group flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      {/* Collapse/Expand Button */}
                      {hasSubPages && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-gray-200"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            togglePageCollapse(slug);
                          }}
                        >
                          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      )}
                      {/* Page Link */}
                      <Link href={`/page/${slug}`} className="flex-1">
                        <Button
                          variant={isCurrentPage(`/page/${slug}`) ? "secondary" : "ghost"}
                          className={`w-full justify-start gap-3 ${hasSubPages ? "ml-0" : "ml-7"}`}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{page.title || "无标题"}</span>
                        </Button>
                      </Link>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-red-500 hover:text-red-700"
                      onClick={(e) => deletePage(slug, e)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Sub Pages */}
                  {hasSubPages && !isCollapsed && (
                    <div className="ml-7 space-y-1">
                      {subPagesByParent[slug].map(([subSlug, subPage]) => (
                        <div key={subSlug} className="group flex items-center justify-between">
                          <Link href={`/page/${subSlug}`} className="flex-1">
                            <Button
                              variant={isCurrentPage(`/page/${subSlug}`) ? "secondary" : "ghost"}
                              className="w-full justify-start gap-3 text-sm"
                              size="sm"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="truncate">{subPage.title || "无标题"}</span>
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            onClick={(e) => deletePage(subSlug, e)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-gray-500 hover:text-gray-700 mt-2"
              onClick={createNewPage}
            >
              <Plus className="h-4 w-4" />
              添加页面
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start gap-3">
              <Settings className="h-4 w-4" />
              设置
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
