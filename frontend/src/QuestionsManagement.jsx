// FILE: src/QuestionsManagement.jsx

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import HTMLEditor from './components/HTMLEditor';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  BookOpen, 
  Code, 
  Eye, 
  Save,
  ArrowLeft,
  ArrowRight,
  TestTube,
  Tag,
  X
} from "lucide-react";

const API_BASE_URL = 'http://localhost:8000';

// Utility function for API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    // Get JWT token from localStorage or your auth system
    const token = localStorage.getItem('access_token'); // Adjust based on your auth implementation
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export default function QuestionsManagement() {
  // State management
  const [activeTab, setActiveTab] = useState("questions");
  const [questions, setQuestions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  // Dialog states
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isTestCaseDialogOpen, setIsTestCaseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isEditorFullScreen, setIsEditorFullScreen] = useState(false);
  
  // Form states
  const [questionForm, setQuestionForm] = useState({
    title: '',
    description: '',
    problem_statement: '',
    difficulty: 'easy',
    max_score: 100,
    is_active: true,
    category_id: '',
    extra_data: {}
  });
  
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    is_active: true,
    extra_data: {}
  });

  const [testCaseForm, setTestCaseForm] = useState({
    input_data: '',
    expected_output: '',
    is_sample: false,
    is_hidden: false,
    extra_data: {},
    question_id: ''
  });

  const [editingQuestion, setEditingQuestion] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // For multi-step question creation
  const [selectedQuestionForTestCases, setSelectedQuestionForTestCases] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadQuestions();
    loadCategories();
  }, []);

  // Auto-fullscreen when reaching step 2
  useEffect(() => {
    if (currentStep === 2) {
      setIsEditorFullScreen(true);
    }
  }, [currentStep]);

  // Load questions from API
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/questions/?skip=0&limit=100');
      setQuestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load questions:', error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load categories from API
  const loadCategories = async () => {
    try {
      const data = await apiCall('/question-categories/?skip=0&limit=100');
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    }
  };

  // Load test cases for a specific question
  const loadTestCases = async (questionId) => {
    try {
      const data = await apiCall(`/question-test-cases/?skip=0&limit=100`);
      const filteredTestCases = Array.isArray(data) ? data.filter(tc => tc.question_id === questionId) : [];
      setTestCases(filteredTestCases);
    } catch (error) {
      console.error('Failed to load test cases:', error);
      setTestCases([]);
    }
  };

  // Create or update question
  const handleQuestionSubmit = async () => {
    setLoading(true);
    try {
      const endpoint = editingQuestion ? `/questions/${editingQuestion.id}` : '/questions/';
      const method = editingQuestion ? 'PUT' : 'POST';
      
      await apiCall(endpoint, {
        method,
        body: JSON.stringify(questionForm),
      });
      
      await loadQuestions();
      
      // Close fullscreen immediately and reset everything
      setIsEditorFullScreen(false);
      setIsQuestionDialogOpen(false);
      resetQuestionForm();
    } catch (error) {
      console.error('Failed to save question:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create or update category
  const handleCategorySubmit = async () => {
    setLoading(true);
    try {
      const endpoint = editingCategory ? `/question-categories/${editingCategory.id}` : '/question-categories/';
      const method = editingCategory ? 'PUT' : 'POST';
      
      await apiCall(endpoint, {
        method,
        body: JSON.stringify(categoryForm),
      });
      
      await loadCategories();
      resetCategoryForm();
      setIsCategoryDialogOpen(false);
    } catch (error) {
      console.error('Failed to save category:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create test case
  const handleTestCaseSubmit = async () => {
    setLoading(true);
    try {
      await apiCall('/question-test-cases/', {
        method: 'POST',
        body: JSON.stringify(testCaseForm),
      });
      
      await loadTestCases(selectedQuestionForTestCases);
      resetTestCaseForm();
      setIsTestCaseDialogOpen(false);
    } catch (error) {
      console.error('Failed to save test case:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!deleteTarget) return;
    
    setLoading(true);
    try {
      if (deleteTarget.type === 'question') {
        await apiCall(`/questions/${deleteTarget.id}`, { method: 'DELETE' });
        await loadQuestions();
      } else if (deleteTarget.type === 'category') {
        await apiCall(`/question-categories/${deleteTarget.id}`, { method: 'DELETE' });
        await loadCategories();
      } else if (deleteTarget.type === 'testcase') {
        await apiCall(`/question-test-cases/${deleteTarget.id}`, { method: 'DELETE' });
        await loadTestCases(selectedQuestionForTestCases);
      }
      
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setLoading(false);
    }
  };

  // Form reset functions
  const resetQuestionForm = () => {
    setQuestionForm({
      title: '',
      description: '',
      problem_statement: '',
      difficulty: 'easy',
      max_score: 100,
      is_active: true,
      category_id: '',
      extra_data: {}
    });
    setEditingQuestion(null);
    setCurrentStep(1);
    setIsEditorFullScreen(false); // Reset fullscreen state
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      is_active: true,
      extra_data: {}
    });
    setEditingCategory(null);
  };

  const resetTestCaseForm = () => {
    setTestCaseForm({
      input_data: '',
      expected_output: '',
      is_sample: false,
      is_hidden: false,
      extra_data: {},
      question_id: selectedQuestionForTestCases || ''
    });
  };

  // Edit handlers
  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      title: question.title || '',
      description: question.description || '',
      problem_statement: question.problem_statement || '',
      difficulty: question.difficulty || 'easy',
      max_score: question.max_score || 100,
      is_active: question.is_active !== false,
      category_id: question.category_id || '',
      extra_data: question.extra_data || {}
    });
    setCurrentStep(1);
    setIsQuestionDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
      is_active: category.is_active !== false,
      extra_data: category.extra_data || {}
    });
    setIsCategoryDialogOpen(true);
  };

  // Close fullscreen editor and go back to main view
  const handleCloseEditor = () => {
    setIsEditorFullScreen(false);
    setIsQuestionDialogOpen(false);
    resetQuestionForm();
  };

  // Go back to step 1
  const handleGoToPrevious = () => {
    setCurrentStep(1);
    setIsEditorFullScreen(false);
  };

  // Filter questions
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         question.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || question.category_id === filterCategory;
    const matchesDifficulty = filterDifficulty === 'all' || question.difficulty === filterDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Get category name by ID
  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  // Difficulty badge color
  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Questions Database
                  </CardTitle>
                  <CardDescription>
                    Manage your coding questions and test cases
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetQuestionForm();
                    setIsQuestionDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search questions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Difficulties</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Questions Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Max Score</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading questions...
                        </TableCell>
                      </TableRow>
                    ) : filteredQuestions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No questions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredQuestions.map((question) => (
                        <TableRow key={question.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold">{question.title}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">
                                {question.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getCategoryName(question.category_id)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getDifficultyColor(question.difficulty)}>
                              {question.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>{question.max_score}</TableCell>
                          <TableCell>
                            <Badge variant={question.is_active ? "default" : "secondary"}>
                              {question.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditQuestion(question)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedQuestionForTestCases(question.id);
                                  loadTestCases(question.id);
                                  setTestCaseForm({
                                    input_data: '',
                                    expected_output: '',
                                    is_sample: false,
                                    is_hidden: false,
                                    extra_data: {},
                                    question_id: question.id
                                  });
                                  setIsTestCaseDialogOpen(true);
                                }}
                              >
                                <TestTube className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteTarget({ type: 'question', id: question.id, name: question.title });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Question Categories
                  </CardTitle>
                  <CardDescription>
                    Organize your questions into categories
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetCategoryForm();
                    setIsCategoryDialogOpen(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map((category) => (
                  <Card key={category.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({ type: 'category', id: category.id, name: category.name });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                      <div className="flex justify-between items-center text-sm">
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <span className="text-gray-500">
                          {((count) => `${count} question${count !== 1 ? 's' : ''}`)(questions.filter(q => q.category_id === category.id).length)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question Create/Edit Dialog - Only shown when not in fullscreen */}
      {!isEditorFullScreen && (
        <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Create New Question'}
              </DialogTitle>
              <DialogDescription>
                Step {currentStep} of 2: {currentStep === 1 ? 'Basic Information' : 'Problem Statement'}
              </DialogDescription>
            </DialogHeader>

            {currentStep === 1 && (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={questionForm.title}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter question title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={questionForm.category_id}
                      onValueChange={(value) => setQuestionForm(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={questionForm.difficulty}
                      onValueChange={(value) => setQuestionForm(prev => ({ ...prev, difficulty: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxScore">Max Score</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      value={questionForm.max_score}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, max_score: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={questionForm.description}
                    onChange={(e) => setQuestionForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the question"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={questionForm.is_active}
                    onCheckedChange={(checked) => setQuestionForm(prev => ({ ...prev, is_active: checked }))}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <div className="flex justify-between w-full">
                <div></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsQuestionDialogOpen(false)}>
                    Cancel
                  </Button>
                  {currentStep === 1 && (
                    <Button 
                      onClick={() => {
                        setCurrentStep(2);
                        setIsEditorFullScreen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Fullscreen HTMLEditor - Render separately when in fullscreen mode */}
      {isEditorFullScreen && currentStep === 2 && (
        <HTMLEditor
          value={questionForm.problem_statement}
          onChange={(value) => setQuestionForm(prev => ({ ...prev, problem_statement: value }))}
          onSave={handleQuestionSubmit}
          onClose={handleCloseEditor}
          onPrevious={handleGoToPrevious}
          loading={loading}
          editingQuestion={editingQuestion}
        />
      )}

      {/* Category Create/Edit Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </DialogTitle>
            <DialogDescription>
              Categories help organize your questions by topic or subject area.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Name *</Label>
              <Input
                id="categoryName"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Data Structures, Algorithms"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryDescription">Description</Label>
              <Textarea
                id="categoryDescription"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="categoryActive"
                checked={categoryForm.is_active}
                onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="categoryActive">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCategorySubmit} disabled={loading}>
              {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Cases Dialog */}
      <Dialog open={isTestCaseDialogOpen} onOpenChange={setIsTestCaseDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Test Cases</DialogTitle>
            <DialogDescription>
              Add and manage test cases for this question
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add Test Case Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add New Test Case</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inputData">Input Data</Label>
                    <Textarea
                      id="inputData"
                      value={testCaseForm.input_data}
                      onChange={(e) => setTestCaseForm(prev => ({ ...prev, input_data: e.target.value }))}
                      placeholder="Enter input data"
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expectedOutput">Expected Output</Label>
                    <Textarea
                      id="expectedOutput"
                      value={testCaseForm.expected_output}
                      onChange={(e) => setTestCaseForm(prev => ({ ...prev, expected_output: e.target.value }))}
                      placeholder="Enter expected output"
                      rows={4}
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isSample"
                      checked={testCaseForm.is_sample}
                      onCheckedChange={(checked) => setTestCaseForm(prev => ({ ...prev, is_sample: checked }))}
                    />
                    <Label htmlFor="isSample">Sample Test Case</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isHidden"
                      checked={testCaseForm.is_hidden}
                      onCheckedChange={(checked) => setTestCaseForm(prev => ({ ...prev, is_hidden: checked }))}
                    />
                    <Label htmlFor="isHidden">Hidden from Students</Label>
                  </div>
                </div>

                <Button onClick={handleTestCaseSubmit} disabled={loading}>
                  Add Test Case
                </Button>
              </CardContent>
            </Card>

            {/* Existing Test Cases */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Existing Test Cases</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testCases.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No test cases found</p>
                  ) : (
                    testCases.map((testCase, index) => (
                      <div key={testCase.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                            <Badge variant={testCase.is_sample ? "default" : "secondary"}>
                              {testCase.is_sample ? "Sample" : "Test"} Case {index + 1}
                            </Badge>
                            {testCase.is_hidden && (
                              <Badge variant="outline">Hidden</Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteTarget({ type: 'testcase', id: testCase.id, name: `Test Case ${index + 1}` });
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <Label>Input:</Label>
                            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {testCase.input_data}
                            </pre>
                          </div>
                          <div>
                            <Label>Expected Output:</Label>
                            <pre className="bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {testCase.expected_output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestCaseDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteTarget?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
