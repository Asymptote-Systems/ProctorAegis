import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, GraduationCap, Clock, Calendar, Eye, EyeOff, LogIn, Moon, Sun } from 'lucide-react';
import { AuthContext } from "./auth/AuthProvider";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [userType, setUserType] = useState('student');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    teacherEmail: '',
    studentPassword: '',
    teacherPassword: ''
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for saved theme preference or default to light mode
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');

    const email = userType === 'student' ? formData.studentId : formData.teacherEmail;
    const password = userType === 'student' ? formData.studentPassword : formData.teacherPassword;

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      // Use the AuthProvider login function
      const result = await login(email, password);

      if (result.access_token) {
        localStorage.setItem("access_token", result.access_token);
        localStorage.setItem("refresh_token", result.refresh_token || "");
        localStorage.setItem("csrf_token", result.csrf_token || "");
        localStorage.setItem("user", JSON.stringify(result.user));
      }

      // Navigate based on user role
      navigate(
        result.user?.role === "student"
          ? "/student/dashboard"
          : "/teacher/dashboard"
      );
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle Enter key press for form submission
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col ${isDarkMode
        ? 'bg-black'
        : 'bg-white'
      }`}>
      {/* Header with Time and Date */}
      <div className={`w-full backdrop-blur-sm border-b shadow-sm transition-colors duration-300 ${isDarkMode
          ? 'bg-gray-900/80 border-gray-700/20'
          : 'bg-white/80 border-gray-200/20'
        }`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <GraduationCap className={`h-6 w-6 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                }`} />
              <h1 className={`text-lg font-semibold transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                }`}>ProctorAegis</h1>
            </div>
            <div className="flex items-center space-x-6">
              <div className={`flex items-center space-x-6 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono">{formatTime(currentTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(currentTime)}</span>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 ${isDarkMode
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-black'
                  }`}
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Login Section */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
              <LogIn className={`h-8 w-8 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                }`} />
            </div>
            <h2 className={`text-3xl font-bold mb-2 transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
              }`}>Welcome Back!</h2>
            <p className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Please sign in to your account</p>
          </div>

          <Card className={`shadow-xl border transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className={`text-2xl font-bold text-center transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                }`}>
                Login
              </CardTitle>
              <CardDescription className={`text-center transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Choose your account type and enter credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={userType} onValueChange={setUserType} className="w-full">
                <TabsList className={`grid w-full grid-cols-2 p-1 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                  }`}>
                  <TabsTrigger
                    value="student"
                    className={`flex items-center space-x-2 transition-all duration-300 ${isDarkMode
                        ? 'data-[state=active]:bg-black data-[state=active]:text-white text-gray-400'
                        : 'data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black'
                      }`}
                  >
                    <User className="h-4 w-4" />
                    <span>Student</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="teacher"
                    className={`flex items-center space-x-2 transition-all duration-300 ${isDarkMode
                        ? 'data-[state=active]:bg-black data-[state=active]:text-white text-gray-400'
                        : 'data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black'
                      }`}
                  >
                    <GraduationCap className="h-4 w-4" />
                    <span>Teacher</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="student" className="mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student-id" className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                        }`}>
                        Student Email
                      </Label>
                      <div className="relative">
                        <User className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                        <Input
                          id="student-id"
                          name="student-id"
                          type="email"
                          placeholder="Enter your student email"
                          value={formData.studentId}
                          onChange={(e) => handleInputChange('studentId', e.target.value)}
                          onKeyPress={handleKeyPress}
                          className={`pl-10 h-12 transition-all duration-300 ${isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-white focus:ring-white'
                              : 'bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black'
                            }`}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="student-password" className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                        }`}>
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="student-password"
                          name="student-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.studentPassword}
                          onChange={(e) => handleInputChange('studentPassword', e.target.value)}
                          onKeyPress={handleKeyPress}
                          className={`pr-10 h-12 transition-all duration-300 ${isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-white focus:ring-white'
                              : 'bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black'
                            }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute right-3 top-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogin}
                      className={`w-full h-12 transition-all duration-300 ${isDarkMode
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${isDarkMode ? 'border-black' : 'border-white'
                            }`}></div>
                          <span>Logging in...</span>
                        </div>
                      ) : (
                        'Login'
                      )}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="teacher" className="mt-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacher-email" className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                        }`}>
                        Email Address
                      </Label>
                      <div className="relative">
                        <GraduationCap className={`absolute left-3 top-3 h-4 w-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`} />
                        <Input
                          id="teacher-email"
                          name="teacher-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={formData.teacherEmail}
                          onChange={(e) => handleInputChange('teacherEmail', e.target.value)}
                          onKeyPress={handleKeyPress}
                          className={`pl-10 h-12 transition-all duration-300 ${isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-white focus:ring-white'
                              : 'bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black'
                            }`}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacher-password" className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-black'
                        }`}>
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="teacher-password"
                          name="teacher-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.teacherPassword}
                          onChange={(e) => handleInputChange('teacherPassword', e.target.value)}
                          onKeyPress={handleKeyPress}
                          className={`pr-10 h-12 transition-all duration-300 ${isDarkMode
                              ? 'bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-white focus:ring-white'
                              : 'bg-white border-gray-300 text-black placeholder:text-gray-500 focus:border-black focus:ring-black'
                            }`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={`absolute right-3 top-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      onClick={handleLogin}
                      className={`w-full h-12 transition-all duration-300 ${isDarkMode
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${isDarkMode ? 'border-black' : 'border-white'
                            }`}></div>
                          <span>Logging in...</span>
                        </div>
                      ) : (
                        'Login'
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <Alert className={`border-red-500 transition-colors duration-300 ${isDarkMode ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-200'
                  }`} variant="destructive">
                  <AlertDescription className={`transition-colors duration-300 ${isDarkMode ? 'text-red-300' : 'text-red-800'
                    }`}>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-2">
              <div className={`text-center text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                <p>Need help? Contact your administrator</p>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className={`backdrop-blur-sm border-t py-4 transition-colors duration-300 ${isDarkMode
          ? 'bg-gray-900/80 border-gray-700/20'
          : 'bg-white/80 border-gray-200/20'
        }`}>
        <div className={`container mx-auto px-4 text-center text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
          <p>&copy; 2025 ProctorAegis. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
