import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Eye, 
  Filter,
  Search,
  RefreshCw,
  Users,
  Trophy,
  Code2,
  Timer,
  MemoryStick
} from 'lucide-react';
import api from '../api/apiClient';

const SubmissionResultsDashboard = ({ examId }) => {
  const [submissions, setSubmissions] = useState([]);
  const [submissionResults, setSubmissionResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);
  const [stats, setStats] = useState({});

  // Status configurations
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
    running: { icon: RefreshCw, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
    accepted: { icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
    wrong_answer: { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
    compilation_error: { icon: AlertTriangle, color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
    runtime_error: { icon: AlertTriangle, color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50' },
    time_limit_exceeded: { icon: Timer, color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
    internal_error: { icon: XCircle, color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50' }
  };

  // Fetch data
  const fetchSubmissionResults = async () => {
    setLoading(true);
    try {
      // Get submissions
      const submissionsResponse = await api.get(`/exams/${examId}/submissions?skip=0&limit=1000`);
      const submissionsData = submissionsResponse.data;
      setSubmissions(submissionsData);

      // Get submission results for each submission
      const resultsPromises = submissionsData.map(async (submission) => {
        try {
          const resultResponse = await api.get(`/submission-results/?submission_id=${submission.id}`);
          return resultResponse.data[0] || null; // Assuming it returns an array
        } catch (error) {
          return null;
        }
      });

      const results = await Promise.all(resultsPromises);
      const validResults = results.filter(r => r !== null);
      setSubmissionResults(validResults);

      // Calculate stats
      calculateStats(submissionsData, validResults);
    } catch (error) {
      console.error('Error fetching submission results:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (submissions, results) => {
    const stats = {
      totalSubmissions: submissions.length,
      processedSubmissions: results.length,
      pendingSubmissions: submissions.length - results.length,
      acceptedSubmissions: results.filter(r => r.status === 'accepted').length,
      wrongAnswerSubmissions: results.filter(r => r.status === 'wrong_answer').length,
      errorSubmissions: results.filter(r => ['compilation_error', 'runtime_error', 'internal_error'].includes(r.status)).length,
      averageScore: results.length > 0 ? (results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1) : 0,
      averageExecutionTime: results.length > 0 ? (results.reduce((sum, r) => sum + r.execution_time, 0) / results.length).toFixed(0) : 0
    };
    setStats(stats);
  };

  // Filter submissions
  const getFilteredData = () => {
    let data = submissions.map(submission => {
      const result = submissionResults.find(r => r.submission_id === submission.id);
      return {
        ...submission,
        result: result || { status: 'pending', score: 0, max_score: 0 }
      };
    });

    // Apply search filter
    if (searchTerm) {
      data = data.filter(item => 
        item.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      data = data.filter(item => item.result.status === statusFilter);
    }

    return data;
  };

  const StatusBadge = ({ status }) => {
    const config = statusConfig[status] || statusConfig.internal_error;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const ScoreDisplay = ({ score, maxScore }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const getScoreColor = () => {
      if (percentage >= 90) return 'text-green-600';
      if (percentage >= 70) return 'text-blue-600';
      if (percentage >= 50) return 'text-yellow-600';
      return 'text-red-600';
    };

    return (
      <div className="flex items-center space-x-2">
        <span className={`font-semibold ${getScoreColor()}`}>
          {score}/{maxScore}
        </span>
        <Progress value={percentage} className="w-16 h-2" />
        <span className="text-xs text-gray-500">{percentage.toFixed(0)}%</span>
      </div>
    );
  };

  useEffect(() => {
    if (examId) {
      fetchSubmissionResults();
    }
  }, [examId]);

  const filteredData = getFilteredData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Submission Results</h1>
          <p className="text-muted-foreground">Manage and review all exam submissions</p>
        </div>
        <Button onClick={fetchSubmissionResults} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.totalSubmissions}</p>
                <p className="text-xs text-muted-foreground">Total Submissions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.acceptedSubmissions}</p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingSubmissions}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.averageScore}</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by student ID or submission ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="wrong_answer">Wrong Answer</SelectItem>
                <SelectItem value="compilation_error">Compilation Error</SelectItem>
                <SelectItem value="runtime_error">Runtime Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions ({filteredData.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : filteredData.length > 0 ? (
              filteredData.map((item) => (
                <SubmissionCard key={item.id} submission={item} onViewDetails={setSelectedResult} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No submissions found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Result Modal */}
      {selectedResult && (
        <SubmissionResultModal 
          result={selectedResult} 
          onClose={() => setSelectedResult(null)} 
        />
      )}
    </div>
  );
};

// Submission Card Component
const SubmissionCard = ({ submission, onViewDetails }) => {
  const { result } = submission;
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
    running: { icon: RefreshCw, color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' },
    accepted: { icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' },
    wrong_answer: { icon: XCircle, color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
    compilation_error: { icon: AlertTriangle, color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
    runtime_error: { icon: AlertTriangle, color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50' },
    time_limit_exceeded: { icon: Timer, color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
    internal_error: { icon: XCircle, color: 'bg-gray-500', textColor: 'text-gray-700', bgColor: 'bg-gray-50' }
  };

  const config = statusConfig[result.status] || statusConfig.internal_error;
  const Icon = config.icon;

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <Icon className={`w-4 h-4 ${config.textColor}`} />
          </div>
          <div>
            <p className="font-medium">Student ID: {submission.student_id}</p>
            <p className="text-sm text-muted-foreground">
              Submitted: {new Date(submission.submitted_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Badge className={`${config.bgColor} ${config.textColor} border-0`}>
            {result.status.replace('_', ' ').toUpperCase()}
          </Badge>

          {result.status !== 'pending' && (
            <>
              <div className="text-right">
                <p className="font-semibold">
                  Score: {result.score}/{result.max_score}
                </p>
                <p className="text-xs text-muted-foreground">
                  {result.execution_time}ms • {result.memory_used}KB
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onViewDetails({...submission, result})}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Detailed Result Modal Component
const SubmissionResultModal = ({ result, onClose }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Submission Info</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Student ID:</span> {result.student_id}</p>
                <p><span className="font-medium">Language:</span> {result.language}</p>
                <p><span className="font-medium">Submitted:</span> {new Date(result.submitted_at).toLocaleString()}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Execution Results</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Status:</span> {result.result.status}</p>
                <p><span className="font-medium">Score:</span> {result.result.score}/{result.result.max_score}</p>
                <p><span className="font-medium">Execution Time:</span> {result.result.execution_time}ms</p>
                <p><span className="font-medium">Memory Used:</span> {result.result.memory_used}KB</p>
              </div>
            </div>
          </div>

          {/* Source Code */}
          <div>
            <h3 className="font-semibold mb-2">Source Code</h3>
            <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{result.source_code}</code>
            </pre>
          </div>

          {/* Test Results */}
          {result.result.test_results && (
            <div>
              <h3 className="font-semibold mb-2">Test Results</h3>
              <div className="space-y-2">
                {result.result.test_results.details?.map((test, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    test.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Test Case {index + 1}</span>
                      <Badge variant={test.passed ? 'success' : 'destructive'}>
                        {test.passed ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>
                    <div className="text-xs space-y-1">
                      <p><span className="font-medium">Expected:</span> {test.expected}</p>
                      <p><span className="font-medium">Actual:</span> {test.actual}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Output/Error Information */}
          {(result.result.stdout || result.result.stderr) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.result.stdout && (
                <div>
                  <h3 className="font-semibold mb-2">Standard Output</h3>
                  <pre className="bg-green-50 p-3 rounded text-xs overflow-x-auto">
                    {result.result.stdout}
                  </pre>
                </div>
              )}
              {result.result.stderr && (
                <div>
                  <h3 className="font-semibold mb-2">Standard Error</h3>
                  <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto">
                    {result.result.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionResultsDashboard;
