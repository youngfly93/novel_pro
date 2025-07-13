// We'll create our own HTML generation since tiptap/html has version conflicts

// Convert TipTap JSON to HTML
function jsonToHTML(json: any): string {
  if (!json || !json.content) return "";

  function processNode(node: any): string {
    if (!node) return "";

    switch (node.type) {
      case "doc":
        return node.content?.map(processNode).join("") || "";

      case "heading":
        const level = node.attrs?.level || 1;
        const headingText = node.content?.map(processNode).join("") || "";
        return `<h${level}>${headingText}</h${level}>`;

      case "paragraph":
        const paragraphText = node.content?.map(processNode).join("") || "";
        return `<p>${paragraphText}</p>`;

      case "text":
        let text = node.text || "";

        // Apply text formatting
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                text = `<strong>${text}</strong>`;
                break;
              case "italic":
                text = `<em>${text}</em>`;
                break;
              case "code":
                text = `<code>${text}</code>`;
                break;
              case "strike":
                text = `<s>${text}</s>`;
                break;
              case "underline":
                text = `<u>${text}</u>`;
                break;
              case "link":
                const href = mark.attrs?.href || "";
                text = `<a href="${href}">${text}</a>`;
                break;
            }
          }
        }
        return text;

      case "codeBlock":
        const language = node.attrs?.language || "";
        const codeText = node.content?.map(processNode).join("") || "";
        return `<pre><code class="language-${language}">${codeText}</code></pre>`;

      case "blockquote":
        const quoteText = node.content?.map(processNode).join("") || "";
        return `<blockquote>${quoteText}</blockquote>`;

      case "bulletList":
        const bulletItems = node.content?.map(processNode).join("") || "";
        return `<ul>${bulletItems}</ul>`;

      case "orderedList":
        const orderedItems = node.content?.map(processNode).join("") || "";
        return `<ol>${orderedItems}</ol>`;

      case "listItem":
        const itemText = node.content?.map(processNode).join("") || "";
        return `<li>${itemText}</li>`;

      case "hardBreak":
        return "<br>";

      case "horizontalRule":
        return "<hr>";

      case "image":
        const src = node.attrs?.src || "";
        const alt = node.attrs?.alt || "";
        const title = node.attrs?.title || "";
        return `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ""}>`;

      case "table":
        if (!node.content) return "";
        const tableRows = node.content.map(processNode).join("");
        return `<table>${tableRows}</table>`;

      case "tableRow":
        const tableCells = node.content?.map(processNode).join("") || "";
        return `<tr>${tableCells}</tr>`;

      case "tableCell":
        const cellContent = node.content?.map(processNode).join("") || "";
        return `<td>${cellContent}</td>`;

      case "tableHeader":
        const headerContent = node.content?.map(processNode).join("") || "";
        return `<th>${headerContent}</th>`;

      default:
        // For unknown nodes, try to process content
        if (node.content) {
          return node.content.map(processNode).join("");
        }
        return "";
    }
  }

  return processNode(json);
}

