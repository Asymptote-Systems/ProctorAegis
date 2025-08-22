"""
Pydantic schemas for Online Exam System
Generated from SQLAlchemy models
"""

from pydantic import BaseModel, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import UUID
from .models import (
    UserRole, Difficulty, ExamType, ExamStatus, RegistrationStatus, 
    SessionStatus, SubmissionStatus, ExecutionStatus, EventType
)

# Base schemas with common fields

class UserBase(BaseModel):
    email: str
    role: UserRole
    is_active: Optional[bool] = True
    extra_data: Optional[Dict[str, Any]] = {}

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[str] = None
    password_hash: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class User(UserBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# UserSession schemas
class UserSessionBase(BaseModel):
    session_token: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: datetime
    extra_data: Optional[Dict[str, Any]] = {}

class UserSessionCreate(UserSessionBase):
    user_id: UUID

class UserSessionUpdate(BaseModel):
    session_token: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    expires_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = None

class UserSession(UserSessionBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# UserToken schemas
class UserTokenBase(BaseModel):
    token_type: str
    token_hash: str
    expires_at: datetime
    is_revoked: Optional[bool] = False
    extra_data: Optional[Dict[str, Any]] = {}

class UserTokenCreate(UserTokenBase):
    user_id: UUID

class UserTokenUpdate(BaseModel):
    token_type: Optional[str] = None
    token_hash: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_revoked: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class UserToken(UserTokenBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# StudentProfile schemas
class StudentProfileBase(BaseModel):
    student_id: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class StudentProfileCreate(StudentProfileBase):
    user_id: UUID

class StudentProfileUpdate(BaseModel):
    student_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class StudentProfile(StudentProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# StudentExamQuestion schemas
class StudentExamQuestionBase(BaseModel):
    question_order: int
    points: Optional[int] = 0
    extra_data: Optional[Dict[str, Any]] = {}

class StudentExamQuestionCreate(StudentExamQuestionBase):
    exam_id: UUID
    student_id: UUID
    question_id: UUID

class StudentExamQuestionUpdate(BaseModel):
    question_order: Optional[int] = None
    points: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class StudentExamQuestion(StudentExamQuestionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# TeacherProfile schemas
class TeacherProfileBase(BaseModel):
    employee_id: str
    first_name: str
    last_name: str
    department: Optional[str] = None
    designation: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}

class TeacherProfileCreate(TeacherProfileBase):
    user_id: UUID

class TeacherProfileUpdate(BaseModel):
    employee_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class TeacherProfile(TeacherProfileBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# QuestionCategory schemas
class QuestionCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: Optional[bool] = True
    extra_data: Optional[Dict[str, Any]] = {}

class QuestionCategoryCreate(QuestionCategoryBase):
    pass

class QuestionCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class QuestionCategory(QuestionCategoryBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Question schemas
class QuestionBase(BaseModel):
    title: str
    description: Optional[str] = None
    problem_statement: str
    difficulty: Difficulty
    constraints: Optional[Dict[str, Any]] = {}
    starter_code: Optional[Dict[str, Any]] = {}
    max_score: int
    time_limit_seconds: Optional[int] = 30
    is_active: Optional[bool] = True
    extra_data: Optional[Dict[str, Any]] = {}

class QuestionCreate(QuestionBase):
    category_id: UUID

class QuestionUpdate(BaseModel):
    category_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    problem_statement: Optional[str] = None
    difficulty: Optional[Difficulty] = None
    constraints: Optional[Dict[str, Any]] = None
    starter_code: Optional[Dict[str, Any]] = None
    max_score: Optional[int] = None
    time_limit_seconds: Optional[int] = None
    is_active: Optional[bool] = None
    extra_data: Optional[Dict[str, Any]] = None

class Question(QuestionBase):
    id: UUID
    category_id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# QuestionTestCase schemas
class QuestionTestCaseBase(BaseModel):
    input_data: str
    expected_output: str
    is_sample: Optional[bool] = False
    is_hidden: Optional[bool] = False
    weight: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class QuestionTestCaseCreate(QuestionTestCaseBase):
    question_id: UUID

class QuestionTestCaseUpdate(BaseModel):
    input_data: Optional[str] = None
    expected_output: Optional[str] = None
    is_sample: Optional[bool] = None
    is_hidden: Optional[bool] = None
    weight: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class QuestionTestCase(QuestionTestCaseBase):
    id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Exam schemas
class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    exam_type: ExamType
    shuffle_questions: Optional[bool] = False
    max_attempts: Optional[int] = 1
    settings: Optional[Dict[str, Any]] = {}
    status: Optional[ExamStatus] = ExamStatus.DRAFT
    extra_data: Optional[Dict[str, Any]] = {}

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    exam_type: Optional[ExamType] = None
    shuffle_questions: Optional[bool] = None
    max_attempts: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None
    status: Optional[ExamStatus] = None
    extra_data: Optional[Dict[str, Any]] = None

class Exam(ExamBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ExamQuestion schemas
class ExamQuestionBase(BaseModel):
    question_order: int
    points: int
    extra_data: Optional[Dict[str, Any]] = {}

class ExamQuestionCreate(ExamQuestionBase):
    exam_id: UUID
    question_id: UUID

class ExamQuestionUpdate(BaseModel):
    question_order: Optional[int] = None
    points: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamQuestion(ExamQuestionBase):
    id: UUID
    exam_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ExamRegistration schemas
class ExamRegistrationBase(BaseModel):
    status: Optional[RegistrationStatus] = RegistrationStatus.PENDING
    approved_at: Optional[datetime] = None
    extra_data: Optional[Dict[str, Any]] = {}

class ExamRegistrationCreate(ExamRegistrationBase):
    exam_id: UUID
    student_id: UUID
    approved_by: Optional[UUID] = None

class ExamRegistrationUpdate(BaseModel):
    status: Optional[RegistrationStatus] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[UUID] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamRegistration(ExamRegistrationBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    approved_by: Optional[UUID] = None
    registered_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# ExamSession schemas
class ExamSessionBase(BaseModel):
    session_token: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    status: Optional[SessionStatus] = SessionStatus.ACTIVE
    browser_info: Optional[Dict[str, Any]] = {}
    ip_address: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}

class ExamSessionCreate(ExamSessionBase):
    exam_id: UUID

class ExamSessionUpdate(BaseModel):
    session_token: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    status: Optional[SessionStatus] = None
    browser_info: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamSession(ExamSessionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Submission schemas
class SubmissionBase(BaseModel):
    source_code: str
    language: str
    status: Optional[SubmissionStatus] = SubmissionStatus.PENDING
    attempt_number: Optional[int] = 1
    extra_data: Optional[Dict[str, Any]] = {}

class SubmissionCreate(SubmissionBase):
    exam_id: UUID
    exam_session_id: UUID
    question_id: UUID

class SubmissionUpdate(BaseModel):
    source_code: Optional[str] = None
    language: Optional[str] = None
    status: Optional[SubmissionStatus] = None
    attempt_number: Optional[int] = None
    extra_data: Optional[Dict[str, Any]] = None

class Submission(SubmissionBase):
    id: UUID
    exam_id: UUID
    exam_session_id: UUID
    question_id: UUID
    student_id: UUID
    submitted_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# SubmissionResult schemas
class SubmissionResultBase(BaseModel):
    judge0_token: Optional[str] = None
    status: ExecutionStatus
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    exit_code: Optional[int] = None
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    score: Optional[int] = 0
    max_score: int
    test_results: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class SubmissionResultCreate(SubmissionResultBase):
    submission_id: UUID

class SubmissionResultUpdate(BaseModel):
    judge0_token: Optional[str] = None
    status: Optional[ExecutionStatus] = None
    stdout: Optional[str] = None
    stderr: Optional[str] = None
    compile_output: Optional[str] = None
    exit_code: Optional[int] = None
    execution_time: Optional[float] = None
    memory_used: Optional[int] = None
    score: Optional[int] = None
    max_score: Optional[int] = None
    test_results: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class SubmissionResult(SubmissionResultBase):
    id: UUID
    submission_id: UUID
    evaluated_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# SubmissionEvent schemas
class SubmissionEventBase(BaseModel):
    event_type: EventType
    event_data: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class SubmissionEventCreate(SubmissionEventBase):
    submission_id: UUID

class SubmissionEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    event_data: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class SubmissionEvent(SubmissionEventBase):
    id: UUID
    submission_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# ExamEvent schemas
class ExamEventBase(BaseModel):
    event_type: EventType
    event_data: Optional[Dict[str, Any]] = {}
    extra_data: Optional[Dict[str, Any]] = {}

class ExamEventCreate(ExamEventBase):
    exam_session_id: UUID

class ExamEventUpdate(BaseModel):
    event_type: Optional[EventType] = None
    event_data: Optional[Dict[str, Any]] = None
    extra_data: Optional[Dict[str, Any]] = None

class ExamEvent(ExamEventBase):
    id: UUID
    exam_session_id: UUID
    created_at: datetime

    class Config:
        orm_mode = True

# AuditLog schemas
class AuditLogBase(BaseModel):
    action: str
    resource_type: str
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = {}
    new_values: Optional[Dict[str, Any]] = {}
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = {}

class AuditLogCreate(AuditLogBase):
    user_id: Optional[UUID] = None

class AuditLogUpdate(BaseModel):
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[UUID] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    extra_data: Optional[Dict[str, Any]] = None

class AuditLog(AuditLogBase):
    id: UUID
    user_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        orm_mode = True

# Schema for bulk assignment
class StudentExamQuestionAssignment(BaseModel):
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    question_order: int
    points: Optional[int] = 0

class BulkStudentExamQuestionCreate(BaseModel):
    assignments: List[StudentExamQuestionAssignment]

# Schema for student exam questions with question details
class StudentExamQuestionWithQuestion(StudentExamQuestionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime
    question: Question  # Include the full question details

    class Config:
        orm_mode = True

# Schema for student exam questions with student profile
class StudentExamQuestionWithStudent(StudentExamQuestionBase):
    id: UUID
    exam_id: UUID
    student_id: UUID
    question_id: UUID
    created_at: datetime
    updated_at: datetime
    student: StudentProfile  # Include student profile details

    class Config:
        orm_mode = True