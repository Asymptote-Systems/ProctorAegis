// FILE: src/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  Users,
  RefreshCw,
  Search,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  UserPlus,
  Trash2,
  Eye,
  AlertTriangle,
  Info,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import * as XLSX from '@e965/xlsx';
import LogoutButton from './LogoutButton';
import axios from 'axios';

// API Client - ENHANCED VERSION with duplicate check and teacher support
const apiClient = {
  baseURL: 'http://localhost:8000',

  // Get headers with authentication
  getHeaders() {
    const token = localStorage.getItem('authToken');
    const csrfToken = localStorage.getItem('csrfToken');
    return {
      'Content-Type': 'application/json',
      'accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    };
  },

  // Check if user already exists
  async checkUserExists(email) {
    try {
      const response = await axios.get(`${this.baseURL}/users/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });

      const allUsers = Array.isArray(response.data) ? response.data : [];
      return allUsers.some(user => user.email.toLowerCase() === email.toLowerCase());
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  },

  // Create user (student or teacher) with duplicate check
  async createUser(user, role = "student") {
    // Check if user already exists
    const userExists = await this.checkUserExists(user.email);
    if (userExists) {
      throw new Error(`User with email ${user.email} already exists`);
    }

    const payload = {
      email: user.email,
      password: user.password,
      role: role,
      is_active: true,
      extra_data: {}
    };

    console.log('Making POST request to:', `${this.baseURL}/users/`);
    console.log('Payload:', payload);

    try {
      const response = await axios.post(`${this.baseURL}/users/`, payload, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log(`${role} user created successfully:`, response.data);
      return { data: response.data, success: true };

    } catch (error) {
      console.error(`Error creating ${role} user:`, error);

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        // Handle specific error cases
        if (status === 400 && errorData?.detail?.includes('already exists')) {
          throw new Error(`User with email ${user.email} already exists`);
        } else if (status === 400) {
          throw new Error(errorData?.detail || 'Invalid user data provided');
        } else if (status === 422) {
          throw new Error('Validation error: Please check email format and password requirements');
        } else {
          throw new Error(`Server error: ${status} - ${errorData?.detail || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('No response from server. Check if your backend is running.');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  },

  // Delete user
  async deleteUser(userId) {
    try {
      console.log('Deleting user:', userId);
      const response = await axios.delete(`${this.baseURL}/users/${userId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('User deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);

      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;

        if (status === 404) {
          throw new Error('User not found');
        } else if (status === 403) {
          throw new Error('You do not have permission to delete this user');
        } else {
          throw new Error(`Server error: ${status} - ${errorData?.detail || 'Unknown error'}`);
        }
      } else if (error.request) {
        throw new Error('No response from server. Check if your backend is running.');
      } else {
        throw new Error(`Request failed: ${error.message}`);
      }
    }
  },

  // NEW: Bulk delete users by role
  async deleteAllUsersByRole(role) {
    try {
      const response = await axios.get(`${this.baseURL}/users/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });

      const allUsers = Array.isArray(response.data) ? response.data : [];
      const usersToDelete = allUsers.filter(user => user.role === role);

      let deletedCount = 0;
      const errors = [];

      for (const user of usersToDelete) {
        try {
          await this.deleteUser(user.id);
          deletedCount++;
        } catch (error) {
          errors.push({ userId: user.id, email: user.email, error: error.message });
        }
      }

      return {
        success: true,
        deletedCount,
        totalCount: usersToDelete.length,
        errors
      };
    } catch (error) {
      console.error(`Error bulk deleting ${role} users:`, error);
      throw new Error(`Failed to delete ${role} users: ${error.message}`);
    }
  },

  // Bulk user creation with duplicate checking
  async createBulkUsers(users) {
    const results = [];
    const errors = [];

    console.log(`Starting bulk creation of ${users.length} student users...`);

    for (let i = 0; i < users.length; i++) {
      try {
        console.log(`Creating student ${i + 1}/${users.length}: ${users[i].email}`);
        const result = await this.createUser(users[i], "student");
        results.push(result.data);
      } catch (error) {
        console.error(`Failed to create student ${users[i].email}:`, error.message);
        errors.push({ user: users[i], error: error.message });
      }
    }

    console.log(`Bulk creation completed. Success: ${results.length}, Errors: ${errors.length}`);

    return {
      data: {
        created: results.length,
        users: results,
        errors: errors
      }
    };
  },

  // Get specific user by ID
  async getUser(userId) {
    try {
      console.log('Fetching user details for ID:', userId);
      const response = await axios.get(`${this.baseURL}/users/${userId}`, {
        headers: this.getHeaders(),
        timeout: 5000
      });
      console.log('User details fetched:', response.data);
      return { data: response.data };
    } catch (error) {
      console.error('Error fetching user details:', error);
      throw error;
    }
  },

  // Get all users (filtered by role)
  async getAllUsers() {
    try {
      const response = await axios.get(`${this.baseURL}/users/`, {
        headers: this.getHeaders(),
        timeout: 5000
      });

      const allUsers = Array.isArray(response.data) ? response.data : [];
      console.log(`Fetched ${allUsers.length} total users`);
      return { data: allUsers };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }
};

// Sample Excel file generation utility (unchanged)
const generateSampleExcelFile = () => {
  const sampleData = [
    { email: 'ch.sc.u4cse24004@ch.students.amrita.edu', password: 'Advaith_Sathish_Kumar' },
    { email: 'ch.sc.u4cse24028@ch.students.amrita.edu', password: 'Advaith_Balaji' },
    { email: 'ch.sc.u4cse24035@ch.students.amrita.edu', password: 'Sanjay_Lakshmanan' },
    { email: 'ch.sc.u4cse24038@ch.students.amrita.edu', password: 'Sahil_Pareek' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  // Auto-size columns
  const maxWidth = sampleData.reduce((w, r) => Math.max(w, r.email.length), 10);
  worksheet['!cols'] = [
    { wch: Math.max(maxWidth, 20) },
    { wch: 15 }
  ];

  XLSX.writeFile(workbook, 'sample_students.xlsx');
};

// Delete Confirmation Dialog Component (unchanged)
const DeleteConfirmDialog = ({ user, isOpen, onClose, onConfirm, isDeleting }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Delete Student
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The student account will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Student to delete:</strong> {user?.email}
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Student
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// NEW: Bulk Delete Confirmation Dialog
const BulkDeleteConfirmDialog = ({ role, isOpen, onClose, onConfirm, isDeleting, userCount }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Confirm Delete All {role}s
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. All {role} accounts will be permanently removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              <strong>Users to delete:</strong> {userCount} {role}(s)
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All {role}s
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Delete Success/Error Dialog Component (unchanged)
const DeleteResultDialog = ({ isOpen, onClose, success, message, userEmail }) => {
  const statusTimeoutRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Auto-close after 4 seconds
      statusTimeoutRef.current = setTimeout(() => {
        onClose();
      }, 4000);
    }

    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${success ? 'text-green-600' : 'text-red-600'}`}>
            {success ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <XCircle className="h-5 w-5" />
            )}
            {success ? 'Operation Successful' : 'Operation Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className={success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            {success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={success ? 'text-green-800' : 'text-red-800'}>
              {userEmail ? (
                success ? (
                  <>User <strong>{userEmail}</strong> has been successfully deleted.</>
                ) : (
                  <>Failed to delete user: {message}</>
                )
              ) : (
                message
              )}
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            This dialog will auto-close in 4 seconds
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// NEW: Manual Teacher Creation Component
const ManualTeacherCreation = ({ onTeacherCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ref to store timeout IDs for cleanup
  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear existing messages and timeouts when user starts typing
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setError('');
    setSuccess('');
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    // Auto-close error after 4 seconds
    errorTimeoutRef.current = setTimeout(() => {
      setError('');
    }, 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    // Auto-close success after 3 seconds
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      setIsOpen(false);
    }, 3000);
  };

  const handleCreateTeacher = async () => {
    if (!formData.email || !formData.password) {
      setErrorWithAutoClose('Please fill in both email and password');
      return;
    }

    if (!formData.email.includes('@')) {
      setErrorWithAutoClose('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setErrorWithAutoClose('Password must be at least 6 characters long');
      return;
    }

    setIsCreating(true);
    try {
      const result = await apiClient.createUser(formData, "teacher");
      setSuccessWithAutoClose(`Teacher ${formData.email} created successfully!`);
      onTeacherCreated(result.data);
      setFormData({ email: '', password: '' });

    } catch (error) {
      setErrorWithAutoClose(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white">
          <GraduationCap className="h-4 w-4 mr-2" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogDescription>
            Create a teacher account manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="teacher-email">Email Address</Label>
            <Input
              id="teacher-email"
              type="email"
              placeholder="teacher@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="teacher-password">Password</Label>
            <Input
              id="teacher-password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isCreating}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCreateTeacher}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Create Teacher
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Manual User Creation Component - WITH DUPLICATE CHECK (unchanged)
const ManualUserCreation = ({ onUserCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Ref to store timeout IDs for cleanup
  const errorTimeoutRef = useRef(null);
  const successTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear existing messages and timeouts when user starts typing
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setError('');
    setSuccess('');
  };

  const setErrorWithAutoClose = (message) => {
    setError(message);
    // Auto-close error after 4 seconds
    errorTimeoutRef.current = setTimeout(() => {
      setError('');
    }, 4000);
  };

  const setSuccessWithAutoClose = (message) => {
    setSuccess(message);
    // Auto-close success after 3 seconds
    successTimeoutRef.current = setTimeout(() => {
      setSuccess('');
      setIsOpen(false);
    }, 3000);
  };

  const handleCreateUser = async () => {
    if (!formData.email || !formData.password) {
      setErrorWithAutoClose('Please fill in both email and password');
      return;
    }

    if (!formData.email.includes('@')) {
      setErrorWithAutoClose('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      setErrorWithAutoClose('Password must be at least 6 characters long');
      return;
    }

    setIsCreating(true);
    try {
      const result = await apiClient.createUser(formData, "student");
      setSuccessWithAutoClose(`Student ${formData.email} created successfully!`);
      onUserCreated(result.data);
      setFormData({ email: '', password: '' });

    } catch (error) {
      setErrorWithAutoClose(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Single Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Create a single student account manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-email">Email Address</Label>
            <Input
              id="manual-email"
              type="email"
              placeholder="student@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-password">Password</Label>
            <Input
              id="manual-password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isCreating}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleCreateUser}
              disabled={isCreating}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Student
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Excel Upload Component - WITH DUPLICATE CHECK (unchanged)
const ExcelUpload = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState(null);

  // Refs for timeout management
  const statusTimeoutRef = useRef(null);
  const resultsTimeoutRef = useRef(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current);
    };
  }, []);

  // Auto-close message helpers
  const setStatusWithAutoClose = (status, closeDelay = 5000) => {
    // Clear existing timeout
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }

    setUploadStatus(status);

    // Set new timeout
    statusTimeoutRef.current = setTimeout(() => {
      setUploadStatus(null);
    }, closeDelay);
  };

  const setResultsWithAutoClose = (results, closeDelay = 8000) => {
    // Clear existing timeout
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
    }

    setUploadResults(results);

    // Auto-close results after delay
    resultsTimeoutRef.current = setTimeout(() => {
      setUploadResults(null);
    }, closeDelay);
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setFile(selectedFile);

      // Clear any existing messages
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current);
      setUploadStatus(null);
      setUploadProgress(0);
      setUploadResults(null);
    } else {
      // Auto-close file error after 4 seconds
      setStatusWithAutoClose({
        type: 'error',
        message: 'Please select a valid .xlsx file'
      }, 4000);
    }
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          if (jsonData.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          const requiredColumns = ['email', 'password'];
          const firstRow = jsonData[0];
          const hasRequiredColumns = requiredColumns.every(col =>
            Object.keys(firstRow).some(key => key.toLowerCase().includes(col.toLowerCase()))
          );

          if (!hasRequiredColumns) {
            reject(new Error('Excel file must contain "email" and "password" columns. Download the sample file for reference.'));
            return;
          }

          const users = jsonData.map(row => {
            const emailKey = Object.keys(row).find(key => key.toLowerCase().includes('email'));
            const passwordKey = Object.keys(row).find(key => key.toLowerCase().includes('password'));
            return {
              email: String(row[emailKey]).trim(),
              password: String(row[passwordKey]).trim()
            };
          }).filter(user => user.email && user.password);

          if (users.length === 0) {
            reject(new Error('No valid student records found. Please ensure email and password fields are filled.'));
            return;
          }

          console.log('Parsed student users from Excel:', users);
          resolve(users);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Clear any existing timeouts
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    if (resultsTimeoutRef.current) clearTimeout(resultsTimeoutRef.current);

    setUploadStatus({ type: 'info', message: 'Processing Excel file...' });

    try {
      const users = await parseExcelFile(file);
      console.log(`Parsed ${users.length} student users from Excel file`);

      setUploadStatus({ type: 'info', message: 'Creating student users in database...' });

      const results = [];
      const errors = [];

      for (let i = 0; i < users.length; i++) {
        try {
          setUploadStatus({
            type: 'info',
            message: `Creating student ${i + 1}/${users.length}: ${users[i].email}`
          });

          const result = await apiClient.createUser(users[i], "student");
          results.push(result.data);
          setUploadProgress(Math.round(((i + 1) / users.length) * 100));

        } catch (error) {
          console.error(`Failed to create student ${users[i].email}:`, error.message);
          errors.push({ user: users[i], error: error.message });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      // Set results with auto-close (longer delay if there are errors)
      if (errorCount > 0) {
        setResultsWithAutoClose({
          success: successCount,
          errors: errorCount,
          errorDetails: errors
        }, 10000); // 10 seconds for errors
      }

      if (successCount > 0) {
        // Success message with auto-close after 5 seconds
        setStatusWithAutoClose({
          type: 'success',
          message: `Successfully created ${successCount} student users${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
        }, 5000);

        onUploadComplete(results);
      } else {
        // Error message with auto-close after 8 seconds
        setStatusWithAutoClose({
          type: 'error',
          message: 'Failed to create any student users. Check details below.'
        }, 8000);
      }

      setFile(null);

    } catch (error) {
      console.error('Upload error:', error);
      // Parse error with auto-close after 6 seconds
      setStatusWithAutoClose({
        type: 'error',
        message: error.message
      }, 6000);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Student Creation
        </CardTitle>
        <CardDescription>
          Upload an Excel file to create multiple student accounts at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sample File Download */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Need a template?</p>
              <p className="text-xs text-blue-700">Download sample Excel file with correct format</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={generateSampleExcelFile}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Sample
            </Button>
          </div>
        </div>

        {/* File Upload */}
        <div className="flex items-center gap-4">
          <Input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="flex-1"
            disabled={isUploading}
          />
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="min-w-[120px]"
          >
            {isUploading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                {uploadProgress > 0 ? `${uploadProgress}%` : 'Processing'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload to Database
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {isUploading && uploadProgress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}

        {/* Status Messages - AUTO-CLOSE ENABLED */}
        {uploadStatus && (
          <Alert className={
            uploadStatus.type === 'error' ? 'border-red-500 bg-red-50' :
              uploadStatus.type === 'success' ? 'border-green-500 bg-green-50' :
                'border-blue-500 bg-blue-50'
          }>
            {uploadStatus.type === 'error' ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : uploadStatus.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Clock className="h-4 w-4 text-blue-600" />
            )}
            <AlertDescription className={
              uploadStatus.type === 'error' ? 'text-red-800' :
                uploadStatus.type === 'success' ? 'text-green-800' :
                  'text-blue-800'
            }>
              {uploadStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Upload Results Details - AUTO-CLOSE ENABLED */}
        {uploadResults && uploadResults.errors > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">Upload Issues Found</p>
                <div className="mt-2 space-y-1">
                  {uploadResults.errorDetails.slice(0, 5).map((error, index) => (
                    <p key={index} className="text-xs text-orange-800">
                      {error.user.email}: {error.error}
                    </p>
                  ))}
                  {uploadResults.errorDetails.length > 5 && (
                    <p className="text-xs text-orange-700 italic">
                      ...and {uploadResults.errorDetails.length - 5} more errors
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Requirements */}
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          <p className="font-medium mb-2">Excel Format Requirements:</p>
          <ul className="space-y-1">
            <li>• File must be .xlsx format</li>
            <li>• Must contain "email" and "password" columns</li>
            <li>• Email format: user@domain.com</li>
            <li>• All users will be created with role: "student"</li>
            <li>• <strong>Duplicate emails will be automatically detected and skipped</strong></li>
          </ul>
          <p className="text-xs text-gray-500 mt-2">
            💡 Messages auto-close: Success (5s), Errors (8s), File errors (4s)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

// NEW: Enhanced User Management with Tabs
const UserManagement = ({ users, onRefresh, onUserDeleted }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [showDeleteResult, setShowDeleteResult] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleteRole, setBulkDeleteRole] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const usersPerPage = 8;

  const studentUsers = users.filter(user =>
    user.role === 'student' &&
    user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const teacherUsers = users.filter(user =>
    user.role === 'teacher' &&
    user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUserClick = async (userId) => {
    try {
      const response = await apiClient.getUser(userId);
      setSelectedUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    }
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setDeletingUser(true);
    try {
      await apiClient.deleteUser(userToDelete.id);
      onUserDeleted(userToDelete.id);

      // Show success result
      setDeleteResult({
        success: true,
        message: `${userToDelete.role} deleted successfully`,
        userEmail: userToDelete.email
      });
      setShowDeleteResult(true);

    } catch (error) {
      // Show error result
      setDeleteResult({
        success: false,
        message: error.message,
        userEmail: userToDelete.email
      });
      setShowDeleteResult(true);
    } finally {
      setDeletingUser(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleDeleteResultClose = () => {
    setShowDeleteResult(false);
    setDeleteResult(null);
  };

  const handleBulkDeleteClick = (role) => {
    setBulkDeleteRole(role);
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleting(true);
    try {
      const result = await apiClient.deleteAllUsersByRole(bulkDeleteRole);

      // Refresh user list
      onRefresh();

      setDeleteResult({
        success: true,
        message: `Successfully deleted ${result.deletedCount} out of ${result.totalCount} ${bulkDeleteRole}(s)${result.errors.length > 0 ? `. ${result.errors.length} errors occurred.` : ''}`
      });
      setShowDeleteResult(true);

    } catch (error) {
      setDeleteResult({
        success: false,
        message: error.message
      });
      setShowDeleteResult(true);
    } finally {
      setBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      setBulkDeleteRole('');
    }
  };

  const renderUserTable = (userList, role) => {
    const totalPages = Math.ceil(userList.length / usersPerPage);
    const startIndex = (currentPage - 1) * usersPerPage;
    const paginatedUsers = userList.slice(startIndex, startIndex + usersPerPage);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-700">
              {userList.length} {role}(s) found
            </p>
            {userList.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleBulkDeleteClick(role)}
                className="ml-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All {role}s
              </Button>
            )}
          </div>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${role}s by email...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-20">ID</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm">Email</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-20">Role</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-20">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-32">Created At</th>
                <th className="text-left py-3 px-3 font-medium text-gray-900 text-sm w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs text-gray-900">{user.id.substring(0, 8)}...</td>
                    <td className="py-3 px-3 text-sm text-gray-900 break-all">{user.email}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${role === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                        {role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${(user.is_active !== false) ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {(user.is_active !== false) ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-gray-900">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUserClick(user.id)}
                              className="h-8 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>{role.charAt(0).toUpperCase() + role.slice(1)} Details</DialogTitle>
                              <DialogDescription>
                                Detailed information about the selected {role}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedUser && (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-sm font-medium">ID:</Label>
                                  <p className="text-sm text-gray-600 font-mono">{selectedUser.id}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Email:</Label>
                                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Role:</Label>
                                  <p className="text-sm text-gray-600">{selectedUser.role}</p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Status:</Label>
                                  <p className="text-sm text-gray-600">
                                    {(selectedUser.is_active !== false) ? 'Active' : 'Inactive'}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-sm font-medium">Created At:</Label>
                                  <p className="text-sm text-gray-600">
                                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                                {selectedUser.extra_data && Object.keys(selectedUser.extra_data).length > 0 && (
                                  <div>
                                    <Label className="text-sm font-medium">Extra Data:</Label>
                                    <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-1 max-h-32 overflow-y-auto">
                                      {JSON.stringify(selectedUser.extra_data, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          className="h-8 text-xs"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      {role === 'student' ? (
                        <Users className="h-8 w-8 text-gray-300" />
                      ) : (
                        <GraduationCap className="h-8 w-8 text-gray-300" />
                      )}
                      <p>No {role}s found</p>
                      {searchTerm && (
                        <p className="text-sm">Try adjusting your search terms</p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + usersPerPage, userList.length)} of {userList.length} {role}s
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>View and manage student and teacher accounts</CardDescription>
            </div>
            <Button onClick={onRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Students ({studentUsers.length})
              </TabsTrigger>
              <TabsTrigger value="teachers" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Teachers ({teacherUsers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-4">
              {renderUserTable(studentUsers, 'student')}
            </TabsContent>

            <TabsContent value="teachers" className="mt-4">
              {renderUserTable(teacherUsers, 'teacher')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        user={userToDelete}
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={deletingUser}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteConfirmDialog
        role={bulkDeleteRole}
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={handleBulkDeleteConfirm}
        isDeleting={bulkDeleting}
        userCount={bulkDeleteRole === 'student' ? studentUsers.length : teacherUsers.length}
      />

      {/* Delete Result Dialog */}
      <DeleteResultDialog
        isOpen={showDeleteResult}
        onClose={handleDeleteResultClose}
        success={deleteResult?.success}
        message={deleteResult?.message}
        userEmail={deleteResult?.userEmail}
      />
    </>
  );
};

// Main Admin Dashboard - UPDATED WITH TEACHER SUPPORT
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, inactiveStudents: 0, totalTeachers: 0 });

  const refreshUsers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await apiClient.getAllUsers();
      if (response.data) {
        const userData = Array.isArray(response.data) ? response.data : [];
        setUsers(userData);

        const students = userData.filter(u => u.role === 'student');
        const teachers = userData.filter(u => u.role === 'teacher');
        const activeStudents = students.filter(u => u.is_active !== false).length;
        const inactiveStudents = students.length - activeStudents;

        setStats({
          totalStudents: students.length,
          activeStudents,
          inactiveStudents,
          totalTeachers: teachers.length
        });
      }
    } catch (error) {
      console.error('Failed to refresh users:', error);
    }
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    refreshUsers();
    const interval = setInterval(refreshUsers, 30000);
    return () => clearInterval(interval);
  }, [refreshUsers]);

  const handleUploadComplete = (newUsers) => {
    setUsers(prevUsers => [...prevUsers, ...newUsers]);
    refreshUsers(); // Refresh to get updated stats
  };

  const handleUserCreated = (newUser) => {
    setUsers(prevUsers => [...prevUsers, newUser]);
    refreshUsers(); // Refresh to get updated stats
  };

  const handleTeacherCreated = (newTeacher) => {
    setUsers(prevUsers => [...prevUsers, newTeacher]);
    refreshUsers(); // Refresh to get updated stats
  };

  const handleUserDeleted = (userId) => {
    setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
    refreshUsers(); // Refresh to get updated stats
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage student and teacher accounts and system settings</p>
          </div>
          <LogoutButton />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Students</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeStudents}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Students</p>
                  <p className="text-3xl font-bold text-gray-600">{stats.inactiveStudents}</p>
                </div>
                <XCircle className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Teachers</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalTeachers}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="space-y-6">
            <ExcelUpload onUploadComplete={handleUploadComplete} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Manual Creation
                </CardTitle>
                <CardDescription>
                  Add individual accounts one at a time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ManualUserCreation onUserCreated={handleUserCreated} />
                <ManualTeacherCreation onTeacherCreated={handleTeacherCreated} />
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-2">
            <UserManagement
              users={users}
              onRefresh={refreshUsers}
              onUserDeleted={handleUserDeleted}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Last Refresh: {new Date().toLocaleTimeString()}</span>
                <span>System Status: Connected</span>
              </div>
              <div className="flex items-center gap-2">
                {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span className={isRefreshing ? 'text-blue-600' : 'text-green-600'}>
                  {isRefreshing ? 'Refreshing...' : 'Online'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
