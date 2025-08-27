import React, { useState, useEffect, useCallback, useRef, useMemo, useContext } from 'react';
import { Clock, FileCheck, AlertTriangle, Save, CheckCircle, Moon, Sun, LogOut, Trophy, Calendar, RotateCcw } from 'lucide-react';
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from "./auth/AuthProvider";
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
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  // Refs for cleanup
  const timerRef = useRef(null);
  const autoSaveIntervalRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const lastCodeRef = useRef('');
  const isInitializedRef = useRef(false);
  const examStartTimeRef = useRef(null);
  const examEndTimeRef = useRef(null);
  const examRegistrationIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const examCreatedByRef = useRef(null); // NEW: Store exam creator (teacher) ID
  const hasShown5MinWarningRef = useRef(false);
  const hasShown1MinWarningRef = useRef(false);
  const lastTimeLeftRef = useRef(null);

  // Memoized storage key
  const storageKey = useMemo(() => `${STORAGE_KEY}_${examId}`, [examId]);

  // Load persisted state
  const initialState = useMemo(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
      return {};
    }
  }, [storageKey]);

  // Load theme preference
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
  const [isExamCompleted, setIsExamCompleted] = useState(false);

  // Language mapping for API
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

  // Calculate time remaining - FIXED VERSION
  const calculateTimeRemaining = useCallback(() => {
    const now = Date.now();
    
    if (!examEndTimeRef.current) {
      return 0;
    }

    const remainingMs = examEndTimeRef.current - now;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    
    console.log('Timer calculation:', {
      now: new Date(now).toLocaleString(),
      examEndTime: new Date(examEndTimeRef.current).toLocaleString(),
      remainingMs,
      remainingSeconds
    });
    
    return remainingSeconds;
  }, []);

  // Get current user info
  const getCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return null;

      const response = await fetch('http://localhost:8000/users/me', {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const user = await response.json();
        currentUserIdRef.current = user.id;
        console.log('Current user ID set:', user.id);
        return user;
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
    }
    return null;
  }, []);

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
  }, [examId, languageMapping, makeAPICall]);

  // Starter code templates
  const starterCodeTemplates = useMemo(() => ({
    javascript: '// Write your JavaScript code here...\nfunction solution() {\n    \n}',
    python: '# Write your Python code here...\ndef solution():\n    pass',
    java: '// Write your Java code here...\npublic class Solution {\n    \n}',
    cpp: '// Write your C++ code here...\n#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}',
    c: '// Write your C code here...\n#include <stdio.h>\n\nint main() {\n  return 0;\n}'
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

  // Persist state function
  const persistState = useCallback((additionalState = {}) => {
    try {
      const stateToSave = {
        currentQuestionIndex,
        code,
        language,
        savedAnswers,
        submittedAnswers,
        examSessionId,
        examStartTime: examStartTimeRef.current,
        examEndTime: examEndTimeRef.current,
        examRegistrationId: examRegistrationIdRef.current,
        examCreatedBy: examCreatedByRef.current,
        lastSavedTime: Date.now(),
        hasShown5MinWarning: hasShown5MinWarningRef.current,
        hasShown1MinWarning: hasShown1MinWarningRef.current,
        ...additionalState
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
      return true;
    } catch (error) {
      console.error('Failed to persist state:', error);
      return false;
    }
  }, [currentQuestionIndex, code, language, savedAnswers, submittedAnswers, examSessionId, storageKey]);

  // FIXED: Update exam registration status with TEACHER ID as approved_by
  const updateExamRegistrationStatus = useCallback(async (status) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token || !examRegistrationIdRef.current) {
        console.warn('Missing required data for registration update:', {
          hasToken: !!token,
          hasRegistrationId: !!examRegistrationIdRef.current
        });
        return false;
      }

      // CRITICAL FIX: Use the teacher's ID (exam creator) as approved_by, NOT the student's ID
      let teacherId = examCreatedByRef.current;
      if (!teacherId) {
        console.error('Teacher ID not found! Cannot update registration status.');
        return false;
      }

      const updateData = {
        status: status,
        approved_at: new Date().toISOString(),
        approved_by: teacherId, // THIS IS THE KEY FIX - Use teacher's ID, not student's ID
        extra_data: {
          submitted_at: new Date().toISOString(),
          submission_type: "final_exam_submission",
          client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      };

      console.log('Updating registration status with TEACHER ID:', {
        registrationId: examRegistrationIdRef.current,
        teacherId: teacherId,
        studentId: currentUserIdRef.current,
        updateData
      });

      const response = await fetch(`http://localhost:8000/exam-registrations/${examRegistrationIdRef.current}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Registration update failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(`Failed to update registration status: ${response.status} - ${errorData?.detail || response.statusText}`);
      }

      const result = await response.json();
      console.log('Registration status updated successfully with teacher ID:', result);
      return true;
    } catch (error) {
      console.error('Failed to update exam registration status:', error);
      // Don't throw the error, just return false to allow submission to continue
      return false;
    }
  }, []);

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

  // FIXED: Handle submit exam with proper teacher ID for approved_by
  const handleSubmitExam = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsSubmitting(true);

    try {
      // Auto-save current work first
      await performAutoSave();
      
      console.log('Starting exam submission process...');
      
      // Ensure we have both student and teacher IDs
      if (!currentUserIdRef.current) {
        console.log('Getting current user before status update...');
        await getCurrentUser();
      }
      
      if (!examCreatedByRef.current) {
        console.error('Teacher ID not available for approval! This is a critical error.');
        throw new Error('Teacher information not available. Cannot complete submission.');
      }
      
      // Update exam registration status to "submitted" with TEACHER ID as approved_by
      const statusUpdated = await updateExamRegistrationStatus("submitted");
      
      if (statusUpdated) {
        console.log('Exam registration status updated to "submitted" successfully with teacher approval');
        toast.success("Exam Status Updated", {
          description: "Your exam registration status has been updated to submitted.",
        });
      } else {
        console.warn('Failed to update registration status, but continuing with submission');
        toast.warning("Status Update Warning", {
          description: "Could not update registration status, but your answers are still saved.",
        });
      }

      // Clear local storage after successful submission
      localStorage.removeItem(storageKey);
      
      // Set exam as completed
      setIsExamCompleted(true);
      
      toast.success("Exam Submitted Successfully", {
        description: "Your exam has been submitted and you will be redirected to login.",
      });

      // Auto-logout after 3 seconds
      setTimeout(() => {
        logout();
        navigate('/login', {
          replace: true,
          state: {
            message: 'Your exam has been submitted successfully. Please login again to access your dashboard.',
            type: 'success'
          }
        });
      }, 3000);

    } catch (error) {
      console.error('Failed to submit exam:', error);
      toast.error("Submission Failed", {
        description: error.message || "Failed to submit exam. Please try again.",
      });
      setIsSubmitting(false);
      
      // Restart timer if submission failed
      if (examEndTimeRef.current) {
        const remaining = calculateTimeRemaining();
        setTimeLeft(remaining);
        if (remaining > 0) {
          timerRef.current = setInterval(() => {
            const newRemaining = calculateTimeRemaining();
            setTimeLeft(newRemaining);
            if (newRemaining <= 0) {
              clearInterval(timerRef.current);
              handleSubmitExam(); // Retry submission
            }
          }, 1000);
        }
      }
    }
  }, [performAutoSave, updateExamRegistrationStatus, storageKey, logout, navigate, calculateTimeRemaining, getCurrentUser]);

  // Parse date string to timestamp
  const parseDateTime = useCallback((dateTimeString) => {
    if (!dateTimeString) return null;

    try {
      let date;

      if (typeof dateTimeString === 'number') {
        return dateTimeString;
      }

      date = new Date(dateTimeString);

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

  // FIXED: Fetch exam registration data with better error handling
  const fetchExamRegistration = useCallback(async (token) => {
    try {
      console.log('Fetching exam registration for exam ID:', examId);
      
      const response = await fetch(`http://localhost:8000/exam-registrations/?exam_id=${examId}`, {
        headers: { 
          'Accept': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }
      });

      if (response.ok) {
        const registrations = await response.json();
        console.log('Found registrations:', registrations);
        
        // Find the current user's registration for this exam
        const currentRegistration = registrations.find(reg => reg.exam_id === examId);
        
        if (currentRegistration) {
          examRegistrationIdRef.current = currentRegistration.id;
          console.log('Found exam registration ID:', currentRegistration.id);
          console.log('Current registration status:', currentRegistration.status);
          
          // Check if exam is already submitted
          if (currentRegistration.status === "submitted") {
            console.warn('Exam already submitted, redirecting to completed state');
            setIsExamCompleted(true);
            return false; // Indicate that exam is already submitted
          }
        } else {
          console.warn('No exam registration found for current user and exam');
        }
      } else {
        console.error('Failed to fetch exam registrations:', response.status);
      }
      
      return true; // Continue with exam loading
    } catch (error) {
      console.error('Failed to fetch exam registration:', error);
      return true; // Continue with exam loading even if registration fetch fails
    }
  }, [examId]);

  // Fetch exam data
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

        // Get current user first and ensure it's set
        console.log('Getting current user...');
        const user = await getCurrentUser();
        if (user) {
          console.log('Current user loaded:', user.id);
        }
        
        const shouldContinue = await fetchExamRegistration(token);
        
        // If exam is already submitted, don't proceed with loading
        if (!shouldContinue) {
          setIsLoading(false);
          return;
        }

        // Restore saved state including teacher ID
        if (initialState.hasShown5MinWarning) {
          hasShown5MinWarningRef.current = true;
        }
        if (initialState.hasShown1MinWarning) {
          hasShown1MinWarningRef.current = true;
        }
        if (initialState.examCreatedBy) {
          examCreatedByRef.current = initialState.examCreatedBy;
          console.log('Restored teacher ID from localStorage:', initialState.examCreatedBy);
        }

        // Fetch questions and exam details
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
          end_time: null,
          created_by: null // This will be populated from API
        };

        if (examResponse.ok) {
          examDetails = await examResponse.json();
          // CRITICAL: Store the teacher's ID (exam creator)
          if (examDetails.created_by) {
            examCreatedByRef.current = examDetails.created_by;
            console.log('Teacher ID (exam creator) set from API:', examDetails.created_by);
          }
        }

        if (!isMounted) return;

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
          duration: examDetails.duration_minutes || examDetails.duration,
          startTime: examDetails.start_time,
          endTime: examDetails.end_time,
          createdBy: examDetails.created_by,
          totalQuestions: questions.length,
          questions
        };

        setExamData(examDataObject);

        // Better exam time calculation and persistence
        let examStartTime, examEndTime;
        
        // Priority 1: Use saved times from localStorage (for crash recovery)
        if (initialState.examStartTime && initialState.examEndTime) {
          examStartTime = initialState.examStartTime;
          examEndTime = initialState.examEndTime;
          console.log('Using saved times from localStorage:', {
            start: new Date(examStartTime).toLocaleString(),
            end: new Date(examEndTime).toLocaleString()
          });
        } 
        // Priority 2: Use backend times
        else if (examDetails.start_time && examDetails.end_time) {
          examStartTime = parseDateTime(examDetails.start_time);
          examEndTime = parseDateTime(examDetails.end_time);
          console.log('Using backend times:', {
            start: new Date(examStartTime).toLocaleString(),
            end: new Date(examEndTime).toLocaleString()
          });
        }
        // Priority 3: Calculate from start time and duration
        else if (examDetails.start_time) {
          examStartTime = parseDateTime(examDetails.start_time);
          if (examStartTime) {
            const durationMinutes = examDetails.duration_minutes || examDetails.duration || 120;
            examEndTime = examStartTime + (durationMinutes * 60 * 1000);
            console.log('Calculated from start + duration:', {
              start: new Date(examStartTime).toLocaleString(),
              end: new Date(examEndTime).toLocaleString(),
              durationMinutes: durationMinutes
            });
          }
        }
        // Fallback: Start now with duration
        else {
          const now = Date.now();
          examStartTime = now;
          const durationMinutes = examDetails.duration_minutes || examDetails.duration || 120;
          examEndTime = now + (durationMinutes * 60 * 1000);
          console.log('Using fallback (now + duration):', {
            start: new Date(examStartTime).toLocaleString(),
            end: new Date(examEndTime).toLocaleString(),
            durationMinutes: durationMinutes
          });
        }
        
        examStartTimeRef.current = examStartTime;
        examEndTimeRef.current = examEndTime;

        // Calculate and set initial time
        const initialTimeRemaining = calculateTimeRemaining();
        console.log('Setting initial time remaining:', initialTimeRemaining, 'seconds');
        setTimeLeft(initialTimeRemaining);

        // Auto-submit if time has already expired
        if (initialTimeRemaining <= 0) {
          console.log('Exam time expired on load, auto-submitting');
          toast.error("Time's Up!", {
            description: "The exam time has expired. Your exam will be submitted automatically.",
          });
          setTimeout(() => handleSubmitExam(), 1000);
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
  }, [examId, initialState, extractExampleFromProblemStatement, calculateTimeRemaining, handleSubmitExam, parseDateTime, fetchExamRegistration, getCurrentUser]);

  // Timer effect with warnings and auto-submit
  useEffect(() => {
    if (!examEndTimeRef.current || timeLeft === null || isExamCompleted) return;

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      const prevTimeLeft = lastTimeLeftRef.current;
      
      console.log('Timer update:', { remaining, prevTimeLeft });
      
      setTimeLeft(remaining);
      lastTimeLeftRef.current = remaining;

      // Time warnings (only show once and when time is decreasing)
      if (!hasShown5MinWarningRef.current && remaining <= 300 && remaining > 0 && (prevTimeLeft === null || prevTimeLeft > 300)) {
        hasShown5MinWarningRef.current = true;
        persistState({ hasShown5MinWarning: true });
        toast.warning("5 Minutes Remaining!", {
          description: "You have 5 minutes left to complete the exam.",
          duration: 10000,
        });
        // Also show browser alert
        alert("⚠️ Warning: Only 5 minutes remaining!\n\nPlease complete your exam soon.");
      }

      if (!hasShown1MinWarningRef.current && remaining <= 60 && remaining > 0 && (prevTimeLeft === null || prevTimeLeft > 60)) {
        hasShown1MinWarningRef.current = true;
        persistState({ hasShown1MinWarning: true });
        toast.error("1 Minute Remaining!", {
          description: "You have only 1 minute left! The exam will auto-submit when time runs out.",
          duration: 10000,
        });
        // Also show browser alert
        alert("🚨 URGENT: Only 1 minute remaining!\n\nThe exam will auto-submit when time runs out!");
      }

      // Auto-submit when time runs out
      if (remaining <= 0 && prevTimeLeft > 0) {
        console.log('Time expired, auto-submitting');
        alert("⏰ Time's Up!\n\nYour exam will be submitted automatically now.");
        toast.error("Time's Up!", {
          description: "The exam time has expired. Your exam is being submitted automatically.",
        });
        handleSubmitExam();
      }
    };

    // Update immediately, then every second
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [calculateTimeRemaining, handleSubmitExam, timeLeft, persistState, isExamCompleted]);

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

  // Persist state on changes
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
      await performAutoSave();
      const submissionResult = await submitAnswerToAPI(currentQuestion.id, code, language);

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

  // Utility functions
  const formatTime = useCallback((seconds) => {
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
    if (timeLeft < 300) return 'text-red-500 animate-pulse'; // Less than 5 minutes - pulsing red
    if (timeLeft < 600) return 'text-red-500'; // Less than 10 minutes - red
    if (timeLeft < 1800) return 'text-yellow-500'; // Less than 30 minutes - yellow
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

  // Exam completion screen
  if (isExamCompleted) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Card className="w-full max-w-2xl mx-4 shadow-2xl border-0 bg-white/90 backdrop-blur-sm dark:bg-gray-900/90">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Trophy className="h-24 w-24 text-yellow-500 animate-bounce" />
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Exam Completed Successfully! 🎉
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 dark:text-gray-300">
              Congratulations! You have successfully submitted your exam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-green-600" />
                Exam Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Exam Title:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{examData?.title || 'Programming Exam'}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Questions Answered:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{answeredQuestionsCount} / {examData?.questions?.length || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Completion Rate:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{completionPercentage}%</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Submitted At:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                What's Next?
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Your answers have been saved and submitted for evaluation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  Results will be available on your dashboard once grading is complete
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  You will be automatically logged out and redirected to the login page
                </li>
              </ul>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <RotateCcw className="h-4 w-4" />
                Redirecting to login in <span className="font-mono font-bold">3</span> seconds...
              </div>
              <Button
                onClick={() => {
                  logout();
                  navigate('/login', {
                    replace: true,
                    state: {
                      message: 'Your exam has been submitted successfully. Please login again to access your dashboard.',
                      type: 'success'
                    }
                  });
                }}
                className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <LogOut className="h-4 w-4" />
                Go to Login Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <Button variant="destructive" className="gap-2" disabled={isSubmitting}>
                <FileCheck className="h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit Test'}
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
                  Once submitted, you will be automatically logged out and cannot make any changes. 
                  Are you sure you want to submit your exam?
                  <br /><br />
                  <strong>Note:</strong> After submission, you will be automatically logged out.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleSubmitExam} 
                  className="bg-destructive hover:bg-destructive/90"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Yes, Submit & Logout'
                  )}
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
