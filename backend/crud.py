"""
CRUD operations for Online Exam System
Generated from SQLAlchemy models
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from . import models
from . import schemas
from backend.auth.passwords import hash_password

# User CRUD operations
def get_user(db: Session, id: UUID) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == id).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, obj_in: schemas.UserCreate) -> models.User:
    db_user = models.User(
        email=obj_in.email,
        role=obj_in.role,
        is_active=obj_in.is_active,
        extra_data=obj_in.extra_data,
        password_hash=hash_password(obj_in.password)  # hash here
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, db_obj: models.User, obj_in: schemas.UserUpdate) -> models.User:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_user(db: Session, id: UUID) -> Optional[models.User]:
    db_obj = db.query(models.User).filter(models.User.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# UserSession CRUD operations
def get_user_session(db: Session, id: UUID) -> Optional[models.UserSession]:
    return db.query(models.UserSession).filter(models.UserSession.id == id).first()

def get_user_sessions(db: Session, skip: int = 0, limit: int = 100) -> List[models.UserSession]:
    return db.query(models.UserSession).offset(skip).limit(limit).all()

def create_user_session(db: Session, obj_in: schemas.UserSessionCreate) -> models.UserSession:
    db_obj = models.UserSession(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_user_session(db: Session, db_obj: models.UserSession, obj_in: schemas.UserSessionUpdate) -> models.UserSession:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_user_session(db: Session, id: UUID) -> Optional[models.UserSession]:
    db_obj = db.query(models.UserSession).filter(models.UserSession.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# UserToken CRUD operations
def get_user_token(db: Session, id: UUID) -> Optional[models.UserToken]:
    return db.query(models.UserToken).filter(models.UserToken.id == id).first()

def get_user_tokens(db: Session, skip: int = 0, limit: int = 100) -> List[models.UserToken]:
    return db.query(models.UserToken).offset(skip).limit(limit).all()

def create_user_token(db: Session, obj_in: schemas.UserTokenCreate) -> models.UserToken:
    db_obj = models.UserToken(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_user_token(db: Session, db_obj: models.UserToken, obj_in: schemas.UserTokenUpdate) -> models.UserToken:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_user_token(db: Session, id: UUID) -> Optional[models.UserToken]:
    db_obj = db.query(models.UserToken).filter(models.UserToken.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# StudentProfile CRUD operations
def get_student_profile(db: Session, id: UUID) -> Optional[models.StudentProfile]:
    return db.query(models.StudentProfile).filter(models.StudentProfile.id == id).first()

def get_student_profiles(db: Session, skip: int = 0, limit: int = 100) -> List[models.StudentProfile]:
    return db.query(models.StudentProfile).offset(skip).limit(limit).all()

def create_student_profile(db: Session, obj_in: schemas.StudentProfileCreate) -> models.StudentProfile:
    db_obj = models.StudentProfile(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_student_profile(db: Session, db_obj: models.StudentProfile, obj_in: schemas.StudentProfileUpdate) -> models.StudentProfile:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_student_profile(db: Session, id: UUID) -> Optional[models.StudentProfile]:
    db_obj = db.query(models.StudentProfile).filter(models.StudentProfile.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# StudentExamQuestion CRUD operations
def get_student_exam_question(db: Session, id: UUID) -> Optional[models.StudentExamQuestion]:
    return db.query(models.StudentExamQuestion).filter(models.StudentExamQuestion.id == id).first()

def get_student_exam_questions(db: Session, skip: int = 0, limit: int = 100) -> List[models.StudentExamQuestion]:
    return db.query(models.StudentExamQuestion).offset(skip).limit(limit).all()

def create_student_exam_question(db: Session, obj_in: schemas.StudentExamQuestionCreate) -> models.StudentExamQuestion:
    db_obj = models.StudentExamQuestion(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_student_exam_question(db: Session, db_obj: models.StudentExamQuestion, obj_in: schemas.StudentExamQuestionUpdate) -> models.StudentExamQuestion:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_student_exam_question(db: Session, id: UUID) -> Optional[models.StudentExamQuestion]:
    db_obj = db.query(models.StudentExamQuestion).filter(models.StudentExamQuestion.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# TeacherProfile CRUD operations
def get_teacher_profile(db: Session, id: UUID) -> Optional[models.TeacherProfile]:
    return db.query(models.TeacherProfile).filter(models.TeacherProfile.id == id).first()

def get_teacher_profiles(db: Session, skip: int = 0, limit: int = 100) -> List[models.TeacherProfile]:
    return db.query(models.TeacherProfile).offset(skip).limit(limit).all()

def create_teacher_profile(db: Session, obj_in: schemas.TeacherProfileCreate) -> models.TeacherProfile:
    db_obj = models.TeacherProfile(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_teacher_profile(db: Session, db_obj: models.TeacherProfile, obj_in: schemas.TeacherProfileUpdate) -> models.TeacherProfile:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_teacher_profile(db: Session, id: UUID) -> Optional[models.TeacherProfile]:
    db_obj = db.query(models.TeacherProfile).filter(models.TeacherProfile.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# QuestionCategory CRUD operations
def get_question_category(db: Session, id: UUID) -> Optional[models.QuestionCategory]:
    return db.query(models.QuestionCategory).filter(models.QuestionCategory.id == id).first()

def get_question_categories(db: Session, skip: int = 0, limit: int = 100) -> List[models.QuestionCategory]:
    return db.query(models.QuestionCategory).offset(skip).limit(limit).all()

def create_question_category(db: Session, obj_in: schemas.QuestionCategoryCreate) -> models.QuestionCategory:
    db_obj = models.QuestionCategory(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_question_category(db: Session, db_obj: models.QuestionCategory, obj_in: schemas.QuestionCategoryUpdate) -> models.QuestionCategory:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question_category(db: Session, id: UUID) -> Optional[models.QuestionCategory]:
    db_obj = db.query(models.QuestionCategory).filter(models.QuestionCategory.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Question CRUD operations
def get_question(db: Session, id: UUID) -> Optional[models.Question]:
    return db.query(models.Question).filter(models.Question.id == id).first()

def get_questions(db: Session, skip: int = 0, limit: int = 100) -> List[models.Question]:
    return db.query(models.Question).offset(skip).limit(limit).all()

def create_question(db: Session, obj_in: schemas.QuestionCreate) -> models.Question:
    db_obj = models.Question(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_question(db: Session, db_obj: models.Question, obj_in: schemas.QuestionUpdate) -> models.Question:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question(db: Session, id: UUID) -> Optional[models.Question]:
    db_obj = db.query(models.Question).filter(models.Question.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# QuestionTestCase CRUD operations
def get_question_test_case(db: Session, id: UUID) -> Optional[models.QuestionTestCase]:
    return db.query(models.QuestionTestCase).filter(models.QuestionTestCase.id == id).first()

def get_question_test_cases(db: Session, skip: int = 0, limit: int = 100) -> List[models.QuestionTestCase]:
    return db.query(models.QuestionTestCase).offset(skip).limit(limit).all()

def create_question_test_case(db: Session, obj_in: schemas.QuestionTestCaseCreate) -> models.QuestionTestCase:
    db_obj = models.QuestionTestCase(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_question_test_case(db: Session, db_obj: models.QuestionTestCase, obj_in: schemas.QuestionTestCaseUpdate) -> models.QuestionTestCase:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_question_test_case(db: Session, id: UUID) -> Optional[models.QuestionTestCase]:
    db_obj = db.query(models.QuestionTestCase).filter(models.QuestionTestCase.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Exam CRUD operations
def get_exam(db: Session, id: UUID) -> Optional[models.Exam]:
    return db.query(models.Exam).filter(models.Exam.id == id).first()

def get_exams(db: Session, skip: int = 0, limit: int = 100) -> List[models.Exam]:
    return db.query(models.Exam).offset(skip).limit(limit).all()

def create_exam(db: Session, obj_in: schemas.ExamCreate) -> models.Exam:
    db_obj = models.Exam(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam(db: Session, db_obj: models.Exam, obj_in: schemas.ExamUpdate) -> models.Exam:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam(db: Session, id: UUID) -> Optional[models.Exam]:
    db_obj = db.query(models.Exam).filter(models.Exam.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamQuestion CRUD operations
def get_exam_question(db: Session, id: UUID) -> Optional[models.ExamQuestion]:
    return db.query(models.ExamQuestion).filter(models.ExamQuestion.id == id).first()

def get_exam_questions(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamQuestion]:
    return db.query(models.ExamQuestion).offset(skip).limit(limit).all()

def create_exam_question(db: Session, obj_in: schemas.ExamQuestionCreate) -> models.ExamQuestion:
    db_obj = models.ExamQuestion(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_question(db: Session, db_obj: models.ExamQuestion, obj_in: schemas.ExamQuestionUpdate) -> models.ExamQuestion:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_question(db: Session, id: UUID) -> Optional[models.ExamQuestion]:
    db_obj = db.query(models.ExamQuestion).filter(models.ExamQuestion.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamRegistration CRUD operations
def get_exam_registration(db: Session, id: UUID) -> Optional[models.ExamRegistration]:
    return db.query(models.ExamRegistration).filter(models.ExamRegistration.id == id).first()

def get_exam_registrations(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamRegistration]:
    return db.query(models.ExamRegistration).offset(skip).limit(limit).all()

def create_exam_registration(db: Session, obj_in: schemas.ExamRegistrationCreate) -> models.ExamRegistration:
    db_obj = models.ExamRegistration(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_registration(db: Session, db_obj: models.ExamRegistration, obj_in: schemas.ExamRegistrationUpdate) -> models.ExamRegistration:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_registration(db: Session, id: UUID) -> Optional[models.ExamRegistration]:
    db_obj = db.query(models.ExamRegistration).filter(models.ExamRegistration.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamSession CRUD operations
def get_exam_session(db: Session, id: UUID) -> Optional[models.ExamSession]:
    return db.query(models.ExamSession).filter(models.ExamSession.id == id).first()

def get_exam_sessions(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamSession]:
    return db.query(models.ExamSession).offset(skip).limit(limit).all()

def create_exam_session(db: Session, obj_in: schemas.ExamSessionCreate) -> models.ExamSession:
    db_obj = models.ExamSession(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_session(db: Session, db_obj: models.ExamSession, obj_in: schemas.ExamSessionUpdate) -> models.ExamSession:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_session(db: Session, id: UUID) -> Optional[models.ExamSession]:
    db_obj = db.query(models.ExamSession).filter(models.ExamSession.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# Submission CRUD operations
def get_submission(db: Session, id: UUID) -> Optional[models.Submission]:
    return db.query(models.Submission).filter(models.Submission.id == id).first()

def get_submissions(db: Session, skip: int = 0, limit: int = 100) -> List[models.Submission]:
    return db.query(models.Submission).offset(skip).limit(limit).all()

def create_submission(db: Session, obj_in: schemas.SubmissionCreate) -> models.Submission:
    db_obj = models.Submission(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_submission(db: Session, db_obj: models.Submission, obj_in: schemas.SubmissionUpdate) -> models.Submission:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_submission(db: Session, id: UUID) -> Optional[models.Submission]:
    db_obj = db.query(models.Submission).filter(models.Submission.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# SubmissionResult CRUD operations
def get_submission_result(db: Session, id: UUID) -> Optional[models.SubmissionResult]:
    return db.query(models.SubmissionResult).filter(models.SubmissionResult.id == id).first()

def get_submission_results(db: Session, skip: int = 0, limit: int = 100) -> List[models.SubmissionResult]:
    return db.query(models.SubmissionResult).offset(skip).limit(limit).all()

def create_submission_result(db: Session, obj_in: schemas.SubmissionResultCreate) -> models.SubmissionResult:
    db_obj = models.SubmissionResult(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_submission_result(db: Session, db_obj: models.SubmissionResult, obj_in: schemas.SubmissionResultUpdate) -> models.SubmissionResult:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_submission_result(db: Session, id: UUID) -> Optional[models.SubmissionResult]:
    db_obj = db.query(models.SubmissionResult).filter(models.SubmissionResult.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# SubmissionEvent CRUD operations
def get_submission_event(db: Session, id: UUID) -> Optional[models.SubmissionEvent]:
    return db.query(models.SubmissionEvent).filter(models.SubmissionEvent.id == id).first()

def get_submission_events(db: Session, skip: int = 0, limit: int = 100) -> List[models.SubmissionEvent]:
    return db.query(models.SubmissionEvent).offset(skip).limit(limit).all()

def create_submission_event(db: Session, obj_in: schemas.SubmissionEventCreate) -> models.SubmissionEvent:
    db_obj = models.SubmissionEvent(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_submission_event(db: Session, db_obj: models.SubmissionEvent, obj_in: schemas.SubmissionEventUpdate) -> models.SubmissionEvent:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_submission_event(db: Session, id: UUID) -> Optional[models.SubmissionEvent]:
    db_obj = db.query(models.SubmissionEvent).filter(models.SubmissionEvent.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# ExamEvent CRUD operations
def get_exam_event(db: Session, id: UUID) -> Optional[models.ExamEvent]:
    return db.query(models.ExamEvent).filter(models.ExamEvent.id == id).first()

def get_exam_events(db: Session, skip: int = 0, limit: int = 100) -> List[models.ExamEvent]:
    return db.query(models.ExamEvent).offset(skip).limit(limit).all()

def create_exam_event(db: Session, obj_in: schemas.ExamEventCreate) -> models.ExamEvent:
    db_obj = models.ExamEvent(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_exam_event(db: Session, db_obj: models.ExamEvent, obj_in: schemas.ExamEventUpdate) -> models.ExamEvent:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_exam_event(db: Session, id: UUID) -> Optional[models.ExamEvent]:
    db_obj = db.query(models.ExamEvent).filter(models.ExamEvent.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

# AuditLog CRUD operations
def get_audit_log(db: Session, id: UUID) -> Optional[models.AuditLog]:
    return db.query(models.AuditLog).filter(models.AuditLog.id == id).first()

def get_audit_logs(db: Session, skip: int = 0, limit: int = 100) -> List[models.AuditLog]:
    return db.query(models.AuditLog).offset(skip).limit(limit).all()

def create_audit_log(db: Session, obj_in: schemas.AuditLogCreate) -> models.AuditLog:
    db_obj = models.AuditLog(**obj_in.dict())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_audit_log(db: Session, db_obj: models.AuditLog, obj_in: schemas.AuditLogUpdate) -> models.AuditLog:
    update_data = obj_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_audit_log(db: Session, id: UUID) -> Optional[models.AuditLog]:
    db_obj = db.query(models.AuditLog).filter(models.AuditLog.id == id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
    return db_obj

def get_student_exam_questions_by_exam_and_student(db: Session, exam_id: UUID, student_id: UUID) -> List[models.StudentExamQuestion]:
    """Get all assigned questions for a specific student in a specific exam"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id,
        models.StudentExamQuestion.student_id == student_id
    ).order_by(models.StudentExamQuestion.question_order).all()

