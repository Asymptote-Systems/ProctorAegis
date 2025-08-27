// FILE: src/teacherDashboard.jsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Plus, Calendar, Users, BookOpen, Clock, Eye, Edit, Trash2, Download, LogOut, Settings, BarChart3, TrendingUp, AlertCircle, RefreshCw, FileQuestion, PlusCircle, Search, UserPlus, UserCheck, Info, CheckCircle2, PlayCircle, PauseCircle, StopCircle, BookOpenCheck, ListChecks, CircleCheckBig } from "lucide-react";
import { toast } from "sonner";

import ExamManagementPage from './ExamManagement'

// Import your auth context and api client (adjust paths as needed)
import { AuthContext } from "./auth/AuthProvider";
import api from "./api/apiClient";
import QuestionsManagement from "./QuestionsManagement";

// Mock data for dashboard stats and analytics
const dashboardStats = { activeExams: 3, totalStudents: 245, completedExams: 12, averageScore: 78.5 };
const recentActivity = [
  { id: 1, action: "Student John submitted EXM001", time: "2 minutes ago" },
  { id: 2, action: "Exam EXM002 scheduled", time: "1 hour ago" },
  { id: 3, action: "Results published for EXM001", time: "3 hours ago" },
];
const analyticsData = {
  examPerformance: [ 
    { exam: "EXM001", averageScore: 82.3, participationRate: 93.3 }, 
    { exam: "EXM003", averageScore: 75.8, participationRate: 92.1 }, 
    { exam: "EXM004", averageScore: 88.5, participationRate: 95.2 }, 
  ],
  monthlyStats: { totalExams: 8, averageParticipation: 91.2, improvementRate: 12.5 }
};

