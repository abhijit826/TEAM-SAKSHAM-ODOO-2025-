
import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  List, 
  ListOrdered, 
  Smile, 
  Link, 
  Image, 
  AlignLeft, 
  AlignCenter, 
  AlignRight 
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor = ({ value, onChange, placeholder }: RichTextEditorProps) => {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef) return;
    
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // Reset cursor position
    setTimeout(() => {
      if (textareaRef) {
        const newPosition = start + before.length + selectedText.length;
        textareaRef.setSelectionRange(newPosition, newPosition);
        textareaRef.focus();
      }
    }, 0);
  };

  const formatButtons = [
    { icon: Bold, action: () => insertText('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertText('*', '*'), title: 'Italic' },
    { icon: Strikethrough, action: () => insertText('~~', '~~'), title: 'Strikethrough' },
    { icon: List, action: () => insertText('\n- '), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertText('\n1. '), title: 'Numbered List' },
    { icon: Link, action: () => insertText('[', '](url)'), title: 'Link' },
    { icon: Image, action: () => insertText('![alt text](', ')'), title: 'Image' },
    { icon: Smile, action: () => insertText('😊'), title: 'Emoji' },
  ];

  const alignButtons = [
    { icon: AlignLeft, action: () => insertText('\n<div align="left">\n', '\n</div>\n'), title: 'Align Left' },
    { icon: AlignCenter, action: () => insertText('\n<div align="center">\n', '\n</div>\n'), title: 'Align Center' },
    { icon: AlignRight, action: () => insertText('\n<div align="right">\n', '\n</div>\n'), title: 'Align Right' },
  ];

  return (
    <div className="border rounded-md">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/20">
        {formatButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={button.action}
            title={button.title}
            className="p-2 h-8 w-8"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
        
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        {alignButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={button.action}
            title={button.title}
            className="p-2 h-8 w-8"
          >
            <button.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Text Area */}
      <Textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[200px] border-0 resize-none focus-visible:ring-0"
      />
    </div>
  );
};
