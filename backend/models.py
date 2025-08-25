"""
FastAPI SQLAlchemy Models for Online Exam System
Generated from Mermaid ER Diagram
"""

from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime, JSON,
    ForeignKey, UniqueConstraint, Index, Enum as SQLEnum
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from datetime import datetime
from typing import Optional

from .database import Base

# Enums
class UserRole(enum.Enum):
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"

class Difficulty(enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class ExamType(enum.Enum):
    PRACTICE = "practice"
    ASSIGNMENT = "assignment"
    MIDTERM = "midterm"
    FINAL = "final"
    QUIZ = "quiz"

class ExamStatus(enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class RegistrationStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"

class SessionStatus(enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    TERMINATED = "terminated"

class SubmissionStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"

class ExecutionStatus(enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TIME_LIMIT_EXCEEDED = "time_limit_exceeded"
    COMPILATION_ERROR = "compilation_error"
    RUNTIME_ERROR = "runtime_error"
    INTERNAL_ERROR = "internal_error"

class EventType(enum.Enum):
    SESSION_START = "session_start"
    SESSION_END = "session_end"
    SUBMISSION_CREATE = "submission_create"
    SUBMISSION_UPDATE = "submission_update"
    TAB_SWITCH = "tab_switch"
    WINDOW_BLUR = "window_blur"
    COPY_PASTE = "copy_paste"
    BROWSER_REFRESH = "browser_refresh"

# Core Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    user_tokens = relationship("UserToken", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    exam_registrations = relationship("ExamRegistration", foreign_keys="ExamRegistration.student_id", back_populates="student", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")
    student_profile = relationship("StudentProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("TeacherProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    created_questions = relationship("Question", foreign_keys="Question.created_by", back_populates="creator", cascade="all, delete-orphan")
    created_exams = relationship("Exam", foreign_keys="Exam.created_by", back_populates="creator", cascade="all, delete-orphan")
    approved_registrations = relationship("ExamRegistration", foreign_keys="ExamRegistration.approved_by", back_populates="approver")
    
    assigned_questions = relationship("StudentExamQuestion", back_populates="student")

    __table_args__ = (
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
        Index("idx_users_is_active", "is_active"),
    )

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    ip_address = Column(INET)
    user_agent = Column(String(500))
    expires_at = Column(DateTime(timezone=False), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="user_sessions")
    
    __table_args__ = (
        Index("idx_user_sessions_user_id", "user_id"),
        Index("idx_user_sessions_expires_at", "expires_at"),
        Index("idx_user_sessions_token", "session_token"),
    )

class UserToken(Base):
    __tablename__ = "user_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_type = Column(String(50), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=False), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="user_tokens")
    
    __table_args__ = (
        Index("idx_user_tokens_user_id", "user_id"),
        Index("idx_user_tokens_type", "token_type"),
        Index("idx_user_tokens_expires_at", "expires_at"),
    )

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    student_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    emergency_contact = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="student_profile")
    
    __table_args__ = (
        Index("idx_student_profiles_user_id", "user_id"),
        Index("idx_student_profiles_student_id", "student_id"),
    )

class StudentExamQuestion(Base):
    __tablename__ = "student_exam_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    points = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    student = relationship("User", back_populates="assigned_questions")
    exam = relationship("Exam", back_populates="assigned_questions")
    question = relationship("Question", back_populates="assigned_students")

    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", "question_id", name="uq_student_exam_question"),
        Index("idx_student_exam_questions_exam_id", "exam_id"),
        Index("idx_student_exam_questions_student_id", "student_id"),
        Index("idx_student_exam_questions_question_id", "question_id"),
    )

class TeacherProfile(Base):
    __tablename__ = "teacher_profiles"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    department = Column(String(100))
    designation = Column(String(100))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    
    __table_args__ = (
        Index("idx_teacher_profiles_user_id", "user_id"),
        Index("idx_teacher_profiles_employee_id", "employee_id"),
    )

# Question Bank Models
class QuestionCategory(Base):
    __tablename__ = "question_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    questions = relationship("Question", back_populates="category", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_question_categories_name", "name"),
        Index("idx_question_categories_is_active", "is_active"),
    )

class Question(Base):
    __tablename__ = "questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(UUID(as_uuid=True), ForeignKey("question_categories.id"), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    problem_statement = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(Difficulty), nullable=False)
    constraints = Column(JSONB, default=dict)
    starter_code = Column(JSONB, default=dict)
    max_score = Column(Integer, nullable=False)
    time_limit_seconds = Column(Integer, default=30)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    category = relationship("QuestionCategory", back_populates="questions")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_questions")
    exam_questions = relationship("ExamQuestion", back_populates="question", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="question", cascade="all, delete-orphan")
    test_cases = relationship("QuestionTestCase", back_populates="question", cascade="all, delete-orphan")
    assigned_students = relationship("StudentExamQuestion", back_populates="question")

    __table_args__ = (
        Index("idx_questions_category_id", "category_id"),
        Index("idx_questions_created_by", "created_by"),
        Index("idx_questions_difficulty", "difficulty"),
        Index("idx_questions_is_active", "is_active"),
    )

class QuestionTestCase(Base):
    __tablename__ = "question_test_cases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    input_data = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=False)
    is_sample = Column(Boolean, default=False, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    weight = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    question = relationship("Question", back_populates="test_cases")
    
    __table_args__ = (
        Index("idx_question_test_cases_question_id", "question_id"),
        Index("idx_question_test_cases_is_sample", "is_sample"),
    )

# Exam Models
class Exam(Base):
    __tablename__ = "exams"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    start_time = Column(DateTime(timezone=False), nullable=False)
    end_time = Column(DateTime(timezone=False), nullable=False)
    duration_minutes = Column(Integer, nullable=False)
    exam_type = Column(SQLEnum(ExamType), nullable=False)
    shuffle_questions = Column(Boolean, default=False, nullable=False)
    max_attempts = Column(Integer, default=1, nullable=False)
    settings = Column(JSONB, default=dict)
    status = Column(SQLEnum(ExamStatus), default=ExamStatus.DRAFT, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_exams")
    exam_questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan")
    exam_registrations = relationship("ExamRegistration", back_populates="exam", cascade="all, delete-orphan")
    exam_sessions = relationship("ExamSession", back_populates="exam", cascade="all, delete-orphan")
    assigned_questions = relationship("StudentExamQuestion", back_populates="exam")

    __table_args__ = (
        Index("idx_exams_created_by", "created_by"),
        Index("idx_exams_start_time", "start_time"),
        Index("idx_exams_end_time", "end_time"),
        Index("idx_exams_status", "status"),
        Index("idx_exams_exam_type", "exam_type"),
    )

class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    question_order = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_questions")
    question = relationship("Question", back_populates="exam_questions")
    
    __table_args__ = (
        UniqueConstraint("exam_id", "question_id", name="uq_exam_questions_exam_question"),
        UniqueConstraint("exam_id", "question_order", name="uq_exam_questions_exam_order"),
        Index("idx_exam_questions_exam_id", "exam_id"),
        Index("idx_exam_questions_question_id", "question_id"),
    )

class ExamRegistration(Base):
    __tablename__ = "exam_registrations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(SQLEnum(RegistrationStatus), default=RegistrationStatus.PENDING, nullable=False)
    registered_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    approved_at = Column(DateTime(timezone=False))
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_registrations")
    student = relationship("User", foreign_keys=[student_id], back_populates="exam_registrations")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="approved_registrations")
    
    __table_args__ = (
        UniqueConstraint("exam_id", "student_id", name="uq_exam_registrations_exam_student"),
        Index("idx_exam_registrations_exam_id", "exam_id"),
        Index("idx_exam_registrations_student_id", "student_id"),
        Index("idx_exam_registrations_status", "status"),
    )

class ExamSession(Base):
    __tablename__ = "exam_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    session_token = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, nullable=False)
    started_at = Column(DateTime(timezone=False))
    ended_at = Column(DateTime(timezone=False))
    last_activity_at = Column(DateTime(timezone=False))
    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)
    browser_info = Column(JSONB, default=dict)
    ip_address = Column(INET)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam = relationship("Exam", back_populates="exam_sessions")
    student = relationship("User", foreign_keys=[student_id])
    submissions = relationship("Submission", back_populates="exam_session", cascade="all, delete-orphan")
    exam_events = relationship("ExamEvent", back_populates="exam_session", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_exam_sessions_exam_id", "exam_id"),
        Index("idx_exam_sessions_student_id", "student_id"),
        Index("idx_exam_sessions_status", "status"),
        Index("idx_exam_sessions_token", "session_token"),
    )

# Submission Models
class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_id = Column(UUID(as_uuid=True), ForeignKey("exams.id"), nullable=False)   # NEW
    exam_session_id = Column(UUID(as_uuid=True), ForeignKey("exam_sessions.id"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    source_code = Column(Text, nullable=False)
    language = Column(String(50), nullable=False)
    status = Column(SQLEnum(SubmissionStatus), default=SubmissionStatus.PENDING, nullable=False)
    submitted_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    attempt_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)

    # Relationships
    exam = relationship("Exam", back_populates="submissions")   # NEW
    exam_session = relationship("ExamSession", back_populates="submissions")
    question = relationship("Question", back_populates="submissions")
    student = relationship("User", foreign_keys=[student_id], back_populates="submissions")
    submission_results = relationship("SubmissionResult", back_populates="submission", cascade="all, delete-orphan")
    submission_events = relationship("SubmissionEvent", back_populates="submission", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_submissions_exam_id", "exam_id"),   # NEW index
        Index("idx_submissions_exam_session_id", "exam_session_id"),
        Index("idx_submissions_question_id", "question_id"),
        Index("idx_submissions_student_id", "student_id"),
        Index("idx_submissions_status", "status"),
        Index("idx_submissions_submitted_at", "submitted_at"),
    )


class SubmissionResult(Base):
    __tablename__ = "submission_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    judge0_token = Column(String(255))
    status = Column(SQLEnum(ExecutionStatus), nullable=False)
    stdout = Column(Text)
    stderr = Column(Text)
    compile_output = Column(Text)
    exit_code = Column(Integer)
    execution_time = Column(Float)
    memory_used = Column(Integer)
    score = Column(Integer, default=0, nullable=False)
    max_score = Column(Integer, nullable=False)
    test_results = Column(JSONB, default=dict)
    evaluated_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=False), default=func.now(), onupdate=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    submission = relationship("Submission", back_populates="submission_results")
    
    __table_args__ = (
        Index("idx_submission_results_submission_id", "submission_id"),
        Index("idx_submission_results_status", "status"),
        Index("idx_submission_results_evaluated_at", "evaluated_at"),
    )

class SubmissionEvent(Base):
    __tablename__ = "submission_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)
    event_data = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    submission = relationship("Submission", back_populates="submission_events")
    
    __table_args__ = (
        Index("idx_submission_events_submission_id", "submission_id"),
        Index("idx_submission_events_event_type", "event_type"),
        Index("idx_submission_events_created_at", "created_at"),
    )

class ExamEvent(Base):
    __tablename__ = "exam_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exam_session_id = Column(UUID(as_uuid=True), ForeignKey("exam_sessions.id"), nullable=False)
    event_type = Column(SQLEnum(EventType), nullable=False)
    event_data = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    exam_session = relationship("ExamSession", back_populates="exam_events")
    
    __table_args__ = (
        Index("idx_exam_events_exam_session_id", "exam_session_id"),
        Index("idx_exam_events_event_type", "event_type"),
        Index("idx_exam_events_created_at", "created_at"),
    )

# Audit Model
class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(UUID(as_uuid=True))
    old_values = Column(JSONB, default=dict)
    new_values = Column(JSONB, default=dict)
    ip_address = Column(INET)
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=False), default=func.now(), nullable=False)
    extra_data = Column(JSONB, default=dict)
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    __table_args__ = (
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_action", "action"),
        Index("idx_audit_logs_resource_type", "resource_type"),
        Index("idx_audit_logs_created_at", "created_at"),
    )