export default function TeacherDashboard() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Form state to match API requirements
  const [examForm, setExamForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    duration_minutes: '',
    exam_type: 'practice',
    shuffle_questions: false,
    max_attempts: 1,
    questions: ''
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [deleteExamId, setDeleteExamId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [exams, setExams] = useState([]); // Real exams from API
  const [loadingExams, setLoadingExams] = useState(false);
  const [editingExam, setEditingExam] = useState(null); // For editing mode
  
  // New state for tracking edit counts
  const [examEditCounts, setExamEditCounts] = useState({}); // Track edit counts by exam ID

  // New state for questions management
  const [questions, setQuestions] = useState([]); // All available questions
  const [examQuestions, setExamQuestions] = useState({}); // Assigned questions by exam ID
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [assigningQuestions, setAssigningQuestions] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState(new Set());
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [currentExamForQuestions, setCurrentExamForQuestions] = useState(null);
  
  // New state for search and filtering questions
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  // New state for student enrollment management
  const [students, setStudents] = useState([]); // All available students
  const [examRegistrations, setExamRegistrations] = useState({}); // Enrolled students by exam ID
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [enrollingStudents, setEnrollingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [enrollmentDialogOpen, setEnrollmentDialogOpen] = useState(false);
  const [currentExamForEnrollment, setCurrentExamForEnrollment] = useState(null);
  
  // New state for search and filtering students
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // New state for status change management
  const [changingStatus, setChangingStatus] = useState(false);

  // NEW: State for questions per student and student question assignments
  const [questionsPerStudent, setQuestionsPerStudent] = useState(5); // Default value
  const [studentQuestionAssignments, setStudentQuestionAssignments] = useState({}); // student assignments by exam ID
  const [viewAssignmentsDialogOpen, setViewAssignmentsDialogOpen] = useState(false);
  const [currentExamForAssignments, setCurrentExamForAssignments] = useState(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [assigningStudentQuestions, setAssigningStudentQuestions] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Fetch exams when component mounts
  useEffect(() => {
    if (user) {
      fetchExams();
    }
  }, [user]);

  // Fetch exam questions when exams are loaded
  useEffect(() => {
    if (exams.length > 0) {
      // Fetch questions for all exams
      exams.forEach(exam => {
        fetchExamQuestions(exam.id);
        fetchExamRegistrations(exam.id);
      });
    }
  }, [exams]);

  // Initialize edit counts when exams are loaded
  useEffect(() => {
    const initEditCounts = {};
    exams.forEach(exam => {
      // Initialize edit count from exam's extra_data or default to 0
      initEditCounts[exam.id] = exam.extra_data?.edit_count || 0;
    });
    setExamEditCounts(initEditCounts);
  }, [exams]);

  // Utility function to format datetime for input fields
  const formatDateTimeForInput = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  // Filter and search questions
  const getFilteredQuestions = () => {
    let filtered = questions;
    
    // Filter by search term
    if (questionSearchTerm.trim()) {
      filtered = filtered.filter(question => 
        (question.title || '').toLowerCase().includes(questionSearchTerm.toLowerCase()) ||
        (question.description || '').toLowerCase().includes(questionSearchTerm.toLowerCase())
      );
    }
    
    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(question => question.difficulty === difficultyFilter);
    }
    
    return filtered;
  };

  // Filter and search students
  const getFilteredStudents = () => {
    let filtered = students;
    
    // Filter by search term
    if (studentSearchTerm.trim()) {
      filtered = filtered.filter(student => 
        (student.email || '').toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        (student.name || '').toLowerCase().includes(studentSearchTerm.toLowerCase())
      );
    }
    
    return filtered;
  };

  // Get difficulty badge color
  const getDifficultyBadge = (difficulty) => {
    const badgeStyles = {
      easy: "bg-green-100 text-green-800 border-green-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200", 
      hard: "bg-red-100 text-red-800 border-red-200"
    };
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${badgeStyles[difficulty] || 'bg-gray-100 text-gray-800'}`}
      >
        {difficulty?.charAt(0)?.toUpperCase() + difficulty?.slice(1) || 'Unknown'}
      </Badge>
    );
  };

  // Get available actions based on exam status
  const getAvailableActions = (exam) => {
    const actions = {
      draft: [
        { key: 'enroll-students', label: 'Enroll Students', icon: UserPlus, handler: () => handleOpenEnrollmentDialog(exam) },
        { key: 'add-questions', label: 'Assign Questions', icon: PlusCircle, handler: () => handleOpenQuestionDialog(exam) },
        { key: 'edit', label: 'Edit Exam', icon: Edit, handler: () => handleEditExam(exam) },
        { key: 'delete', label: 'Delete Exam', icon: Trash2, handler: () => setDeleteExamId(exam.id), className: 'text-red-600' }
      ],
      scheduled: [
        { key: 'view-assignments', label: 'View Student Assignments', icon: ListChecks, handler: () => handleViewStudentAssignments(exam) },
        { key: 'enroll-students', label: 'Enroll Students', icon: UserPlus, handler: () => handleOpenEnrollmentDialog(exam) },
        { key: 'view-questions', label: 'View Questions', icon: FileQuestion, handler: () => handleViewQuestions(exam) },
        { key: 'edit', label: 'Edit Exam', icon: Edit, handler: () => handleEditExam(exam) },
        { key: 'delete', label: 'Delete Exam', icon: Trash2, handler: () => setDeleteExamId(exam.id), className: 'text-red-600' }
      ],
      ongoing: [ // "On-Going" status
        { key: 'view-assignments', label: 'View Student Assignments', icon: ListChecks, handler: () => handleViewStudentAssignments(exam) },
        { key: 'view-questions', label: 'View Questions', icon: FileQuestion, handler: () => handleViewQuestions(exam) }
      ],
      completed: [
        { key: 'view-assignments', label: 'View Student Assignments', icon: ListChecks, handler: () => handleViewStudentAssignments(exam) },
        { key: 'view-questions', label: 'View Questions', icon: FileQuestion, handler: () => handleViewQuestions(exam) },
        { key: 'view-results', label: 'View Results', icon: Eye, handler: () => handleViewResults(exam.id) }
      ]
    };

    return actions[exam.status] || [];
  };

  // NEW: Function to shuffle array (Fisher-Yates shuffle)
  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // NEW: Function to clear existing student-question assignments
  const clearExistingStudentAssignments = async (examId) => {
    try {
      // Get existing assignments
      const response = await api.get(`/exams/${examId}/student-questions/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      // Delete each assignment
      const deletePromises = response.data.map(assignment =>
        api.delete(`/student-exam-questions/${assignment.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          }
        })
      );

      await Promise.all(deletePromises);
      console.log('Cleared existing student assignments');
      
    } catch (error) {
      console.error('Error clearing existing assignments:', error);
      // Don't throw error, just log it as it's not critical
    }
  };

  // NEW: Function to reassign questions to all students (used when questions change)
  const reassignQuestionsToAllStudents = async (examId) => {
    setAssigningStudentQuestions(true);
    try {
      // First clear existing assignments
      await clearExistingStudentAssignments(examId);
      
      // Then assign new questions
      const success = await assignQuestionsToStudents(examId);
      return success;
      
    } catch (error) {
      console.error('Error reassigning questions:', error);
      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };

  // FIXED: Function to assign questions randomly to all enrolled students using bulk assignment endpoint
  const assignQuestionsToStudents = async (examId) => {
    setAssigningStudentQuestions(true);
    try {
      const examQuestionsList = examQuestions[examId] || [];
      const enrolledStudents = examRegistrations[examId] || [];
      
      if (examQuestionsList.length === 0) {
        toast.error("No questions assigned to exam", {
          description: "Please assign questions to the exam first before setting it to scheduled.",
        });
        return false;
      }
      
      if (enrolledStudents.length === 0) {
        toast.error("No students enrolled", {
          description: "Please enroll students in the exam first before setting it to scheduled.",
        });
        return false;
      }

      const exam = exams.find(e => e.id === examId);
      const questionsPerStudentCount = exam?.extra_data?.questions_per_student || questionsPerStudent;
      
      if (questionsPerStudentCount > examQuestionsList.length) {
        toast.error("Not enough questions", {
          description: `Exam has ${examQuestionsList.length} questions but needs ${questionsPerStudentCount} per student.`,
        });
        return false;
      }

      // Get all available question IDs from the exam questions
      const availableQuestionIds = examQuestionsList.map(eq => eq.question_id);
      const assignments = [];
      
      for (const registration of enrolledStudents) {
        const studentId = registration.student_id;
        
        // Randomly select questions for this student
        const shuffledQuestions = shuffleArray(availableQuestionIds);
        const selectedQuestions = shuffledQuestions.slice(0, questionsPerStudentCount);
        
        // Create assignment objects for this student
        selectedQuestions.forEach((questionId, index) => {
          assignments.push({
            exam_id: String(examId), // Ensure string format for UUID
            student_id: String(studentId), // Ensure string format for UUID
            question_id: String(questionId), // Ensure string format for UUID
            question_order: index, // Sequential order per student
            points: 1 // Default points
          });
        });
      }

      console.log('Bulk assignment payload:', { assignments }); // Debug log

      // Get access token for authorization
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in again.",
        });
        logout();
        return false;
      }

      // Make bulk assignment request using the correct endpoint
      const response = await api.post('/student-exam-questions/bulk-assign/', {
        assignments: assignments
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Bulk assignment response:', response.data); // Debug log
      
      toast.success("Questions assigned to students!", {
        description: `Successfully assigned ${questionsPerStudentCount} random questions to ${enrolledStudents.length} students.`,
      });
      
      return true;
      
    } catch (error) {
      console.error('Error assigning questions to students:', error);
      console.error('Error response data:', error.response?.data); // Debug log
      
      if (error.response?.status === 401) {
        toast.error("Authentication failed", {
          description: "Your session has expired. Please log in again.",
        });
        logout();
        return false;
      }
      
      // Show detailed error message from backend
      let errorMessage = "An error occurred while assigning questions to students.";
      if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          // Handle validation error array
          errorMessage = error.response.data.detail.map(err => 
            `${err.loc?.join('.')} - ${err.msg}`
          ).join('; ');
        }
      }
      
      toast.error("Failed to assign questions to students", {
        description: errorMessage,
      });
      return false;
    } finally {
      setAssigningStudentQuestions(false);
    }
  };

  // FIXED: Function to fetch student question assignments using the NEW endpoint
  const fetchStudentQuestionAssignments = async (examId) => {
    setLoadingAssignments(true);
    try {
      // Get access token from localStorage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        toast.error("Authentication required", {
          description: "Please log in again.",
        });
        logout();
        return {};
      }

      // Use the NEW endpoint format: /exams/{exam_id}/student-questions/
      const response = await api.get(`/exams/${examId}/student-questions/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Raw API response for assignments:', response.data); // Debug log
      
      // Process the raw assignment data by mapping student and question information
      const assignmentsByStudent = {};
      response.data.forEach(assignment => {
        const studentId = assignment.student_id;
        
        // Find the question data from our questions array
        const questionData = questions.find(q => q.id === assignment.question_id);
        
        // Create processed assignment with question details
        const processedAssignment = {
          ...assignment,
          question: questionData // Add the question object
        };
        
        if (!assignmentsByStudent[studentId]) {
          assignmentsByStudent[studentId] = [];
        }
        assignmentsByStudent[studentId].push(processedAssignment);
      });

      console.log('Grouped assignments by student:', assignmentsByStudent); // Debug log

      setStudentQuestionAssignments(prev => ({
        ...prev,
        [examId]: assignmentsByStudent
      }));

      return assignmentsByStudent;
    } catch (error) {
      console.error('Error fetching student question assignments:', error);
      if (error.response?.status === 401) {
        toast.error("Authentication failed", {
          description: "Your session has expired. Please log in again.",
        });
        logout();
        return {};
      }
      toast.error("Failed to fetch student assignments", {
        description: error.response?.data?.detail || "Unable to load student question assignments.",
      });
      return {};
    } finally {
      setLoadingAssignments(false);
    }
  };

  // NEW: Handler to open student assignments view dialog
  const handleViewStudentAssignments = async (exam) => {
    setCurrentExamForAssignments(exam);
    setViewAssignmentsDialogOpen(true);
    
    // Ensure questions are loaded for mapping question IDs to question data
    if (questions.length === 0) {
      await fetchQuestions();
    }
    
    // Ensure students are loaded for mapping student IDs to student data
    if (students.length === 0) {
      await fetchStudents();
    }
    
    // Fetch student assignments
    await fetchStudentQuestionAssignments(exam.id);
  };

  // Fetch exams from API
  const fetchExams = async () => {
    setLoadingExams(true);
    try {
      const response = await api.get('/exams/');
      setExams(response.data);
      
      // Update dashboard stats based on real data
      const activeCount = response.data.filter(exam => exam.status === 'ongoing' || exam.status === 'draft').length;
      const completedCount = response.data.filter(exam => exam.status === 'completed').length;
      
    } catch (error) {
      console.error('Error fetching exams:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exams", {
        description: "Unable to load your exams. Please refresh the page.",
      });
    } finally {
      setLoadingExams(false);
    }
  };

  // Fetch all available questions
  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await api.get('/questions/?skip=0&limit=100');
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch questions", {
        description: "Unable to load available questions.",
      });
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Fetch all available students
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const response = await api.get('/users/?skip=0&limit=100');
      // Filter only students
      const studentUsers = response.data.filter(user => user.role === 'student');
      setStudents(studentUsers);
    } catch (error) {
      console.error('Error fetching students:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch students", {
        description: "Unable to load available students.",
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  // FIXED: Fetch exam-specific questions - using correct endpoint
  const fetchExamQuestions = async (examId) => {
    try {
      const response = await api.get('/exam-questions/?skip=0&limit=100');
      // Filter questions for this specific exam
      const examSpecificQuestions = response.data.filter(eq => eq.exam_id === examId);
      setExamQuestions(prev => ({
        ...prev,
        [examId]: examSpecificQuestions
      }));
      return examSpecificQuestions;
    } catch (error) {
      console.error('Error fetching exam questions:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exam questions", {
        description: "Unable to load assigned questions for this exam.",
      });
      return [];
    }
  };

  // Fetch exam-specific registrations
  const fetchExamRegistrations = async (examId) => {
    try {
      const response = await api.get('/exam-registrations/?skip=0&limit=100');
      // Filter registrations for this specific exam
      const examSpecificRegistrations = response.data.filter(reg => reg.exam_id === examId);
      setExamRegistrations(prev => ({
        ...prev,
        [examId]: examSpecificRegistrations
      }));
      return examSpecificRegistrations;
    } catch (error) {
      console.error('Error fetching exam registrations:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exam registrations", {
        description: "Unable to load enrolled students for this exam.",
      });
      return [];
    }
  };

  // MODIFIED: Handle status change with automatic question assignment
  const handleStatusChange = async (examId, newStatus) => {
    setChangingStatus(true);
    try {
      const exam = exams.find(e => e.id === examId);
      
      // If changing to "scheduled", assign questions to students first
      if (newStatus === 'scheduled' && exam.status !== 'scheduled') {
        const success = await assignQuestionsToStudents(examId);
        if (!success) {
          setChangingStatus(false);
          return; // Don't update status if assignment failed
        }
      }
      
      const updatedExam = {
        ...exam,
        status: newStatus
      };

      const response = await api.put(`/exams/${examId}`, updatedExam);
      
      // Update exam in local state
      setExams(prevExams => prevExams.map(exam => 
        exam.id === examId ? response.data : exam
      ));
      
      toast.success("Status updated successfully!", {
        description: `Exam status changed to "${newStatus}".`,
      });
      
    } catch (error) {
      console.error('Error updating exam status:', error);
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }
      toast.error("Failed to update status", {
        description: error.response?.data?.detail || "An error occurred while updating the exam status.",
      });
    } finally {
      setChangingStatus(false);
    }
  };

  // IMPROVED: Handle question assignment with status-based validation
  const handleAssignQuestions = async (examId, questionIds) => {
    setAssigningQuestions(true);
    try {
      const exam = exams.find(e => e.id === examId);
      
      // Check if modifications are allowed based on exam status
      if (exam.status === 'ongoing' || exam.status === 'completed') {
        toast.error("Cannot modify questions", {
          description: `Cannot modify questions in ${exam.status} exams.`,
        });
        setAssigningQuestions(false);
        return;
      }

      const assignPromises = questionIds.map((questionId, index) => 
        api.post('/exam-questions/', {
          question_order: index,
          points: 1, // Default points, can be made configurable
          extra_data: {},
          exam_id: examId,
          question_id: questionId
        })
      );

      await Promise.all(assignPromises);
      
      // Refresh exam questions
      await fetchExamQuestions(examId);
      
      // If exam is scheduled, reassign questions to all students
      if (exam.status === 'scheduled') {
        toast.info("Reassigning questions", {
          description: "Reassigning questions to all enrolled students...",
        });
        await reassignQuestionsToAllStudents(examId);
      }
      
      toast.success("Questions assigned successfully!", {
        description: `${questionIds.length} question(s) have been assigned to the exam.`,
      });
      
      setSelectedQuestions(new Set());
      setQuestionDialogOpen(false);
      
    } catch (error) {
      console.error('Error assigning questions:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      
      // Improved error handling
      let errorMessage = "An error occurred while assigning questions.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Questions may already be assigned or there may be a conflict.";
      }
      
      toast.error("Failed to assign questions", {
        description: errorMessage,
      });
    } finally {
      setAssigningQuestions(false);
    }
  };

  // IMPROVED: Handle student enrollment with status-based validation
  const handleEnrollStudents = async (examId, studentIds) => {
    setEnrollingStudents(true);
    try {
      const exam = exams.find(e => e.id === examId);
      
      // Check if modifications are allowed based on exam status
      if (exam.status === 'ongoing' || exam.status === 'completed') {
        toast.error("Cannot modify enrollment", {
          description: `Cannot enroll students in ${exam.status} exams.`,
        });
        setEnrollingStudents(false);
        return;
      }

      const enrollPromises = studentIds.map(studentId => 
        api.post('/exam-registrations/', {
          status: "pending",
          approved_at: new Date().toISOString(),
          extra_data: {},
          exam_id: examId,
          student_id: studentId,
          approved_by: user.id // Assuming the teacher's ID is available in user context
        })
      );

      await Promise.all(enrollPromises);
      
      // Refresh exam registrations
      await fetchExamRegistrations(examId);
      
      // If exam is scheduled, reassign questions to include new students
      if (exam.status === 'scheduled') {
        toast.info("Reassigning questions", {
          description: "Assigning questions to newly enrolled students...",
        });
        await assignQuestionsToStudents(examId);
      }
      
      toast.success("Students enrolled successfully!", {
        description: `${studentIds.length} student(s) have been enrolled in the exam.`,
      });
      
      setSelectedStudents(new Set());
      setEnrollmentDialogOpen(false);
      
    } catch (error) {
      console.error('Error enrolling students:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      
      // Improved error handling
      let errorMessage = "An error occurred while enrolling students.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Please check if students are already enrolled or if the exam state conflicts.";
      }
      
      toast.error("Failed to enroll students", {
        description: errorMessage,
      });
    } finally {
      setEnrollingStudents(false);
    }
  };

  // IMPROVED: Handle question removal with status-based validation
  const handleRemoveQuestion = async (examQuestionId, examId) => {
    try {
      const exam = exams.find(e => e.id === examId);
      
      // Check if modifications are allowed
      if (exam.status === 'ongoing' || exam.status === 'completed') {
        toast.error("Cannot modify questions", {
          description: `Cannot remove questions from ${exam.status} exams.`,
        });
        return;
      }

      // If exam is scheduled, warn about reassignment
      if (exam.status === 'scheduled') {
        toast.info("Student assignments will be updated", {
          description: "Questions will be reassigned to all students after removal.",
        });
      }

      await api.delete(`/exam-questions/${examQuestionId}`);
      
      // Refresh exam questions
      await fetchExamQuestions(examId);
      
      // If exam is scheduled, reassign questions to all students
      if (exam.status === 'scheduled') {
        await reassignQuestionsToAllStudents(examId);
      }
      
      toast.success("Question removed successfully!", {
        description: "The question has been removed from the exam.",
      });
      
    } catch (error) {
      console.error('Error removing question:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      
      let errorMessage = "An error occurred while removing the question.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Cannot remove question at this time.";
      }
      
      toast.error("Failed to remove question", {
        description: errorMessage,
      });
    }
  };

  // IMPROVED: Handle student unenrollment with status-based validation
  const handleUnenrollStudent = async (registrationId, examId) => {
    try {
      const exam = exams.find(e => e.id === examId);
      
      // Check if modifications are allowed
      if (exam.status === 'ongoing' || exam.status === 'completed') {
        toast.error("Cannot modify enrollment", {
          description: `Cannot unenroll students from ${exam.status} exams.`,
        });
        return;
      }

      // If exam is scheduled, warn about reassignment
      if (exam.status === 'scheduled') {
        toast.info("Student assignments will be updated", {
          description: "Questions will be reassigned after unenrolling the student.",
        });
      }

      await api.delete(`/exam-registrations/${registrationId}`);
      
      // Refresh exam registrations
      await fetchExamRegistrations(examId);
      
      // If exam is scheduled, clear assignments for this student
      if (exam.status === 'scheduled') {
        await clearExistingStudentAssignments(examId);
        await assignQuestionsToStudents(examId);
      }
      
      toast.success("Student unenrolled successfully!", {
        description: "The student has been unenrolled from the exam.",
      });
      
    } catch (error) {
      console.error('Error unenrolling student:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      
      let errorMessage = "An error occurred while unenrolling the student.";
      if (error.response?.status === 400) {
        errorMessage = error.response?.data?.detail || "Bad request. Cannot unenroll student at this time.";
      }
      
      toast.error("Failed to unenroll student", {
        description: errorMessage,
      });
    }
  };

  // IMPROVED: Enhanced dialog with status warnings
  const handleOpenQuestionDialog = async (exam) => {
    setCurrentExamForQuestions(exam);
    setQuestionDialogOpen(true);
    
    // Reset filters and search
    setQuestionSearchTerm('');
    setDifficultyFilter('all');
    
    // Show warning for non-draft exams
    if (exam.status !== 'draft') {
      toast.info("Exam Status Warning", {
        description: `Modifying questions in a ${exam.status} exam will reassign questions to all students.`,
      });
    }
    
    // Set questions per student from exam data or default
    const examQuestionsPerStudent = exam?.extra_data?.questions_per_student || 5;
    setQuestionsPerStudent(examQuestionsPerStudent);
    
    // Fetch questions if not already loaded
    if (questions.length === 0) {
      await fetchQuestions();
    }
    
    // Fetch exam-specific questions
    await fetchExamQuestions(exam.id);
    
    // Pre-select already assigned questions
    const assignedQuestions = examQuestions[exam.id] || [];
    const assignedQuestionIds = new Set(assignedQuestions.map(eq => eq.question_id));
    setSelectedQuestions(assignedQuestionIds);
  };

  // IMPROVED: Enhanced dialog with status warnings
  const handleOpenEnrollmentDialog = async (exam) => {
    setCurrentExamForEnrollment(exam);
    setEnrollmentDialogOpen(true);
    
    // Reset search
    setStudentSearchTerm('');
    
    // Show warning for non-draft exams
    if (exam.status !== 'draft') {
      toast.info("Exam Status Warning", {
        description: `Modifying enrollment in a ${exam.status} exam will reassign questions to all students.`,
      });
    }
    
    // Fetch students if not already loaded
    if (students.length === 0) {
      await fetchStudents();
    }
    
    // Fetch exam-specific registrations
    await fetchExamRegistrations(exam.id);
    
    // Pre-select already enrolled students
    const enrolledStudents = examRegistrations[exam.id] || [];
    const enrolledStudentIds = new Set(enrolledStudents.map(reg => reg.student_id));
    setSelectedStudents(enrolledStudentIds);
  };

  // Get question assignment status for an exam
  const getQuestionAssignmentStatus = (exam) => {
    const assignedQuestions = examQuestions[exam.id] || [];
    return {
      count: assignedQuestions.length,
      isAssigned: assignedQuestions.length > 0
    };
  };

  // Get student enrollment status for an exam
  const getStudentEnrollmentStatus = (exam) => {
    const enrolledStudents = examRegistrations[exam.id] || [];
    return {
      count: enrolledStudents.length,
      isEnrolled: enrolledStudents.length > 0
    };
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      // Prepare API payload
      const apiPayload = {
        title: examForm.title,
        description: examForm.description,
        start_time: examForm.start_time,
        end_time: examForm.end_time,
        duration_minutes: parseInt(examForm.duration_minutes),
        exam_type: examForm.exam_type,
        shuffle_questions: examForm.shuffle_questions,
        max_attempts: parseInt(examForm.max_attempts),
        settings: {},
        status: 'draft',
        extra_data: {}
      };
      
      console.log('Creating exam with payload:', apiPayload);
      
      let response;
      if (editingExam) {
        // Update existing exam - increment edit count
        const currentEditCount = examEditCounts[editingExam.id] || 0;
        const newEditCount = currentEditCount + 1;
        
        // Include the incremented edit count in extra_data
        apiPayload.extra_data = {
          ...editingExam.extra_data,
          edit_count: newEditCount
        };
        
        response = await api.put(`/exams/${editingExam.id}`, apiPayload);
        
        // Update exam in local state
        setExams(prevExams => prevExams.map(exam => 
          exam.id === editingExam.id ? response.data : exam
        ));
        
        // Update edit count in local state
        setExamEditCounts(prev => ({
          ...prev,
          [editingExam.id]: newEditCount
        }));
        
        toast.success("Exam updated successfully!", {
          description: `"${examForm.title}" has been updated (Edit #${newEditCount}).`,
        });
      } else {
        // Create new exam - initialize edit count to 0
        apiPayload.extra_data = { edit_count: 0 };
        
        response = await api.post('/exams/', apiPayload);
        
        // Add new exam to local state
        setExams(prevExams => [...prevExams, response.data]);
        
        // Initialize edit count for new exam
        setExamEditCounts(prev => ({
          ...prev,
          [response.data.id]: 0
        }));
        
        toast.success("Exam created successfully!", {
          description: `"${examForm.title}" has been created and is ready for questions.`,
        });
      }
      
      console.log('Exam operation successful:', response.data);
      
      // Reset form and editing state
      resetForm();
      setEditingExam(null);
      
      // Switch to exams tab to show the exam
      setActiveTab("exams");
      
    } catch (error) {
      console.error('Error with exam operation:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }
      
      // Handle other errors
      const action = editingExam ? 'update' : 'create';
      toast.error(`Failed to ${action} exam`, {
        description: error.response?.data?.detail || `An unexpected error occurred while ${action.slice(0, -1)}ing the exam.`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    try {
      await api.delete(`/exams/${examId}`);
      
      // Remove exam from local state
      setExams(prevExams => prevExams.filter(exam => exam.id !== examId));
      
      // Remove edit count from local state
      setExamEditCounts(prev => {
        const newCounts = { ...prev };
        delete newCounts[examId];
        return newCounts;
      });
      
      toast.success("Exam deleted successfully!", {
        description: "The exam and all associated data have been removed.",
      });
      
    } catch (error) {
      console.error('Error deleting exam:', error);
      
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }
      
      toast.error("Failed to delete exam", {
        description: error.response?.data?.detail || "An unexpected error occurred while deleting the exam.",
      });
    } finally {
      setDeleteExamId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error("Logout failed", {
        description: "There was an error logging out. Please try again.",
      });
      navigate('/login');
    }
  };

  const handleViewResults = (examId) => { 
    navigate(`/teacher/exam/${examId}/results`); 
  };

  const handleViewQuestions = (exam) => {
    navigate(`/teacher/exam/${exam.id}/questions`);
    toast.info("Viewing questions", {
      description: `Opening questions for "${exam.title}"`,
    });
  };

  const handleAddQuestions = (exam) => {
    navigate(`/teacher/exam/${exam.id}/questions/create`);
    toast.info("Add questions", {
      description: `Adding questions to "${exam.title}"`,
    });
  };
  
  const handleEditExam = (exam) => {
    // Only allow editing for scheduled and draft exams
    if (exam.status !== 'scheduled' && exam.status !== 'draft') {
      toast.warning("Cannot edit exam", {
        description: `Exams with status "${exam.status}" cannot be edited.`,
      });
      return;
    }

    // Pre-fill form with exam data
    setExamForm({
      title: exam.title || '',
      description: exam.description || '',
      start_time: formatDateTimeForInput(exam.start_time),
      end_time: formatDateTimeForInput(exam.end_time),
      duration_minutes: exam.duration_minutes?.toString() || '',
      exam_type: exam.exam_type || 'practice',
      shuffle_questions: exam.shuffle_questions || false,
      max_attempts: exam.max_attempts?.toString() || '1',
      questions: '' // Questions might need to be fetched separately
    });
    
    setEditingExam(exam);
    setActiveTab("create-exam");
    
    const currentEditCount = examEditCounts[exam.id] || 0;
    toast.info("Edit mode", {
      description: `Now editing "${exam.title}". This will be edit #${currentEditCount + 1}.`,
    });
  };

  const resetForm = () => {
    setExamForm({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      duration_minutes: '',
      exam_type: 'practice',
      shuffle_questions: false,
      max_attempts: 1,
      questions: ''
    });
  };

  const handleNewExam = () => {
    resetForm();
    setEditingExam(null);
    setActiveTab("create-exam");
  };

  const handleExportData = async (examId) => {
    try {
      const response = await api.get(`/exams/${examId}/export`);
      toast.success("Data exported successfully!", {
        description: "The exam data has been downloaded to your device.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      if (error.response?.status === 401) {
        toast.error("Session Expired", {
          description: "Please log in again.",
        });
        logout();
        return;
      }
      toast.error("Export failed", {
        description: "Unable to export the exam data. Please try again.",
      });
    }
  };
  
  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { 
        icon: CheckCircle2, 
        className: "bg-green-100 text-green-800 border-green-200",
        label: "Completed"
      },
      ongoing: { 
        icon: PlayCircle, 
        className: "bg-blue-100 text-blue-800 border-blue-200",
        label: "On-Going"
      },
      scheduled: { 
        icon: Calendar, 
        className: "bg-purple-100 text-purple-800 border-purple-200",
        label: "Scheduled"
      },
      draft: { 
        icon: Edit, 
        className: "bg-gray-100 text-gray-800 border-gray-200",
        label: "Draft"
      }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getStatusDescription = (status) => {
    switch (status) {
      case 'draft': 
        return 'Exam is being prepared. Add questions and enroll students to complete setup.';
      case 'scheduled': 
        return 'Exam is scheduled and ready. Can be edited before start time.';
      case 'ongoing': 
        return 'Exam is currently in progress. Students are taking the exam.';
      case 'completed': 
        return 'Exam has ended. Results are available for review.';
      default: 
        return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    
    // Handle timezone offset to prevent date shifting
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + timezoneOffset);
    
    return adjustedDate.toLocaleDateString() + ' ' + adjustedDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render the dashboard if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user?.name || user?.email || 'Teacher'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-2">
              <BookOpen className="h-4 w-4" />
              All Exams ({exams.length})
            </TabsTrigger>
            <TabsTrigger value="create-exam" className="gap-2">
              <Plus className="h-4 w-4" />
              {editingExam ? 'Edit Exam' : 'Create Exam'}
            </TabsTrigger>
            <TabsTrigger value="questions" className="gap-2"><BookOpenCheck className="h-4 w-4" />Questions</TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
            <CircleCheckBig className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="results"><ExamManagementPage /></TabsContent> 

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Draft Exams</CardTitle>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exams.filter(exam => exam.status === 'draft').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Need setup completion</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On-Going Exams</CardTitle>
                  <PlayCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exams.filter(exam => exam.status === 'ongoing').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Currently in progress</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Exams</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {exams.filter(exam => exam.status === 'completed').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Results available</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{exams.length}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between border-b pb-2">
                        <p className="text-sm">{activity.action}</p>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full gap-2" onClick={handleNewExam}>
                    <Plus className="h-4 w-4" />
                    Create New Exam
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => toast.info("Export feature", { description: "This feature will be available soon!" })}
                  >
                    <Download className="h-4 w-4" />
                    Export Results
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={fetchExams}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Exams
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Enhanced Create/Edit Exam Tab */}
          <TabsContent value="create-exam">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-xl">
                  {editingExam ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                  {editingExam ? 'Edit Exam' : 'Create a New Exam'}
                </CardTitle>
                <CardDescription className="text-base">
                  {editingExam 
                    ? `Modify the details for "${editingExam.title}"`
                    : 'Set up a new examination for your students with detailed configuration'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                {editingExam && (
                  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Editing Mode - {editingExam.status}</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                      You are editing exam ID: {editingExam.id} (Edit #{(examEditCounts[editingExam.id] || 0) + 1})
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3" 
                      onClick={() => {
                        setEditingExam(null);
                        resetForm();
                        toast.info("Edit cancelled", { description: "Returned to create mode." });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  </div>
                )}
                
                <form onSubmit={handleCreateExam} className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Basic Information</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Enter the basic details of your exam</p>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-3">
                        <Label htmlFor="exam-title" className="text-sm font-medium">Exam Title *</Label>
                        <Input 
                          id="exam-title" 
                          value={examForm.title} 
                          onChange={(e) => setExamForm(prev => ({ ...prev, title: e.target.value }))} 
                          placeholder="e.g., Data Structures Final Exam" 
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">Give your exam a clear, descriptive title</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="exam-type" className="text-sm font-medium">Exam Type *</Label>
                        <Select 
                          value={examForm.exam_type} 
                          onValueChange={(value) => setExamForm(prev => ({ ...prev, exam_type: value }))}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select exam type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="quiz">Quiz</SelectItem>
                            <SelectItem value="midterm">Midterm</SelectItem>
                            <SelectItem value="final">Final</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">Choose the type that best describes your exam</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="exam-description" className="text-sm font-medium">Description</Label>
                      <Textarea 
                        id="exam-description" 
                        value={examForm.description} 
                        onChange={(e) => setExamForm(prev => ({ ...prev, description: e.target.value }))} 
                        placeholder="Brief description of the exam content, topics covered, and any special instructions..." 
                        rows={4}
                        className="resize-none"
                      />
                      <p className="text-xs text-gray-500">Provide additional context about this exam</p>
                    </div>
                  </div>

                  {/* Schedule Section */}
                  <div className="space-y-6">
                    <div className="border-b pb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Schedule & Duration</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Set when the exam will be available and how long it will last</p>
                    </div>
                    
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="space-y-3">
                        <Label htmlFor="start-time" className="text-sm font-medium">Start Time *</Label>
                        <Input 
                          id="start-time" 
                          type="datetime-local" 
                          value={examForm.start_time} 
                          onChange={(e) => setExamForm(prev => ({ ...prev, start_time: e.target.value }))} 
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">When students can start taking the exam</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="end-time" className="text-sm font-medium">End Time *</Label>
                        <Input 
                          id="end-time" 
                          type="datetime-local" 
                          value={examForm.end_time} 
                          onChange={(e) => setExamForm(prev => ({ ...prev, end_time: e.target.value }))} 
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">When the exam period closes</p>
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="exam-duration" className="text-sm font-medium">Duration (minutes) *</Label>
                        <Input 
                          id="exam-duration" 
                          type="number" 
                          min="1"
                          value={examForm.duration_minutes} 
                          onChange={(e) => setExamForm(prev => ({ ...prev, duration_minutes: e.target.value }))} 
                          placeholder="120" 
                          required
                          className="h-11"
                        />
                        <p className="text-xs text-gray-500">Maximum time allowed per attempt</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-6 border-t">
                    <Button 
                      type="submit" 
                      disabled={isCreating} 
                      className="gap-2 px-8 py-3 text-base"
                      size="lg"
                    >
                      {isCreating ? (
                        <>
                          <Clock className="h-5 w-5 animate-spin" />
                          {editingExam ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          {editingExam ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                          {editingExam ? 'Update Exam' : 'Create Exam'}
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        resetForm();
                        toast.info("Form reset", { description: "All fields have been cleared." });
                      }}
                      className="px-8 py-3 text-base"
                      size="lg"
                    >
                      Reset Form
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced All Exams Tab */}
          <TabsContent value="exams">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-t-lg">
                <div className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">All Exams</CardTitle>
                    <CardDescription className="text-base">
                      Manage your examinations and track their progress
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchExams}
                    disabled={loadingExams}
                    className="gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingExams ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingExams ? (
                  <div className="flex items-center justify-center py-16">
                    <Clock className="h-8 w-8 animate-spin mr-3" />
                    <span className="text-lg">Loading exams...</span>
                  </div>
                ) : exams.length === 0 ? (
                  <div className="text-center py-16 px-8">
                    <BookOpen className="h-16 w-16 mx-auto text-gray-400 mb-6" />
                    <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">No exams yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                      Create your first exam to get started with online assessments for your students.
                    </p>
                    <Button onClick={handleNewExam} className="gap-2" size="lg">
                      <Plus className="h-5 w-5" />
                      Create Your First Exam
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50 dark:bg-gray-800">
                        <TableRow>
                          <TableHead className="font-semibold">Exam Details</TableHead>
                          <TableHead className="font-semibold">Schedule</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-center">Questions</TableHead>
                          <TableHead className="font-semibold text-center">Students</TableHead>
                          <TableHead className="font-semibold">Created</TableHead>
                          <TableHead className="font-semibold text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exams.map((exam) => {
                          const questionStatus = getQuestionAssignmentStatus(exam);
                          const enrollmentStatus = getStudentEnrollmentStatus(exam);
                          const editCount = examEditCounts[exam.id] || 0;
                          return (
                            <TableRow key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <TableCell className="py-4">
                                <div className="space-y-1">
                                  <div className="font-semibold text-base">{exam.title}</div>
                                  <div className="text-sm text-gray-600 dark:text-gray-400 capitalize flex items-center gap-2">
                                    <BookOpen className="h-3 w-3" />
                                    {exam.exam_type} • {exam.duration_minutes}min
                                    {exam.max_attempts > 1 && ` • ${exam.max_attempts} attempts`}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                                    {exam.description || 'No description provided'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(exam.start_time)}
                                  </div>
                                  <div className="flex items-center gap-1 text-red-600">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(exam.end_time)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="space-y-2">
                                  {getStatusBadge(exam.status)}
                                  <Select 
                                    value={exam.status} 
                                    onValueChange={(newStatus) => handleStatusChange(exam.id, newStatus)}
                                    disabled={changingStatus}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="draft">Draft</SelectItem>
                                      <SelectItem value="scheduled">Scheduled</SelectItem>
                                      <SelectItem value="ongoing">On-Going</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant={questionStatus.isAssigned ? "default" : "secondary"}>
                                    {questionStatus.count}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant={enrollmentStatus.isEnrolled ? "default" : "secondary"}>
                                    {enrollmentStatus.count}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-sm text-muted-foreground">
                                {new Date(exam.created_at).toLocaleDateString()}
                                {editCount > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Edited {editCount}x
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center justify-center gap-1">
                                  {/* View Student Assignments - First for scheduled, ongoing, completed */}
                                  {(exam.status === 'scheduled' || exam.status === 'ongoing' || exam.status === 'completed') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewStudentAssignments(exam)}
                                      className="h-9 w-9 p-0"
                                      title="View Student Assignments"
                                    >
                                      <ListChecks className="h-4 w-4 text-indigo-600" />
                                    </Button>
                                  )}

                                  {/* Enroll Students - Always second */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenEnrollmentDialog(exam)}
                                    className="h-9 w-9 p-0"
                                    title="Enroll Students"
                                  >
                                    <UserPlus className={`h-4 w-4 ${enrollmentStatus.isEnrolled ? 'text-green-600' : 'text-gray-400'}`} />
                                  </Button>

                                  {/* Assign Questions - Always third */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenQuestionDialog(exam)}
                                    className="h-9 w-9 p-0"
                                    title="Assign Questions"
                                  >
                                    <FileQuestion className={`h-4 w-4 ${questionStatus.isAssigned ? 'text-green-600' : 'text-gray-400'}`} />
                                  </Button>

                                  {/* Edit Exam - Fourth, for draft and scheduled exams only */}
                                  {(exam.status === 'draft' || exam.status === 'scheduled') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditExam(exam)}
                                      className="h-9 w-9 p-0 relative"
                                      title={`Edit Exam (Edited ${editCount} times)`}
                                    >
                                      <Edit className="h-4 w-4 text-blue-600" />
                                      {editCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold leading-none">
                                          {editCount}
                                        </span>
                                      )}
                                    </Button>
                                  )}

                                  {/* View Results - Only for completed exams */}
                                  {exam.status === 'completed' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleViewResults(exam.id)}
                                      className="h-9 w-9 p-0"
                                      title="View Results"
                                    >
                                      <Eye className="h-4 w-4 text-purple-600" />
                                    </Button>
                                  )}

                                  {/* Delete Exam - Last, for draft and scheduled exams only */}
                                  {(exam.status === 'draft' || exam.status === 'scheduled') && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteExamId(exam.id)}
                                      className="h-9 w-9 p-0"
                                      title="Delete Exam"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Exam Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Draft Exams</span>
                    <span className="text-2xl font-bold">{exams.filter(e => e.status === 'draft').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Scheduled Exams</span>
                    <span className="text-2xl font-bold">{exams.filter(e => e.status === 'scheduled').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">On-Going Exams</span>
                    <span className="text-2xl font-bold">{exams.filter(e => e.status === 'ongoing').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Completed Exams</span>
                    <span className="text-2xl font-bold">{exams.filter(e => e.status === 'completed').length}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Status Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {exams.filter(e => e.status === 'draft').length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium">Draft Exams Need Setup</span>
                      </div>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        {exams.filter(e => e.status === 'draft').length} exam(s) need questions and student enrollment
                      </p>
                    </div>
                  )}
                  {exams.filter(e => e.status === 'ongoing').length > 0 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Exams In Progress</span>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        {exams.filter(e => e.status === 'ongoing').length} exam(s) are currently active
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Exam Performance Analysis</CardTitle>
                <CardDescription>Detailed breakdown of exam results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {analyticsData.examPerformance.map((exam, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{exam.exam}</span>
                        <span className="text-sm text-muted-foreground">
                          Score: {exam.averageScore}% | Participation: {exam.participationRate}%
                        </span>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs">Average Score</span>
                            <span className="text-xs">{exam.averageScore}%</span>
                          </div>
                          <Progress value={exam.averageScore} className="h-2" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-xs">Participation Rate</span>
                            <span className="text-xs">{exam.participationRate}%</span>
                          </div>
                          <Progress value={exam.participationRate} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="questions">
            <QuestionsManagement />
          </TabsContent>
        </Tabs>

        {/* MODIFIED: Enhanced Question Assignment Dialog with Questions Per Student */}
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileQuestion className="h-5 w-5" />
                Assign Questions to "{currentExamForQuestions?.title}"
              </DialogTitle>
              <DialogDescription>
                Select questions to assign to this exam. Use the search and filter options to find specific questions.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Questions Per Student Input */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="questions-per-student" className="text-sm font-medium">
                      Questions Per Student *
                    </Label>
                    <Input
                      id="questions-per-student"
                      type="number"
                      min="1"
                      max="50"
                      value={questionsPerStudent}
                      onChange={(e) => setQuestionsPerStudent(parseInt(e.target.value) || 1)}
                      className="w-24"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      When this exam is set to <strong>Scheduled</strong>, each enrolled student will automatically receive <strong>{questionsPerStudent}</strong> randomly selected questions from the assigned questions pool.
                    </p>
                  </div>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="question-search">Search Questions</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="question-search"
                      placeholder="Search by title or description..."
                      value={questionSearchTerm}
                      onChange={(e) => setQuestionSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty Filter</Label>
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Summary Information */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Selected: {selectedQuestions.size}</span>
                    <span className="text-muted-foreground ml-2">
                      (Showing {getFilteredQuestions().length} of {questions.length} questions)
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Currently assigned: {examQuestions[currentExamForQuestions?.id]?.length || 0} questions
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuestions(new Set(getFilteredQuestions().map(q => q.id)))}
                    disabled={loadingQuestions || getFilteredQuestions().length === 0}
                  >
                    Select All Visible
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedQuestions(new Set())}
                    disabled={loadingQuestions}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Questions List */}
              <ScrollArea className="h-[400px] border rounded-lg">
                {loadingQuestions ? (
                  <div className="flex items-center justify-center py-12">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading questions...</span>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Questions Available</h3>
                    <p className="text-sm">Create some questions first to assign them to exams.</p>
                  </div>
                ) : getFilteredQuestions().length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Matching Questions</h3>
                    <p className="text-sm">Try adjusting your search term or filters.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {getFilteredQuestions().map((question) => {
                      const isSelected = selectedQuestions.has(question.id);
                      const isAssigned = examQuestions[currentExamForQuestions?.id]?.some(
                        eq => eq.question_id === question.id
                      );
                      
                      return (
                        <div
                          key={question.id}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                          } ${isAssigned ? 'ring-2 ring-green-200 dark:ring-green-800' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`question-${question.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedQuestions);
                                if (checked) {
                                  newSelected.add(question.id);
                                } else {
                                  newSelected.delete(question.id);
                                }
                                setSelectedQuestions(newSelected);
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <Label
                                  htmlFor={`question-${question.id}`}
                                  className="font-semibold text-base cursor-pointer line-clamp-2"
                                >
                                  {question.title || 'Untitled Question'}
                                </Label>
                                <div className="flex gap-2 flex-shrink-0">
                                  {getDifficultyBadge(question.difficulty)}
                                  {isAssigned && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Assigned
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              {question.description && (
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {question.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Max Score: {question.max_score || 0} points</span>
                                <span>Time Limit: {question.time_limit_seconds || 30}s</span>
                                {question.problem_statement && (
                                  <span>Has Problem Statement</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Currently Assigned Questions Summary */}
              {currentExamForQuestions && examQuestions[currentExamForQuestions.id]?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Currently Assigned Questions ({examQuestions[currentExamForQuestions.id].length})</h4>
                  </div>
                  <ScrollArea className="max-h-32 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {examQuestions[currentExamForQuestions.id].map((examQuestion) => {
                        const questionData = questions.find(q => q.id === examQuestion.question_id);
                        return (
                          <div
                            key={examQuestion.id}
                            className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700"
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium">
                                {questionData?.title || 'Question not found'}
                              </span>
                              {questionData?.difficulty && (
                                <span className="ml-2">
                                  {getDifficultyBadge(questionData.difficulty)}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveQuestion(examQuestion.id, currentExamForQuestions.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Remove question from exam"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedQuestions.size > 0 && (
                  <span>{selectedQuestions.size} question(s) selected for assignment</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setQuestionDialogOpen(false)}
                  disabled={assigningQuestions}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Update exam with questions per student setting
                    if (currentExamForQuestions) {
                      const exam = exams.find(e => e.id === currentExamForQuestions.id);
                      const updatedExam = {
                        ...exam,
                        extra_data: {
                          ...exam.extra_data,
                          questions_per_student: questionsPerStudent
                        }
                      };
                      
                      // Update exam first, then assign questions
                      api.put(`/exams/${currentExamForQuestions.id}`, updatedExam).then(() => {
                        setExams(prevExams => prevExams.map(exam => 
                          exam.id === currentExamForQuestions.id ? updatedExam : exam
                        ));
                      });
                    }
                    
                    const questionsToAssign = Array.from(selectedQuestions).filter(qId => 
                      !examQuestions[currentExamForQuestions?.id]?.some(eq => eq.question_id === qId)
                    );
                    if (questionsToAssign.length > 0) {
                      handleAssignQuestions(currentExamForQuestions.id, questionsToAssign);
                    } else {
                      toast.info("No new questions to assign", {
                        description: "All selected questions are already assigned to this exam."
                      });
                    }
                  }}
                  disabled={assigningQuestions || selectedQuestions.size === 0}
                  className="gap-2 min-w-[140px]"
                >
                  {assigningQuestions ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-4 w-4" />
                      Assign Questions ({selectedQuestions.size})
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Student Enrollment Dialog */}
        <Dialog open={enrollmentDialogOpen} onOpenChange={setEnrollmentDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Enroll Students in "{currentExamForEnrollment?.title}"
              </DialogTitle>
              <DialogDescription>
                Select students to enroll in this exam. Use the search option to find specific students.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Search Control */}
              <div className="space-y-2">
                <Label htmlFor="student-search">Search Students</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="student-search"
                    placeholder="Search by email or name..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Summary Information */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="font-medium">Selected: {selectedStudents.size}</span>
                    <span className="text-muted-foreground ml-2">
                      (Showing {getFilteredStudents().length} of {students.length} students)
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Currently enrolled: {examRegistrations[currentExamForEnrollment?.id]?.length || 0} students
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudents(new Set(getFilteredStudents().map(s => s.id)))}
                    disabled={loadingStudents || getFilteredStudents().length === 0}
                  >
                    Select All Visible
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedStudents(new Set())}
                    disabled={loadingStudents}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Students List */}
              <ScrollArea className="h-[400px] border rounded-lg">
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-12">
                    <Clock className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading students...</span>
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Students Available</h3>
                    <p className="text-sm">There are no students registered in the system yet.</p>
                  </div>
                ) : getFilteredStudents().length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No Matching Students</h3>
                    <p className="text-sm">Try adjusting your search term.</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {getFilteredStudents().map((student) => {
                      const isSelected = selectedStudents.has(student.id);
                      const isEnrolled = examRegistrations[currentExamForEnrollment?.id]?.some(
                        reg => reg.student_id === student.id
                      );
                      
                      return (
                        <div
                          key={student.id}
                          className={`p-4 rounded-lg border transition-all duration-200 ${
                            isSelected 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700'
                          } ${isEnrolled ? 'ring-2 ring-green-200 dark:ring-green-800' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`student-${student.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const newSelected = new Set(selectedStudents);
                                if (checked) {
                                  newSelected.add(student.id);
                                } else {
                                  newSelected.delete(student.id);
                                }
                                setSelectedStudents(newSelected);
                              }}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <Label
                                  htmlFor={`student-${student.id}`}
                                  className="font-semibold text-base cursor-pointer"
                                >
                                  {student.email}
                                </Label>
                                <div className="flex gap-2 flex-shrink-0">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {student.role}
                                  </Badge>
                                  {isEnrolled && (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <UserCheck className="h-3 w-3 mr-1" />
                                      Enrolled
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>ID: {student.id.slice(0, 8)}...</span>
                                <span>Status: {student.is_active ? 'Active' : 'Inactive'}</span>
                                <span>Joined: {new Date(student.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Currently Enrolled Students Summary */}
              {currentExamForEnrollment && examRegistrations[currentExamForEnrollment.id]?.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Currently Enrolled Students ({examRegistrations[currentExamForEnrollment.id].length})</h4>
                  </div>
                  <ScrollArea className="max-h-32 border rounded-lg">
                    <div className="p-3 space-y-2">
                      {examRegistrations[currentExamForEnrollment.id].map((registration) => {
                        const studentData = students.find(s => s.id === registration.student_id);
                        return (
                          <div
                            key={registration.id}
                            className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700"
                          >
                            <div className="flex-1 flex items-center gap-2">
                              <UserCheck className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium">
                                {studentData?.email || 'Student not found'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {registration.status}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnenrollStudent(registration.id, currentExamForEnrollment.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Unenroll student from exam"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedStudents.size > 0 && (
                  <span>{selectedStudents.size} student(s) selected for enrollment</span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEnrollmentDialogOpen(false)}
                  disabled={enrollingStudents}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const studentsToEnroll = Array.from(selectedStudents).filter(sId => 
                      !examRegistrations[currentExamForEnrollment?.id]?.some(reg => reg.student_id === sId)
                    );
                    if (studentsToEnroll.length > 0) {
                      handleEnrollStudents(currentExamForEnrollment.id, studentsToEnroll);
                    } else {
                      toast.info("No new students to enroll", {
                        description: "All selected students are already enrolled in this exam."
                      });
                    }
                  }}
                  disabled={enrollingStudents || selectedStudents.size === 0}
                  className="gap-2 min-w-[140px]"
                >
                  {enrollingStudents ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Enrolling...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Enroll Students ({selectedStudents.size})
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* NEW: Student Question Assignments View Dialog */}
        <Dialog open={viewAssignmentsDialogOpen} onOpenChange={setViewAssignmentsDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                Student Question Assignments for "{currentExamForAssignments?.title}"
              </DialogTitle>
              <DialogDescription>
                View the randomly assigned questions for each enrolled student.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-8 w-8 animate-spin mr-3" />
                  <span className="text-lg">Loading student assignments...</span>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-6">
                    {currentExamForAssignments && examRegistrations[currentExamForAssignments.id]?.map((registration) => {
                      const student = students.find(s => s.id === registration.student_id);
                      const assignments = studentQuestionAssignments[currentExamForAssignments.id]?.[registration.student_id] || [];
                      
                      return (
                        <Card key={registration.id} className="border-2">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <UserCheck className="h-5 w-5 text-green-600" />
                                {student?.email || `Student ${registration.student_id.slice(0, 8)}...`}
                              </CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {assignments.length} questions
                                </Badge>
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {registration.status}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            {assignments.length === 0 ? (
                              <div className="text-center py-6 text-muted-foreground">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No questions assigned to this student yet.</p>
                                <p className="text-xs">Questions will be assigned when exam status is set to "Scheduled".</p>
                              </div>
                            ) : (
                              <div className="grid gap-3">
                                {assignments
                                  .sort((a, b) => a.question_order - b.question_order)
                                  .map((assignment, index) => {
                                    // The question data is now included in the assignment object
                                    const question = assignment.question;
                                    
                                    return (
                                      <div
                                        key={assignment.id}
                                        className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                Q{assignment.question_order + 1}
                                              </Badge>
                                              <span className="text-sm font-semibold">
                                                {question?.title || `Question ${assignment.question_id.slice(0, 8)}...`}
                                              </span>
                                            </div>
                                            
                                            {question?.description && (
                                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                                {question.description}
                                              </p>
                                            )}
                                            
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                              <span>Points: {assignment.points}</span>
                                              {question?.difficulty && getDifficultyBadge(question.difficulty)}
                                              {question?.time_limit_seconds && (
                                                <span className="flex items-center gap-1">
                                                  <Clock className="h-3 w-3" />
                                                  {question.time_limit_seconds}s
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    
                    {/* No students enrolled message */}
                    {currentExamForAssignments && (!examRegistrations[currentExamForAssignments.id] || examRegistrations[currentExamForAssignments.id].length === 0) && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No Students Enrolled</h3>
                        <p className="text-sm">Enroll students in this exam to view their question assignments.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {currentExamForAssignments && examRegistrations[currentExamForAssignments.id] && (
                  <span>
                    Showing assignments for {examRegistrations[currentExamForAssignments.id].length} enrolled student(s)
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setViewAssignmentsDialogOpen(false)}
                >
                  Close
                </Button>
                {currentExamForAssignments && (
                  <Button
                    onClick={() => {
                      setViewAssignmentsDialogOpen(false);
                      toast.info("Reassigning questions", {
                        description: "This will reassign random questions to all enrolled students.",
                      });
                      reassignQuestionsToAllStudents(currentExamForAssignments.id);
                    }}
                    variant="outline"
                    className="gap-2"
                    disabled={assigningStudentQuestions}
                  >
                    {assigningStudentQuestions ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Reassigning...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Reassign All Questions
                      </>
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Exam Confirmation Dialog */}
        <AlertDialog open={deleteExamId !== null} onOpenChange={() => setDeleteExamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Delete Exam
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete this exam? This action cannot be undone.</p>
                <p className="text-sm text-red-600 font-medium">
                  This will permanently remove:
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li>The exam and all its settings</li>
                  <li>All assigned questions</li>
                  <li>All student enrollments</li>
                  <li>All student question assignments</li>
                  <li>Any submitted responses (if applicable)</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteExam(deleteExamId)}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
