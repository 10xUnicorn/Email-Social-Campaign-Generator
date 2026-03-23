'use client';

import { useState, useRef } from 'react';
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Link2, Image, Video, Eye, Code, Quote, Minus, Undo2, Redo2, Sparkles, Upload,
} from 'lucide-react';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  platform?: string;
  title?: string;
  onSave?: () => void;
  onCancel?: () => void;
  onImageUpload?: (imageDataUrl: string) => void;
}

const TOOLBAR_GROUPS = [
  {
    items: [
      { icon: Bold, action: 'bold', label: 'Bold', wrap: ['**', '**'] },
      { icon: Italic, action: 'italic', label: 'Italic', wrap: ['*', '*'] },
      { icon: Code, action: 'code', label: 'Code', wrap: ['`', '`'] },
    ],
  },
  {
    items: [
      { icon: Heading1, action: 'h1', label: 'Heading 1', prefix: '# ' },
      { icon: Heading2, action: 'h2', label: 'Heading 2', prefix: '## ' },
      { icon: Quote, action: 'quote', label: 'Quote', prefix: '> ' },
    ],
  },
  {
    items: [
      { icon: List, action: 'ul', label: 'Bullet List', prefix: '- ' },
      { icon: ListOrdered, action: 'ol', label: 'Numbered List', prefix: '1. ' },
      { icon: Minus, action: 'hr', label: 'Divider', insert: '\n---\n' },
    ],
  },
  {
    items: [
      { icon: Link2, action: 'link', label: 'Link', wrap: ['[', '](url)'] },
      { icon: Image, action: 'image', label: 'Image', insert: '![Alt text](image-url)' },
      { icon: Video, action: 'video', label: 'Video embed', insert: '\n<!-- video: url -->\n' },
    ],
  },
];

function markdownToHtml(md: string): string {
  let html = md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-100">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-5 mb-2 text-gray-100">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-gray-100">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code
    .replace(/`(.+?)`/g, '<code class="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-300 text-sm font-mono">$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-violet-400 underline hover:text-violet-300" target="_blank">$1</a>')
    // Images
    .replace(/!\[(.+?)\]\((.+?)\)/g, '<div class="my-3 rounded-xl overflow-hidden border border-white/[0.06]"><img src="$2" alt="$1" class="w-full" /><p class="text-xs text-gray-600 px-3 py-2">$1</p></div>')
    // HR
    .replace(/^---$/gm, '<hr class="border-white/[0.06] my-4" />')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-violet-500/30 pl-4 text-gray-400 italic my-2">$1</blockquote>')
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-300 mb-1">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-300 mb-1">$1</li>')
    // Paragraphs (lines that aren't already wrapped)
    .replace(/^(?!<[hbluodia]|<hr|<li|<code)(.+)$/gm, '<p class="text-gray-300 mb-2 leading-relaxed">$1</p>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="my-2">$1</ul>');

  return html;
}

const PLATFORM_HINTS: Record<string, { maxChars?: number; label: string; tips: string[] }> = {
  wordpress: { label: 'WordPress', tips: ['Full HTML supported', 'SEO meta recommended', 'Featured image helps CTR'] },
  'forem-dev': { maxChars: 10000, label: 'DEV.to', tips: ['Markdown only', 'Use canonical URL', 'Add 4 relevant tags'] },
  medium: { label: 'Medium', tips: ['Markdown converted to rich text', 'Strong opening hook', 'Include 1-2 images'] },
  mastodon: { maxChars: 500, label: 'Mastodon', tips: ['500 char limit', 'Use hashtags', 'No markdown rendering'] },
  bluesky: { maxChars: 300, label: 'Bluesky', tips: ['300 char limit', 'Link cards auto-generate', 'Keep it punchy'] },
  linkedin: { maxChars: 3000, label: 'LinkedIn', tips: ['3000 char limit', 'First 2 lines = hook', 'Use line breaks for readability'] },
  twitter: { maxChars: 280, label: 'X / Twitter', tips: ['280 char limit', 'Thread format recommended', 'Hashtags optional'] },
  rss: { label: 'RSS Feed', tips: ['Full content in feed', 'Include featured image', 'Valid XML required'] },
  press_release: { label: 'Press Release', tips: ['AP style formatting', 'Lead with who/what/when/where', 'Include boilerplate'] },
  default: { label: 'General', tips: ['Keep it concise', 'Strong CTA', 'Proofread before publish'] },
};

