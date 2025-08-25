// FILE: src/components/HTMLEditor.jsx

import React, { useState, useEffect, useContext, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Save, FileText, BookOpen, X, ArrowLeft, Moon, Sun } from "lucide-react";

const HTMLEditor = ({ value, onChange, onSave, onClose, onPrevious, loading, editingQuestion }) => {
  const [editorValue, setEditorValue] = useState(value || '');
  const [activeView, setActiveView] = useState('split');
  const [theme, setTheme] = useState(() => {
    // Load theme from localStorage or default to light
    try {
      return localStorage.getItem('htmleditor_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    setEditorValue(value || '');
  }, [value]);

  // Apply theme to document root
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const handleEditorChange = (newValue) => {
    setEditorValue(newValue || '');
    onChange(newValue || '');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem('htmleditor_theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const insertTemplate = (template) => {
    const templates = {
      basic: `<div class="problem-statement">
  <h2>Problem Title</h2>
  <p>Problem description goes here...</p>
  
  <h3>Input</h3>
  <p>Input description...</p>
  
  <h3>Output</h3>
  <p>Output description...</p>
  
  <h3>Example</h3>
  <pre>Input:
5
1 2 3 4 5

Output:
15</pre>
  
  <h3>Constraints</h3>
  <ul>
    <li>1 ≤ n ≤ 10<sup>5</sup></li>
    <li>1 ≤ a[i] ≤ 10<sup>9</sup></li>
  </ul>
</div>`,

      advanced: `<div class="problem-statement">
  <h1>Advanced Problem Statement</h1>
  
  <div class="section">
    <p>Given an array of integers, find the maximum subarray sum using Kadane's algorithm.</p>
  </div>
  
  <h3>Input Format</h3>
  <p>The first line contains an integer <code>n</code>, the size of the array.</p>
  <p>The second line contains <code>n</code> space-separated integers.</p>
  
  <h3>Output Format</h3>
  <p>Print the maximum subarray sum.</p>
  
  <h3>Sample Input/Output</h3>
  <table class="example-table">
    <tr>
      <th>Input</th>
      <th>Output</th>
      <th>Explanation</th>
    </tr>
    <tr>
      <td><pre>5
-2 1 -3 4 -1</pre></td>
      <td><pre>4</pre></td>
      <td>The subarray [4] has the maximum sum of 4.</td>
    </tr>
    <tr>
      <td><pre>6
-2 -3 4 -1 -2 1</pre></td>
      <td><pre>4</pre></td>
      <td>The subarray [4] has the maximum sum of 4.</td>
    </tr>
  </table>
  
  <h3>Constraints</h3>
  <ul>
    <li><code>1 ≤ n ≤ 10<sup>5</sup></code></li>
    <li><code>-10<sup>9</sup> ≤ arr[i] ≤ 10<sup>9</sup></code></li>
  </ul>
  
  <blockquote>
    <strong>Note:</strong> Try to solve this problem in O(n) time complexity.
  </blockquote>
</div>`
    };

    setEditorValue(templates[template]);
    onChange(templates[template]);
  };

  // Memoized editor options based on theme
  const editorOptions = useMemo(() => ({
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    wordWrap: 'on',
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 16,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 3,
    renderLineHighlight: 'line',
    tabSize: 2,
    insertSpaces: true,
    formatOnPaste: true,
    formatOnType: true,
    language: 'html'
  }), []);

  // Theme-aware CSS classes
  const containerClasses = theme === 'dark'
    ? 'fixed inset-0 z-[9999] bg-gray-900 text-white'
    : 'fixed inset-0 z-[9999] bg-white text-gray-900';

  const headerBgClasses = theme === 'dark'
    ? 'bg-gray-800 border-gray-700'
    : 'bg-gray-50 border-gray-200';

  const previewBgClasses = theme === 'dark'
    ? 'bg-gray-800'
    : 'bg-gray-50';

  const previewContentClasses = theme === 'dark'
    ? 'bg-gray-900 text-white problem-statement-dark'
    : 'bg-white text-gray-900 problem-statement';

  return (
    <div className={containerClasses} style={{ zIndex: 9999 }}>
      <Card className={`h-full ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Problem Statement Editor
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="flex items-center gap-2"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                {theme === 'light' ? 'Dark' : 'Light'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => insertTemplate('basic')}
                className="hidden sm:flex"
              >
                <FileText className="h-4 w-4 mr-1" />
                Basic Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => insertTemplate('advanced')}
                className="hidden sm:flex"
              >
                <BookOpen className="h-4 w-4 mr-1" />
                Advanced Template
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={onSave}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : (editingQuestion ? 'Update' : 'Create')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="h-full p-0">
          <Tabs value={activeView} onValueChange={setActiveView} className="h-full">
            <div className={`border-b px-4 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <TabsList className="grid grid-cols-3 max-w-md">
                <TabsTrigger value="split">Split View</TabsTrigger>
                <TabsTrigger value="code">Code Only</TabsTrigger>
                <TabsTrigger value="preview">Preview Only</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="split" className="m-0 h-[calc(100%-4rem)]">
              <div className="grid grid-cols-2 h-full">
                <div className={`border-r ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className={`h-8 border-b flex items-center px-3 ${headerBgClasses}`}>
                    <Badge variant="outline" className="text-xs">
                      HTML Editor
                    </Badge>
                  </div>
                  <Editor
                    height="calc(100vh - 12rem)"
                    defaultLanguage="html"
                    value={editorValue}
                    onChange={handleEditorChange}
                    options={editorOptions}
                    theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                  />
                </div>
                <div className={previewBgClasses}>
                  <div className={`h-8 border-b flex items-center px-3 ${headerBgClasses}`}>
                    <Badge variant="outline" className="text-xs">
                      Live Preview
                    </Badge>
                  </div>
                  <div
                    className={`h-[calc(100vh-12rem)] p-4 overflow-auto ${previewContentClasses}`}
                    dangerouslySetInnerHTML={{ __html: editorValue }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="m-0 h-[calc(100%-4rem)]">
              <Editor
                height="calc(100vh - 10rem)"
                defaultLanguage="html"
                value={editorValue}
                onChange={handleEditorChange}
                options={{
                  ...editorOptions,
                  minimap: { enabled: true }
                }}
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              />
            </TabsContent>

            <TabsContent value="preview" className="m-0 h-[calc(100%-4rem)]">
              <div
                className={`h-[calc(100vh-10rem)] p-6 overflow-auto ${previewContentClasses}`}
                dangerouslySetInnerHTML={{ __html: editorValue }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add CSS for dark mode problem statement styling */}
      <style jsx global>{`
        .problem-statement-dark {
          color: #e2e8f0;
        }
        
        .problem-statement-dark h1,
        .problem-statement-dark h2,
        .problem-statement-dark h3,
        .problem-statement-dark h4,
        .problem-statement-dark h5,
        .problem-statement-dark h6 {
          color: #f8fafc;
          border-bottom: ${theme === 'dark' ? '1px solid #374151' : 'none'};
        }
        
        .problem-statement-dark code {
          background-color: #374151;
          color: #fbbf24;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        
        .problem-statement-dark pre {
          background-color: #1f2937;
          color: #e5e7eb;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #374151;
          overflow-x: auto;
        }
        
        .problem-statement-dark blockquote {
          border-left: 4px solid #3b82f6;
          background-color: #1e3a8a;
          background-color: rgba(59, 130, 246, 0.1);
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 4px;
        }
        
        .problem-statement-dark table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        
        .problem-statement-dark th,
        .problem-statement-dark td {
          border: 1px solid #374151;
          padding: 8px 12px;
          text-align: left;
        }
        
        .problem-statement-dark th {
          background-color: #374151;
          font-weight: 600;
        }
        
        .problem-statement-dark tr:nth-child(even) {
          background-color: rgba(55, 65, 81, 0.3);
        }
        
        .problem-statement-dark ul,
        .problem-statement-dark ol {
          padding-left: 20px;
        }
        
        .problem-statement-dark li {
          margin: 4px 0;
        }
        
        .problem-statement-dark .section {
          margin: 16px 0;
          padding: 12px;
          background-color: rgba(55, 65, 81, 0.2);
          border-radius: 6px;
        }

        /* Light mode styles */
        .problem-statement {
          color: #1f2937;
        }
        
        .problem-statement h1,
        .problem-statement h2,
        .problem-statement h3,
        .problem-statement h4,
        .problem-statement h5,
        .problem-statement h6 {
          color: #111827;
          margin-top: 24px;
          margin-bottom: 16px;
        }
        
        .problem-statement code {
          background-color: #f3f4f6;
          color: #dc2626;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        
        .problem-statement pre {
          background-color: #f9fafb;
          color: #374151;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          overflow-x: auto;
        }
        
        .problem-statement blockquote {
          border-left: 4px solid #3b82f6;
          background-color: rgba(59, 130, 246, 0.1);
          padding: 12px 16px;
          margin: 16px 0;
          border-radius: 4px;
        }
        
        .problem-statement table {
          border-collapse: collapse;
          width: 100%;
          margin: 16px 0;
        }
        
        .problem-statement th,
        .problem-statement td {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          text-align: left;
        }
        
        .problem-statement th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        
        .problem-statement tr:nth-child(even) {
          background-color: #f9fafb;
        }
        
        .problem-statement ul,
        .problem-statement ol {
          padding-left: 20px;
        }
        
        .problem-statement li {
          margin: 4px 0;
        }
        
        .problem-statement .section {
          margin: 16px 0;
          padding: 12px;
          background-color: #f3f4f6;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
};

export default HTMLEditor;
