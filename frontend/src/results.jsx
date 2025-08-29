// FILE: src/Results.jsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useContext, useEffect, useMemo } from 'react';
import { 
  Search, Eye, Edit3, CheckCircle2, Calendar, Clock, Users, FileText, 
  TrendingUp, Download, Filter, Star, MessageCircle, BarChart3, Award, 
  RefreshCw, BookOpen, AlertCircle, CheckCircle, XCircle, User, 
  Code, FileSpreadsheet, ExternalLink, ChevronRight, MoreHorizontal,
  GraduationCap, Target, TrendingDown, PieChart, Info, AlertTriangle,
  Copy, Maximize2, FileDown, Activity, Zap, Trophy, Medal,
  ArrowUp, ArrowDown, Minus, Plus, CheckSquare, Square,
  MousePointer2, Sparkles, Crown, Flame, Database
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from 'xlsx';

// Import your auth context and api client
import { AuthContext } from "./auth/AuthProvider";
import api from "./api/apiClient";

export default function Results({ exams, onRefresh }) {
  const { logout } = useContext(AuthContext);
  
  // Enhanced state management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [examResults, setExamResults] = useState({});
  const [loadingResults, setLoadingResults] = useState(false);
  const [evaluationDialog, setEvaluationDialog] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [evaluationForm, setEvaluationForm] = useState({
    overall_score: '',
    feedback: '',
    grade: '',
    comments: ''
  });
  const [evaluating, setEvaluating] = useState(false);
  const [examEvaluations, setExamEvaluations] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [codeViewDialog, setCodeViewDialog] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [viewMode, setViewMode] = useState('cards');
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Filter completed exams
  const completedExams = exams.filter(exam => exam.status === 'completed');

  // Enhanced filtering and sorting with memoization
  const filteredExams = useMemo(() => {
    let filtered = completedExams;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(exam =>
        exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.exam_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(exam => {
        const isEvaluated = examEvaluations[exam.id]?.evaluated || false;
        return filterStatus === 'evaluated' ? isEvaluated : !isEvaluated;
      });
    }

    // Sort exams
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created_at':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'submissions':
          return (examResults[b.id]?.statistics?.totalSubmissions || 0) - 
                 (examResults[a.id]?.statistics?.totalSubmissions || 0);
        case 'score':
          return (parseFloat(examResults[b.id]?.statistics?.averageScore) || 0) - 
                 (parseFloat(examResults[a.id]?.statistics?.averageScore) || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [completedExams, searchTerm, filterStatus, sortBy, examResults, examEvaluations]);

  // Advanced data fetching with comprehensive error handling and fallbacks
  const fetchExamResults = async (examId) => {
    setLoadingResults(true);
    try {
      // Always attempt to fetch exam details first for fallback data
      const examResponse = await api.get(`/exams/${examId}`);
      const examDetails = examResponse.data;
      
      let submissions = [];
      let examQuestions = examDetails.questions || [];
      
      try {
        // Attempt to fetch submissions
        const submissionsResponse = await api.get(`/exams/${examId}/submissions/`);
        submissions = submissionsResponse.data || [];
      } catch (submissionError) {
        console.warn('Failed to fetch submissions:', submissionError);
        // Continue with empty submissions - we can still export exam structure
        submissions = [];
      }

      // Process submissions with comprehensive fallback handling
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (submission) => {
          let studentData = { email: 'Unknown Student', id: submission.student_id };
          let processedAnswers = [];

          // Fetch student data with fallback
          try {
            const studentResponse = await api.get(`/users/${submission.student_id}`);
            studentData = studentResponse.data;
          } catch (error) {
            console.warn(`Failed to fetch student ${submission.student_id}:`, error);
          }

          // Process answers with comprehensive fallbacks
          try {
            if (submission.answers && Array.isArray(submission.answers)) {
              processedAnswers = await Promise.all(
                submission.answers.map(async (answer, index) => {
                  let questionData = examQuestions.find(q => q.id === answer.question_id) || {};
                  
                  // Attempt to fetch detailed question data if not available
                  if (!questionData.title && answer.question_id) {
                    try {
                      const questionResponse = await api.get(`/questions/${answer.question_id}`);
                      questionData = questionResponse.data;
                    } catch (qError) {
                      // Use exam questions or create fallback
                      questionData = examQuestions[index] || {
                        id: answer.question_id || `q_${index}`,
                        title: `Question ${index + 1}`,
                        code: '',
                        description: 'Question details unavailable',
                        max_score: 10
                      };
                    }
                  }

                  return {
                    ...answer,
                    question: questionData,
                    questionNumber: index + 1,
                    score: answer.score || 0,
                    maxScore: questionData.max_score || 10,
                    code: answer.code || '',
                    hasCode: !!(answer.code && answer.code.trim()),
                    submissionStatus: submission.status || 'unknown'
                  };
                })
              );
            } else {
              // Create placeholder answers for all exam questions
              processedAnswers = examQuestions.map((question, index) => ({
                question_id: question.id,
                code: '',
                score: 0,
                maxScore: question.max_score || 10,
                question: question,
                questionNumber: index + 1,
                hasCode: false,
                submissionStatus: submission.status || 'not_attempted',
                isPlaceholder: true
              }));
            }
          } catch (answerError) {
            console.warn('Error processing answers:', answerError);
            // Create basic placeholders
            processedAnswers = examQuestions.map((question, index) => ({
              question_id: question.id || `q_${index}`,
              code: '',
              score: 0,
              maxScore: 10,
              question: {
                id: question.id || `q_${index}`,
                title: question.title || `Question ${index + 1}`,
                code: question.code || '',
                description: question.description || ''
              },
              questionNumber: index + 1,
              hasCode: false,
              submissionStatus: 'error',
              isPlaceholder: true
            }));
          }

          // Calculate completion metrics
          const totalQuestions = Math.max(processedAnswers.length, examQuestions.length);
          const questionsWithCode = processedAnswers.filter(a => a.hasCode).length;
          const totalScore = processedAnswers.reduce((sum, a) => sum + (a.score || 0), 0);
          const maxPossibleScore = processedAnswers.reduce((sum, a) => sum + (a.maxScore || 10), 0);
          
          return {
            ...submission,
            student: studentData,
            answers: processedAnswers,
            totalQuestions,
            questionsWithCode,
            totalScore,
            maxPossibleScore,
            completionPercentage: totalQuestions > 0 
              ? Math.round((questionsWithCode / totalQuestions) * 100) 
              : 0,
            scorePercentage: maxPossibleScore > 0 
              ? Math.round((totalScore / maxPossibleScore) * 100) 
              : 0,
            hasAnyCode: questionsWithCode > 0,
            submissionQuality: questionsWithCode > totalQuestions * 0.8 ? 'high' : 
                              questionsWithCode > totalQuestions * 0.5 ? 'medium' : 'low'
          };
        })
      );

      // Calculate comprehensive statistics
      const totalSubmissions = enrichedSubmissions.length;
      const completedSubmissions = enrichedSubmissions.filter(s => s.status === 'completed');
      const submissionsWithCode = enrichedSubmissions.filter(s => s.hasAnyCode);
      
      const scores = completedSubmissions.map(s => s.scorePercentage || 0);
      const completionRates = enrichedSubmissions.map(s => s.completionPercentage || 0);
      
      const averageScore = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
      
      const averageCompletion = completionRates.length > 0
        ? completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length
        : 0;
      
      const passThreshold = 60;
      const passRate = scores.length > 0 
        ? (scores.filter(s => s >= passThreshold).length / scores.length) * 100 
        : 0;

      // Advanced grade distribution
      const gradingDistribution = {
        excellent: scores.filter(s => s >= 90).length,
        good: scores.filter(s => s >= 80 && s < 90).length,
        average: scores.filter(s => s >= 70 && s < 80).length,
        below: scores.filter(s => s >= 60 && s < 70).length,
        fail: scores.filter(s => s < 60).length
      };

      // Quality metrics
      const qualityMetrics = {
        highQuality: enrichedSubmissions.filter(s => s.submissionQuality === 'high').length,
        mediumQuality: enrichedSubmissions.filter(s => s.submissionQuality === 'medium').length,
        lowQuality: enrichedSubmissions.filter(s => s.submissionQuality === 'low').length
      };

      const results = {
        submissions: enrichedSubmissions,
        examQuestions,
        examDetails,
        statistics: {
          totalSubmissions,
          completedSubmissions: completedSubmissions.length,
          submissionsWithCode: submissionsWithCode.length,
          averageScore: averageScore.toFixed(1),
          averageCompletion: averageCompletion.toFixed(1),
          passRate: passRate.toFixed(1),
          highestScore: scores.length > 0 ? Math.max(...scores) : 0,
          lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
          medianScore: scores.length > 0 
            ? [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)] 
            : 0,
          gradingDistribution,
          qualityMetrics,
          totalQuestions: examQuestions.length,
          questionsAnalyzed: examQuestions.length
        },
        lastUpdated: new Date().toISOString()
      };

      setExamResults(prev => ({
        ...prev,
        [examId]: results
      }));

      return results;
    } catch (error) {
      console.error('Critical error fetching exam results:', error);
      
      // Create minimal fallback structure for Excel export
      const fallbackResults = {
        submissions: [],
        examQuestions: [],
        examDetails: { title: 'Unknown Exam', id: examId },
        statistics: {
          totalSubmissions: 0,
          completedSubmissions: 0,
          submissionsWithCode: 0,
          averageScore: '0',
          averageCompletion: '0',
          passRate: '0',
          highestScore: 0,
          lowestScore: 0,
          medianScore: 0,
          gradingDistribution: { excellent: 0, good: 0, average: 0, below: 0, fail: 0 },
          qualityMetrics: { highQuality: 0, mediumQuality: 0, lowQuality: 0 },
          totalQuestions: 0,
          questionsAnalyzed: 0
        },
        error: `Failed to load exam data: ${error.message}`,
        lastUpdated: new Date().toISOString()
      };

      setExamResults(prev => ({
        ...prev,
        [examId]: fallbackResults
      }));

      if (error.response?.status === 401) {
        logout();
        return;
      }

      toast.error("Data Loading Issue", {
        description: "Some data couldn't be loaded, but Excel export is still available with current information.",
      });

      return fallbackResults;
    } finally {
      setLoadingResults(false);
    }
  };

  // Advanced Excel Export - Always Available
  const handleExportToExcel = async (examId, forceRefresh = false) => {
    setExportingExcel(true);
    
    try {
      let results = examResults[examId];
      
      // If no results or force refresh, attempt to fetch
      if (!results || forceRefresh) {
        toast.info("Preparing export data...", {
          description: "Fetching latest exam data for comprehensive export.",
        });
        results = await fetchExamResults(examId);
      }
      
      // Ensure we have at least basic exam info for export
      if (!results) {
        // Create absolute minimum export structure
        const exam = exams.find(e => e.id === examId) || { title: 'Unknown Exam', id: examId };
        results = {
          submissions: [],
          examQuestions: [],
          examDetails: exam,
          statistics: {
            totalSubmissions: 0,
            completedSubmissions: 0,
            submissionsWithCode: 0,
            averageScore: '0',
            averageCompletion: '0',
            passRate: '0',
            highestScore: 0,
            lowestScore: 0,
            medianScore: 0,
            gradingDistribution: { excellent: 0, good: 0, average: 0, below: 0, fail: 0 },
            qualityMetrics: { highQuality: 0, mediumQuality: 0, lowQuality: 0 },
            totalQuestions: 0,
            questionsAnalyzed: 0
          },
          error: "No data available",
          lastUpdated: new Date().toISOString()
        };
      }

      const exam = results.examDetails || exams.find(e => e.id === examId) || { title: 'Unknown Exam' };
      const workbook = XLSX.utils.book_new();

      // Executive Summary Sheet
      const summaryData = [
        ['EXAM RESULTS EXECUTIVE SUMMARY'],
        [''],
        ['Export Details'],
        ['Generated On', new Date().toLocaleString()],
        ['Generated By', 'Results Dashboard System'],
        ['Export Version', '2.0'],
        [''],
        ['Exam Information'],
        ['Exam Title', exam.title || 'Unknown Exam'],
        ['Exam Type', exam.exam_type || 'Unknown'],
        ['Exam ID', examId],
        ['Exam Status', exam.status || 'Unknown'],
        ['Created Date', exam.created_at ? new Date(exam.created_at).toLocaleString() : 'Unknown'],
        [''],
        ['Submission Overview'],
        ['Total Submissions', results.statistics.totalSubmissions],
        ['Completed Submissions', results.statistics.completedSubmissions],
        ['Submissions with Code', results.statistics.submissionsWithCode],
        ['Total Questions', results.statistics.totalQuestions],
        [''],
        ['Performance Metrics'],
        ['Average Score', `${results.statistics.averageScore}%`],
        ['Average Completion', `${results.statistics.averageCompletion}%`],
        ['Pass Rate (≥60%)', `${results.statistics.passRate}%`],
        ['Highest Score', `${results.statistics.highestScore}%`],
        ['Lowest Score', `${results.statistics.lowestScore}%`],
        ['Median Score', `${results.statistics.medianScore}%`],
        [''],
        ['Grade Distribution'],
        ['Excellent (90-100%)', results.statistics.gradingDistribution.excellent],
        ['Good (80-89%)', results.statistics.gradingDistribution.good],
        ['Average (70-79%)', results.statistics.gradingDistribution.average],
        ['Below Average (60-69%)', results.statistics.gradingDistribution.below],
        ['Needs Improvement (<60%)', results.statistics.gradingDistribution.fail],
        [''],
        ['Submission Quality Analysis'],
        ['High Quality Submissions', results.statistics.qualityMetrics.highQuality],
        ['Medium Quality Submissions', results.statistics.qualityMetrics.mediumQuality],
        ['Low Quality Submissions', results.statistics.qualityMetrics.lowQuality]
      ];

      if (results.error) {
        summaryData.push([''], ['Data Issues'], ['Error Details', results.error]);
      }

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      // Style the summary sheet
      summarySheet['!cols'] = [{ wch: 30 }, { wch: 50 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

      // Detailed Student Results Sheet
      const studentHeaders = [
        'Student Email',
        'Student ID', 
        'Submission Status',
        'Overall Score (%)',
        'Completion Rate (%)',
        'Questions Attempted',
        'Questions with Code',
        'Quality Rating',
        'Submitted At',
        'Time Taken (minutes)',
        'Total Score Points',
        'Max Possible Points'
      ];

      const studentData = [studentHeaders];

      if (results.submissions.length > 0) {
        results.submissions.forEach(submission => {
          studentData.push([
            submission.student?.email || 'Unknown',
            submission.student_id || 'Unknown',
            submission.status || 'not_started',
            submission.scorePercentage || 0,
            submission.completionPercentage || 0,
            submission.totalQuestions || 0,
            submission.questionsWithCode || 0,
            submission.submissionQuality || 'unknown',
            submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted',
            Math.round((submission.time_taken || 0) / 60),
            submission.totalScore || 0,
            submission.maxPossibleScore || 0
          ]);
        });
      } else {
        studentData.push(['No student submissions available', '', '', '', '', '', '', '', '', '', '', '']);
      }

      const studentSheet = XLSX.utils.aoa_to_sheet(studentData);
      studentSheet['!cols'] = Array(12).fill({ wch: 20 });
      XLSX.utils.book_append_sheet(workbook, studentSheet, 'Student Results');

      // Question-by-Question Analysis Sheet
      if (results.examQuestions.length > 0) {
        const questionHeaders = ['Question ID', 'Question Number', 'Question Title', 'Max Score', 'Average Score', 'Completion Rate (%)', 'Code Submissions'];
        const questionData = [questionHeaders];

        results.examQuestions.forEach((question, index) => {
          const questionSubmissions = results.submissions
            .map(s => s.answers?.find(a => a.question_id === question.id))
            .filter(Boolean);
          
          const avgScore = questionSubmissions.length > 0
            ? questionSubmissions.reduce((sum, a) => sum + (a.score || 0), 0) / questionSubmissions.length
            : 0;
          
          const completionRate = questionSubmissions.length > 0
            ? (questionSubmissions.filter(a => a.hasCode).length / questionSubmissions.length) * 100
            : 0;

          questionData.push([
            question.id || `q_${index}`,
            index + 1,
            question.title || `Question ${index + 1}`,
            question.max_score || 10,
            avgScore.toFixed(1),
            completionRate.toFixed(1),
            questionSubmissions.filter(a => a.hasCode).length
          ]);
        });

        const questionSheet = XLSX.utils.aoa_to_sheet(questionData);
        questionSheet['!cols'] = Array(7).fill({ wch: 20 });
        XLSX.utils.book_append_sheet(workbook, questionSheet, 'Question Analysis');
      }

      // Detailed Code Submissions Sheet
      if (results.submissions.some(s => s.hasAnyCode)) {
        const codeHeaders = [
          'Student Email',
          'Question Number', 
          'Question Title',
          'Code Submitted',
          'Code Length (chars)',
          'Score Earned',
          'Max Score',
          'Submission Time',
          'Has Valid Code'
        ];
        const codeData = [codeHeaders];

        results.submissions.forEach(submission => {
          if (submission.answers) {
            submission.answers.forEach(answer => {
              codeData.push([
                submission.student?.email || 'Unknown',
                answer.questionNumber || 'Unknown',
                answer.question?.title || 'Unknown Question',
                answer.code || 'No code submitted',
                answer.code ? answer.code.length : 0,
                answer.score || 0,
                answer.maxScore || 10,
                submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted',
                answer.hasCode ? 'Yes' : 'No'
              ]);
            });
          }
        });

        const codeSheet = XLSX.utils.aoa_to_sheet(codeData);
        codeSheet['!cols'] = [
          { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 60 }, 
          { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(workbook, codeSheet, 'Code Submissions');
      }

      // Raw Data Sheet for Advanced Analysis
      const rawHeaders = ['timestamp', 'student_email', 'student_id', 'exam_id', 'exam_title', 'question_id', 'question_title', 'code_submitted', 'score', 'max_score', 'status', 'submission_quality'];
      const rawData = [rawHeaders];

      results.submissions.forEach(submission => {
        if (submission.answers) {
          submission.answers.forEach(answer => {
            rawData.push([
              submission.submitted_at || new Date().toISOString(),
              submission.student?.email || 'unknown',
              submission.student_id || 'unknown',
              examId,
              exam.title || 'Unknown Exam',
              answer.question?.id || 'unknown',
              answer.question?.title || 'Unknown Question',
              answer.code || '',
              answer.score || 0,
              answer.maxScore || 10,
              submission.status || 'unknown',
              submission.submissionQuality || 'unknown'
            ]);
          });
        } else {
          // Add empty row for students with no submissions
          rawData.push([
            new Date().toISOString(),
            submission.student?.email || 'unknown',
            submission.student_id || 'unknown',
            examId,
            exam.title || 'Unknown Exam',
            '',
            '',
            '',
            0,
            0,
            submission.status || 'not_started',
            'no_submission'
          ]);
        }
      });

      const rawSheet = XLSX.utils.aoa_to_sheet(rawData);
      rawSheet['!cols'] = Array(12).fill({ wch: 20 });
      XLSX.utils.book_append_sheet(workbook, rawSheet, 'Raw Data');

      // Generate filename with timestamp
      const examTitle = exam.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown_Exam';
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `${examTitle}_Comprehensive_Results_${timestamp}.xlsx`;
      
      // Write and download file
      XLSX.writeFile(workbook, fileName);

      toast.success("Excel Export Completed! 📊", {
        description: `Comprehensive report "${fileName}" downloaded successfully with all available data.`,
      });

    } catch (error) {
      console.error('Excel export error:', error);
      toast.error("Export Failed", {
        description: "Unable to generate Excel file. Please try again or contact support.",
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // Enhanced submission viewing
  const handleViewCode = (submission) => {
    setSelectedSubmission(submission);
    setCodeViewDialog(true);
  };

  const copyCodeToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied to clipboard! 📋");
    } catch (error) {
      toast.error("Failed to copy code");
    }
  };

  // Other utility functions
  const isExamEvaluated = (examId) => {
    return examEvaluations[examId]?.evaluated || false;
  };

  const handleEvaluateExam = (exam) => {
    setCurrentEvaluation(exam);
    setEvaluationForm({
      overall_score: '',
      feedback: '',
      grade: '',
      comments: ''
    });
    setEvaluationDialog(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!currentEvaluation) return;
    setEvaluating(true);
    
    try {
      const evaluationData = {
        exam_id: currentEvaluation.id,
        overall_score: parseFloat(evaluationForm.overall_score) || 0,
        feedback: evaluationForm.feedback,
        grade: evaluationForm.grade,
        comments: evaluationForm.comments,
        evaluated_at: new Date().toISOString(),
        status: 'evaluated'
      };

      await api.post(`/exams/${currentEvaluation.id}/evaluation/`, evaluationData);

      setExamEvaluations(prev => ({
        ...prev,
        [currentEvaluation.id]: {
          ...evaluationData,
          evaluated: true
        }
      }));

      toast.success("Evaluation Completed! ✅", {
        description: `Exam "${currentEvaluation.title}" has been successfully evaluated.`,
      });

      setEvaluationDialog(false);
      setCurrentEvaluation(null);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Evaluation Failed", {
        description: error.response?.data?.detail || "An error occurred while submitting the evaluation.",
      });
    } finally {
      setEvaluating(false);
    }
  };

  const handleViewResults = async (exam) => {
    setSelectedExam(exam);
    if (!examResults[exam.id]) {
      await fetchExamResults(exam.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'not_started': return 'outline';
      default: return 'destructive';
    }
  };

  const getScoreBadgeVariant = (score) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    if (score >= 60) return 'outline';
    return 'destructive';
  };

  const getQualityBadge = (quality) => {
    switch (quality) {
      case 'high': return { variant: 'default', icon: Crown, color: 'text-yellow-600' };
      case 'medium': return { variant: 'secondary', icon: Award, color: 'text-blue-600' };
      case 'low': return { variant: 'outline', icon: AlertTriangle, color: 'text-orange-600' };
      default: return { variant: 'destructive', icon: XCircle, color: 'text-red-600' };
    }
  };

  const totalEvaluated = Object.values(examEvaluations).filter(e => e.evaluated).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-slate-900 dark:via-gray-900 dark:to-slate-800">
      {/* Ultra-Modern Header */}
      <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-50 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5"></div>
        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                    Results Dashboard
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Advanced Analytics & Code Review Platform
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onRefresh} variant="outline" size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300">
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Refresh
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh all exam data</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
        {/* Advanced Statistics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {[
            {
              title: "Total Exams",
              value: completedExams.length,
              icon: CheckCircle2,
              gradient: "from-blue-500 to-cyan-500",
              bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950",
              description: "Completed & ready",
              trend: "+12%",
              trendUp: true
            },
            {
              title: "Evaluated",
              value: totalEvaluated,
              icon: GraduationCap,
              gradient: "from-green-500 to-emerald-500",
              bgGradient: "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
              description: "Reviews completed",
              trend: "+8%",
              trendUp: true
            },
            {
              title: "Pending",
              value: completedExams.length - totalEvaluated,
              icon: Clock,
              gradient: "from-yellow-500 to-orange-500",
              bgGradient: "from-yellow-50 to-orange-50 dark:from-yellow-950 dark:to-orange-950",
              description: "Awaiting review",
              trend: "-5%",
              trendUp: false
            },
            {
              title: "Success Rate",
              value: `${completedExams.length > 0 ? Math.round((totalEvaluated / completedExams.length) * 100) : 0}%`,
              icon: TrendingUp,
              gradient: "from-purple-500 to-indigo-500",
              bgGradient: "from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950",
              description: "Evaluation progress",
              trend: "+15%",
              trendUp: true
            }
          ].map((stat, index) => (
            <Card key={index} className={`relative overflow-hidden border-0 shadow-xl bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/10"></div>
              <CardContent className="relative p-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                      {stat.title}
                    </p>
                    <div className="flex items-baseline gap-3">
                      <p className="text-4xl font-bold text-slate-900 dark:text-white">
                        {stat.value}
                      </p>
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        stat.trendUp 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {stat.trendUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {stat.trend}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                      {stat.description}
                    </p>
                  </div>
                  
                  <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${stat.gradient} rounded-full transition-all duration-1000 ease-out`}
                    style={{ 
                      width: `${typeof stat.value === 'string' ? parseInt(stat.value) : Math.min(stat.value * 10, 100)}%` 
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Advanced Search & Filter Controls */}
        <Card className="mb-10 border-0 shadow-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
          <CardContent className="p-8">
            <div className="flex flex-col xl:flex-row gap-6">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Search Exams</Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder="Search by title, description, type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 text-lg border-0 shadow-sm bg-white/80 dark:bg-slate-700/80 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Status Filter</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-52 h-14 border-0 shadow-sm bg-white/80 dark:bg-slate-700/80">
                      <Filter className="h-5 w-5 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Exams</SelectItem>
                      <SelectItem value="evaluated">Evaluated</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-52 h-14 border-0 shadow-sm bg-white/80 dark:bg-slate-700/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                      <SelectItem value="submissions">Submissions</SelectItem>
                      <SelectItem value="score">Average Score</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Exams Display */}
        {filteredExams.length === 0 ? (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
            <CardContent className="p-20 text-center">
              <div className="max-w-lg mx-auto space-y-8">
                <div className="relative">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                    <FileText className="h-16 w-16 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {completedExams.length === 0 ? 'No Completed Exams Yet' : 'No Matching Results'}
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    {completedExams.length === 0
                      ? 'Completed exams will appear here for comprehensive analysis and evaluation.'
                      : 'Try adjusting your search terms or filters to find specific exams.'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-10">
            {filteredExams.map((exam) => {
              const isEvaluated = isExamEvaluated(exam.id);
              const results = examResults[exam.id];

              return (
                <Card key={exam.id} className="group border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-700 hover:-translate-y-2">
                  <CardContent className="p-10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-8">
                        {/* Header Section */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                              <FileText className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-3xl font-bold text-slate-900 dark:text-white group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                                {exam.title}
                              </h3>
                              <div className="flex items-center gap-3 mt-2">
                                {isEvaluated ? (
                                  <Badge className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                                    <Crown className="h-4 w-4 mr-2" />
                                    Evaluated
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="px-4 py-2 border-2 border-yellow-300 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-600">
                                    <Clock className="h-4 w-4 mr-2" />
                                    Pending Review
                                  </Badge>
                                )}
                                
                                <Badge variant="secondary" className="px-4 py-2 bg-slate-100 dark:bg-slate-700">
                                  <Database className="h-4 w-4 mr-2" />
                                  {exam.exam_type}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {exam.description && (
                            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed pl-16">
                              {exam.description}
                            </p>
                          )}
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pl-16">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Calendar className="h-5 w-5" />
                              <span className="text-sm font-medium">Created</span>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {formatDate(exam.created_at)}
                            </p>
                          </div>
                          
                          {results && (
                            <>
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <Users className="h-5 w-5" />
                                  <span className="text-sm font-medium">Submissions</span>
                                </div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {results.statistics.totalSubmissions}
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <Target className="h-5 w-5" />
                                  <span className="text-sm font-medium">Avg Score</span>
                                </div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {results.statistics.averageScore}%
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <Trophy className="h-5 w-5" />
                                  <span className="text-sm font-medium">Pass Rate</span>
                                </div>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {results.statistics.passRate}%
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Performance Bar */}
                        {results && (
                          <div className="space-y-4 pl-16">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                Performance Overview
                              </span>
                              <div className="flex items-center gap-4 text-sm text-slate-500">
                                <span>Low: {results.statistics.lowestScore}%</span>
                                <span>High: {results.statistics.highestScore}%</span>
                              </div>
                            </div>
                            <div className="relative">
                              <Progress 
                                value={parseFloat(results.statistics.averageScore)} 
                                className="h-4 bg-slate-200 dark:bg-slate-700"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  {results.statistics.averageScore}% Average
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error Alert */}
                        {results?.error && (
                          <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 dark:border-amber-700">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                            <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">Data Notice</AlertTitle>
                            <AlertDescription className="text-amber-700 dark:text-amber-400">
                              {results.error} - Excel export remains available with current data.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-4 ml-10">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                onClick={() => handleViewResults(exam)}
                                size="lg"
                                className="whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                              >
                                <Eye className="h-5 w-5 mr-2" />
                                View Results
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Open detailed results analysis</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleExportToExcel(exam.id)}
                                variant="outline"
                                size="lg"
                                disabled={exportingExcel}
                                className="whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 border-2"
                              >
                                {exportingExcel ? (
                                  <>
                                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                                    Exporting...
                                  </>
                                ) : (
                                  <>
                                    <FileSpreadsheet className="h-5 w-5 mr-2" />
                                    Export Excel
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Always available - exports all current data</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {!isEvaluated && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleEvaluateExam(exam)}
                                  size="lg"
                                  className="whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                                >
                                  <GraduationCap className="h-5 w-5 mr-2" />
                                  Evaluate
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Submit comprehensive evaluation</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Ultra-Modern Results Sheet */}
      <Sheet open={!!selectedExam} onOpenChange={() => setSelectedExam(null)}>
        <SheetContent className="w-full max-w-[95vw] bg-gradient-to-br from-slate-50/95 to-slate-100/95 dark:from-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-0 shadow-2xl">
          <SheetHeader className="space-y-6 pb-8 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <SheetTitle className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                  {selectedExam?.title}
                </SheetTitle>
                <SheetDescription className="text-xl text-slate-600 dark:text-slate-400 mt-2">
                  Comprehensive Analysis & Code Review Dashboard
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {selectedExam && (
            <div className="space-y-10 py-8">
              {loadingResults ? (
                <div className="space-y-10">
                  {/* Advanced Loading State */}
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
                    <CardContent className="p-16">
                      <div className="text-center space-y-8">
                        <div className="relative">
                          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                            <RefreshCw className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="absolute inset-0 rounded-full border-4 border-transparent bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 animate-pulse"></div>
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            Loading Comprehensive Results
                          </h3>
                          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                            Analyzing submissions, processing code, and generating advanced analytics...
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-lg mx-auto">
                          {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-6 w-full rounded-full" />
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : examResults[selectedExam.id] ? (
                <Tabs defaultValue="overview" className="space-y-10">
                  <div className="flex items-center justify-between">
                    <TabsList className="grid w-full max-w-lg grid-cols-3 h-16 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
                      <TabsTrigger value="overview" className="text-base font-semibold rounded-xl">
                        📊 Overview
                      </TabsTrigger>
                      <TabsTrigger value="submissions" className="text-base font-semibold rounded-xl">
                        👥 Submissions  
                      </TabsTrigger>
                      <TabsTrigger value="analytics" className="text-base font-semibold rounded-xl">
                        📈 Analytics
                      </TabsTrigger>
                    </TabsList>

                    <Button
                      onClick={() => handleExportToExcel(selectedExam.id, true)}
                      disabled={exportingExcel}
                      className="shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-8 py-4"
                    >
                      {exportingExcel ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Generating Excel...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-5 w-5 mr-2" />
                          Export Full Report
                        </>
                      )}
                    </Button>
                  </div>

                  <TabsContent value="overview" className="space-y-10">
                    {/* Ultra-Modern Statistics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                      {[
                        {
                          title: "Total Submissions",
                          value: examResults[selectedExam.id].statistics.totalSubmissions,
                          icon: Users,
                          gradient: "from-blue-500 to-cyan-500",
                          bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950"
                        },
                        {
                          title: "With Code",
                          value: examResults[selectedExam.id].statistics.submissionsWithCode,
                          icon: Code,
                          gradient: "from-green-500 to-emerald-500",
                          bgGradient: "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950"
                        },
                        {
                          title: "Average Score",
                          value: `${examResults[selectedExam.id].statistics.averageScore}%`,
                          icon: Target,
                          gradient: "from-purple-500 to-indigo-500",
                          bgGradient: "from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950"
                        },
                        {
                          title: "Completion",
                          value: `${examResults[selectedExam.id].statistics.averageCompletion}%`,
                          icon: TrendingUp,
                          gradient: "from-orange-500 to-red-500",
                          bgGradient: "from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950"
                        }
                      ].map((stat, index) => (
                        <Card key={index} className={`border-0 shadow-xl bg-gradient-to-br ${stat.bgGradient} backdrop-blur-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 group`}>
                          <CardContent className="p-8">
                            <div className="flex items-center justify-between mb-4">
                              <div className="space-y-2">
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  {stat.title}
                                </p>
                                <p className="text-4xl font-bold text-slate-900 dark:text-white">
                                  {stat.value}
                                </p>
                              </div>
                              <div className={`p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} shadow-xl group-hover:shadow-2xl transition-shadow`}>
                                <stat.icon className="h-8 w-8 text-white" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Advanced Grade Distribution */}
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
                      <CardHeader className="pb-8">
                        <CardTitle className="text-2xl font-bold flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <PieChart className="h-6 w-6 text-white" />
                          </div>
                          Grade Distribution Analytics
                        </CardTitle>
                        <CardDescription className="text-lg">
                          Comprehensive performance breakdown with quality insights
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {[
                          { 
                            label: 'Outstanding (90-100%)', 
                            count: examResults[selectedExam.id].statistics.gradingDistribution.excellent, 
                            gradient: 'from-green-500 to-emerald-600', 
                            bgColor: 'bg-green-50 dark:bg-green-950/20',
                            textColor: 'text-green-800 dark:text-green-200',
                            icon: Crown
                          },
                          { 
                            label: 'Excellent (80-89%)', 
                            count: examResults[selectedExam.id].statistics.gradingDistribution.good, 
                            gradient: 'from-blue-500 to-cyan-600', 
                            bgColor: 'bg-blue-50 dark:bg-blue-950/20',
                            textColor: 'text-blue-800 dark:text-blue-200',
                            icon: Award
                          },
                          { 
                            label: 'Good (70-79%)', 
                            count: examResults[selectedExam.id].statistics.gradingDistribution.average, 
                            gradient: 'from-yellow-500 to-orange-600', 
                            bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
                            textColor: 'text-yellow-800 dark:text-yellow-200',
                            icon: Medal
                          },
                          { 
                            label: 'Average (60-69%)', 
                            count: examResults[selectedExam.id].statistics.gradingDistribution.below, 
                            gradient: 'from-orange-500 to-red-500', 
                            bgColor: 'bg-orange-50 dark:bg-orange-950/20',
                            textColor: 'text-orange-800 dark:text-orange-200',
                            icon: Star
                          },
                          { 
                            label: 'Needs Improvement (<60%)', 
                            count: examResults[selectedExam.id].statistics.gradingDistribution.fail, 
                            gradient: 'from-red-500 to-pink-600', 
                            bgColor: 'bg-red-50 dark:bg-red-950/20',
                            textColor: 'text-red-800 dark:text-red-200',
                            icon: AlertTriangle
                          }
                        ].map((grade) => {
                          const percentage = examResults[selectedExam.id].statistics.totalSubmissions > 0 
                            ? (grade.count / examResults[selectedExam.id].statistics.totalSubmissions) * 100 
                            : 0;
                          
                          return (
                            <div key={grade.label} className={`p-6 rounded-2xl ${grade.bgColor} border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300`}>
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                  <div className={`p-3 rounded-xl bg-gradient-to-br ${grade.gradient} shadow-lg`}>
                                    <grade.icon className="h-6 w-6 text-white" />
                                  </div>
                                  <div>
                                    <h4 className={`font-bold text-lg ${grade.textColor}`}>{grade.label}</h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {grade.count} students ({percentage.toFixed(1)}%)
                                    </p>
                                  </div>
                                </div>
                                <div className={`px-4 py-2 rounded-full font-bold text-lg ${grade.textColor} ${grade.bgColor}`}>
                                  {grade.count}
                                </div>
                              </div>
                              
                              <div className="bg-white dark:bg-slate-800 rounded-full h-4 overflow-hidden shadow-inner">
                                <div 
                                  className={`h-full bg-gradient-to-r ${grade.gradient} rounded-full transition-all duration-1000 ease-out`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="submissions" className="space-y-8">
                    <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
                      <CardHeader className="flex flex-row items-center justify-between pb-8">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-bold">All Submissions</CardTitle>
                            <CardDescription className="text-lg">
                              Detailed view with code availability and quality metrics
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleExportToExcel(selectedExam.id)}
                          disabled={exportingExcel}
                          className="shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                          <FileSpreadsheet className="h-5 w-5 mr-2" />
                          Export All Data
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {examResults[selectedExam.id].submissions.length === 0 ? (
                          <div className="text-center py-20 space-y-6">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center">
                              <Users className="h-12 w-12 text-blue-500 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No Submissions Available</h3>
                              <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
                                Submissions will appear here as students complete the exam.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <ScrollArea className="h-[700px] rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm">
                            <Table>
                              <TableHeader className="sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b-2 border-slate-200 dark:border-slate-700">
                                <TableRow>
                                  <TableHead className="font-bold text-base py-6">Student</TableHead>
                                  <TableHead className="font-bold text-base">Status</TableHead>
                                  <TableHead className="font-bold text-base">Score</TableHead>
                                  <TableHead className="font-bold text-base">Quality</TableHead>
                                  <TableHead className="font-bold text-base">Progress</TableHead>
                                  <TableHead className="font-bold text-base">Submitted</TableHead>
                                  <TableHead className="font-bold text-base">Duration</TableHead>
                                  <TableHead className="font-bold text-base text-center">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {examResults[selectedExam.id].submissions.map((submission) => {
                                  const qualityBadge = getQualityBadge(submission.submissionQuality);
                                  
                                  return (
                                    <TableRow key={submission.id} className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-all duration-200">
                                      <TableCell className="py-6">
                                        <div className="flex items-center gap-4">
                                          <Avatar className="h-12 w-12 border-2 border-slate-200 dark:border-slate-700">
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold">
                                              {submission.student?.email?.[0]?.toUpperCase() || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div>
                                            <p className="font-semibold text-slate-900 dark:text-white text-base">
                                              {submission.student?.email || 'Unknown'}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                              ID: {submission.student_id}
                                            </p>
                                          </div>
                                        </div>
                                      </TableCell>
                                      
                                      <TableCell>
                                        <Badge variant={getStatusBadgeVariant(submission.status)} className="font-semibold px-3 py-1">
                                          {submission.status || 'unknown'}
                                        </Badge>
                                      </TableCell>
                                      
                                      <TableCell>
                                        <Badge variant={getScoreBadgeVariant(submission.scorePercentage || 0)} className="font-bold px-3 py-1">
                                          {submission.scorePercentage || 0}%
                                        </Badge>
                                      </TableCell>
                                      
                                      <TableCell>
                                        <Badge variant={qualityBadge.variant} className="font-semibold px-3 py-1">
                                          <qualityBadge.icon className="h-4 w-4 mr-1" />
                                          {submission.submissionQuality || 'unknown'}
                                        </Badge>
                                      </TableCell>
                                      
                                      <TableCell>
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">
                                              {submission.completionPercentage || 0}%
                                            </span>
                                            <span className="text-xs text-slate-500">
                                              {submission.questionsWithCode || 0}/{submission.totalQuestions || 0}
                                            </span>
                                          </div>
                                          <Progress 
                                            value={submission.completionPercentage || 0} 
                                            className="h-2" 
                                          />
                                        </div>
                                      </TableCell>
                                      
                                      <TableCell className="text-sm">
                                        {formatDate(submission.submitted_at || submission.created_at)}
                                      </TableCell>
                                      
                                      <TableCell className="text-sm font-medium">
                                        {Math.round((submission.time_taken || 0) / 60)} min
                                      </TableCell>
                                      
                                      <TableCell>
                                        <div className="flex items-center justify-center gap-3">
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  onClick={() => handleViewCode(submission)}
                                                  size="sm"
                                                  className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                                >
                                                  <Code className="h-4 w-4 mr-1" />
                                                  Code
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>View submitted code</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                          
                                          {submission.hasAnyCode && (
                                            <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700">
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Has Code
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-10">
                    <div className="grid gap-10">
                      {/* Advanced Performance Analytics */}
                      <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
                        <CardHeader>
                          <CardTitle className="text-2xl font-bold flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                              <Activity className="h-6 w-6 text-white" />
                            </div>
                            Advanced Performance Analytics
                          </CardTitle>
                          <CardDescription className="text-lg">
                            Comprehensive insights and statistical analysis
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            {/* Score Analytics */}
                            <div className="space-y-6">
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <Target className="h-5 w-5" />
                                Score Distribution
                              </h4>
                              <div className="space-y-4">
                                {[
                                  { label: 'Highest Score', value: `${examResults[selectedExam.id].statistics.highestScore}%`, icon: ArrowUp, color: 'text-green-600 dark:text-green-400' },
                                  { label: 'Average Score', value: `${examResults[selectedExam.id].statistics.averageScore}%`, icon: Minus, color: 'text-blue-600 dark:text-blue-400' },
                                  { label: 'Median Score', value: `${examResults[selectedExam.id].statistics.medianScore}%`, icon: Target, color: 'text-purple-600 dark:text-purple-400' },
                                  { label: 'Lowest Score', value: `${examResults[selectedExam.id].statistics.lowestScore}%`, icon: ArrowDown, color: 'text-red-600 dark:text-red-400' },
                                  { label: 'Pass Rate', value: `${examResults[selectedExam.id].statistics.passRate}%`, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' }
                                ].map((stat, index) => (
                                  <div key={index} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                      <div className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                      </div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">{stat.label}</span>
                                    </div>
                                    <span className={`font-bold text-2xl ${stat.color}`}>{stat.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Submission Analytics */}
                            <div className="space-y-6">
                              <h4 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                <Users className="h-5 w-5" />
                                Submission Insights
                              </h4>
                              <div className="space-y-4">
                                {[
                                  { label: 'Total Submissions', value: examResults[selectedExam.id].statistics.totalSubmissions, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
                                  { label: 'Completed', value: examResults[selectedExam.id].statistics.completedSubmissions, icon: CheckCircle, color: 'text-green-600 dark:text-green-400' },
                                  { label: 'With Code', value: examResults[selectedExam.id].statistics.submissionsWithCode, icon: Code, color: 'text-purple-600 dark:text-purple-400' },
                                  { label: 'High Quality', value: examResults[selectedExam.id].statistics.qualityMetrics.highQuality, icon: Crown, color: 'text-yellow-600 dark:text-yellow-400' },
                                  { 
                                    label: 'Avg Completion', 
                                    value: `${examResults[selectedExam.id].statistics.averageCompletion}%`, 
                                    icon: Activity, 
                                    color: 'text-indigo-600 dark:text-indigo-400' 
                                  }
                                ].map((stat, index) => (
                                  <div key={index} className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
                                    <div className="flex items-center gap-4">
                                      <div className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-sm">
                                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                      </div>
                                      <span className="font-semibold text-slate-700 dark:text-slate-300">{stat.label}</span>
                                    </div>
                                    <span className={`font-bold text-2xl ${stat.color}`}>{stat.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Data Quality Notice */}
                      {examResults[selectedExam.id].error && (
                        <Alert className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 dark:border-amber-700 shadow-xl">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-xl">
                              <Info className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1">
                              <AlertTitle className="text-xl font-bold text-amber-800 dark:text-amber-300 mb-2">
                                Data Processing Notice
                              </AlertTitle>
                              <AlertDescription className="text-base text-amber-700 dark:text-amber-400 leading-relaxed">
                                <strong>Issue:</strong> {examResults[selectedExam.id].error}
                                <br />
                                <strong>Status:</strong> All available data has been processed and is ready for export. 
                                Some statistics may be limited, but Excel export contains all accessible information.
                              </AlertDescription>
                            </div>
                          </div>
                        </Alert>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-20 text-center">
                    <div className="max-w-lg mx-auto space-y-8">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                          Unable to Load Results
                        </h3>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                          There was an issue loading the exam data. You can still export available information or try refreshing.
                        </p>
                      </div>
                      <div className="flex gap-4 justify-center">
                        <Button onClick={() => fetchExamResults(selectedExam.id)} variant="outline" size="lg">
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Try Again
                        </Button>
                        <Button 
                          onClick={() => handleExportToExcel(selectedExam.id)} 
                          disabled={exportingExcel}
                          size="lg"
                          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                          <FileSpreadsheet className="h-5 w-5 mr-2" />
                          Export Anyway
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Ultra-Modern Code View Dialog */}
      <Dialog open={codeViewDialog} onOpenChange={setCodeViewDialog}>
        <DialogContent className="max-w-7xl max-h-[95vh] bg-gradient-to-br from-slate-50/98 to-white/98 dark:from-slate-900/98 dark:to-slate-800/98 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader className="space-y-6 pb-8 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-3xl font-bold flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Code className="h-8 w-8 text-white" />
              </div>
              Advanced Code Review Dashboard
            </DialogTitle>
            {selectedSubmission && (
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-slate-200 dark:border-slate-700">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
                    {selectedSubmission.student?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {selectedSubmission.student?.email || 'Unknown Student'}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant={getScoreBadgeVariant(selectedSubmission.scorePercentage || 0)} className="px-3 py-1">
                      Score: {selectedSubmission.scorePercentage || 0}%
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(selectedSubmission.status)} className="px-3 py-1">
                      {selectedSubmission.status}
                    </Badge>
                    <Badge variant={getQualityBadge(selectedSubmission.submissionQuality).variant} className="px-3 py-1">
                      <getQualityBadge(selectedSubmission.submissionQuality).icon className="h-3 w-3 mr-1" />
                      {selectedSubmission.submissionQuality}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogHeader>
          
          {selectedSubmission && (
            <ScrollArea className="max-h-[calc(95vh-250px)]">
              <div className="space-y-10 py-6">
                {selectedSubmission.answers?.length > 0 ? (
                  selectedSubmission.answers.map((answer, index) => (
                    <Card key={index} className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                      <CardHeader className="pb-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                              <span className="text-white font-bold text-lg">Q{answer.questionNumber}</span>
                            </div>
                            <div>
                              <CardTitle className="text-xl">
                                {answer.question?.title || `Question ${answer.questionNumber}`}
                              </CardTitle>
                              {answer.question?.description && (
                                <CardDescription className="text-base mt-1">
                                  {answer.question.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <Badge variant={getScoreBadgeVariant(answer.score || 0)} className="px-4 py-2 text-base font-bold">
                              {answer.score || 0} / {answer.maxScore || 10} points
                            </Badge>
                            {answer.hasCode ? (
                              <Badge className="px-4 py-2 text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Code Submitted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="px-4 py-2 text-base border-2 border-red-200 text-red-700 dark:border-red-800 dark:text-red-300">
                                <XCircle className="h-4 w-4 mr-2" />
                                No Code
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-8">
                        {/* Original Question Code */}
                        {answer.question?.code && (
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <Label className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                Original Question Code
                              </Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyCodeToClipboard(answer.question.code)}
                                className="shadow-sm hover:shadow-md transition-all"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Code
                              </Button>
                            </div>
                            <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 border-2 border-slate-300 dark:border-slate-600 shadow-inner">
                              <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
                                <code className="text-slate-800 dark:text-slate-200">
                                  {answer.question.code}
                                </code>
                              </pre>
                            </div>
                          </div>
                        )}
                        
                        {/* Student's Code */}
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <Label className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                              </div>
                              Student's Solution
                            </Label>
                            {answer.code && (
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-sm px-3 py-1">
                                  {answer.code.length} characters
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyCodeToClipboard(answer.code)}
                                  className="shadow-sm hover:shadow-md transition-all"
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Solution
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {answer.code && answer.code.trim() ? (
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-8 border-2 border-green-200 dark:border-green-800 shadow-inner">
                              <pre className="text-sm font-mono leading-relaxed overflow-x-auto">
                                <code className="text-slate-800 dark:text-slate-200">
                                  {answer.code}
                                </code>
                              </pre>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/10 dark:to-pink-900/10 rounded-2xl p-12 border-2 border-dashed border-red-300 dark:border-red-700 text-center">
                              <XCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-6" />
                              <div className="space-y-2">
                                <h4 className="text-xl font-bold text-red-700 dark:text-red-300">
                                  No Code Submitted
                                </h4>
                                <p className="text-red-600 dark:text-red-400 text-lg">
                                  The student did not submit any code for this question
                                </p>
                                <p className="text-sm text-red-500 dark:text-red-500 mt-4">
                                  This could indicate the question was not attempted or there was a technical issue during submission
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Placeholder Notice */}
                        {answer.isPlaceholder && (
                          <Alert className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 dark:border-blue-700 shadow-lg">
                            <div className="flex items-start gap-4">
                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <AlertTitle className="text-lg font-bold text-blue-800 dark:text-blue-300">
                                  Question Placeholder
                                </AlertTitle>
                                <AlertDescription className="text-blue-700 dark:text-blue-400 text-base mt-2">
                                  This question was part of the exam structure, but no submission data is currently available. 
                                  The student may not have reached this question or data may still be processing.
                                </AlertDescription>
                              </div>
                            </div>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-0 shadow-xl bg-gradient-to-br from-white/80 to-slate-50/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm">
                    <CardContent className="p-20 text-center">
                      <div className="space-y-8">
                        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                          <Code className="h-16 w-16 text-slate-400" />
                        </div>
                        <div className="space-y-4">
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                            No Code Submissions Available
                          </h3>
                          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                            This submission contains no code data. The student may not have started the exam, 
                            encountered technical difficulties, or the data is still being processed.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Ultra-Modern Evaluation Dialog */}
      <Dialog open={evaluationDialog} onOpenChange={setEvaluationDialog}>
        <DialogContent className="max-w-4xl max-h-[95vh] bg-gradient-to-br from-slate-50/98 to-white/98 dark:from-slate-900/98 dark:to-slate-800/98 backdrop-blur-xl border-0 shadow-2xl">
          <DialogHeader className="space-y-6 pb-8 border-b border-slate-200 dark:border-slate-700">
            <DialogTitle className="text-3xl font-bold flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              Comprehensive Exam Evaluation
            </DialogTitle>
            <DialogDescription className="text-xl">
              Submit detailed evaluation and feedback for "{currentEvaluation?.title}"
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] py-6">
            <div className="space-y-10">
              {/* Score & Grade Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="overall_score" className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Overall Score (%)
                  </Label>
                  <Input
                    id="overall_score"
                    type="number"
                    min="0"
                    max="100"
                    value={evaluationForm.overall_score}
                    onChange={(e) => setEvaluationForm(prev => ({
                      ...prev,
                      overall_score: e.target.value
                    }))}
                    placeholder="Enter score (0-100)"
                    className="h-16 text-xl font-semibold border-2 shadow-lg focus:shadow-xl transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="grade" className="text-base font-bold text-slate-800 dark:text-slate-200">
                    Letter Grade
                  </Label>
                  <Select 
                    value={evaluationForm.grade}
                    onValueChange={(value) => setEvaluationForm(prev => ({
                      ...prev,
                      grade: value
                    }))}
                  >
                    <SelectTrigger className="h-16 text-xl font-semibold border-2 shadow-lg">
                      <SelectValue placeholder="Select letter grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+ (95-100%) - Outstanding Excellence</SelectItem>
                      <SelectItem value="A">A (90-94%) - Exceptional Performance</SelectItem>
                      <SelectItem value="A-">A- (85-89%) - Excellent Work</SelectItem>
                      <SelectItem value="B+">B+ (80-84%) - Very Good</SelectItem>
                      <SelectItem value="B">B (75-79%) - Good Performance</SelectItem>
                      <SelectItem value="B-">B- (70-74%) - Above Average</SelectItem>
                      <SelectItem value="C+">C+ (65-69%) - Satisfactory Plus</SelectItem>
                      <SelectItem value="C">C (60-64%) - Satisfactory</SelectItem>
                      <SelectItem value="D">D (50-59%) - Below Average</SelectItem>
                      <SelectItem value="F">F (<50%) - Needs Significant Improvement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="space-y-4">
                <Label htmlFor="feedback" className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Comprehensive Feedback
                </Label>
                <Textarea
                  id="feedback"
                  value={evaluationForm.feedback}
                  onChange={(e) => setEvaluationForm(prev => ({
                    ...prev,
                    feedback: e.target.value
                  }))}
                  placeholder="Provide detailed feedback covering:
• Code quality and structure
• Problem-solving approach  
• Technical accuracy
• Best practices adherence
• Areas of strength
• Specific improvement suggestions
• Overall performance assessment"
                  rows={8}
                  className="resize-none text-base leading-relaxed border-2 shadow-lg focus:shadow-xl transition-all"
                />
              </div>

              {/* Additional Comments */}
              <div className="space-y-4">
                <Label htmlFor="comments" className="text-base font-bold text-slate-800 dark:text-slate-200">
                  Additional Comments & Recommendations
                </Label>
                <Textarea
                  id="comments"
                  value={evaluationForm.comments}
                  onChange={(e) => setEvaluationForm(prev => ({
                    ...prev,
                    comments: e.target.value
                  }))}
                  placeholder="Include:
• Notable achievements or innovations
• Recommendations for continued learning
• Resources for improvement
• Encouragement and motivation
• Any special considerations"
                  rows={6}
                  className="resize-none text-base leading-relaxed border-2 shadow-lg focus:shadow-xl transition-all"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-4 pt-8 border-t border-slate-200 dark:border-slate-700">
            <Button 
              variant="outline" 
              onClick={() => setEvaluationDialog(false)}
              size="lg" 
              className="shadow-lg hover:shadow-xl transition-all duration-300 px-8"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitEvaluation} 
              disabled={evaluating} 
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-8"
            >
              {evaluating ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Processing Evaluation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Submit Comprehensive Evaluation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