export function RichEditor({ content, onChange, platform, title, onSave, onCancel, onImageUpload }: RichEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiAction = async (action: 'generate' | 'improve' | 'rewrite' | 'shorten' | 'expand') => {
    setAiLoading(true);
    setAiMenuOpen(false);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Untitled',
          platform: platform || 'default',
          currentContent: content,
          action,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.content) onChange(data.content);
      }
    } catch { /* silently fail */ }
    setAiLoading(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

      // Insert markdown image syntax
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const altText = file.name.replace(/\.[^.]+$/, '');
        const imageMarkdown = `![${altText}](${dataUrl})`;
        const newContent = content.substring(0, start) + imageMarkdown + content.substring(end);
        onChange(newContent);

        // Notify parent if callback provided
        if (onImageUpload) {
          onImageUpload(dataUrl);
        }

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + imageMarkdown.length, start + imageMarkdown.length);
        }, 0);
      }
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const platformInfo = PLATFORM_HINTS[platform || 'default'] || PLATFORM_HINTS.default;
  const charCount = content.length;
  const isOverLimit = platformInfo.maxChars ? charCount > platformInfo.maxChars : false;

  const applyAction = (action: any) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    let newContent = content;
    let newCursorPos = start;

    if (action.wrap) {
      const [before, after] = action.wrap;
      newContent = content.substring(0, start) + before + (selected || 'text') + after + content.substring(end);
      newCursorPos = start + before.length + (selected || 'text').length + after.length;
    } else if (action.prefix) {
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      newContent = content.substring(0, lineStart) + action.prefix + content.substring(lineStart);
      newCursorPos = start + action.prefix.length;
    } else if (action.insert) {
      newContent = content.substring(0, start) + action.insert + content.substring(end);
      newCursorPos = start + action.insert.length;
    }

    onChange(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="space-y-3">
      {/* Platform hint bar */}
      {platform && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-violet-500/5 border border-violet-500/10">
          <span className="text-xs font-semibold text-violet-400">{platformInfo.label}</span>
          <span className="text-xs text-gray-600">|</span>
          {platformInfo.tips.map((tip, i) => (
            <span key={i} className="text-xs text-gray-500">{tip}</span>
          ))}
          {platformInfo.maxChars && (
            <>
              <span className="text-xs text-gray-600 ml-auto">|</span>
              <span className={`text-xs font-mono ${isOverLimit ? 'text-red-400' : 'text-gray-500'}`}>
                {charCount}/{platformInfo.maxChars}
              </span>
            </>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex-wrap">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload Image"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="w-px h-5 bg-white/[0.06] mx-1" />
        </div>

        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {gi > 0 && <div className="w-px h-5 bg-white/[0.06] mx-1" />}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.action}
                  onClick={() => applyAction(item)}
                  title={item.label}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        ))}

        <div className="ml-auto flex items-center gap-1">
          {/* AI Actions */}
          <div className="relative">
            <button
              onClick={() => setAiMenuOpen(!aiMenuOpen)}
              disabled={aiLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                aiLoading
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse'
                  : 'bg-gradient-to-r from-amber-600/20 to-yellow-500/20 text-amber-300 border border-amber-500/15 hover:border-amber-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiLoading ? 'Generating…' : 'AI'}
            </button>
            {aiMenuOpen && !aiLoading && (
              <div className="absolute right-0 top-full mt-1.5 w-44 glass-card rounded-xl border-white/[0.1] shadow-2xl z-50 py-1">
                {[
                  { action: 'generate' as const, label: 'Generate New', icon: '✨' },
                  { action: 'improve' as const, label: 'Improve', icon: '🔧' },
                  { action: 'rewrite' as const, label: 'Rewrite', icon: '🔄' },
                  { action: 'shorten' as const, label: 'Shorten', icon: '✂️' },
                  { action: 'expand' as const, label: 'Expand', icon: '📝' },
                ].map((item) => (
                  <button
                    key={item.action}
                    onClick={() => handleAiAction(item.action)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/[0.04] hover:text-white transition-all"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showPreview
                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="min-h-[300px] p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] prose-invert max-w-none overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          rows={14}
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-200 placeholder-gray-700 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 resize-y font-mono text-sm leading-relaxed"
          placeholder="Write your content in Markdown..."
        />
      )}

      {/* Actions */}
      {(onSave || onCancel) && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-700">
            Markdown supported &middot; {content.split(/\s+/).filter(Boolean).length} words
          </div>
          <div className="flex gap-2">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-white/[0.08] transition-all"
              >
                Cancel
              </button>
            )}
            {onSave && (
              <button
                onClick={onSave}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-purple-600/20 border border-purple-500/20 transition-all"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
