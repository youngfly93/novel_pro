"use client";

import { useState } from "react";
import TailwindAdvancedEditor from "@/components/tailwind/advanced-editor";
import { Button } from "@/components/tailwind/ui/button";
import Sidebar from "@/components/sidebar";
import { Menu, GithubIcon } from "lucide-react";

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Content */}
      <div className={`flex-1 flex flex-col items-center gap-4 py-4 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className={`flex w-full max-w-4xl items-center gap-2 sm:mb-[calc(10vh)] ${sidebarOpen ? 'px-4' : 'px-4 sm:px-5'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gap-2"
          >
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
