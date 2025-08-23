import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, FileCheck, AlertTriangle, Save, CheckCircle, Moon, Sun } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { useParams } from 'react-router-dom';
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

  // State for dynamically fetched exam data
  const [examData, setExamData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // State management
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(persisted.currentQuestionIndex || 0);
  const [code, setCode] = useState(persisted.code || '');
  const [language, setLanguage] = useState(persisted.language || 'javascript');
  const [timeLeft, setTimeLeft] = useState(persisted.timeLeft || 5400); // 90 minutes fallback
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
  const { examId } = useParams();
  // Generate UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Persist state
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

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Fetch exam data from API
  useEffect(() => {
    async function fetchExamData() {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        
        if (!token) {
          setFetchError('No access token found. Please login.');
          setIsLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:8000/exams/${examId}/questions-with-details/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });


        if (!response.ok) {
          const message = `Failed to fetch exam questions: ${response.status} ${response.statusText}`;
          setFetchError(message);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        // Map response to examData format expected
        const questions = data.map((q, index) => {
          const questionDetail = q.question;

          return {
            id: questionDetail.id,
            title: questionDetail.title || "Untitled Question",
            difficulty: questionDetail.difficulty ? 
              questionDetail.difficulty.charAt(0).toUpperCase() + questionDetail.difficulty.slice(1) : 
              "Easy",
            description: questionDetail.description || "",
            problem_statement: questionDetail.problem_statement || "",
            example: extractExampleFromProblemStatement(questionDetail.problem_statement) || "",
            testCases: [], // no test cases info from API
            points: q.points || 1,
            order: q.question_order || index
          };
        });

        // Sort questions by order
        questions.sort((a, b) => a.order - b.order);

        setExamData({
          id: 'e394cbe9-ba85-42f1-a576-7675229063cf',
          title: 'Programming Exam',
          duration: 120, // fallback duration in minutes
          totalQuestions: questions.length,
          currentQuestion: 0,
          questions: questions
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch exam data:', error);
        setFetchError('Failed to fetch exam questions. Please check your connection and try again.');
        setIsLoading(false);
      }
    }

    fetchExamData();
  }, []);

  // Helper to extract example from problem_statement HTML string
  function extractExampleFromProblemStatement(html) {
    if (!html) return "";
    
    try {
      // Try to extract content between <h3>Example</h3> and <pre> tags
      const exampleMatch = html.match(/<h3>Example<\/h3>\s*<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (exampleMatch) {
        return exampleMatch[1].trim();
      }
      
      // Alternative: look for any <pre> tag content
      const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) {
        return preMatch[1].trim();
      }
      
      return "";
    } catch (error) {
      console.warn('Error extracting example:', error);
      return "";
    }
  }

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !examData) return;

    setAutoSaveStatus('saving');
    
    try {
      const currentQuestion = examData.questions[currentQuestionIndex];
      const updatedSavedAnswers = {
        ...savedAnswers,
        [currentQuestion?.id]: code
      };
      setSavedAnswers(updatedSavedAnswers);

      const success = persistState({
        savedAnswers: updatedSavedAnswers,
        lastSavedTime: Date.now()
      });

      if (success) {
        setAutoSaveStatus('saved');
        setLastSavedTime(Date.now());
        setHasUnsavedChanges(false);

        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [code, currentQuestionIndex, savedAnswers, hasUnsavedChanges, persistState, examData]);

  // Debounced auto save
  const debouncedAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(performAutoSave, SAVE_DEBOUNCE_DELAY);
  }, [performAutoSave]);

  // Set auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = setInterval(() => {
      if (hasUnsavedChanges && examData) {
        performAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [performAutoSave, hasUnsavedChanges, examData]);

  // Track code change for auto-save
  useEffect(() => {
    if (lastCodeRef.current !== code) {
      setHasUnsavedChanges(true);
      lastCodeRef.current = code;
      debouncedAutoSave();
    }
  }, [code, debouncedAutoSave]);

  // Persist state on any change
  useEffect(() => {
    if (examData) {
      persistState();
    }
  }, [persistState, examData]);

  // Handle browser unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        performAutoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, performAutoSave]);

  // Timer countdown
  useEffect(() => {
    if (!examData) return;
    
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
  }, [examData]);

  // Load saved answer when question changes
  useEffect(() => {
    if (!examData) return;
    
    const currentQuestion = examData.questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    const savedCode = savedAnswers[currentQuestion.id];
    if (savedCode !== undefined) {
      setCode(savedCode);
      setHasUnsavedChanges(false);
    } else {
      setCode(getStarterCode(language));
      setHasUnsavedChanges(false);
    }
  }, [currentQuestionIndex, savedAnswers, examData, language]);

  // Update code when language changes
  useEffect(() => {
    if (!examData) return;
    
    const currentQuestion = examData.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    if (!savedAnswers[currentQuestion.id]) {
      setCode(getStarterCode(language));
      setHasUnsavedChanges(false);
    }
  }, [language, currentQuestionIndex, savedAnswers, examData]);

  // Handle submit answer
  const handleSubmitAnswer = async () => {
    if (!examData) return;
    
    await performAutoSave();
    
    const currentQuestion = examData.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const updatedSubmittedAnswers = {
      ...submittedAnswers,
      [currentQuestion.id]: code
    };
    setSubmittedAnswers(updatedSubmittedAnswers);
    persistState({ submittedAnswers: updatedSubmittedAnswers });

    toast.success("Answer Submitted", {
      description: `Your answer for "${currentQuestion.title}" has been submitted successfully.`,
    });
  };

  // Handle submit full exam
  const handleSubmitExam = async () => {
    await performAutoSave();

    localStorage.removeItem(STORAGE_KEY);

    toast.success("Exam Submitted Successfully", {
      description: "Your exam has been submitted. You will be redirected to the results page.",
    });

    navigate('/student/results');
  };

  // Mock navigate
  const navigate = (path) => {
    console.log(`Navigating to: ${path}`);
    alert(`Demo: Would navigate to ${path}`);
  };

  // Format time
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

  // Navigation handlers
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
    if (!examData) return 0;
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

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading exam questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center max-w-md p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Exam</h2>
          <p className="text-red-600 mb-4">{fetchError}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!examData || !examData.questions.length) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg">No exam questions available.</p>
        </div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentQuestionIndex];
  const isCurrentQuestionSubmitted = submittedAnswers.hasOwnProperty(currentQuestion.id);
  const isCurrentQuestionReadOnly = isCurrentQuestionSubmitted;

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
                    {currentQuestion.description && (
                      <div className="mb-4">
                        <p>{currentQuestion.description}</p>
                      </div>
                    )}
                    
                    {/* Problem Statement as HTML */}
                    {currentQuestion.problem_statement && (
                      <div 
                        className="mb-4 prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.problem_statement }} 
                      />
                    )}

                    {/* Example Section */}
                    {currentQuestion.example && (
                      <div className="bg-muted p-4 rounded-lg">
                        <strong>Example:</strong>
                        <pre className="mt-2 whitespace-pre-wrap text-sm">
                          {currentQuestion.example}
                        </pre>
                      </div>
                    )}
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

              {/* Action Buttons - Removed Reset Demo and Run Code */}
              <div className="flex justify-between gap-2 p-2 border-t">
                <Button 
                  variant="outline" 
                  onClick={performAutoSave}
                  disabled={autoSaveStatus === 'saving' || isCurrentQuestionReadOnly}
                >
                  {autoSaveStatus === 'saving' ? 'Saving...' : 'Save Code'}
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Student_UI;