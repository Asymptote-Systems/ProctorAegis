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

export default function StudentDashboard() {
    const { user, loading: authLoading } = useContext(AuthContext);
    const [registeredExams, setRegisteredExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [startingExam, setStartingExam] = useState(null);
    const [showStartDialog, setShowStartDialog] = useState(false);
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [selectedExamData, setSelectedExamData] = useState(null);
    const navigate = useNavigate();

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
    }, [user]);

    const fetchRegisteredExams = async () => {
        try {
            setLoading(true);
            const response = await api.get('/me/registered-exams/');
            if (response.status !== 200) throw new Error('Failed to fetch registered exams');
            const examRegistrations = response.data;
            const examsWithDetails = await Promise.all(
                examRegistrations.map(async (registration) => {
                    try {
                        const examResponse = await api.get(`/exams/${registration.exam_id}`);
                        return {
                            registration,
                            exam: examResponse.data
                        };
                    } catch (error) {
                        return { registration, exam: null };
                    }
                })
            );

            const validExams = examsWithDetails.filter(item => item.exam);
            const sortedExams = validExams.sort((a, b) =>
                new Date(a.exam.start_time) - new Date(b.exam.start_time)
            );

            setRegisteredExams(sortedExams);
        } catch (error) {
            toast.error("Failed to load exams", { description: "Could not fetch your registered exams. Please try again." });
        } finally {
            setLoading(false);
        }
    };

    function pad(num) {
        return num.toString().padStart(2, '0');
    }

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

    function getExamStatus(exam) {
        if (!exam) return 'loading';
        const now = currentTime.getTime();
        const startTime = new Date(exam.start_time).getTime();
        const endTime = new Date(exam.end_time).getTime();
        if (now < startTime) return 'upcoming';
        if (now >= startTime && now <= endTime) return 'active';
        return 'completed';
    }

    function handleStartExamClick(examData) {
        setSelectedExamId(examData.registration.exam_id);
        setSelectedExamData(examData);
        setShowStartDialog(true);
    }

    // Generate unique UUID v4
    function generateUniqueSessionToken() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async function getClientIP() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip || '127.0.0.1';
        } catch {
            return '127.0.0.1';
        }
    }

    async function handleStartExam() {
        if (!selectedExamId || !selectedExamData || !user?.id) return;

        try {
            setStartingExam(selectedExamId);

            // Generate session data
            const sessionId = generateUniqueSessionToken();
            const sessionToken = generateUniqueSessionToken();
            const now = new Date().toISOString();

            // CRITICAL: Use EXACT field names from your ExamSessionCreate schema
            const sessionData = {
                // Note: DO NOT include 'id' field - let backend generate it
                exam_id: selectedExamId,                // Matches schema
                session_token: sessionToken,            // MUST be non-null string
                started_at: now,                        // MUST be non-null datetime string
                ended_at: null,                         // Can be null
                last_activity_at: now,                  // MUST be non-null datetime string  
                status: "active",                       // MUST be lowercase enum value
                browser_info: {                         // MUST be dict/object, not string
                    userAgent: navigator.userAgent,
                    screenResolution: `${screen.width}x${screen.height}`,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    language: navigator.language,
                    platform: navigator.platform
                },
                ip_address: await getClientIP(),        // Should be non-null string
                extra_data: {                          // CRITICAL: Use 'extra_data' not 'extra'
                    registration_id: selectedExamData.registration.id,
                    exam_title: selectedExamData.exam.title,
                    student_email: user?.email
                }
            };

            console.log('Creating exam session with payload:', sessionData);

            const response = await api.post('/exam-sessions/', sessionData);

            if (response.status !== 200 && response.status !== 201) {
                throw new Error(`Failed to create exam session: ${response.status}`);
            }

            const createdSession = response.data;
            console.log('Exam session created successfully:', createdSession);

            // Store session data
            localStorage.setItem('examSessionToken', sessionToken);
            localStorage.setItem('currentExamId', selectedExamId);

            toast.success("Exam Started", {
                description: "Your exam session has been created successfully."
            });

            // Navigate to exam platform
            navigate(`/student/platform/${selectedExamId}`, {
                state: {
                    sessionToken: sessionToken,
                    examDetails: selectedExamData.exam,
                    registration: selectedExamData.registration,
                    sessionData: createdSession
                }
            });

        } catch (error) {
            console.error('Error starting exam:', error);

            if (error.response?.status === 422) {
                console.error('Validation errors:', error.response.data);
                toast.error("Validation Error", {
                    description: `Request validation failed: ${JSON.stringify(error.response.data.detail)}`
                });
            } else if (error.response?.status === 500) {
                toast.error("Server Error", {
                    description: "Internal server error occurred. Check your data format and try again."
                });
            } else {
                toast.error("Failed to start exam", {
                    description: error.response?.data?.detail || error.message || "Please try again."
                });
            }
        } finally {
            setStartingExam(null);
            setShowStartDialog(false);
            setSelectedExamId(null);
            setSelectedExamData(null);
        }
    }


    function getStatusBadge(status) {
        switch (status) {
            case 'upcoming':
                return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-4 h-4" />Upcoming</Badge>;
            case 'active':
                return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><Play className="w-4 h-4" />Active</Badge>;
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

    const upcomingExams = registeredExams.filter(item => getExamStatus(item.exam) === 'upcoming').length;
    const activeExams = registeredExams.filter(item => getExamStatus(item.exam) === 'active').length;
    const completedExams = registeredExams.filter(item => getExamStatus(item.exam) === 'completed').length;

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

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-sky-50 border-sky-100 shadow-none rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-sky-900">Upcoming</CardTitle>
                            <Calendar className="h-4 w-4 text-sky-600" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-sky-700">{upcomingExams}</span>
                            <p className="text-xs text-sky-600">Scheduled soon</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-100 shadow-none rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-emerald-900">Active</CardTitle>
                            <Play className="h-4 w-4 text-emerald-600" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-emerald-700">{activeExams}</span>
                            <p className="text-xs text-emerald-600">Available now</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-slate-100 border-slate-200 shadow-none rounded-xl">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-semibold text-slate-900">Completed</CardTitle>
                            <CheckCircle className="h-4 w-4 text-slate-500" />
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-slate-700">{completedExams}</span>
                            <p className="text-xs text-slate-600">This semester</p>
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
                                    <h3 className="text-lg font-medium mb-2 text-slate-600">No exams registered</h3>
                                    <p className="text-slate-500 mb-4">You don't have any exams registered at the moment.</p>
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
                                        return (
                                            <Card key={exam.id} className="transition-all border border-sky-100/70 shadow-md hover:shadow-xl bg-white/90 p-0">
                                                <CardContent className="p-6">
                                                    <div className="flex flex-wrap justify-between items-start mb-3">
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <h3 className="text-xl font-semibold text-sky-900">{exam.title}</h3>
                                                                {getStatusBadge(status)}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {getExamTypeBadge(exam.exam_type)}
                                                                <span className="text-xs text-slate-500">
                                                                    Created: {new Date(exam.created_at || Date.now()).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col md:flex-row md:items-center md:gap-6 mt-2">
                                                        <div className="flex flex-col gap-2 text-[15px] text-sky-900 font-medium mb-2">
                                                            <span><Calendar className="inline w-4 h-4 mr-1 align-middle" /> {new Date(exam.start_time).toLocaleDateString()} {new Date(exam.start_time).toLocaleTimeString()}</span>
                                                            <span><Clock className="inline w-4 h-4 mr-1 align-middle" /> {exam.duration_minutes} minutes</span>
                                                            <span><Timer className="inline w-4 h-4 mr-1 align-middle" /> {status === "upcoming"
                                                                ? <span>
                                                                    <span className="text-blue-700 font-bold font-mono">{timeRemaining}</span> until start
                                                                </span>
                                                                : `Ends: ${new Date(exam.end_time).toLocaleTimeString()}`
                                                            }</span>
                                                        </div>
                                                        <div className="text-sm text-slate-600 md:ml-auto max-w-md">
                                                            <div className="font-semibold text-slate-700 mb-1">Description:</div>
                                                            {exam.description || <span className="italic text-slate-400">No description</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end mt-3">
                                                        {status === 'active' && (
                                                            <Button
                                                                onClick={() => handleStartExamClick(examData)}
                                                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 text-white"
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
