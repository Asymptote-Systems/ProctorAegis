import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Clock, 
  Users, 
  FileText, 
  Play,
  Eye,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import { SubmissionProcessor } from './components/SubmissionProcessor';
import SubmissionResultsDashboard from './SubmissionResultsDashboard';
import api from './api/apiClient';

const ExamManagementPage = () => {
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [examSubmissions, setExamSubmissions] = useState({});

  // Status color mapping
  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-orange-100 text-orange-700'
  };

  // Fetch all exams
  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await api.get('/exams/?skip=0&limit=100');
      const examsData = response.data;
      setExams(examsData);

      // Fetch submission counts for each exam
      const submissionCounts = {};
      await Promise.all(
        examsData.map(async (exam) => {
          try {
            const submissionsResponse = await api.get(`/exams/${exam.id}/submissions?skip=0&limit=1000`);
            submissionCounts[exam.id] = submissionsResponse.data.length;
          } catch (error) {
            submissionCounts[exam.id] = 0;
          }
        })
      );
      setExamSubmissions(submissionCounts);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Select an exam for management
  const selectExam = (exam) => {
    setSelectedExam(exam);
  };

  // Go back to exam list
  const goBackToList = () => {
    setSelectedExam(null);
  };

  useEffect(() => {
    fetchExams();
  }, []);

  if (selectedExam) {
    return (
      <SelectedExamView 
        exam={selectedExam} 
        submissionCount={examSubmissions[selectedExam.id] || 0}
        onBack={goBackToList} 
      />
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Exam Management</h1>
            <p className="text-muted-foreground">
              Select an exam to process submissions and view results
            </p>
          </div>
          <Button onClick={fetchExams} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{exams.length}</p>
                  <p className="text-xs text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Play className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {exams.filter(e => e.status === 'active').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Active Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {Object.values(examSubmissions).reduce((sum, count) => sum + count, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {exams.filter(e => e.status === 'draft').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Draft Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Exams List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Exams</CardTitle>
            <CardDescription>Click on an exam to manage submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading exams...</p>
              </div>
            ) : exams.length > 0 ? (
              <div className="space-y-3">
                {exams.map((exam) => (
                  <ExamCard 
                    key={exam.id} 
                    exam={exam} 
                    submissionCount={examSubmissions[exam.id] || 0}
                    onSelect={() => selectExam(exam)} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No exams found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Individual Exam Card Component
const ExamCard = ({ exam, submissionCount, onSelect }) => {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    active: 'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-blue-100 text-blue-700 border-blue-200',
    archived: 'bg-orange-100 text-orange-700 border-orange-200'
  };

  return (
    <div 
      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer hover:border-blue-300"
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="font-semibold text-lg truncate">{exam.title}</h3>
            <Badge className={`${statusColors[exam.status] || statusColors.draft} border`}>
              {exam.status.toUpperCase()}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {exam.description || 'No description provided'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Start: {new Date(exam.start_time).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              <span>Duration: {exam.duration_minutes} min</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <Users className="w-4 h-4 mr-2" />
              <span>{submissionCount} submissions</span>
            </div>
          </div>
        </div>

        <div className="flex items-center ml-4">
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};

// Selected Exam View Component
const SelectedExamView = ({ exam, submissionCount, onBack }) => {
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={onBack}>
            ← Back to Exams
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{exam.title}</h1>
            <p className="text-muted-foreground">
              Managing submissions for this exam
            </p>
          </div>
        </div>

        {/* Exam Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="font-semibold">Status</p>
                <Badge className="mt-1">{exam.status.toUpperCase()}</Badge>
              </div>
              <div>
                <p className="font-semibold">Duration</p>
                <p className="text-muted-foreground">{exam.duration_minutes} minutes</p>
              </div>
              <div>
                <p className="font-semibold">Start Time</p>
                <p className="text-muted-foreground">
                  {new Date(exam.start_time).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="font-semibold">Submissions</p>
                <p className="text-2xl font-bold text-blue-600">{submissionCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="process" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="process">Process Submissions</TabsTrigger>
            <TabsTrigger value="results">View Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Process Submissions</CardTitle>
                <CardDescription>
                  Run all submissions through Judge0 and calculate scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submissionCount > 0 ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Ready to process {submissionCount} submissions</strong>
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        This will test each submission against their respective test cases and create submission results.
                      </p>
                    </div>
                    
                    <SubmissionProcessor examId={exam.id} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No submissions found for this exam.</p>
                    <p className="text-sm mt-1">
                      Make sure students have submitted their solutions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="results">
            <SubmissionResultsDashboard examId={exam.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExamManagementPage;
