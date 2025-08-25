import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../api/apiClient'; // Import your API client

export const SubmissionProcessor = ({ examId }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const startProcessing = async () => {
    try {
      // Use your API client
      const response = await api.post(`/exams/${examId}/process-submissions`);

      if (response.status !== 200) {
        throw new Error('Failed to start processing');
      }

      const data = response.data;
      setJobId(data.job_id);
      setIsProcessing(true);
      setShowDialog(true);
      
      // Start polling for status
      pollStatus(data.job_id);
    } catch (error) {
      console.error('Error starting processing:', error);
      alert(`Failed to start processing submissions: ${error.response?.data?.detail || error.message}`);
    }
  };

  const pollStatus = async (currentJobId) => {
    const poll = async () => {
      try {
        // Use your API client
        const response = await api.get(`/processing-jobs/${currentJobId}/status`);
        
        if (response.status !== 200) {
          throw new Error('Failed to fetch status');
        }

        const statusData = response.data;
        setStatus(statusData);

        if (statusData.status === 'completed' || statusData.status === 'failed') {
          setIsProcessing(false);
          // Clean up job after 30 seconds
          setTimeout(async () => {
            try {
              await api.delete(`/processing-jobs/${currentJobId}`);
            } catch (error) {
              console.error('Error cleaning up job:', error);
            }
          }, 30000);
        } else {
          // Continue polling every 2 seconds
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Error polling status:', error);
        setIsProcessing(false);
      }
    };

    poll();
  };

  const getProgressPercentage = () => {
    if (!status) return 0;
    return Math.round((status.completed / status.total) * 100);
  };

  const getStatusIcon = () => {
    if (!status) return <Clock className="h-4 w-4" />;
    
    switch (status.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    if (!status) return 'Initializing...';
    
    switch (status.status) {
      case 'completed':
        return 'Processing completed!';
      case 'failed':
        return 'Processing failed';
      case 'processing':
        return `Processing submissions... ${status.completed}/${status.total}`;
      default:
        return 'Unknown status';
    }
  };

  return (
    <>
      <Button 
        onClick={startProcessing} 
        disabled={isProcessing}
        className="mb-4"
      >
        {isProcessing ? 'Processing...' : 'Process Submissions'}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Submission Processing
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              {getStatusText()}
            </div>
            
            {status && (
              <>
                <Progress value={getProgressPercentage()} className="w-full" />
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{status.completed}</div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-red-600">{status.failed}</div>
                    <div className="text-gray-500">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">{status.total}</div>
                    <div className="text-gray-500">Total</div>
                  </div>
                </div>

                {status.errors && status.errors.length > 0 && (
                  <Alert>
                    <AlertDescription>
                      <div className="font-semibold mb-2">Errors encountered:</div>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {status.errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-red-600">{error}</div>
                        ))}
                        {status.errors.length > 5 && (
                          <div className="text-gray-500">
                            ... and {status.errors.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {status?.status === 'completed' && (
              <Button 
                onClick={() => setShowDialog(false)} 
                className="w-full"
              >
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubmissionProcessor;
