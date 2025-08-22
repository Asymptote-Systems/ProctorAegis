// FILE: src/ProfilesPage.jsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, MoreVertical, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '@/api/apiClient';
import { useAuth } from './auth/AuthProvider';

// --- Reusable Profile Form Component (defined inside this file for simplicity) ---
const ProfileForm = ({ profileType, initialData, onSuccess, onCancel }) => {
  const isStudent = profileType === 'student';
  const [formData, setFormData] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Set form data when opening for editing, or reset for adding new
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(isStudent 
        ? { user_id: '', student_id: '', first_name: '', last_name: '', phone: '' }
        : { user_id: '', employee_id: '', first_name: '', last_name: '', department: '', designation: '' }
      );
    }
  }, [initialData, isStudent]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (initialData?.id) {
        // --- API ENDPOINT: Update Profile ---
        await apiClient.put(`/api/v1/${profileType}-profiles/${initialData.id}`, formData);
        toast.success(`${isStudent ? 'Student' : 'Teacher'} profile updated successfully.`);
      } else {
        // --- API ENDPOINT: Create Profile ---
        await apiClient.post(`/api/v1/${profileType}-profiles/`, formData);
        toast.success(`${isStudent ? 'Student' : 'Teacher'} profile created successfully.`);
      }
      onSuccess(); // Trigger data refresh and close dialog
    } catch (err) {
      const errorMessage = err.response?.data?.detail || `Failed to save profile.`;
      // Handle cases where the error detail is an array
      const finalMessage = Array.isArray(errorMessage) ? errorMessage.map(e => e.msg).join(', ') : errorMessage;
      toast.error(finalMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{initialData ? 'Edit' : 'Add New'} {isStudent ? 'Student' : 'Teacher'} Profile</DialogTitle>
        <DialogDescription>
          {initialData ? 'Update the details below.' : 'A corresponding user account must exist to link this profile.'}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {!initialData && (
          <div className="space-y-2"><Label htmlFor="user_id">User ID *</Label><Input name="user_id" value={formData.user_id || ''} onChange={handleChange} placeholder="Paste existing User ID" required /></div>
        )}
        {isStudent ? (
          <div className="space-y-2"><Label htmlFor="student_id">Student ID *</Label><Input name="student_id" value={formData.student_id || ''} onChange={handleChange} required /></div>
        ) : (
          <div className="space-y-2"><Label htmlFor="employee_id">Employee ID</Label><Input name="employee_id" value={formData.employee_id || ''} onChange={handleChange} /></div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label htmlFor="first_name">First Name *</Label><Input name="first_name" value={formData.first_name || ''} onChange={handleChange} required /></div>
          <div className="space-y-2"><Label htmlFor="last_name">Last Name *</Label><Input name="last_name" value={formData.last_name || ''} onChange={handleChange} required /></div>
        </div>
        {isStudent ? (
          <div className="space-y-2"><Label htmlFor="phone">Phone Number</Label><Input name="phone" value={formData.phone || ''} onChange={handleChange} /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="department">Department</Label><Input name="department" value={formData.department || ''} onChange={handleChange} /></div>
            <div className="space-y-2"><Label htmlFor="designation">Designation</Label><Input name="designation" value={formData.designation || ''} onChange={handleChange} /></div>
          </div>
        )}
        <DialogFooter>
            <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

// --- Main Page Component ---
export default function ProfilesPage() {
  const [studentProfiles, setStudentProfiles] = useState([]);
  const [teacherProfiles, setTeacherProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('students');

  const auth = useAuth();

  const fetchData = async () => {
    // No need to set loading true here if we call it after an action
    try {
      const [studentRes, teacherRes] = await Promise.all([
        apiClient.get('/api/v1/student-profiles/'),
        apiClient.get('/api/v1/teacher-profiles/')
      ]);
      setStudentProfiles(studentRes.data);
      setTeacherProfiles(teacherRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load profiles.");
      if (err.response?.status === 401) auth.logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (profileId, profileType) => {
    try {
      await apiClient.delete(`/api/v1/${profileType}-profiles/${profileId}`);
      toast.success(`${profileType === 'students' ? 'Student' : 'Teacher'} profile deleted successfully.`);
      fetchData(); // Refresh data
    } catch (err) {
      toast.error(`Failed to delete ${profileType} profile.`);
    }
  };
  
  const handleEdit = (profile) => {
    setEditingProfile(profile);
    setIsDialogOpen(true);
  };
  
  const handleAdd = () => {
    setEditingProfile(null);
    setIsDialogOpen(true);
  };
  
  const handleFormSuccess = () => {
      fetchData();
      setIsDialogOpen(false);
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 md:p-8">
      <div className="container mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Profile Management</h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">View, add, edit, and remove student and teacher profiles.</p>
        </header>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList>
                <TabsTrigger value="students">Student Profiles</TabsTrigger>
                <TabsTrigger value="teachers">Teacher Profiles</TabsTrigger>
              </TabsList>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={handleAdd}>
                  <PlusCircle className="h-4 w-4" />
                  Add New {activeTab === 'students' ? 'Student' : 'Teacher'}
                </Button>
              </DialogTrigger>
            </div>
            
            <TabsContent value="students">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {studentProfiles.map(profile => (
                  <Card key={profile.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar><AvatarFallback>{profile.first_name?.[0]}{profile.last_name?.[0]}</AvatarFallback></Avatar>
                        <div>
                          <CardTitle>{profile.first_name} {profile.last_name}</CardTitle>
                          <CardDescription>ID: {profile.student_id}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleEdit(profile)} className="gap-2"><Edit className="h-4 w-4" />Edit</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 gap-2"><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the student profile.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(profile.id, 'student')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">Phone: {profile.phone || 'N/A'}</p></CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="teachers">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {teacherProfiles.map(profile => (
                  <Card key={profile.id}>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar><AvatarFallback>{profile.first_name?.[0]}{profile.last_name?.[0]}</AvatarFallback></Avatar>
                        <div>
                          <CardTitle>{profile.first_name} {profile.last_name}</CardTitle>
                          <CardDescription>Dept: {profile.department || 'N/A'}</CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleEdit(profile)} className="gap-2"><Edit className="h-4 w-4" />Edit</DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 gap-2"><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete the teacher profile.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(profile.id, 'teacher')} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">Designation: {profile.designation || 'N/A'}</p></CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <ProfileForm 
            profileType={activeTab === 'students' ? 'student' : 'teacher'}
            initialData={editingProfile}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </Dialog>
      </div>
    </div>
  );
}