// Convert TipTap JSON to Markdown
function jsonToMarkdown(json: any): string {
  if (!json || !json.content) return "";

  function processNode(node: any): string {
    if (!node) return "";

    switch (node.type) {
      case "doc":
        return node.content?.map(processNode).join("\n\n") || "";

      case "heading":
        const level = node.attrs?.level || 1;
        const headingText = node.content?.map(processNode).join("") || "";
        return "#".repeat(level) + " " + headingText;

      case "paragraph":
        const paragraphText = node.content?.map(processNode).join("") || "";
        return paragraphText || "";

      case "text":
        let text = node.text || "";

        // Apply text formatting
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case "bold":
                text = `**${text}**`;
                break;
              case "italic":
                text = `*${text}*`;
                break;
              case "code":
                text = `\`${text}\``;
                break;
              case "strike":
                text = `~~${text}~~`;
                break;
              case "underline":
                text = `<u>${text}</u>`;
                break;
              case "link":
                const href = mark.attrs?.href || "";
                text = `[${text}](${href})`;
                break;
            }
          }
        }
        return text;

      case "codeBlock":
        const language = node.attrs?.language || "";
        const codeText = node.content?.map(processNode).join("") || "";
        return "```" + language + "\n" + codeText + "\n```";

      case "blockquote":
        const quoteText = node.content?.map(processNode).join("\n") || "";
        return quoteText
          .split("\n")
          .map((line) => "> " + line)
          .join("\n");

      case "bulletList":
        return (
          node.content
            ?.map((item: any, index: number) => {
              const itemText = processNode(item);
              return "- " + itemText;
            })
            .join("\n") || ""
        );

      case "orderedList":
        return (
          node.content
            ?.map((item: any, index: number) => {
              const itemText = processNode(item);
              return `${index + 1}. ${itemText}`;
            })
            .join("\n") || ""
        );

      case "listItem":
        return node.content?.map(processNode).join("") || "";

      case "hardBreak":
        return "\n";

      case "horizontalRule":
        return "---";

      case "image":
        const src = node.attrs?.src || "";
        const alt = node.attrs?.alt || "";
        const title = node.attrs?.title || "";
        return `![${alt}](${src}${title ? ` "${title}"` : ""})`;

      case "table":
        if (!node.content) return "";

        let tableMarkdown = "";
        let isFirstRow = true;

        for (const row of node.content) {
          if (row.type === "tableRow") {
            const cells =
              row.content?.map((cell: any) => {
                return cell.content?.map(processNode).join("") || "";
              }) || [];

            tableMarkdown += "| " + cells.join(" | ") + " |\n";

            // Add header separator after first row
            if (isFirstRow) {
              tableMarkdown += "| " + cells.map(() => "---").join(" | ") + " |\n";
              isFirstRow = false;
            }
          }
        }

        return tableMarkdown;

      default:
        // For unknown nodes, try to process content
        if (node.content) {
          return node.content.map(processNode).join("");
        }
        return "";
    }
  }

  return processNode(json);
}

// Export to Markdown
export async function exportToMarkdown(title: string, content: any, pageSlug: string) {
  try {
    let markdown = "";

    // Add title as main heading
    if (title && title !== "Untitled") {
      markdown += `# ${title}\n\n`;
    }

    // Convert content to markdown
    if (content) {
      const contentMarkdown = jsonToMarkdown(content);
      if (contentMarkdown.trim()) {
        markdown += contentMarkdown;
      }
    }

    // If no content, add a note
    if (!markdown.trim()) {
      markdown = `# ${title || "Untitled"}\n\n*此页面暂无内容*`;
    }

    // Create and download file
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title || pageSlug || "untitled"}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Export to Markdown failed:", error);
    throw error;
  }
}

// Export to PDF
export async function exportToPDF(title: string, content: any, pageSlug: string) {
  try {
    // Generate HTML from TipTap JSON
    let html = "";

    if (content) {
      html = jsonToHTML(content);
    }

    // Create a complete HTML document for PDF generation
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title || "Untitled"}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        h1, h2, h3, h4, h5, h6 {
            color: #2d3748;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }
        h1 { font-size: 2em; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.3em; }
        p { margin-bottom: 1em; }
        pre {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 1em;
            overflow-x: auto;
        }
        code {
            background: #edf2f7;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
        }
        blockquote {
            border-left: 4px solid #4299e1;
            padding-left: 1em;
            margin-left: 0;
            color: #4a5568;
            font-style: italic;
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 0.5em 1em;
            text-align: left;
        }
        th {
            background: #f7fafc;
            font-weight: 600;
        }
        ul, ol {
            padding-left: 2em;
        }
        li {
            margin-bottom: 0.5em;
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
        }
        .page-title {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 1em;
            color: #1a202c;
            text-align: center;
        }
        .ghost-text {
            display: none;
        }
        .ghost-text-container {
            display: none;
        }
        @media print {
            body { padding: 20px; }
            .page-title { page-break-after: avoid; }
        }
    </style>
</head>
<body>
    ${title && title !== "Untitled" ? `<div class="page-title">${title}</div>` : ""}
    ${html || "<p><em>此页面暂无内容</em></p>"}
</body>
</html>`;

    // Open in new window for printing/PDF saving
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("无法打开打印窗口，请检查浏览器弹窗设置");
    }

    printWindow.document.write(fullHtml);
    printWindow.document.close();

    // Wait for content to load, then trigger print dialog
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close window after print dialog
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 500);
    };
  } catch (error) {
    console.error("Export to PDF failed:", error);
    throw error;
  }
}
