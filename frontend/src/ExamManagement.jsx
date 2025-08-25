import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubmissionProcessor } from './components/SubmissionProcessor';
import SubmissionResultsDashboard from './SubmissionResultsDashboard';
import api from './api/apiClient'; // Import your API client

const ExamManagementPage = () => {
  const [examId, setExamId] = useState('');
  const [isValidExamId, setIsValidExamId] = useState(false);
  const [examInfo, setExamInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateExamId = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  const handleExamIdChange = (e) => {
    const value = e.target.value;
    setExamId(value);
    setIsValidExamId(validateExamId(value));
    
    if (!validateExamId(value)) {
      setExamInfo(null);
    }
  };

  const fetchExamInfo = async () => {
    if (!isValidExamId) return;
    
    setLoading(true);
    try {
      // Use your API client instead of fetch
      const response = await api.get(`/exams/${examId}/submissions?skip=0&limit=1000`);
      
      if (response.status === 200) {
        const submissions = response.data;
        setExamInfo({
          id: examId,
          submissionsCount: submissions.length,
          submissions: submissions
        });
      } else {
        throw new Error(`API returned status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching exam info:', error);
      setExamInfo({
        id: examId,
        submissionsCount: 0,
        error: error.response?.data?.detail || error.message || 'Error fetching exam data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadExam = () => {
    fetchExamInfo();
  };

  const clearExam = () => {
    setExamId('');
    setIsValidExamId(false);
    setExamInfo(null);
  };

  // Rest of your component remains the same...
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Exam Management</h1>
          <p className="text-muted-foreground">
            Process submissions and view results
          </p>
        </div>

        {/* Exam ID Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Enter Exam ID</CardTitle>
            <CardDescription>
              Enter the UUID of the exam you want to manage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="examId">Exam ID</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  id="examId"
                  placeholder="e.g., e266ef67-1381-44f2-bf53-e3ce6e48db9c"
                  value={examId}
                  onChange={handleExamIdChange}
                  className={`flex-1 ${
                    examId && !isValidExamId 
                      ? 'border-red-500 focus-visible:ring-red-500' 
                      : examId && isValidExamId 
                      ? 'border-green-500 focus-visible:ring-green-500' 
                      : ''
                  }`}
                />
                <Button 
                  onClick={handleLoadExam}
                  disabled={!isValidExamId || loading}
                  variant="outline"
                >
                  {loading ? 'Loading...' : 'Load'}
                </Button>
                {examInfo && (
                  <Button 
                    onClick={clearExam}
                    variant="ghost"
                  >
                    Clear
                  </Button>
                )}
              </div>
              {examId && !isValidExamId && (
                <p className="text-sm text-red-500">
                  Please enter a valid UUID format
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Info Display */}
        {/* Main Content with Tabs */}
        {examInfo && !examInfo.error && (
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
                  {examInfo.submissionsCount > 0 ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>Ready to process {examInfo.submissionsCount} submissions</strong>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          This will test each submission against their respective test cases and create submission results.
                        </p>
                      </div>
                      
                      <SubmissionProcessor examId={examId} />
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No submissions found for this exam.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="results">
              <SubmissionResultsDashboard examId={examId} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ExamManagementPage;
