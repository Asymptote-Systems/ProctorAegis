import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Clock, Calendar, BookOpen, Play, CheckCircle, User, Timer, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { AuthContext } from "./auth/AuthProvider";
import api from "./api/apiClient";
import LogoutButton from "./LogoutButton";


// Reduced glow intensity CSS for the red dot (back to original level)
const glowingDotStyles = `
  @keyframes pulse-glow {
    0% {
      transform: scale(1);
      box-shadow: 0 0 5px #ef4444, 0 0 10px #ef4444, 0 0 15px #ef4444;
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 10px #ef4444, 0 0 20px #ef4444, 0 0 25px #ef4444;
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 5px #ef4444, 0 0 10px #ef4444, 0 0 15px #ef4444;
    }
  }
  
  .glowing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #ef4444;
    animation: pulse-glow 1.5s ease-in-out infinite;
    margin-right: 8px;
    display: inline-block;
  }
`;


export default function StudentDashboard() {
    const { user, loading: authLoading } = useContext(AuthContext);
    const [registeredExams, setRegisteredExams] = useState([]);
    const [allExamRegistrations, setAllExamRegistrations] = useState([]); // Store all registrations for stats
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [startingExam, setStartingExam] = useState(null);
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [selectedExamData, setSelectedExamData] = useState(null);
    const navigate = useNavigate();


    // Add the glow styles to the document head
    useEffect(() => {
        const styleElement = document.createElement("style");
        styleElement.textContent = glowingDotStyles;
        document.head.appendChild(styleElement);


        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);


    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);


    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'student')) {
            navigate('/login');
        }
    }, [user, authLoading, navigate]);


    useEffect(() => {
        if (user && user.role === 'student') {
            fetchRegisteredExams();
        }
        // eslint-disable-next-line
    }, [user]);


    // Fixed function to display time as-is without timezone conversion
    const formatTimeAsIs = (isoString) => {
        if (!isoString) return 'Invalid Time';
        
        try {
            // Extract time part from "2025-08-20T22:11:00+00:00" or "2025-08-20T22:11:00Z"
            const timePart = isoString.split('T')[1];
            if (timePart) {
                // Remove timezone offset part and extract HH:MM:SS
                let timeOnly = timePart.split('+')[0].split('-')[0].split('Z')[0];
                // Return only HH:MM format
                const [hours, minutes] = timeOnly.split(':');
                return `${hours}:${minutes}`;
            }
            return 'Invalid Time';
        } catch (error) {
            console.error('Error parsing time:', error);
            return 'Invalid Time';
        }
    };


    // Fixed function to display date as-is without timezone conversion
    const formatDateAsIs = (isoString) => {
        if (!isoString) return 'Invalid Date';
        
        try {
            // Extract date part from "2025-08-20T22:11:00+00:00"
            const datePart = isoString.split('T')[0]; // "2025-08-20"
            const [year, month, day] = datePart.split('-');
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Error parsing date:', error);
            return 'Invalid Date';
        }
    };


    const fetchRegisteredExams = async () => {
        try {
            setLoading(true);
            const response = await api.get('/me/registered-exams/');
            if (response.status !== 200) throw new Error('Failed to fetch registered exams');
            const examRegistrations = response.data;
            
            console.log('All exam registrations:', examRegistrations);
            
            // Store all registrations for stats calculation
            setAllExamRegistrations(examRegistrations);
            
            // Filter out submitted registrations for display only
            const nonSubmittedRegistrations = examRegistrations.filter(registration => {
                const isSubmitted = registration.status === 'submitted';
                if (isSubmitted) {
                    console.log('Filtering out submitted exam from display:', registration.exam_id, 'status:', registration.status);
                }
                return !isSubmitted;
            });
            
            console.log('Non-submitted registrations for display:', nonSubmittedRegistrations);
            
            const examsWithDetails = await Promise.all(
                nonSubmittedRegistrations.map(async (registration) => {
                    try {
                        const examResponse = await api.get(`/exams/${registration.exam_id}`);
                        const exam = examResponse.data;
                        
                        return {
                            registration,
                            exam,
                            isSubmitted: false // Since we already filtered out submitted ones
                        };
                    } catch (error) {
                        console.error('Error fetching exam details for registration:', registration.id, error);
                        return null; // Return null for failed requests
                    }
                })
            );


            // Filter out null exams and sort
            const validExams = examsWithDetails.filter(item => item && item.exam);
            console.log('Valid exams after filtering:', validExams.length);
            
            const sortedExams = validExams.sort((a, b) => {
                const statusA = getExamStatus(a.exam);
                const statusB = getExamStatus(b.exam);


                // Priority order: active > upcoming > completed
                const statusPriority = { active: 3, upcoming: 2, completed: 1 };


                if (statusPriority[statusA] !== statusPriority[statusB]) {
                    return statusPriority[statusB] - statusPriority[statusA];
                }


                // Within same status group - use UTC timestamps for comparison
                const dateA = new Date(a.exam.start_time).getTime();
                const dateB = new Date(b.exam.start_time).getTime();


                if (statusA === 'completed') {
                    // For completed exams: latest first (most recent)
                    return dateB - dateA;
                } else {
                    // For active and upcoming exams: earliest first (soonest)
                    return dateA - dateB;
                }
            });


            setRegisteredExams(sortedExams);
        } catch (error) {
            console.error('Error fetching exams:', error);
            toast.error("Failed to load exams", { 
                description: "Could not fetch your registered exams. Please try again." 
            });
        } finally {
            setLoading(false);
        }
    };


    function pad(num) {
        return num.toString().padStart(2, '0');
    }


    // Fixed time remaining calculation - use UTC for proper comparison
    function formatTimeRemaining(targetTime) {
        const now = currentTime.getTime();
        const target = new Date(targetTime).getTime();
        const diff = target - now;
        
        if (diff <= 0) return "00:00:00";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
        else return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }


    // Modified to not include submission status since we're filtering out submitted exams
    function getExamStatus(exam) {
        if (!exam) return 'loading';
        
        const now = currentTime.getTime();
        const startTime = new Date(exam.start_time).getTime();
        const endTime = new Date(exam.end_time).getTime();
        
        if (now < startTime) return 'upcoming';
        if (now >= startTime && now <= endTime) return 'active';
        return 'completed';
    }


    // Helper function to get exam status including submitted status
    function getExamStatusWithSubmission(exam, registration) {
        if (!exam || !registration) return 'loading';
        
        // If the registration is submitted, it's considered completed
        if (registration.status === 'submitted') return 'completed';
        
        const now = currentTime.getTime();
        const startTime = new Date(exam.start_time).getTime();
        const endTime = new Date(exam.end_time).getTime();
        
        if (now < startTime) return 'upcoming';
        if (now >= startTime && now <= endTime) return 'active';
        return 'completed';
    }


    // Fixed date formatting function using string parsing instead of Date object
    function formatDateDDMMYYYY(dateString) {
        try {
            // Use string parsing to avoid timezone conversion
            return formatDateAsIs(dateString);
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    }


    function handleStartExamClick(examData) {
        // Double-check that this exam is not submitted before allowing start
        if (examData.registration.status === 'submitted') {
            toast.error("Cannot start exam", {
                description: "This exam has already been submitted."
            });
            return;
        }
        
        setSelectedExamId(examData.registration.exam_id);
        setSelectedExamData(examData);
        setShowStartDialog(true);
    }


    async function getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }


    async function handleStartExam() {
        if (!selectedExamId || !selectedExamData) return;

        // Additional check before starting
        if (selectedExamData.registration.status === 'submitted') {
            toast.error("Cannot start exam", {
                description: "This exam has already been submitted."
            });
            setShowStartDialog(false);
            setSelectedExamId(null);
            setSelectedExamData(null);
            return;
        }

        try {
            setStartingExam(selectedExamId);


            const now = new Date();
            const sessionData = {
                started_at: now.toISOString(),
                ended_at: null,
                last_activity_at: now.toISOString(),
                status: "active",
                browser_info: {
                    userAgent: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    platform: navigator.platform
                },
                ip_address: await getClientIP(),
                extra_data: {
                    registration_id: selectedExamData.registration.id,
                    exam_title: selectedExamData.exam.title,
                    student_email: user?.email
                },
                exam_id: selectedExamId
            };


            console.log('Creating exam session:', sessionData);


            const response = await api.post('/exam-sessions/', sessionData);


            if (response.status !== 200 && response.status !== 201) {
                throw new Error('Failed to create exam session');
            }


            const createdSession = response.data;
            console.log('Exam session created successfully:', createdSession);


            localStorage.setItem('currentExamId', selectedExamId);
            localStorage.setItem('examSessionData', JSON.stringify(createdSession));
            localStorage.setItem('examSessionId', createdSession.id || createdSession.session_id);


            toast.success("Exam Started", {
                description: "Your exam session has been created successfully. Redirecting to exam platform..."
            });


            navigate(`/student/platform/${selectedExamId}`, {
                state: {
                    examDetails: selectedExamData.exam,
                    registration: selectedExamData.registration,
                    sessionData: createdSession
                }
            });


        } catch (error) {
            console.error('Error starting exam:', error);
            toast.error("Failed to start exam", {
                description: error.response?.data?.detail || error.message || "Please try again."
            });
        } finally {
            setStartingExam(null);
            setShowStartDialog(false);
            setSelectedExamId(null);
            setSelectedExamData(null);
        }
    }


    // Simplified to not include submitted status
    function getStatusBadge(status) {
        switch (status) {
            case 'upcoming':
                return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-4 h-4" />Upcoming</Badge>;
            case 'active':
                // Return LIVE with glowing dot instead of Active badge
                return (
                    <div className="flex items-center bg-red-50 border border-red-200 rounded-md px-3 py-1">
                        <div className="glowing-dot"></div>
                        <span className="text-red-700 font-bold text-sm uppercase tracking-wider">LIVE</span>
                    </div>
                );
            case 'completed':
                return <Badge variant="outline" className="flex items-center gap-1"><CheckCircle className="w-4 h-4" />Completed</Badge>;
            default:
                return <Badge variant="secondary">Loading...</Badge>;
        }
    }


    function getExamTypeBadge(examType) {
        const typeStyles = {
            'practice': 'bg-blue-100 text-blue-800 border-blue-200',
            'assessment': 'bg-orange-100 text-orange-800 border-orange-200',
            'final': 'bg-red-100 text-red-800 border-red-200',
            'midterm': 'bg-purple-100 text-purple-800 border-purple-200',
            'quiz': 'bg-green-100 text-green-800 border-green-200'
        };


        return (
            <Badge
                variant="outline"
                className={`text-xs capitalize ${typeStyles[examType] || 'bg-gray-100 text-gray-800 border-gray-200'}`}
            >
                {examType || 'exam'}
            </Badge>
        );
    }


    // Fixed end time formatting function
    function formatEndTime(exam, status) {
        if (status !== 'completed') return null;


        // Parse the end time string directly without Date object conversion
        const endTimeStr = exam.end_time;
        
        // Calculate time difference using Date objects for comparison only
        const endTime = new Date(endTimeStr);
        const now = new Date();
        const diffHours = (now - endTime) / (1000 * 60 * 60);


        if (diffHours < 24) {
            // Less than a day - show time as-is without timezone conversion
            return `Ended at ${formatTimeAsIs(endTimeStr)}`;
        } else {
            // More than a day - show date as-is without timezone conversion  
            return `Ended on ${formatDateAsIs(endTimeStr)}`;
        }
    }


    // Calculate stats including submitted exams as completed
    const calculateStats = async () => {
        const stats = { upcoming: 0, active: 0, completed: 0 };
        
        for (const registration of allExamRegistrations) {
            if (registration.status === 'submitted') {
                // Submitted exams count as completed
                stats.completed++;
            } else {
                try {
                    // For non-submitted, we need to fetch exam details to determine status
                    const examResponse = await api.get(`/exams/${registration.exam_id}`);
                    const exam = examResponse.data;
                    const status = getExamStatus(exam);
                    stats[status]++;
                } catch (error) {
                    console.error('Error fetching exam for stats:', error);
                    // If we can't fetch exam details, we can't determine its status
                }
            }
        }
        
        return stats;
    };


    // Use effect to calculate stats when allExamRegistrations changes
    const [examStats, setExamStats] = useState({ upcoming: 0, active: 0, completed: 0 });
    
    useEffect(() => {
        if (allExamRegistrations.length > 0) {
            calculateStats().then(setExamStats);
        }
    }, [allExamRegistrations, currentTime]); // Include currentTime to recalculate when time changes


    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <BookOpen className="h-7 w-7 text-black" />
                            <span className="text-2xl font-bold text-black tracking-tight">ProctorAegis Student</span>
                        </div>
                        <div className="flex items-center space-x-5">
                            <span className="flex items-center text-gray-700 bg-sky-50 rounded-md px-3 py-1">
                                <User className="w-4 h-4 mr-1" />
                                <span className="font-medium">{user?.email}</span>
                            </span>
                            <LogoutButton />
                        </div>
                    </div>
                </div>
            </header>


            <main className="max-w-8xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-3">
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2 leading-tight">Welcome, <span className="text-sky-700">{user?.email?.split("@")[0] || "Student"}</span></h2>
                        <p className="text-gray-500">Here are your registered exams. Prepared to achieve your best!</p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={fetchRegisteredExams}
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>


                {/* Stats Cards - Now using calculated stats that include submitted exams */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-sky-50 border-sky-100 shadow-none rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-sky-900">Upcoming</CardTitle>
                            <Calendar className="h-4 w-4 text-sky-600" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-sky-700">{examStats.upcoming}</span>
                            <p className="text-xs text-sky-600">Scheduled soon</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100 shadow-none rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-emerald-900">Active</CardTitle>
                            <Play className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-emerald-700">{examStats.active}</span>
                            <p className="text-xs text-emerald-600">Available now</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-100 border-slate-200 shadow-none rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-900">Completed</CardTitle>
                            <CheckCircle className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-slate-700">{examStats.completed}</span>
                            <p className="text-xs text-slate-600">Submitted + Time expired</p>
                        </CardContent>
                    </Card>
                </div>


                {/* My Exams Section */}
                <section className="mb-8">
                    <Card className="shadow-sm rounded-2xl border border-slate-200">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <BookOpen className="w-5 h-5 text-sky-800" />
                                My Exams
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-3"></div>
                                    <p className="text-slate-600">Loading exams...</p>
                                </div>
                            ) : registeredExams.length === 0 ? (
                                <div className="text-center py-10">
                                    <BookOpen className="w-10 h-10 text-sky-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-medium mb-2 text-slate-600">No exams available</h3>
                                    <p className="text-slate-500 mb-4">You don't have any active exams at the moment.</p>
                                    <Button
                                        variant="outline"
                                        onClick={fetchRegisteredExams}
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Check Again
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {registeredExams.map((examData) => {
                                        const exam = examData.exam;
                                        const status = getExamStatus(exam);
                                        const timeRemaining = formatTimeRemaining(exam.start_time);
                                        const endTimeFormatted = formatEndTime(exam, status);


                                        return (
                                            <Card
                                                key={exam.id}
                                                className="transition-all border shadow-md hover:shadow-xl bg-white/90 p-0 border-sky-100/70"
                                            >
                                                <CardContent className="p-6">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-2 flex-1">
                                                            <h3 className="text-xl font-semibold text-sky-900">
                                                                {exam.title}
                                                            </h3>
                                                            <div className="flex items-center gap-2">
                                                                {getExamTypeBadge(exam.exam_type)}
                                                                <span className="text-xs text-slate-500">
                                                                    Created: {formatDateDDMMYYYY(exam.created_at || new Date())}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {/* Status badge */}
                                                        <div className="flex flex-col items-end gap-2">
                                                            {getStatusBadge(status)}
                                                        </div>
                                                    </div>


                                                    <div className="flex flex-col md:flex-row md:items-center md:gap-6 mt-4">
                                                        <div className="flex flex-col gap-2 text-[15px] font-medium mb-2">
                                                            {/* Show different info based on status */}
                                                            {status === 'upcoming' && (
                                                                <>
                                                                    {/* Start time - Green color */}
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="w-4 h-4 text-green-600" />
                                                                        <span className="text-green-700 font-semibold">Starts:</span>
                                                                        <span className="text-green-600">
                                                                            {formatDateAsIs(exam.start_time)} at {formatTimeAsIs(exam.start_time)}
                                                                        </span>
                                                                    </span>


                                                                    {/* Duration */}
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-4 h-4 text-sky-600" />
                                                                        <span className="text-sky-700 font-semibold">Duration:</span>
                                                                        <span className="text-sky-600">{exam.duration_minutes} minutes</span>
                                                                    </span>


                                                                    {/* Countdown */}
                                                                    {timeRemaining && (
                                                                        <span className="flex items-center gap-1">
                                                                            <Timer className="w-4 h-4 text-blue-600" />
                                                                            <span className="text-blue-700 font-semibold">Starts in:</span>
                                                                            <span className="text-blue-700 font-bold font-mono">{timeRemaining}</span>
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}


                                                            {status === 'active' && (
                                                                <>
                                                                    {/* Started text - no date/time */}
                                                                    <span className="flex items-center gap-1">
                                                                        <Play className="w-4 h-4 text-green-600" />
                                                                        <span className="text-green-700 font-semibold">Started</span>
                                                                    </span>


                                                                    {/* Duration */}
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-4 h-4 text-sky-600" />
                                                                        <span className="text-sky-700 font-semibold">Duration:</span>
                                                                        <span className="text-sky-600">{exam.duration_minutes} minutes</span>
                                                                    </span>


                                                                    {/* End time */}
                                                                    <span className="flex items-center gap-1">
                                                                        <Timer className="w-4 h-4 text-red-600" />
                                                                        <span className="text-red-700 font-semibold">Ends:</span>
                                                                        <span className="text-red-600">{formatDateAsIs(exam.end_time)} at {formatTimeAsIs(exam.end_time)}</span>
                                                                    </span>
                                                                </>
                                                            )}


                                                            {status === 'completed' && (
                                                                <>
                                                                    {/* Only show ended info - no starts */}
                                                                    <span className="flex items-center gap-1">
                                                                        <CheckCircle className="w-4 h-4 text-red-600" />
                                                                        <span className="text-red-700 font-semibold">{endTimeFormatted}</span>
                                                                    </span>


                                                                    {/* Duration */}
                                                                    <span className="flex items-center gap-1">
                                                                        <Clock className="w-4 h-4 text-sky-600" />
                                                                        <span className="text-sky-700 font-semibold">Duration:</span>
                                                                        <span className="text-sky-600">{exam.duration_minutes} minutes</span>
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>


                                                        {/* Description */}
                                                        <div className="text-sm text-slate-600 md:ml-auto max-w-md">
                                                            <div className="font-semibold text-slate-700 mb-1">Description:</div>
                                                            {exam.description || <span className="italic text-slate-400">No description</span>}
                                                        </div>
                                                    </div>


                                                    {/* Start button - only for active exams */}
                                                    <div className="flex justify-end mt-4">
                                                        {status === 'active' && (
                                                            <Button
                                                                onClick={() => handleStartExamClick(examData)}
                                                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 text-white shadow-lg"
                                                                disabled={startingExam === exam.id}
                                                            >
                                                                <Play className="w-4 h-4 mr-2" />
                                                                {startingExam === exam.id ? "Starting..." : "Start Exam"}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>


                {/* Start Exam Confirmation Dialog */}
                <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Start Exam</AlertDialogTitle>
                            <AlertDialogDescription>
                                You are about to start <b>{selectedExamData?.exam?.title}</b> ({selectedExamData?.exam?.exam_type || 'exam'}).
                                <br />Make sure you have a stable internet connection and are ready to begin.<br />
                                <span className="block mt-3 font-semibold text-sky-700">Duration: {selectedExamData?.exam?.duration_minutes} minutes</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <Button variant="outline" onClick={() => {
                                setShowStartDialog(false);
                                setSelectedExamId(null);
                                setSelectedExamData(null);
                            }}>
                                Cancel
                            </Button>
                            <AlertDialogAction
                                onClick={handleStartExam}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600"
                            >
                                Start Exam
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </div>
    );
}
