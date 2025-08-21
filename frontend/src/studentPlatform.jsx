// FILE: src/studentPlatform.jsx

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Play, Square, FileCheck, AlertTriangle } from 'lucide-react';

import LogoutButton from "./LogoutButton";

const examData = { title: "Data Structures & Algorithms Final Exam", duration: 120, totalQuestions: 2, questions: [ { id: 1, title: "Reverse a Linked List", difficulty: "Medium", description: "Write a function to reverse a singly linked list iteratively.", example: `Input: [1,2,3,4,5]\nOutput: [5,4,3,2,1]\n\nExplanation: The linked list is reversed.`, testCases: [ { input: "[1,2,3]", output: "[3,2,1]" }, { input: "[1,2]", output: "[2,1]" }, { input: "[]", output: "[]" } ] }, { id: 2, title: "Binary Tree Traversal", difficulty: "Easy", description: "Implement inorder traversal of a binary tree.", example: `Input: [1,null,2,3]\nOutput: [1,3,2]`, testCases: [] } ] };

export default function StudentPlatform() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [timeLeft, setTimeLeft] = useState(5400);
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState('');
  const [savedAnswers, setSavedAnswers] = useState({});
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const navigate = useNavigate();

  // --- SAFEGUARD ---
  // If there's no data or no questions, don't crash the app.
  if (!examData || !examData.questions || examData.questions.length === 0) {
    return <div>Loading exam questions or no questions available...</div>;
  }

  const currentQuestion = examData.questions[currentQuestionIndex];

  useEffect(() => { const timer = setInterval(() => { setTimeLeft((prev) => { if (prev <= 1) { handleSubmitExam(); return 0; } return prev - 1; }); }, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => { const savedCode = savedAnswers[currentQuestion.id]; setCode(savedCode || ''); }, [currentQuestionIndex, savedAnswers, currentQuestion.id]);

  const formatTime = (seconds) => { const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };
  const getTimeColor = () => { if (timeLeft < 600) return 'text-red-500'; if (timeLeft < 1800) return 'text-yellow-500'; return 'text-green-500'; };
  const handleRunCode = async () => { setIsRunning(true); setTestResults('Running tests...'); setTimeout(() => { const results = `✅ Test Case 1: Passed\n✅ Test Case 2: Passed\n❌ Test Case 3: Failed\nExpected: [3,2,1], Got: [1,2,3]\n\n2/3 test cases passed.`; setTestResults(results); setIsRunning(false); }, 2000); };
  const handleSaveCode = () => { setSavedAnswers(prev => ({ ...prev, [currentQuestion.id]: code })); };
  const handleNextQuestion = () => { handleSaveCode(); if (currentQuestionIndex < examData.questions.length - 1) { setCurrentQuestionIndex(currentQuestionIndex + 1); } };
  const handlePrevQuestion = () => { handleSaveCode(); if (currentQuestionIndex > 0) { setCurrentQuestionIndex(currentQuestionIndex - 1); } };
  const handleSubmitExam = () => { handleSaveCode(); console.log('Submitting exam with answers:', savedAnswers); navigate('/student/results'); };
  const getAnsweredQuestionsCount = () => Object.keys(savedAnswers).length;
  const getCompletionPercentage = () => (getAnsweredQuestionsCount() / examData.questions.length) * 100;

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <div className="flex justify-between items-center p-4 border-b bg-card"><div className="flex items-center gap-4"><h1 className="text-xl font-bold">{examData.title}</h1><Badge variant="outline">Question {currentQuestionIndex + 1} of {examData.questions.length}</Badge></div><div className="flex items-center gap-6"><div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span className={`font-mono text-lg font-bold ${getTimeColor()}`}>{formatTime(timeLeft)}</span></div><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">Progress:</span><Progress value={getCompletionPercentage()} className="w-20" /><span className="text-sm font-medium">{getAnsweredQuestionsCount()}/{examData.questions.length}</span></div><AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}><AlertDialogTrigger asChild><Button variant="destructive" className="gap-2"><FileCheck className="h-4 w-4" />Submit Test</Button></AlertDialogTrigger><LogoutButton /><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Submit Exam?</AlertDialogTitle><AlertDialogDescription>You have answered {getAnsweredQuestionsCount()} out of {examData.questions.length} questions. This action cannot be undone. Are you sure you want to submit your exam?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleSubmitExam} className="bg-destructive hover:bg-destructive/90">Yes, Submit</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></div>
      <div className="flex-1 p-4"><ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border"><ResizablePanel defaultSize={40} minSize={30}><div className="h-full p-6 overflow-auto"><Card className="h-full"><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2">{currentQuestion.title}<Badge variant={currentQuestion.difficulty === 'Easy' ? 'default' : currentQuestion.difficulty === 'Medium' ? 'secondary' : 'destructive'}>{currentQuestion.difficulty}</Badge></CardTitle></div></CardHeader><CardContent className="space-y-4"><div><p className="mb-4">{currentQuestion.description}</p><div className="bg-muted p-4 rounded-lg"><strong>Example:</strong><pre className="mt-2 whitespace-pre-wrap text-sm">{currentQuestion.example}</pre></div></div><div className="flex justify-between pt-4"><Button variant="outline" onClick={handlePrevQuestion} disabled={currentQuestionIndex === 0}>Previous</Button><Button variant="outline" onClick={handleNextQuestion} disabled={currentQuestionIndex === examData.questions.length - 1}>Next</Button></div></CardContent></Card></div></ResizablePanel><ResizableHandle withHandle /><ResizablePanel defaultSize={60} minSize={40}><div className="h-full flex flex-col p-2 gap-2"><div className="flex items-center justify-between p-2 border-b"><div className="flex items-center gap-2"><Label>Your Solution:</Label>{savedAnswers[currentQuestion.id] && (<Badge variant="secondary" className="gap-1"><FileCheck className="h-3 w-3" />Saved</Badge>)}</div><Select value={language} onValueChange={setLanguage}><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem><SelectItem value="java">Java</SelectItem><SelectItem value="cpp">C++</SelectItem></SelectContent></Select></div><Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder={`// Write your ${language} code here...`} className="flex-1 resize-none font-mono text-sm" />{testResults && (<div className="bg-muted p-3 rounded-lg max-h-32 overflow-auto"><Label className="text-sm font-medium">Test Results:</Label><pre className="text-xs mt-1 whitespace-pre-wrap">{testResults}</pre></div>)}<div className="flex justify-between gap-2 p-2 border-t"><Button variant="outline" onClick={handleSaveCode}>Save Code</Button><div className="flex gap-2"><Button variant="outline" onClick={handleRunCode} disabled={isRunning} className="gap-2">{isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{isRunning ? 'Running...' : 'Run Code'}</Button><Button onClick={handleSaveCode} className="gap-2"><FileCheck className="h-4 w-4" />Submit Answer</Button></div></div></div></ResizablePanel></ResizablePanelGroup></div>
    </div>
  );
}