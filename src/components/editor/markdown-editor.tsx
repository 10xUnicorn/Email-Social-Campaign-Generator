'use client';

import { useState } from 'react';
import { Save, Eye, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface MarkdownEditorProps {
  initialContent?: string;
  onSave?: (content: string) => Promise<void>;
  title?: string;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*?)$/gm, '<h3 className="text-lg font-bold mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.*?)$/gm, '<h2 className="text-xl font-bold mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.*?)$/gm, '<h1 className="text-2xl font-bold mt-8 mb-4">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks (using [\s\S] instead of . with s flag for ES2017 compatibility)
  html = html.replace(/```([\s\S]*?)```/g, '<pre className="bg-gray-800 p-4 rounded overflow-x-auto"><code>$1</code></pre>');

  // Inline code
  html = html.replace(/`(.*?)`/g, '<code className="bg-gray-800 px-2 py-1 rounded text-sm">$1</code>');

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" className="text-blue-400 hover:text-blue-300">$1</a>');

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;

  return html;
}

export function MarkdownEditor({
  initialContent = '',
  onSave,
  title = 'Content Editor',
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave(content);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const previewHtml = markdownToHtml(content);
  const originalHtml = markdownToHtml(initialContent);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          {showPreview && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-sm"
            >
              <Code className="w-4 h-4" />
              {showDiff ? 'Hide Diff' : 'Show Diff'}
            </button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || content === initialContent}
            className="gap-2"
            size="sm"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Editor Container */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Editor Panel */}
        {!showPreview && (
          <Card>
            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-medium">MARKDOWN INPUT</div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter markdown content..."
                className="w-full h-96 bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <div className="text-xs text-gray-500 flex items-center justify-between">
                <span>{content.length} characters</span>
                <span>{content.split('\n').length} lines</span>
              </div>
            </div>
          </Card>
        )}

        {/* Preview Panel */}
        {showPreview ? (
          <Card className="overflow-hidden">
            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-medium">
                {showDiff ? 'DIFF VIEW' : 'PREVIEW'}
              </div>

              {showDiff ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Original */}
                  <div className="space-y-2 pb-4 border-b border-gray-700">
                    <div className="text-xs text-gray-600 font-medium">ORIGINAL</div>
                    <div
                      className="text-sm text-gray-400 prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: originalHtml,
                      }}
                    />
                  </div>

                  {/* Current */}
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400 font-medium">CURRENT</div>
                    <div
                      className="text-sm text-gray-200 prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: previewHtml,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm text-gray-200 prose prose-invert max-w-none max-h-96 overflow-y-auto"
                  dangerouslySetInnerHTML={{
                    __html: previewHtml,
                  }}
                />
              )}
            </div>
          </Card>
        ) : (
          /* Side-by-side preview when not in full preview */
          <Card>
            <div className="space-y-3">
              <div className="text-xs text-gray-500 font-medium">PREVIEW</div>
              <div
                className="text-sm text-gray-200 prose prose-invert max-w-none max-h-96 overflow-y-auto"
                dangerouslySetInnerHTML={{
                  __html: previewHtml,
                }}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Formatting Tips */}
      <Card>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2">HEADERS</div>
            <code className="text-xs text-gray-300 space-y-1">
              <div># Heading 1</div>
              <div>## Heading 2</div>
              <div>### Heading 3</div>
            </code>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2">TEXT</div>
            <code className="text-xs text-gray-300 space-y-1">
              <div>**bold**</div>
              <div>*italic*</div>
              <div>`code`</div>
            </code>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2">LINKS</div>
            <code className="text-xs text-gray-300">
              [text](url)
            </code>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-400 mb-2">BLOCKS</div>
            <code className="text-xs text-gray-300">
              ```code block```
            </code>
          </div>
        </div>
      </Card>
    </div>
  );
}
