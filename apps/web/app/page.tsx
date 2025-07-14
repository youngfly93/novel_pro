"use client";

import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import Sidebar from "@/components/sidebar";
import { Menu, GithubIcon } from "lucide-react";
import { useSidebar } from "@/contexts/sidebar-context";
import { useBackground } from "@/contexts/background-context";

export default function Page() {
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebar();
  const { backgroundImage } = useBackground();

  return (
    <div className={`flex min-h-screen ${!backgroundImage ? "bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" : ""}`}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col items-center gap-1 py-2 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : ""}`}
      >
        <div className={`flex w-full max-w-4xl items-center gap-2 mb-1 ${sidebarOpen ? "px-4" : "px-4 sm:px-5"}`}>
          <Button variant="ghost" size="sm" onClick={toggleSidebar} className="gap-2">
            <Menu className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" className="ml-auto">
            <a href="https://github.com/youngfly93/novel_pro.git" target="_blank" rel="noreferrer">
              <GithubIcon />
            </a>
          </Button>
        </div>

        <TailwindAdvancedEditor />
      </div>
    </div>
  );
}
