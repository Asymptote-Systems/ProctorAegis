// FILE: src/StudentDashboard.jsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, BookOpen, Play, CheckCircle, XCircle, User, Timer } from "lucide-react";
import LogoutButton from "./LogoutButton";

export default function StudentDashboard() {
  const [assignedExams, setAssignedExams] = useState([]);
  const [examDetails, setExamDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [startingExam, setStartingExam] = useState(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const navigate = useNavigate();

  // Update current time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch assigned exams on component mount
  useEffect(() => {
    fetchAssignedExams();
  }, []);

  const fetchAssignedExams = async () => {
    try {
      setLoading(true);
      const response = await fetch('/me/assigned-exams/', {
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch assigned exams');
      
      const exams = await response.json();
      setAssignedExams(exams);
      
      // Fetch details for each exam
      const details = {};
      for (const exam of exams) {
        const examResponse = await fetch(`/exams/${exam.exam_id}`, {
          headers: {
            'accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (examResponse.ok) {
          details[exam.exam_id] = await examResponse.json();
        }
      }
      setExamDetails(details);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (targetTime) => {
    const now = currentTime.getTime();
    const target = new Date(targetTime).getTime();
    const diff = target - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const getExamStatus = (examId) => {
    const exam = examDetails[examId];
    if (!exam) return 'loading';
    
    const now = currentTime.getTime();
    const startTime = new Date(exam.start_time).getTime();
    const endTime = new Date(exam.end_time).getTime();
    
    if (now < startTime) return 'upcoming';
    if (now >= startTime && now <= endTime) return 'active';
    return 'completed';
  };

  const handleStartExam = async (examId) => {
    try {
      setStartingExam(examId);
      
      const sessionData = {
        session_token: generateSessionToken(),
        started_at: new Date().toISOString(),
        ended_at: null,
        last_activity_at: new Date().toISOString(),
        status: "active",
        browser_info: {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        ip_address: await getClientIP(),
        extra_data: {},
        exam_id: examId
      };

      const response = await fetch('/exam-sessions/', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) throw new Error('Failed to create exam session');
      
      const session = await response.json();
      
      // Store session token for exam continuity
      localStorage.setItem('examSessionToken', sessionData.session_token);
      localStorage.setItem('currentExamId', examId);
      
      // Navigate to exam environment
      navigate(`/exam/${examId}`, { 
        state: { 
          sessionToken: sessionData.session_token,
          examDetails: examDetails[examId]
        }
      });
      
    } catch (error) {
      console.error('Error starting exam:', error);
      alert('Failed to start exam. Please try again.');
    } finally {
      setStartingExam(null);
      setShowStartDialog(false);
    }
  };

  const generateSessionToken = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const getClientIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Upcoming
        </Badge>;
      case 'active':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <Play className="w-3 h-3" />
          Active
        </Badge>;
      case 'completed':
        return <Badge variant="outline" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Completed
        </Badge>;
      default:
        return <Badge variant="secondary">Loading...</Badge>;
    }
  };

  const upcomingExams = assignedExams.filter(exam => getExamStatus(exam.exam_id) === 'upcoming').length;
  const activeExams = assignedExams.filter(exam => getExamStatus(exam.exam_id) === 'active').length;
  const completedExams = assignedExams.filter(exam => getExamStatus(exam.exam_id) === 'completed').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-gray-900" />
                <h1 className="text-2xl font-bold text-gray-900">ProctorAegis</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span>Student Dashboard</span>
              </div>
              <LogoutButton onLogout={() => navigate('/login')} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-600">Your upcoming exams and recent activity</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingExams}</div>
              <p className="text-xs text-muted-foreground">Scheduled soon</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeExams}</div>
              <p className="text-xs text-muted-foreground">Available now</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedExams}</div>
              <p className="text-xs text-muted-foreground">This semester</p>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              My Exams
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedExams.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No exams assigned</h3>
                <p className="text-gray-600">You don't have any exams assigned at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedExams.map((exam) => {
                  const details = examDetails[exam.exam_id];
                  const status = getExamStatus(exam.exam_id);
                  const timeRemaining = details ? formatTimeRemaining(details.start_time) : null;
                  
                  return (
                    <Card key={exam.exam_id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {details?.name || 'Loading...'}
                              </h3>
                              {getStatusBadge(status)}
                            </div>
                            
                            {details && (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 mb-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>
                                    {new Date(details.start_time).toLocaleDateString()} at{' '}
                                    {new Date(details.start_time).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{details.duration} minutes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Timer className="w-4 h-4" />
                                  <span>
                                    Ends: {new Date(details.end_time).toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Countdown or Status */}
                            {status === 'upcoming' && timeRemaining && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-blue-700">
                                  <Clock className="w-4 h-4" />
                                  <span className="font-medium">Starts in: {timeRemaining}</span>
                                </div>
                              </div>
                            )}

                            {status === 'completed' && (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 text-gray-600">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Exam completed</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {status === 'active' && (
                              <Button 
                                onClick={() => setShowStartDialog(true)}
                                className="bg-green-600 hover:bg-green-700"
                                disabled={startingExam === exam.exam_id}
                              >
                                {startingExam === exam.exam_id ? (
                                  <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Starting...
                                  </div>
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Start Exam
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Start Exam Confirmation Dialog */}
        <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start Exam</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to start your exam. Make sure you have a stable internet connection 
                and are ready to begin. Once started, the timer will begin counting down.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => {
                  const activeExam = assignedExams.find(exam => getExamStatus(exam.exam_id) === 'active');
                  if (activeExam) {
                    handleStartExam(activeExam.exam_id);
                  }
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Exam
              </AlertDialogAction>
              <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                Cancel
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
