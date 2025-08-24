import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Play, Square, FileCheck, AlertTriangle, Save, CheckCircle, Moon, Sun } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { toast } from "sonner";

// Shadcn UI Components
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from '@/components/ui/resizable';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = "student_exam_progress";
const THEME_STORAGE_KEY = "student_exam_theme";
const AUTO_SAVE_INTERVAL = 3000; // 3 seconds
const SAVE_DEBOUNCE_DELAY = 1000; // 1 second

// Mock exam data - Replace this with API call to fetch exam data
const examData = {
  id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", // Mock exam ID
  title: "Data Structures & Algorithms Final Exam",
  duration: 120, // minutes
  totalQuestions: 5,
  currentQuestion: 1,
  questions: [
    {
      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6", // Mock question ID
      title: "Reverse a Linked List",
      difficulty: "Medium",
      description: "Write a function to reverse a singly linked list iteratively.",
      example: `Input: [1,2,3,4,5]
Output: [5,4,3,2,1]

Explanation: The linked list is reversed.`,
      testCases: [
        { input: "[1,2,3]", output: "[3,2,1]" },
        { input: "[1,2]", output: "[2,1]" },
        { input: "[]", output: "[]" }
      ]
    },
    {
      id: "4fa85f64-5717-4562-b3fc-2c963f66afa7", // Mock question ID
      title: "Binary Tree Traversal",
      difficulty: "Easy",
      description: "Implement inorder traversal of a binary tree.",
      example: `Input: [1,null,2,3]
Output: [1,3,2]`,
      testCases: []
    },
    {
      id: "5fa85f64-5717-4562-b3fc-2c963f66afa8", // Mock question ID
      title: "Find the Kth Largest Element",
      difficulty: "Medium",
      description: "Given an array, find the Kth largest element in it.",
      example: `Input: [3,2,1,5,6,4], K = 2
Output: 5`,
      testCases: []
    }
  ]
};

// Mock student ID - In a real app, this would come from authentication
const STUDENT_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

