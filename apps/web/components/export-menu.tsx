"use client";

import { useState } from "react";
import { Button } from "@/components/tailwind/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/tailwind/ui/dropdown-menu";
import { Download, FileText, File } from "lucide-react";
import { exportToMarkdown, exportToPDF } from "@/lib/export-utils";

interface ExportMenuProps {
  title: string;
  content: any;
  pageSlug: string;
}

export default function ExportMenu({ title, content, pageSlug }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportMarkdown = async () => {
    try {
      setIsExporting(true);
      await exportToMarkdown(title, content, pageSlug);
    } catch (error) {
      console.error("导出Markdown失败:", error);
      alert("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      await exportToPDF(title, content, pageSlug);
    } catch (error) {
      console.error("导出PDF失败:", error);
      alert("导出失败，请重试");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2" disabled={isExporting}>
          <Download className="h-4 w-4" />
          {isExporting ? "导出中..." : "导出"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportMarkdown} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2" />
          导出为 Markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
          <File className="h-4 w-4 mr-2" />
          导出为 PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
