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
import { useState, useContext, useEffect } from 'react';
import { Search, Eye, Edit3, CheckCircle2, Calendar, Clock, Users, FileText, TrendingUp, Download, Filter, Star, MessageCircle, BarChart3, Award, RefreshCw, BookOpen, AlertCircle, CheckCircle, XCircle, User } from "lucide-react";
import { toast } from "sonner";

// Import your auth context and api client
import { AuthContext } from "./auth/AuthProvider";
import api from "./api/apiClient";

export default function Results({ exams, onRefresh }) {
  const { logout } = useContext(AuthContext);
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

  // Filter completed exams
  const completedExams = exams.filter(exam => exam.status === 'completed');

  // Filter exams based on search term
  const getFilteredExams = () => {
    if (!searchTerm.trim()) return completedExams;
    
    return completedExams.filter(exam => 
      exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.exam_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Fetch exam results and submissions
  const fetchExamResults = async (examId) => {
    setLoadingResults(true);
    try {
      // Fetch submissions for this exam
      const submissionsResponse = await api.get(`/exams/${examId}/submissions/`);
      const submissions = submissionsResponse.data;

      // Fetch student details for each submission
      const studentPromises = submissions.map(async (submission) => {
        try {
          const studentResponse = await api.get(`/users/${submission.student_id}`);
          return {
            ...submission,
            student: studentResponse.data
          };
        } catch (error) {
          console.error(`Error fetching student ${submission.student_id}:`, error);
          return {
            ...submission,
            student: { email: 'Unknown Student' }
          };
        }
      });

      const submissionsWithStudents = await Promise.all(studentPromises);

      // Calculate statistics
      const totalSubmissions = submissionsWithStudents.length;
      const completedSubmissions = submissionsWithStudents.filter(s => s.status === 'completed');
      const averageScore = completedSubmissions.length > 0 
        ? completedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / completedSubmissions.length 
        : 0;
      const passRate = completedSubmissions.length > 0 
        ? (completedSubmissions.filter(s => (s.score || 0) >= 60).length / completedSubmissions.length) * 100 
        : 0;

      const results = {
        submissions: submissionsWithStudents,
        statistics: {
          totalSubmissions,
          completedSubmissions: completedSubmissions.length,
          averageScore: averageScore.toFixed(1),
          passRate: passRate.toFixed(1),
          highestScore: completedSubmissions.length > 0 ? Math.max(...completedSubmissions.map(s => s.score || 0)) : 0,
          lowestScore: completedSubmissions.length > 0 ? Math.min(...completedSubmissions.map(s => s.score || 0)) : 0
        }
      };

      setExamResults(prev => ({
        ...prev,
        [examId]: results
      }));

      return results;
    } catch (error) {
      console.error('Error fetching exam results:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to fetch exam results", {
        description: "Unable to load results for this exam.",
      });
      return null;
    } finally {
      setLoadingResults(false);
    }
  };

  // Check if exam has been evaluated
  const isExamEvaluated = (examId) => {
    return examEvaluations[examId]?.evaluated || false;
  };

  // Handle exam evaluation
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

  // Submit evaluation
  const handleSubmitEvaluation = async () => {
    if (!currentEvaluation) return;

    setEvaluating(true);
    try {
      // Create evaluation record (you might need to adjust this based on your API)
      const evaluationData = {
        exam_id: currentEvaluation.id,
        overall_score: parseFloat(evaluationForm.overall_score) || 0,
        feedback: evaluationForm.feedback,
        grade: evaluationForm.grade,
        comments: evaluationForm.comments,
        evaluated_at: new Date().toISOString(),
        status: 'evaluated'
      };

      // Save evaluation (adjust API endpoint as needed)
      await api.post(`/exams/${currentEvaluation.id}/evaluation/`, evaluationData);

      // Mark exam as evaluated locally
      setExamEvaluations(prev => ({
        ...prev,
        [currentEvaluation.id]: {
          ...evaluationData,
          evaluated: true
        }
      }));

      toast.success("Evaluation submitted successfully!", {
        description: `Exam "${currentEvaluation.title}" has been evaluated.`,
      });

      setEvaluationDialog(false);
      setCurrentEvaluation(null);

    } catch (error) {
      console.error('Error submitting evaluation:', error);
      if (error.response?.status === 401) {
        logout();
        return;
      }
      toast.error("Failed to submit evaluation", {
        description: error.response?.data?.detail || "An error occurred while submitting the evaluation.",
      });
    } finally {
      setEvaluating(false);
    }
  };

  // Handle view detailed results
  const handleViewResults = async (exam) => {
    setSelectedExam(exam);
    if (!examResults[exam.id]) {
      await fetchExamResults(exam.id);
    }
  };

  // Export results to CSV
  const handleExportResults = async (examId) => {
    try {
      const results = examResults[examId];
      if (!results) {
        toast.error("No results available", {
          description: "Please load the results first before exporting.",
        });
        return;
      }

      // Create CSV content
      const headers = ['Student Email', 'Score', 'Status', 'Submitted At', 'Time Taken (minutes)'];
      const csvContent = [
        headers.join(','),
        ...results.submissions.map(submission => [
          submission.student.email,
          submission.score || 0,
          submission.status,
          new Date(submission.submitted_at || submission.created_at).toLocaleString(),
          Math.round((submission.time_taken || 0) / 60)
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedExam.title}_results.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Results exported successfully!", {
        description: "CSV file has been downloaded to your device.",
      });

    } catch (error) {
      console.error('Error exporting results:', error);
      toast.error("Export failed", {
        description: "Unable to export the results. Please try again.",
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get grade color
  const getGradeColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-lg">
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Award className="h-5 w-5" />
                Exam Results & Evaluation
              </CardTitle>
              <CardDescription className="text-base">
                Review and evaluate completed examinations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Stats */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardContent className="p-4">
            <div className="space-y-2">
              <Label htmlFor="search-results">Search Completed Exams</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-results"
                  placeholder="Search by exam title, description, or type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Completed</p>
                <p className="text-2xl font-bold">{completedExams.length}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Evaluated</p>
                <p className="text-2xl font-bold">
                  {Object.values(examEvaluations).filter(e => e.evaluated).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completed Exams Table */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          {completedExams.length === 0 ? (
            <div className="text-center py-16 px-8">
              <CheckCircle2 className="h-16 w-16 mx-auto text-gray-400 mb-6" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">No completed exams</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Completed exams will appear here for review and evaluation.
              </p>
            </div>
          ) : getFilteredExams().length === 0 ? (
            <div className="text-center py-16 px-8">
              <Search className="h-16 w-16 mx-auto text-gray-400 mb-6" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">No matching exams</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search term to find specific exams.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-800">
                  <TableRow>
                    <TableHead className="font-semibold">Exam Details</TableHead>
                    <TableHead className="font-semibold">Completion Date</TableHead>
                    <TableHead className="font-semibold text-center">Participants</TableHead>
                    <TableHead className="font-semibold text-center">Evaluation Status</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getFilteredExams().map((exam) => {
                    const isEvaluated = isExamEvaluated(exam.id);
                    const results = examResults[exam.id];
                    
                    return (
                      <TableRow key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="font-semibold text-base">{exam.title}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 capitalize flex items-center gap-2">
                              <BookOpen className="h-3 w-3" />
                              {exam.exam_type} • {exam.duration_minutes}min
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500 line-clamp-1">
                              {exam.description || 'No description provided'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-blue-600" />
                              {formatDate(exam.end_time)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Duration: {exam.duration_minutes} minutes
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {results?.statistics.totalSubmissions || 0}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {results?.statistics.completedSubmissions || 0} completed
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Badge 
                              variant="outline" 
                              className={isEvaluated 
                                ? "bg-green-50 text-green-700 border-green-200" 
                                : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }
                            >
                              {isEvaluated ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Evaluated
                                </>
                              ) : (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </>
                              )}
                            </Badge>
                            {isEvaluated && examEvaluations[exam.id]?.grade && (
                              <span className="text-xs text-muted-foreground">
                                Grade: {examEvaluations[exam.id].grade}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewResults(exam)}
                              className="h-9 w-9 p-0"
                              title="View Results"
                            >
                              <Eye className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEvaluateExam(exam)}
                              className="h-9 w-9 p-0"
                              title={isEvaluated ? "Update Evaluation" : "Evaluate Exam"}
                            >
                              {isEvaluated ? (
                                <Edit3 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Star className="h-4 w-4 text-yellow-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportResults(exam.id)}
                              className="h-9 w-9 p-0"
                              title="Export Results"
                              disabled={!results}
                            >
                              <Download className="h-4 w-4 text-purple-600" />
                            </Button>
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

      {/* Results Detail Dialog */}
      <Dialog open={selectedExam !== null} onOpenChange={() => setSelectedExam(null)}>
        <DialogContent className="max-w-6xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Results for "{selectedExam?.title}"
            </DialogTitle>
            <DialogDescription>
              Detailed examination results and student performance analysis.
            </DialogDescription>
          </DialogHeader>
          
          {selectedExam && (
            <div className="space-y-6">
              {loadingResults ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-8 w-8 animate-spin mr-3" />
                  <span className="text-lg">Loading results...</span>
                </div>
              ) : examResults[selectedExam.id] ? (
                <>
                  {/* Statistics Cards */}
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {examResults[selectedExam.id].statistics.averageScore}%
                          </p>
                          <p className="text-sm text-muted-foreground">Average Score</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {examResults[selectedExam.id].statistics.passRate}%
                          </p>
                          <p className="text-sm text-muted-foreground">Pass Rate</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {examResults[selectedExam.id].statistics.highestScore}
                          </p>
                          <p className="text-sm text-muted-foreground">Highest Score</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {examResults[selectedExam.id].statistics.lowestScore}
                          </p>
                          <p className="text-sm text-muted-foreground">Lowest Score</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Student Results Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>Student Results</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExportResults(selectedExam.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export CSV
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead className="text-center">Score</TableHead>
                              <TableHead className="text-center">Status</TableHead>
                              <TableHead className="text-center">Submitted At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {examResults[selectedExam.id].submissions.map((submission) => (
                              <TableRow key={submission.id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {submission.student.email}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`font-semibold ${getGradeColor(submission.score || 0)}`}>
                                    {submission.score || 0}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      submission.status === 'completed' 
                                        ? "bg-green-50 text-green-700 border-green-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    }
                                  >
                                    {submission.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {formatDate(submission.submitted_at || submission.created_at)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Results Available</h3>
                  <p className="text-sm">Unable to load results for this exam.</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedExam(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evaluationDialog} onOpenChange={setEvaluationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Evaluate "{currentEvaluation?.title}"
            </DialogTitle>
            <DialogDescription>
              Provide overall evaluation and feedback for this exam.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="overall-score">Overall Score (0-100)</Label>
                <Input
                  id="overall-score"
                  type="number"
                  min="0"
                  max="100"
                  value={evaluationForm.overall_score}
                  onChange={(e) => setEvaluationForm(prev => ({ ...prev, overall_score: e.target.value }))}
                  placeholder="85"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={evaluationForm.grade}
                  onChange={(e) => setEvaluationForm(prev => ({ ...prev, grade: e.target.value }))}
                  placeholder="A, B+, Pass, etc."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback</Label>
              <Textarea
                id="feedback"
                value={evaluationForm.feedback}
                onChange={(e) => setEvaluationForm(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Overall exam feedback and observations..."
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="comments">Additional Comments</Label>
              <Textarea
                id="comments"
                value={evaluationForm.comments}
                onChange={(e) => setEvaluationForm(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Any additional notes or recommendations..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEvaluationDialog(false)}
              disabled={evaluating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEvaluation}
              disabled={evaluating || !evaluationForm.overall_score}
              className="gap-2"
            >
              {evaluating ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Submit Evaluation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