const Student_UI = () => {
  // Load persisted state from localStorage with better error handling
  const loadPersistedState = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      return {};
    }
  };

  // Load theme preference from localStorage
  const loadThemePreference = () => {
    try {
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      return storedTheme || 'light';
    } catch (error) {
      console.warn('Failed to load theme preference:', error);
      return 'light';
    }
  };

  const persisted = loadPersistedState();

  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(persisted.currentQuestionIndex || 0);
  const [code, setCode] = useState(persisted.code || '');
  const [language, setLanguage] = useState(persisted.language || 'javascript');
  const [timeLeft, setTimeLeft] = useState(persisted.timeLeft || 5400); // 90 minutes fallback
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState('');
  const [savedAnswers, setSavedAnswers] = useState(persisted.savedAnswers || {});
  const [submittedAnswers, setSubmittedAnswers] = useState(persisted.submittedAnswers || {});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState(loadThemePreference());
  
  // Auto-save related state
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastSavedTime, setLastSavedTime] = useState(persisted.lastSavedTime || Date.now());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Exam session state
  const [examSessionId] = useState(persisted.examSessionId || generateUUID());
  const [attemptNumbers, setAttemptNumbers] = useState(persisted.attemptNumbers || {});
  
  // Refs for debouncing and intervals
  const autoSaveIntervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastCodeRef = useRef(code);

  const currentQuestion = examData.questions[currentQuestionIndex];

  // Check if current question is submitted (read-only)
  const isCurrentQuestionSubmitted = submittedAnswers.hasOwnProperty(currentQuestion.id);
  const isCurrentQuestionReadOnly = isCurrentQuestionSubmitted;

  // Generate a UUID for exam session and submissions
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Enhanced persistence with error handling
  const persistState = useCallback((state) => {
    try {
      const stateToSave = {
        currentQuestionIndex,
        code,
        language,
        timeLeft,
        savedAnswers,
        submittedAnswers,
        lastSavedTime: Date.now(),
        examSessionId,
        attemptNumbers,
        ...state
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.error('Failed to persist state:', error);
      setAutoSaveStatus('error');
      return false;
    }
  }, [currentQuestionIndex, code, language, timeLeft, savedAnswers, submittedAnswers, examSessionId, attemptNumbers]);

  // Save theme preference
  const saveThemePreference = (newTheme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    saveThemePreference(newTheme);
  };

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Auto-save function with improved error handling (skip if read-only)
  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || isCurrentQuestionReadOnly) return;
    
    setAutoSaveStatus('saving');
    
    try {
      // Update saved answers with current code
      const updatedSavedAnswers = {
        ...savedAnswers,
        [currentQuestion.id]: code
      };
      
      setSavedAnswers(updatedSavedAnswers);
      
      // Persist to localStorage
      const success = persistState({
        savedAnswers: updatedSavedAnswers,
        lastSavedTime: Date.now()
      });
      
      if (success) {
        setAutoSaveStatus('saved');
        setLastSavedTime(Date.now());
        setHasUnsavedChanges(false);
        
        // TODO: Replace with actual API call for backend persistence
        // await saveToBackend(currentQuestion.id, code, language);
        
        // Reset status after showing success briefly
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [code, currentQuestion.id, savedAnswers, hasUnsavedChanges, persistState, isCurrentQuestionReadOnly]);

  // Debounced save function
  const debouncedAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(performAutoSave, SAVE_DEBOUNCE_DELAY);
  }, [performAutoSave]);

  // Set up auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && !isCurrentQuestionReadOnly) {
        performAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [performAutoSave, hasUnsavedChanges, isCurrentQuestionReadOnly]);

  // Track code changes for auto-save (only if not read-only)
  useEffect(() => {
    if (!isCurrentQuestionReadOnly && lastCodeRef.current !== code) {
      setHasUnsavedChanges(true);
      lastCodeRef.current = code;
      debouncedAutoSave();
    }
  }, [code, debouncedAutoSave, isCurrentQuestionReadOnly]);

  // Persist state on any change
  useEffect(() => {
    persistState();
  }, [persistState]);

  // Handle browser close/refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && !isCurrentQuestionReadOnly) {
        performAutoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, performAutoSave, isCurrentQuestionReadOnly]);

  const handleResetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  // Timer countdown effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load saved answer when question changes
  useEffect(() => {
    const savedCode = savedAnswers[currentQuestion.id];
    if (savedCode !== undefined) {
      setCode(savedCode);
      setHasUnsavedChanges(false);
    } else {
      setCode(getStarterCode(language));
      setHasUnsavedChanges(false);
    }
  }, [currentQuestionIndex, savedAnswers, currentQuestion.id]);

  // Update code when language changes (only if not read-only)
  useEffect(() => {
    if (!savedAnswers[currentQuestion.id] && !isCurrentQuestionReadOnly) {
      setCode(getStarterCode(language));
      setHasUnsavedChanges(false);
    }
  }, [language, currentQuestion.id, savedAnswers, isCurrentQuestionReadOnly]);

  // API Integration Points
  const handleRunCode = async () => {
    if (isCurrentQuestionReadOnly) return;
    
    setIsRunning(true);
    setTestResults('Running tests...');

    // Mock implementation - Replace when connecting to backend
    setTimeout(() => {
      const results = `✅ Test Case 1: Passed
✅ Test Case 2: Passed
❌ Test Case 3: Failed
Expected: [3,2,1], Got: [1,2,3]

2/3 test cases passed.`;
      setTestResults(results);
      setIsRunning(false);
    }, 2000);
  };

  // Manual save function (disabled if read-only)
  const handleSaveCode = async () => {
    if (isCurrentQuestionReadOnly) return;
    await performAutoSave();
  };

  // Prepare submission data for a single question
  const prepareSubmissionData = (questionId, code, language) => {
    const attemptNumber = (attemptNumbers[questionId] || 0) + 1;
    
    return {
      source_code: code,
      language: language,
      status: "pending",
      attempt_number: attemptNumber,
      extra_data: {
        timestamp: new Date().toISOString(),
        question_title: currentQuestion.title
      },
      exam_session_id: examSessionId,
      question_id: questionId,
      student_id: STUDENT_ID
    };
  };

  // Submit answer function
  const handleSubmitAnswer = async () => {
    if (isCurrentQuestionReadOnly) return;
    
    await performAutoSave();
    
    // Prepare submission data
    const submissionData = prepareSubmissionData(currentQuestion.id, code, language);
    
    // Update attempt numbers
    const updatedAttemptNumbers = {
      ...attemptNumbers,
      [currentQuestion.id]: submissionData.attempt_number
    };
    setAttemptNumbers(updatedAttemptNumbers);
    persistState({ attemptNumbers: updatedAttemptNumbers });
    
    // Update submitted answers
    const updatedSubmittedAnswers = {
      ...submittedAnswers,
      [currentQuestion.id]: code
    };
    setSubmittedAnswers(updatedSubmittedAnswers);
    persistState({ submittedAnswers: updatedSubmittedAnswers });
    
    // Log submission data to console (for now)
    console.log("Question Submission:", submissionData);
    
    // Show success message with sonner
    toast.success("Answer Submitted", {
      description: `Your answer for "${currentQuestion.title}" has been submitted successfully.`,
    });
  };

  // Submit entire exam
  const handleSubmitExam = async () => {
    await performAutoSave();
    
    // Prepare all submission data
    const allSubmissions = [];
    
    // Add all submitted answers
    Object.entries(submittedAnswers).forEach(([questionId, code]) => {
      const question = examData.questions.find(q => q.id === questionId);
      if (question) {
        const submissionData = prepareSubmissionData(
          questionId, 
          code, 
          language
        );
        allSubmissions.push(submissionData);
      }
    });
    
    // Add current answer if not already submitted
    if (!submittedAnswers[currentQuestion.id]) {
      const submissionData = prepareSubmissionData(
        currentQuestion.id, 
        code, 
        language
      );
      allSubmissions.push(submissionData);
    }
    
    // Log all submission data to console
    console.log("Final Exam Submissions:", allSubmissions);
    
    // Clear persisted data
    localStorage.removeItem(STORAGE_KEY);
    
    // Show success message with sonner
    toast.success("Exam Submitted Successfully", {
      description: "Your exam has been submitted. You will be redirected to the results page.",
    });
    
    // Navigate to results page
    navigate('/student/results');
  };

  // Mock navigation function for demo
  const navigate = (path) => {
    console.log(`Navigating to: ${path}`);
    alert(`Demo: Would navigate to ${path}`);
  };

  // Utility functions
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft < 600) return 'text-red-500';
    if (timeLeft < 1800) return 'text-yellow-500';
    return 'text-green-500';
  };

  const handleNextQuestion = async () => {
    await performAutoSave();
    if (currentQuestionIndex < examData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = async () => {
    await performAutoSave();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const getAnsweredQuestionsCount = () => {
    return Object.keys(submittedAnswers).length;
  };

  const getCompletionPercentage = () => {
    return (getAnsweredQuestionsCount() / examData.questions.length) * 100;
  };

  const getDifficultyVariant = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'default';
      case 'Medium': return 'secondary';
      case 'Hard': return 'destructive';
      default: return 'default';
    }
  };

  const getStarterCode = (lang) => {
    const templates = {
      javascript: '// Write your JavaScript code here...\n// Function signature will be provided\n\nfunction solution() {\n    \n}',
      python: '# Write your Python code here...\n# Function signature will be provided\n\ndef solution():\n    pass',
      java: '// Write your Java code here...\n// Class and method signatures will be provided\n\npublic class Solution {\n    \n}',
      cpp: '// Write your C++ code here...\n// Function signature will be provided\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}',
      c: '// Write your C code here...\n// Function signature will be provided\n\n#include <stdio.h>\n\nint main() {\n    return 0;\n}'
    };
    return templates[lang] || templates.javascript;
  };

  // Auto-save badge component
  const getAutoSaveBadge = () => {
    if (isCurrentQuestionReadOnly) return null;
    
    const badges = {
      idle: null,
      saving: (
        <Badge variant="secondary" className="gap-1 animate-pulse">
          <Save className="h-3 w-3" />
          Saving...
        </Badge>
      ),
      saved: (
        <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Auto-saved
        </Badge>
      ),
      error: (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Save failed
        </Badge>
      )
    };
    return badges[autoSaveStatus];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      {/* Header Section */}
      <div className="flex justify-between items-center p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{examData.title}</h1>
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {examData.questions.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Theme Toggle Button */}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>
          
          {/* Timer Display */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className={`font-mono text-lg font-bold ${getTimeColor()}`}>
              {formatTime(timeLeft)}
            </span>
            <Button variant="outline" onClick={handleResetDemo}>
                Reset Demo
            </Button>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Progress:</span>
            <Progress value={getCompletionPercentage()} className="w-20" />
            <span className="text-sm font-medium">
              {getAnsweredQuestionsCount()}/{examData.questions.length}
            </span>
          </div>

          {/* Submit Button with Confirmation Dialog */}
          <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <FileCheck className="h-4 w-4" />
                Submit Test
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Submit Exam?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You have answered {getAnsweredQuestionsCount()} out of {examData.questions.length} questions.
                  This action cannot be undone. Are you sure you want to submit your exam?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmitExam} className="bg-destructive hover:bg-destructive/90">
                  Yes, Submit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          {/* Question Panel - Left Side */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full p-6 overflow-auto">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {currentQuestion.title}
                      <Badge variant={getDifficultyVariant(currentQuestion.difficulty)}>
                        {currentQuestion.difficulty}
                      </Badge>
                    </CardTitle>
                    {isCurrentQuestionReadOnly && (
                      <Badge variant="destructive" className="gap-1">
                        <FileCheck className="h-3 w-3" />
                        Submitted
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Question Description */}
                  <div>
                    <p className="mb-4">{currentQuestion.description}</p>
                    
                    {/* Example Section */}
                    <div className="bg-muted p-4 rounded-lg">
                      <strong>Example:</strong>
                      <pre className="mt-2 whitespace-pre-wrap text-sm">
                        {currentQuestion.example}
                      </pre>
                    </div>
                  </div>

                  {/* Question Navigation */}
                  <div className="flex justify-between pt-4">
                    <Button 
                      variant="outline" 
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === examData.questions.length - 1}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Code Editor Panel - Right Side */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col p-2 gap-2">
              {/* Editor Header */}
              <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2">
                  <Label>Your Solution:</Label>
                  {/* Save Status Badges */}
                  {isCurrentQuestionReadOnly ? (
                    <Badge variant="destructive" className="gap-1">
                      <FileCheck className="h-3 w-3" />
                      Submitted (Read-only)
                    </Badge>
                  ) : (
                    <>
                      {savedAnswers[currentQuestion.id] && (
                        <Badge variant="secondary" className="gap-1">
                          <FileCheck className="h-3 w-3" />
                          Saved
                        </Badge>
                      )}
                      {getAutoSaveBadge()}
                      {hasUnsavedChanges && autoSaveStatus === 'idle' && (
                        <Badge variant="outline" className="gap-1 text-yellow-600">
                          <Save className="h-3 w-3" />
                          Unsaved changes
                        </Badge>
                      )}
                    </>
                  )}
                </div>
                {/* Language Selector */}
                <Select 
                  value={language} 
                  onValueChange={setLanguage}
                  disabled={isCurrentQuestionReadOnly}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                    <SelectItem value="java">Java</SelectItem>
                    <SelectItem value="cpp">C++</SelectItem>
                    <SelectItem value="c">C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Editor
                height="500px"
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                language={language === "c" ? "cpp" : language}
                value={code}
                onChange={isCurrentQuestionReadOnly ? undefined : (val) => setCode(val || "")}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  autoClosingBrackets: "always",
                  autoClosingQuotes: "always",
                  formatOnType: true,
                  formatOnPaste: true,
                  readOnly: isCurrentQuestionReadOnly,
                  domReadOnly: isCurrentQuestionReadOnly,
                  cursorStyle: isCurrentQuestionReadOnly ? 'line-thin' : 'line',
                }}
              />

              {/* Test Results Display */}
              {testResults && (
                <div className="bg-muted p-3 rounded-lg max-h-32 overflow-auto">
                  <Label className="text-sm font-medium">Test Results:</Label>
                  <pre className="text-xs mt-1 whitespace-pre-wrap">{testResults}</pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 p-2 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleSaveCode}
                  disabled={autoSaveStatus === 'saving' || isCurrentQuestionReadOnly}
                >
                  {autoSaveStatus === 'saving' ? 'Saving...' : 'Save Code'}
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleRunCode}
                    disabled={isRunning || isCurrentQuestionReadOnly}
                    className="gap-2"
                  >
                    {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isRunning ? 'Running...' : 'Run Code'}
                  </Button>
                  {isCurrentQuestionReadOnly ? (
                    <Button 
                      disabled
                      className="gap-2 opacity-50 cursor-not-allowed"
                    >
                      <FileCheck className="h-4 w-4" />
                      Already Submitted
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmitAnswer}
                      className="gap-2"
                    >
                      <FileCheck className="h-4 w-4" />
                      Submit Answer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Student_UI;