def get_students_for_exam(db: Session, exam_id: UUID) -> List[models.StudentExamQuestion]:
    """Get all students assigned to a specific exam with their questions"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id
    ).order_by(models.StudentExamQuestion.student_id, models.StudentExamQuestion.question_order).all()

def get_exam_questions_for_student(db: Session, student_id: UUID, exam_id: UUID) -> List[models.StudentExamQuestion]:
    """Get questions assigned to a student for a specific exam with full question details"""
    return db.query(models.StudentExamQuestion).join(
        models.Question
    ).filter(
        models.StudentExamQuestion.student_id == student_id,
        models.StudentExamQuestion.exam_id == exam_id
    ).order_by(models.StudentExamQuestion.question_order).all()

def get_student_exam_questions_by_exam(db: Session, exam_id: UUID) -> List[models.StudentExamQuestion]:
    """Get all question assignments for a specific exam"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id
    ).order_by(
        models.StudentExamQuestion.student_id, 
        models.StudentExamQuestion.question_order
    ).all()

def assign_question_to_student(db: Session, exam_id: UUID, student_id: UUID, question_id: UUID, question_order: int, points: int = 0) -> models.StudentExamQuestion:
    """Assign a question to a student for an exam"""
    db_obj = models.StudentExamQuestion(
        exam_id=exam_id,
        student_id=student_id,
        question_id=question_id,
        question_order=question_order,
        points=points
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def bulk_assign_questions_to_students(db: Session, assignments: List[dict]) -> List[models.StudentExamQuestion]:
    """Bulk assign questions to students
    assignments format: [{'exam_id': UUID, 'student_id': UUID, 'question_id': UUID, 'question_order': int, 'points': int}, ...]
    """
    db_objects = []
    for assignment in assignments:
        db_obj = models.StudentExamQuestion(**assignment)
        db.add(db_obj)
        db_objects.append(db_obj)
    
    db.commit()
    for obj in db_objects:
        db.refresh(obj)
    
    return db_objects

# --- append these helper functions to backend/crud.py ---

from sqlalchemy.orm import Session
from uuid import UUID

from backend import models
from backend import schemas as app_schemas  # your existing schemas module


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_id(db: Session, id):
    # id may be UUID or string
    return db.query(models.User).filter(models.User.id == id).first()


def update_user_password(db: Session, user: models.User, new_password_hash: str):
    user.password_hash = new_password_hash
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# Refresh token bookkeeping using user.extra_data JSONB
def set_user_refresh_jti(db: Session, user: models.User, jti: str):
    d = user.extra_data or {}
    d["refresh_jti"] = jti
    user.extra_data = d
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_refresh_jti(user: models.User):
    d = user.extra_data or {}
    return d.get("refresh_jti")


def set_user_csrf_token(db: Session, user: models.User, csrf: str):
    d = user.extra_data or {}
    d["csrf_token"] = csrf
    user.extra_data = d
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_csrf_token(user: models.User):
    d = user.extra_data or {}
    return d.get("csrf_token")


def clear_user_refresh_jti(db: Session, user: models.User):
    d = user.extra_data or {}
    d.pop("refresh_jti", None)
    d.pop("csrf_token", None)
    user.extra_data = d
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
