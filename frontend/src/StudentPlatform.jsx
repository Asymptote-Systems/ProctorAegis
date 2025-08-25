import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

const STORAGE_KEY = "student_exam_progress";
const THEME_STORAGE_KEY = "student_exam_theme";
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds
const SAVE_DEBOUNCE_DELAY = 2000; // 2 seconds

const Student_UI = () => {
  const { examId } = useParams();

  // Refs for cleanup
  const timerRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastCodeRef = useRef('');
  const isInitializedRef = useRef(false);
  const examEndTimeRef = useRef(null);

  // Memoized storage key
  const storageKey = useMemo(() => `${STORAGE_KEY}_${examId}`, [examId]);

  // Load persisted state - memoized to prevent recalculation
  const initialState = useMemo(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      return {};
    }
  }, [storageKey]);

  // Load theme preference - memoized
  const initialTheme = useMemo(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'light';
    } catch {
      return 'light';
    }
  }, []);

  // State management
  const [examData, setExamData] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialState.currentQuestionIndex || 0);
  const [code, setCode] = useState(initialState.code || '');
  const [language, setLanguage] = useState(initialState.language || 'javascript');
  const [timeLeft, setTimeLeft] = useState(null);
  const [savedAnswers, setSavedAnswers] = useState(initialState.savedAnswers || {});
  const [submittedAnswers, setSubmittedAnswers] = useState(initialState.submittedAnswers || {});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [theme, setTheme] = useState(initialTheme);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [examSessionId] = useState(initialState.examSessionId || generateUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Language mapping for API (Monaco editor language to API language)
  const languageMapping = useMemo(() => ({
    'javascript': 'javascript',
    'python': 'python3',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c'
  }), []);

  // Generate UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // API call helper function
  const makeAPICall = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const defaultHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `API call failed with status ${response.status}`);
    }

    return response.json();
  }, []);

  // Submit answer to API
  const submitAnswerToAPI = useCallback(async (questionId, sourceCode, selectedLanguage) => {
    const submissionData = {
      source_code: sourceCode,
      language: languageMapping[selectedLanguage] || selectedLanguage,
      status: "pending",
      attempt_number: 1,
      extra_data: {
        submitted_at: new Date().toISOString(),
        client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      exam_id: examId,
      question_id: questionId
    };

    console.log('Submitting answer:', submissionData);

    try {
      const result = await makeAPICall('http://localhost:8000/submissions/', {
        method: 'POST',
        body: JSON.stringify(submissionData)
      });

      console.log('Submission successful:', result);
      return result;
    } catch (error) {
      console.error('Submission failed:', error);
      throw error;
    }
  }, [examId, examSessionId, languageMapping, makeAPICall]);

  // Calculate time remaining based on current time and exam end time
  const calculateTimeRemaining = useCallback(() => {
    if (!examEndTimeRef.current) return 0;

    const now = Date.now();
    const endTime = examEndTimeRef.current;
    const remainingMs = endTime - now;

    // Return remaining seconds, minimum 0
    return Math.max(0, Math.floor(remainingMs / 1000));
  }, []);

  // Memoized starter code templates
  const starterCodeTemplates = useMemo(() => ({
    javascript: '// Write your JavaScript code here...\nfunction solution() {\n    \n}',
    python: '# Write your Python code here...\ndef solution():\n    pass',
    java: '// Write your Java code here...\npublic class Solution {\n    \n}',
    cpp: '// Write your C++ code here...\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}',
    c: '// Write your C code here...\n#include <stdio.h>\n\nint main() {\n    return 0;\n}'
  }), []);

  // Memoized calculations
  const answeredQuestionsCount = useMemo(() => {
    return Object.keys(submittedAnswers).length;
  }, [submittedAnswers]);

  const completionPercentage = useMemo(() => {
    if (!examData || examData.questions.length === 0) return 0;
    return Math.round((answeredQuestionsCount / examData.questions.length) * 100);
  }, [answeredQuestionsCount, examData]);

  const currentQuestion = useMemo(() => {
    return examData?.questions?.[currentQuestionIndex] || null;
  }, [examData, currentQuestionIndex]);

  const isCurrentQuestionSubmitted = useMemo(() => {
    return currentQuestion ? submittedAnswers.hasOwnProperty(currentQuestion.id) : false;
  }, [currentQuestion, submittedAnswers]);

  // Persist state function - memoized with useCallback
  const persistState = useCallback((additionalState = {}) => {
    try {
      const stateToSave = {
        currentQuestionIndex,
        code,
        language,
        savedAnswers,
        submittedAnswers,
        examSessionId,
        examEndTime: examEndTimeRef.current,
        lastSavedTime: Date.now(),
        ...additionalState
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.error('Failed to persist state:', error);
      return false;
    }
  }, [currentQuestionIndex, code, language, savedAnswers, submittedAnswers, examSessionId, storageKey]);

  // Theme management
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, [theme]);

  // Apply theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!hasUnsavedChanges || !currentQuestion || isCurrentQuestionSubmitted) {
      return;
    }

    setAutoSaveStatus('saving');

    try {
      const updatedSavedAnswers = {
        ...savedAnswers,
        [currentQuestion.id]: code
      };

      setSavedAnswers(updatedSavedAnswers);

      const success = persistState({ savedAnswers: updatedSavedAnswers });

      if (success) {
        setAutoSaveStatus('saved');
        setHasUnsavedChanges(false);
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 3000);
    }
  }, [hasUnsavedChanges, currentQuestion, isCurrentQuestionSubmitted, savedAnswers, code, persistState]);

  // Debounced auto save
  const debouncedAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(performAutoSave, SAVE_DEBOUNCE_DELAY);
  }, [performAutoSave]);

  // Extract example from HTML
  const extractExampleFromProblemStatement = useCallback((html) => {
    if (!html) return "";
    try {
      const exampleMatch = html.match(/<h3>Example<\/h3>\s*<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (exampleMatch) return exampleMatch[1].trim();
      const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) return preMatch[1].trim();
      return "";
    } catch {
      return "";
    }
  }, []);

  // Handle submit exam
  const handleSubmitExam = useCallback(async () => {
    // Clear timer first to prevent multiple submissions
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    await performAutoSave();
    localStorage.removeItem(storageKey);
    toast.success("Exam Submitted Successfully", {
      description: "Your exam has been submitted.",
    });
    // Mock navigation
    console.log('Navigating to results page');
  }, [performAutoSave, storageKey]);

  // Parse date string to timestamp safely
  const parseDateTime = useCallback((dateTimeString) => {
    if (!dateTimeString) return null;

    try {
      // Handle different date formats
      let date;

      // If it's already a timestamp
      if (typeof dateTimeString === 'number') {
        return dateTimeString;
      }

      // If it's an ISO string or standard date format
      date = new Date(dateTimeString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', dateTimeString);
        return null;
      }

      return date.getTime();
    } catch (error) {
      console.error('Error parsing date:', dateTimeString, error);
      return null;
    }
  }, []);

  // Fetch exam data - only runs once when examId changes
  useEffect(() => {
    let isMounted = true;

    const fetchExamData = async () => {
      if (!examId || isInitializedRef.current) return;

      try {
        setIsLoading(true);
        setFetchError(null);

        const token = localStorage.getItem('access_token');
        if (!token) {
          if (isMounted) {
            setFetchError('No access token found. Please login.');
            setIsLoading(false);
          }
          return;
        }

        // Fetch questions and exam details in parallel
        const [questionsResponse, examResponse] = await Promise.all([
          fetch(`http://localhost:8000/exams/${examId}/questions-with-details/`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
          }),
          fetch(`http://localhost:8000/exams/${examId}/`, {
            headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!questionsResponse.ok) {
          throw new Error(`Failed to fetch questions: ${questionsResponse.status}`);
        }

        const questionsData = await questionsResponse.json();
        let examDetails = {
          duration: 120,
          title: 'Programming Exam',
          start_time: null,
          end_time: null
        };

        if (examResponse.ok) {
          examDetails = await examResponse.json();
        }

        if (!isMounted) return; // Component unmounted

        // Process questions data
        const questions = questionsData
          .map((q, index) => ({
            id: q.question.id,
            title: q.question.title || "Untitled Question",
            difficulty: q.question.difficulty ?
              q.question.difficulty.charAt(0).toUpperCase() + q.question.difficulty.slice(1) :
              "Easy",
            description: q.question.description || "",
            problem_statement: q.question.problem_statement || "",
            example: extractExampleFromProblemStatement(q.question.problem_statement),
            testCases: [],
            points: q.points || 1,
            order: q.question_order || index
          }))
          .sort((a, b) => a.order - b.order);

        const examDataObject = {
          id: examId,
          title: examDetails.title,
          duration: examDetails.duration,
          startTime: examDetails.start_time,
          endTime: examDetails.end_time,
          totalQuestions: questions.length,
          questions
        };

        setExamData(examDataObject);

        // Calculate exam end time with better error handling
        let examEndTime;

        console.log('Exam details:', {
          start_time: examDetails.start_time,
          end_time: examDetails.end_time,
          duration: examDetails.duration,
          savedEndTime: initialState.examEndTime
        });

        // Priority 1: Use saved exam end time from previous session
        if (initialState.examEndTime && typeof initialState.examEndTime === 'number') {
          examEndTime = initialState.examEndTime;
          console.log('Using saved end time:', new Date(examEndTime));
        }
        // Priority 2: Use explicit end time from backend
        else if (examDetails.end_time) {
          examEndTime = parseDateTime(examDetails.end_time);
          if (examEndTime) {
            console.log('Using backend end time:', new Date(examEndTime));
          }
        }
        // Priority 3: Calculate from start time + duration
        else if (examDetails.start_time) {
          const startTime = parseDateTime(examDetails.start_time);
          if (startTime) {
            examEndTime = startTime + (examDetails.duration * 60 * 1000);
            console.log('Calculated end time from start + duration:', new Date(examEndTime));
          }
        }

        // Fallback: Start exam now with duration
        if (!examEndTime) {
          const now = Date.now();
          examEndTime = now + (examDetails.duration * 60 * 1000);
          console.log('Using fallback end time (now + duration):', new Date(examEndTime));
        }

        examEndTimeRef.current = examEndTime;

        // Calculate initial time remaining
        const initialTimeRemaining = calculateTimeRemaining();
        console.log('Initial time remaining (seconds):', initialTimeRemaining);

        setTimeLeft(initialTimeRemaining);

        // If exam has already ended, submit automatically
        if (initialTimeRemaining <= 0) {
          console.log('Exam time has expired, auto-submitting');
          handleSubmitExam();
          return;
        }

        isInitializedRef.current = true;
        setIsLoading(false);

      } catch (error) {
        console.error('Failed to fetch exam data:', error);
        if (isMounted) {
          setFetchError('Failed to fetch exam questions. Please try again.');
          setIsLoading(false);
        }
      }
    };

    fetchExamData();

    return () => {
      isMounted = false;
    };
  }, [examId, initialState, extractExampleFromProblemStatement, calculateTimeRemaining, handleSubmitExam, parseDateTime]);

  // Timer effect - updates every second with better error handling
  useEffect(() => {
    if (!examEndTimeRef.current || timeLeft === null || timeLeft <= 0) return;

    // Update timer immediately and then every second
    const updateTimer = () => {
      const remaining = calculateTimeRemaining();

      console.log('Timer update - remaining seconds:', remaining);
      setTimeLeft(remaining);

      // Auto-submit when time runs out
      if (remaining <= 0) {
        console.log('Timer expired, submitting exam');
        handleSubmitExam();
        return;
      }
    };

    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [calculateTimeRemaining, handleSubmitExam, timeLeft]);

  // Auto-save interval effect
  useEffect(() => {
    if (!examData) return;

    autoSaveIntervalRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        performAutoSave();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
        autoSaveIntervalRef.current = null;
      }
    };
  }, [examData, hasUnsavedChanges, performAutoSave]);

  // Code change tracking
  useEffect(() => {
    if (lastCodeRef.current !== code && lastCodeRef.current !== '') {
      setHasUnsavedChanges(true);
      debouncedAutoSave();
    }
    lastCodeRef.current = code;
  }, [code, debouncedAutoSave]);

  // Load saved answer when question changes
  useEffect(() => {
    if (!currentQuestion) return;

    const savedCode = savedAnswers[currentQuestion.id];
    if (savedCode !== undefined) {
      setCode(savedCode);
      lastCodeRef.current = savedCode;
    } else {
      const starterCode = starterCodeTemplates[language] || starterCodeTemplates.javascript;
      setCode(starterCode);
      lastCodeRef.current = starterCode;
    }
    setHasUnsavedChanges(false);
  }, [currentQuestion, savedAnswers, language, starterCodeTemplates]);

  // Persist state on changes (debounced)
  useEffect(() => {
    if (!examData || timeLeft === null) return;

    const timeoutId = setTimeout(() => {
      persistState();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [examData, persistState]);

  // Handle browser unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        persistState();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, persistState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveIntervalRef.current) clearInterval(autoSaveIntervalRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Event handlers
  const handleSubmitAnswer = useCallback(async () => {
    if (!currentQuestion || isCurrentQuestionSubmitted || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // First auto-save the current code
      await performAutoSave();

      // Submit to API
      const submissionResult = await submitAnswerToAPI(currentQuestion.id, code, language);

      // Update local state
      const updatedSubmittedAnswers = {
        ...submittedAnswers,
        [currentQuestion.id]: code
      };

      setSubmittedAnswers(updatedSubmittedAnswers);
      persistState({ submittedAnswers: updatedSubmittedAnswers });

      toast.success("Answer Submitted Successfully", {
        description: `Your answer for "${currentQuestion.title}" has been submitted and is being evaluated.`,
      });

      console.log('Submission completed:', submissionResult);

    } catch (error) {
      console.error('Submit answer failed:', error);
      toast.error("Submission Failed", {
        description: error.message || "Failed to submit your answer. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentQuestion, isCurrentQuestionSubmitted, isSubmitting, submittedAnswers, code, language, performAutoSave, submitAnswerToAPI, persistState]);

  const handleNextQuestion = useCallback(async () => {
    if (!examData || currentQuestionIndex >= examData.questions.length - 1) return;
    await performAutoSave();
    setCurrentQuestionIndex(prev => prev + 1);
  }, [examData, currentQuestionIndex, performAutoSave]);

  const handlePrevQuestion = useCallback(async () => {
    if (currentQuestionIndex <= 0) return;
    await performAutoSave();
    setCurrentQuestionIndex(prev => prev - 1);
  }, [currentQuestionIndex, performAutoSave]);

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    if (currentQuestion && !savedAnswers[currentQuestion.id]) {
      const starterCode = starterCodeTemplates[newLanguage] || starterCodeTemplates.javascript;
      setCode(starterCode);
      lastCodeRef.current = starterCode;
    }
  }, [currentQuestion, savedAnswers, starterCodeTemplates]);

  // Utility functions - Fixed time formatting
  const formatTime = useCallback((seconds) => {
    // Ensure seconds is a valid number
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
      return '00:00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getTimeColor = useCallback(() => {
    if (timeLeft === null || typeof timeLeft !== 'number') return 'text-muted-foreground';
    if (timeLeft < 600) return 'text-red-500'; // Less than 10 minutes
    if (timeLeft < 1800) return 'text-yellow-500'; // Less than 30 minutes
    return 'text-green-500';
  }, [timeLeft]);

  const getDifficultyVariant = useCallback((difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'default';
      case 'Medium': return 'secondary';
      case 'Hard': return 'destructive';
      default: return 'default';
    }
  }, []);

  // Auto-save badge component
  const autoSaveBadge = useMemo(() => {
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
  }, [autoSaveStatus]);

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

  if (!examData?.questions?.length) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <p className="text-lg">No exam questions available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      {/* Header Section */}
      <header className="flex justify-between items-center p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{examData.title}</h1>
          <Badge variant="outline">
            Question {currentQuestionIndex + 1} of {examData.questions.length}
          </Badge>
        </div>

        <div className="flex items-center gap-6">
          {/* Theme Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Timer */}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className={`font-mono text-lg font-bold ${getTimeColor()}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Progress:</span>
            <Progress value={completionPercentage} className="w-20" />
            <span className="text-sm font-medium">
              {answeredQuestionsCount}/{examData.questions.length}
            </span>
          </div>

          {/* Submit Button */}
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
                  You have answered {answeredQuestionsCount} out of {examData.questions.length} questions.
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
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
          {/* Question Panel */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full p-6 overflow-auto">
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {currentQuestion?.title}
                      <Badge variant={getDifficultyVariant(currentQuestion?.difficulty)}>
                        {currentQuestion?.difficulty}
                      </Badge>
                    </CardTitle>
                    {isCurrentQuestionSubmitted && (
                      <Badge variant="destructive" className="gap-1">
                        <FileCheck className="h-3 w-3" />
                        Submitted
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    {currentQuestion?.description && (
                      <div className="mb-4">
                        <p>{currentQuestion.description}</p>
                      </div>
                    )}

                    {currentQuestion?.problem_statement && (
                      <div
                        className="mb-4 prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: currentQuestion.problem_statement }}
                      />
                    )}

                    {currentQuestion?.example && (
                      <div className="bg-muted p-4 rounded-lg">
                        <strong>Example:</strong>
                        <pre className="mt-2 whitespace-pre-wrap text-sm">
                          {currentQuestion.example}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
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

          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col p-2 gap-2">
              {/* Editor Header */}
              <div className="flex items-center justify-between p-2 border-b">
                <div className="flex items-center gap-2">
                  <Label>Your Solution:</Label>
                  {isCurrentQuestionSubmitted ? (
                    <Badge variant="destructive" className="gap-1">
                      <FileCheck className="h-3 w-3" />
                      Submitted (Read-only)
                    </Badge>
                  ) : (
                    <>
                      {currentQuestion && savedAnswers[currentQuestion.id] && (
                        <Badge variant="secondary" className="gap-1">
                          <FileCheck className="h-3 w-3" />
                          Saved
                        </Badge>
                      )}
                      {autoSaveBadge}
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
                  onValueChange={handleLanguageChange}
                  disabled={isCurrentQuestionSubmitted}
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

              {/* Monaco Editor */}
              <div className="flex-1">
                <Editor
                  height="100%"
                  theme={theme === 'dark' ? 'vs-dark' : 'light'}
                  language={language === "c" ? "cpp" : language}
                  value={code}
                  onChange={isCurrentQuestionSubmitted ? undefined : (val) => setCode(val || "")}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    formatOnType: true,
                    formatOnPaste: true,
                    readOnly: isCurrentQuestionSubmitted,
                    domReadOnly: isCurrentQuestionSubmitted,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    renderWhitespace: 'selection',
                    tabSize: 2,
                    insertSpaces: true
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-2 p-2 border-t">
                <Button
                  variant="outline"
                  onClick={performAutoSave}
                  disabled={autoSaveStatus === 'saving' || isCurrentQuestionSubmitted || !hasUnsavedChanges}
                >
                  {autoSaveStatus === 'saving' ? 'Saving...' : 'Save Code'}
                </Button>

                {isCurrentQuestionSubmitted ? (
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
                    disabled={!code.trim() || isSubmitting}
                  >
                    <FileCheck className="h-4 w-4" />
                    {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                  </Button>
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
};

export default Student_UI;
