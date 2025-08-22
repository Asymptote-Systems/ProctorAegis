// FILE: src/components/HTMLEditor.jsx

import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Code, Save, FileText, BookOpen, X, ArrowLeft } from "lucide-react";

const HTMLEditor = ({ value, onChange, onSave, onClose, onPrevious, loading, editingQuestion }) => {
  const [editorValue, setEditorValue] = useState(value || '');
  const [activeView, setActiveView] = useState('split');

  useEffect(() => {
    setEditorValue(value || '');
  }, [value]);

  const handleEditorChange = (newValue) => {
    setEditorValue(newValue || '');
    onChange(newValue || '');
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

  const editorOptions = {
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
    theme: 'vs-light',
    language: 'html'
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white" style={{ zIndex: 9999 }}>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Problem Statement Editor
            </CardTitle>
            <div className="flex items-center gap-2">
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
            <div className="border-b px-4">
              <TabsList className="grid grid-cols-3 max-w-md">
                <TabsTrigger value="split">Split View</TabsTrigger>
                <TabsTrigger value="code">Code Only</TabsTrigger>
                <TabsTrigger value="preview">Preview Only</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="split" className="m-0 h-[calc(100%-4rem)]">
              <div className="grid grid-cols-2 h-full">
                <div className="border-r">
                  <div className="h-8 bg-gray-50 border-b flex items-center px-3">
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
                    theme="vs-light"
                  />
                </div>
                <div className="bg-gray-50">
                  <div className="h-8 bg-gray-100 border-b flex items-center px-3">
                    <Badge variant="outline" className="text-xs">
                      Live Preview
                    </Badge>
                  </div>
                  <div 
                    className="h-[calc(100vh-12rem)] p-4 overflow-auto bg-white problem-statement"
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
                theme="vs-light"
              />
            </TabsContent>

            <TabsContent value="preview" className="m-0 h-[calc(100%-4rem)]">
              <div 
                className="h-[calc(100vh-10rem)] p-6 overflow-auto bg-white problem-statement"
                dangerouslySetInnerHTML={{ __html: editorValue }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HTMLEditor;
