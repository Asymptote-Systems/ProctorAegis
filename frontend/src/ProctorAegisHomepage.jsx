import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Code, 
  Users, 
  BarChart3, 
  Clock, 
  Lock, 
  Zap, 
  CheckCircle, 
  ArrowRight, 
  Moon, 
  Sun,
  Play,
  Database,
  FileText,
  Award,
  Activity,
  Sparkles,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

const ProctorAegisHomepage = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Enterprise Security",
      description: "JWT authentication, RBAC, and Secure Exam Browser support with military-grade encryption"
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "LeetCode-like Environment",
      description: "Multi-language coding with intelligent syntax highlighting and live execution feedback"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Analytics",
      description: "Comprehensive dashboards with AI-powered insights and exportable detailed reports"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Real-time Evaluation",
      description: "Instant feedback with Judge0 integration, auto-grading, and performance analytics"
    }
  ];

  const stats = [
    { label: "Concurrent Users", value: "10,000+", icon: <Users className="h-5 w-5" /> },
    { label: "Code Languages", value: "15+", icon: <Code className="h-5 w-5" /> },
    { label: "Security Layers", value: "Multi-Tier", icon: <Lock className="h-5 w-5" /> },
    { label: "Uptime", value: "99.9%", icon: <Activity className="h-5 w-5" /> }
  ];

  const roles = [
    {
      title: "Teachers",
      description: "Upload rosters, create comprehensive exams, and analyze detailed results",
      features: ["Excel Integration", "Question Management", "Analytics Dashboard", "Export Reports"],
      icon: <FileText className="h-12 w-12" />
    },
    {
      title: "Students",
      description: "Take secure coding exams with real-time feedback and seamless experience",
      features: ["Live Coding Environment", "Auto-save & Recovery", "Timer Management", "Instant Results"],
      icon: <Award className="h-12 w-12" />
    },
    {
      title: "Administrators",
      description: "Manage platform security and user access with comprehensive controls",
      features: ["User Management", "Security Monitoring", "System Analytics", "Audit Logs"],
      icon: <Database className="h-12 w-12" />
    }
  ];

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'Roles', href: '#roles' },
    { name: 'Technology', href: '#tech' }
  ];

  // Enhanced mouse tracking for interactive elements
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smoother feature carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Enhanced intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(prev => ({
            ...prev,
            [entry.target.id]: entry.isIntersecting
          }));
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px 0px'
      }
    );

    document.querySelectorAll('[id]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const scrollToSection = (href) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleViewDemo = () => {
    navigate('/api');
  };

  return (
    <div className={`min-h-screen transition-all duration-700 ease-in-out ${
      isDark 
        ? 'dark bg-gradient-to-br from-black via-gray-900 to-black text-white' 
        : 'bg-gradient-to-br from-white via-gray-50 to-white text-black'
    }`}>
      
      {/* Enhanced Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-800/20 bg-white/90 dark:bg-black/90 transition-all duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <Shield className="h-10 w-10 animate-pulse text-black dark:text-white group-hover:rotate-12 transition-transform duration-500" />
              <span className="text-3xl font-bold bg-gradient-to-r from-black to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                ProctorAegis
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => scrollToSection(item.href)}
                  className="text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors duration-300 hover:scale-105"
                >
                  {item.name}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="lg"
                onClick={toggleTheme}
                className="hover:scale-110 transition-all duration-300 rounded-full p-3"
              >
                {isDark ? 
                  <Sun className="h-6 w-6 animate-spin-slow" /> : 
                  <Moon className="h-6 w-6 animate-bounce" />
                }
              </Button>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="lg"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>

              <Button 
                className="hidden md:flex hover:scale-105 transition-all duration-300 px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-20 left-0 right-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-gray-200/20 dark:border-gray-800/20">
              <div className="px-4 py-6 space-y-4">
                {navItems.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => scrollToSection(item.href)}
                    className="block w-full text-left text-lg font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors duration-300 py-2"
                  >
                    {item.name}
                  </button>
                ))}
                <Button 
                  className="w-full mt-4"
                  onClick={handleGetStarted}
                >
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Interactive background grid */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-gray-100/10 dark:via-gray-800/10 to-transparent"></div>
          
          {/* Enhanced floating elements */}
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className={`absolute rounded-full transition-all duration-1000 ${
                isDark ? 'bg-white/20 hover:bg-white/30' : 'bg-gray-800/20 hover:bg-gray-800/30'
              } animate-float cursor-pointer`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 8 + 3}px`,
                height: `${Math.random() * 8 + 3}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 8 + 6}s`,
                transform: typeof window !== 'undefined' ? `translate(${(mousePosition.x - window.innerWidth / 2) / 100}px, ${(mousePosition.y - window.innerHeight / 2) / 100}px)` : 'translate(0, 0)'
              }}
            />
          ))}
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge className="mb-8 text-base px-6 py-3 animate-bounce rounded-full border-2 border-gray-300 dark:border-gray-600 hover:scale-110 transition-transform duration-300">
            <Sparkles className="h-5 w-5 mr-2 animate-spin" />
            Enterprise-Grade Examination Platform
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-9xl font-black mb-10 bg-gradient-to-r from-black via-gray-700 to-black dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent animate-fade-in-up tracking-tight">
            ProctorAegis
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl mb-16 max-w-5xl mx-auto text-gray-700 dark:text-gray-300 leading-relaxed font-light animate-fade-in-up animation-delay-300">
            Secure, scalable online coding examinations with real-time evaluation, 
            advanced analytics, and enterprise-grade security for thousands of concurrent users.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-20 animate-fade-in-up animation-delay-600">
            <Button 
              size="lg" 
              className="text-xl px-12 py-8 hover:scale-110 transition-all duration-500 group rounded-full shadow-2xl hover:shadow-3xl bg-black dark:bg-white text-white dark:text-black border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
              onClick={handleGetStarted}
            >
              <Play className="mr-3 h-6 w-6 group-hover:animate-pulse" />
              Start Examination
              <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-xl px-12 py-8 hover:scale-110 transition-all duration-500 rounded-full border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={handleViewDemo}
            >
              View Demo
            </Button>
          </div>

          {/* Enhanced Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-fade-in-up animation-delay-900">
            {stats.map((stat, index) => (
              <Card 
                key={index} 
                className="group hover:scale-110 transition-all duration-500 bg-white/80 dark:bg-black/80 backdrop-blur-md border-2 border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl hover:border-gray-300 dark:hover:border-gray-600 rounded-2xl overflow-hidden"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardContent className="p-6 md:p-8 text-center relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-50/20 dark:via-gray-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex justify-center mb-4 text-black dark:text-white group-hover:scale-125 transition-transform duration-300">
                      {stat.icon}
                    </div>
                    <div className="text-2xl md:text-4xl font-black mb-2 text-black dark:text-white group-hover:animate-pulse">{stat.value}</div>
                    <div className="text-sm md:text-base text-gray-600 dark:text-gray-400 font-medium">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="mt-20 animate-bounce">
            <ChevronDown className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 cursor-pointer" onClick={() => scrollToSection('#features')} />
          </div>
        </div>
      </section>

      {/* Enhanced Features Carousel */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-black dark:text-white">
              Cutting-Edge Features
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-light">
              Built with modern technologies for maximum security, scalability, and user experience
            </p>
          </div>

          <Card className={`p-8 md:p-12 transition-all duration-1000 transform ${
            isVisible.features ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-20 opacity-0 scale-95'
          } bg-white/90 dark:bg-black/90 backdrop-blur-md border-2 border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl hover:shadow-3xl`}>
            <CardContent className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start mb-6 text-black dark:text-white">
                  <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 mr-4 animate-pulse">
                    {features[currentFeature].icon}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">{features[currentFeature].title}</h3>
                </div>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed font-light">
                  {features[currentFeature].description}
                </p>
                <div className="flex justify-center lg:justify-start space-x-3">
                  {features.map((_, index) => (
                    <div
                      key={index}
                      className={`h-3 w-12 rounded-full transition-all duration-500 cursor-pointer hover:scale-110 ${
                        index === currentFeature 
                          ? 'bg-black dark:bg-white scale-110' 
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                      }`}
                      onClick={() => setCurrentFeature(index)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex-1 flex justify-center">
                <div className="relative">
                  <div className="w-64 md:w-80 h-64 md:h-80 rounded-full border-4 border-dashed border-gray-300 dark:border-gray-600 animate-spin-slower flex items-center justify-center">
                    <div className="w-48 md:w-64 h-48 md:h-64 rounded-full bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-800 dark:via-gray-900 dark:to-gray-700 flex items-center justify-center shadow-inner border-2 border-gray-200 dark:border-gray-700">
                      <div className="text-6xl md:text-8xl animate-pulse text-black dark:text-white transition-all duration-1000">
                        {features[currentFeature].icon}
                      </div>
                    </div>
                  </div>
                  {/* Decorative orbiting elements */}
                  <div className="absolute inset-0 animate-spin-reverse">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 bg-black dark:bg-white rounded-full"
                        style={{
                          top: `${50 + 45 * Math.cos(i * 60 * Math.PI / 180)}%`,
                          left: `${50 + 45 * Math.sin(i * 60 * Math.PI / 180)}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enhanced User Roles Section */}
      <section id="roles" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-black dark:text-white">
              Built for Everyone
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-light">
              Tailored experiences for teachers, students, and administrators
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {roles.map((role, index) => (
              <Card 
                key={index} 
                className={`group hover:scale-105 transition-all duration-700 transform ${
                  isVisible.roles ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'
                } bg-white dark:bg-black border-2 border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:border-gray-300 dark:hover:border-gray-600 rounded-3xl overflow-hidden`}
                style={{ transitionDelay: `${index * 200}ms` }}
              >
                <CardHeader className="text-center pb-6 p-8 md:p-10">
                  <div className="flex justify-center mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 text-black dark:text-white">
                    <div className="p-4 md:p-6 rounded-2xl bg-gray-100 dark:bg-gray-800">
                      {role.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-3">{role.title}</CardTitle>
                  <CardDescription className="text-base md:text-lg text-gray-600 dark:text-gray-300 font-light leading-relaxed">
                    {role.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-8 md:px-10 pb-8 md:pb-10">
                  <Separator className="mb-6 bg-gray-200 dark:bg-gray-700" />
                  <ul className="space-y-4">
                    {role.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center group-hover:translate-x-2 transition-transform duration-300" style={{ transitionDelay: `${idx * 100}ms` }}>
                        <CheckCircle className="h-5 w-5 mr-4 text-green-500 dark:text-green-400 animate-pulse" />
                        <span className="text-sm md:text-base text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Tech Stack Section */}
      <section id="tech" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 text-black dark:text-white">
            Powered by Modern Tech
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-16 max-w-3xl mx-auto font-light">
            Built with FastAPI, PostgreSQL, React, and Judge0 for maximum performance and reliability
          </p>

          <div className="flex flex-wrap justify-center items-center gap-6 mb-16">
            {['FastAPI', 'PostgreSQL', 'React', 'Judge0', 'Docker', 'Celery'].map((tech, index) => (
              <Badge 
                key={index} 
                variant="outline" 
                className="text-lg md:text-xl px-6 md:px-8 py-3 md:py-4 hover:scale-125 transition-all duration-500 animate-pulse border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full font-semibold cursor-pointer"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <Zap className="mr-2 md:mr-3 h-4 md:h-5 w-4 md:w-5 animate-bounce" />
                {tech}
              </Badge>
            ))}
          </div>

          {/* Enhanced CTA Card */}
          <Card className="bg-gradient-to-r from-black via-gray-800 to-black dark:from-white dark:via-gray-200 dark:to-white text-white dark:text-black border-0 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-transparent via-gray-700/20 dark:via-gray-300/20 to-transparent"></div>
            <CardContent className="p-12 md:p-16 relative z-10">
              <h3 className="text-3xl md:text-4xl font-black mb-8">Ready to Transform Your Examinations?</h3>
              <p className="text-xl md:text-2xl mb-12 opacity-90 font-light max-w-2xl mx-auto leading-relaxed">
                Join thousands of educators who trust ProctorAegis for secure, scalable coding assessments.
              </p>
              <Button 
                size="lg" 
                variant="secondary" 
                className="text-lg md:text-xl px-10 md:px-12 py-6 md:py-8 hover:scale-110 transition-all duration-500 bg-white dark:bg-black text-black dark:text-white rounded-full shadow-xl hover:shadow-2xl font-semibold border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600 group"
                onClick={handleGetStarted}
              >
                <Shield className="mr-3 h-5 md:h-6 w-5 md:w-6 animate-spin-slow" />
                Get Started Today
                <ArrowRight className="ml-3 h-5 md:h-6 w-5 md:w-6 group-hover:translate-x-2 transition-transform duration-300" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="border-t-2 border-gray-200 dark:border-gray-800 py-16 px-4 sm:px-6 lg:px-8 bg-gray-50/30 dark:bg-gray-950/30">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-8 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <Shield className="h-10 md:h-12 w-10 md:w-12 text-black dark:text-white animate-pulse group-hover:rotate-12 transition-transform duration-500" />
            <span className="text-3xl md:text-4xl font-black text-black dark:text-white bg-gradient-to-r from-black to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              ProctorAegis
            </span>
          </div>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-6 font-light">
            Enterprise-grade online coding examination platform
          </p>
          <p className="text-sm md:text-base text-gray-500 dark:text-gray-500 font-medium">
            © 2025 ProctorAegis. Secure. Scalable. Reliable.
          </p>
        </div>
      </footer>

      {/* Enhanced Styles */}
      <style jsx>{`
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(30px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes spin-slower {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) translateX(0px) scale(1) rotate(0deg);
            opacity: 0.3;
          }
          25% { 
            transform: translateY(-25px) translateX(15px) scale(1.2) rotate(90deg);
            opacity: 0.6;
          }
          50% { 
            transform: translateY(-15px) translateX(-15px) scale(0.8) rotate(180deg);
            opacity: 0.8;
          }
          75% { 
            transform: translateY(-35px) translateX(8px) scale(1.1) rotate(270deg);
            opacity: 0.4;
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-600 {
          animation-delay: 600ms;
        }
        
        .animation-delay-900 {
          animation-delay: 900ms;
        }
        
        .animate-spin-slower {
          animation: spin-slower 30s linear infinite;
        }
        
        .animate-spin-reverse {
          animation: spin-reverse 25s linear infinite;
        }
        
        .animate-float {
          animation: float var(--animation-duration, 10s) ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slower 8s linear infinite;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
        
        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Custom backdrop blur */
        .backdrop-blur-xl {
          backdrop-filter: blur(20px);
        }

        /* Mobile responsive text adjustments */
        @media (max-width: 768px) {
          .animate-float {
            animation-duration: 6s;
          }
        }
      `}</style>
    </div>
  );
};

export default ProctorAegisHomepage;
