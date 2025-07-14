"use client";

import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/tailwind/ui/button";
import { Home, FileText, Plus, Settings, X, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useBackground } from "@/contexts/background-context";

interface PageData {
  title: string;
  content: unknown;
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
  const { backgroundImage } = useBackground();
  const [pages, setPages] = useState<PagesList>({});
  const [collapsedPages, setCollapsedPages] = useState<Set<string>>(new Set());
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(null);

  const deletePage = useCallback(
    (slug: string, e?: React.MouseEvent | React.KeyboardEvent) => {
      console.log("deletePage called with slug:", slug);
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      try {
        const updatedPages = { ...pages };
        delete updatedPages[slug];
        localStorage.setItem("novel-pages", JSON.stringify(updatedPages));
        setPages(updatedPages);

        // If currently on the deleted page, redirect to home
        if (pathname === `/page/${slug}`) {
          router.push("/");
        }

        // Clear selection after deletion
        setSelectedPageSlug(null);
        console.log("Page deleted successfully:", slug);
      } catch (error) {
        console.error("删除页面时出错:", error);
        // In desktop app, we can't use alert, so just log the error
        console.error("删除页面失败");
      }
    },
    [pages, pathname, router],
  );

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

  // Handle keyboard events for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Delete key is pressed and a page is selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedPageSlug) {
        // Prevent deletion on input fields
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") {
          return;
        }

        // For Tauri desktop app, we need to ensure the sidebar has focus
        const sidebarElement = document.getElementById("sidebar-content");
        if (sidebarElement && !sidebarElement.contains(target)) {
          // If the event target is not within the sidebar, ignore it
          return;
        }

        e.preventDefault();
        e.stopPropagation();
        deletePage(selectedPageSlug);
      }
    };

    // Use capture phase to ensure we get the event first
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [selectedPageSlug, deletePage]);

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
      // Don't close sidebar on desktop
      // onToggle is only called on mobile
    } catch (error) {
      console.error("创建页面时出错:", error);
      alert("创建页面失败，请重试");
    }
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
        fixed top-0 left-0 h-full border-r border-gray-200 z-50 transition-all duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        w-64 flex flex-col
        ${backgroundImage 
          ? "bg-white/70 backdrop-blur-md border-white/30" 
          : "bg-gray-50"
        }
      `}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 transition-colors duration-300 ${
          backgroundImage 
            ? "border-b border-white/30 bg-white/50" 
            : "border-b border-gray-200"
        }`}>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-700" />
            <span className="font-semibold text-gray-900">Novel Pro</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle} className="lg:hidden">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div id="sidebar-content" className="flex-1 overflow-y-auto p-4 space-y-2" tabIndex={-1}>
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
                  <div className={`group flex items-center justify-between rounded-md transition-colors duration-150 px-1 py-1 ${
                    backgroundImage 
                      ? "hover:bg-white/50" 
                      : "hover:bg-gray-100"
                  }`}>
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
                          className={`w-full justify-start gap-3 ${hasSubPages ? "ml-0" : "ml-7"} ${selectedPageSlug === slug ? "ring-2 ring-blue-500" : ""} hover:bg-transparent ${
                            backgroundImage 
                              ? "group-hover:bg-white/30" 
                              : "group-hover:bg-gray-50"
                          }`}
                          onClick={(e) => {
                            setSelectedPageSlug(slug);
                            // Ensure the sidebar content has focus for keyboard events
                            const sidebarElement = document.getElementById("sidebar-content");
                            if (sidebarElement) {
                              sidebarElement.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Delete" || e.key === "Backspace") {
                              e.preventDefault();
                              e.stopPropagation();
                              deletePage(slug, e);
                            }
                          }}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{page.title || "无标题"}</span>
                        </Button>
                      </Link>
                    </div>
                    <button
                      className="h-7 w-7 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      onClick={(e) => {
                        console.log("Delete button clicked for slug:", slug);
                        e.preventDefault();
                        e.stopPropagation();
                        deletePage(slug, e);
                      }}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Sub Pages */}
                  {hasSubPages && !isCollapsed && (
                    <div className="ml-7 space-y-1">
                      {subPagesByParent[slug].map(([subSlug, subPage]) => (
                        <div
                          key={subSlug}
                          className={`group flex items-center justify-between rounded-md transition-colors duration-150 px-1 py-1 ${
                            backgroundImage 
                              ? "hover:bg-white/50" 
                              : "hover:bg-gray-100"
                          }`}
                        >
                          <Link href={`/page/${subSlug}`} className="flex-1">
                            <Button
                              variant={isCurrentPage(`/page/${subSlug}`) ? "secondary" : "ghost"}
                              className={`w-full justify-start gap-3 text-sm ${selectedPageSlug === subSlug ? "ring-2 ring-blue-500" : ""} hover:bg-transparent ${
                                backgroundImage 
                                  ? "group-hover:bg-white/30" 
                                  : "group-hover:bg-gray-50"
                              }`}
                              size="sm"
                              onClick={(e) => {
                                setSelectedPageSlug(subSlug);
                                // Ensure the sidebar content has focus for keyboard events
                                const sidebarElement = document.getElementById("sidebar-content");
                                if (sidebarElement) {
                                  sidebarElement.focus();
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Delete" || e.key === "Backspace") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deletePage(subSlug, e);
                                }
                              }}
                            >
                              <FileText className="h-3 w-3" />
                              <span className="truncate">{subPage.title || "无标题"}</span>
                            </Button>
                          </Link>
                          <button
                            className="h-6 w-6 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                            onClick={(e) => {
                              console.log("Delete button clicked for subSlug:", subSlug);
                              e.preventDefault();
                              e.stopPropagation();
                              deletePage(subSlug, e);
                            }}
                            type="button"
                          >
                            <X className="h-3 w-3" />
                          </button>
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
        <div className={`p-4 space-y-2 transition-colors duration-300 ${
          backgroundImage 
            ? "border-t border-white/30 bg-white/50" 
            : "border-t border-gray-200"
        }`}>
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
