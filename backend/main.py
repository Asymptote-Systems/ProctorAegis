"""
FastAPI main application for Online Exam System
Generated routes for all models
"""

from typing import List
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

#from backend.config import settings
from backend.database import Base, engine, get_db, SessionLocal
from backend import crud, schemas
from backend.wait_for_db import wait_for_db
from backend.auth.router import router as auth_router

from backend.auth.dependencies import require_role, get_current_user
from backend import models as dbmodels

from backend import models, schemas, crud

from backend.auth.passwords import hash_password

# --- App init ---
app = FastAPI(title="Online Exam System API", version="1.0.0")

# --- Security headers middleware (basic hardening) ---
@app.middleware("http")
async def set_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    
    # Don't add security headers to OPTIONS requests (CORS preflight)
    if request.method != "OPTIONS":
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-XSS-Protection", "0")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=()")
    
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# --- Startup: wait for DB & create tables ---
@app.on_event("startup")
def on_startup():
    wait_for_db(engine, timeout=60)
    # Import models so Base is populated
    import backend.models 
    Base.metadata.create_all(bind=engine)

# --- Health check ---
@app.get("/health", tags=["health"])
def health() -> dict:
    return {"status": "ok"}


# User routes
@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

@app.post("/users/", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return crud.create_user(db=db, obj_in=user)

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: UUID, user: schemas.UserUpdate, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.update_user(db=db, db_obj=db_user, obj_in=user)

@app.delete("/users/{user_id}", response_model=schemas.User)
def delete_user(user_id: UUID, db: Session = Depends(get_db)):
    db_user = crud.delete_user(db, id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# UserSession routes
@app.get("/user-sessions/", response_model=List[schemas.UserSession])
def read_user_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    user_sessions = crud.get_user_sessions(db, skip=skip, limit=limit)
    return user_sessions

@app.get("/user-sessions/{session_id}", response_model=schemas.UserSession)
def read_user_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.get_user_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="User session not found")
    return db_session

@app.post("/user-sessions/", response_model=schemas.UserSession)
def create_user_session(session: schemas.UserSessionCreate, db: Session = Depends(get_db)):
    return crud.create_user_session(db=db, obj_in=session)

@app.put("/user-sessions/{session_id}", response_model=schemas.UserSession)
def update_user_session(session_id: UUID, session: schemas.UserSessionUpdate, db: Session = Depends(get_db)):
    db_session = crud.get_user_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="User session not found")
    return crud.update_user_session(db=db, db_obj=db_session, obj_in=session)

@app.delete("/user-sessions/{session_id}", response_model=schemas.UserSession)
def delete_user_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.delete_user_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="User session not found")
    return db_session

# UserToken routes
@app.get("/user-tokens/", response_model=List[schemas.UserToken])
def read_user_tokens(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    user_tokens = crud.get_user_tokens(db, skip=skip, limit=limit)
    return user_tokens

@app.get("/user-tokens/{token_id}", response_model=schemas.UserToken)
def read_user_token(token_id: UUID, db: Session = Depends(get_db)):
    db_token = crud.get_user_token(db, id=token_id)
    if db_token is None:
        raise HTTPException(status_code=404, detail="User token not found")
    return db_token

@app.post("/user-tokens/", response_model=schemas.UserToken)
def create_user_token(token: schemas.UserTokenCreate, db: Session = Depends(get_db)):
    return crud.create_user_token(db=db, obj_in=token)

@app.put("/user-tokens/{token_id}", response_model=schemas.UserToken)
def update_user_token(token_id: UUID, token: schemas.UserTokenUpdate, db: Session = Depends(get_db)):
    db_token = crud.get_user_token(db, id=token_id)
    if db_token is None:
        raise HTTPException(status_code=404, detail="User token not found")
    return crud.update_user_token(db=db, db_obj=db_token, obj_in=token)

@app.delete("/user-tokens/{token_id}", response_model=schemas.UserToken)
def delete_user_token(token_id: UUID, db: Session = Depends(get_db)):
    db_token = crud.delete_user_token(db, id=token_id)
    if db_token is None:
        raise HTTPException(status_code=404, detail="User token not found")
    return db_token

# StudentProfile routes
@app.get("/student-profiles/", response_model=List[schemas.StudentProfile])
def read_student_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    student_profiles = crud.get_student_profiles(db, skip=skip, limit=limit)
    return student_profiles

@app.get("/student-profiles/{profile_id}", response_model=schemas.StudentProfile)
def read_student_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.get_student_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return db_profile

@app.post("/student-profiles/", response_model=schemas.StudentProfile)
def create_student_profile(profile: schemas.StudentProfileCreate, db: Session = Depends(get_db)):
    return crud.create_student_profile(db=db, obj_in=profile)

@app.put("/student-profiles/{profile_id}", response_model=schemas.StudentProfile)
def update_student_profile(profile_id: UUID, profile: schemas.StudentProfileUpdate, db: Session = Depends(get_db)):
    db_profile = crud.get_student_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return crud.update_student_profile(db=db, db_obj=db_profile, obj_in=profile)

@app.delete("/student-profiles/{profile_id}", response_model=schemas.StudentProfile)
def delete_student_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.delete_student_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return db_profile

# StudentExamQuestion routes
@app.get("/student-exam-questions/", response_model=List[schemas.StudentExamQuestion])
def read_student_exam_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    student_exam_questions = crud.get_student_exam_questions(db, skip=skip, limit=limit)
    return student_exam_questions

@app.get("/student-exam-questions/{question_id}", response_model=schemas.StudentExamQuestion)
def read_student_exam_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.get_student_exam_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Student exam question not found")
    return db_question

@app.post("/student-exam-questions/", response_model=schemas.StudentExamQuestion)
def create_student_exam_question(question: schemas.StudentExamQuestionCreate, db: Session = Depends(get_db)):
    return crud.create_student_exam_question(db=db, obj_in=question)

@app.put("/student-exam-questions/{question_id}", response_model=schemas.StudentExamQuestion)
def update_student_exam_question(question_id: UUID, question: schemas.StudentExamQuestionUpdate, db: Session = Depends(get_db)):
    db_question = crud.get_student_exam_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Student exam question not found")
    return crud.update_student_exam_question(db=db, db_obj=db_question, obj_in=question)

@app.delete("/student-exam-questions/{question_id}", response_model=schemas.StudentExamQuestion)
def delete_student_exam_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.delete_student_exam_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Student exam question not found")
    return db_question

# TeacherProfile routes
@app.get("/teacher-profiles/", response_model=List[schemas.TeacherProfile])
def read_teacher_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    teacher_profiles = crud.get_teacher_profiles(db, skip=skip, limit=limit)
    return teacher_profiles

@app.get("/teacher-profiles/{profile_id}", response_model=schemas.TeacherProfile)
def read_teacher_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.get_teacher_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return db_profile

@app.post("/teacher-profiles/", response_model=schemas.TeacherProfile)
def create_teacher_profile(profile: schemas.TeacherProfileCreate, db: Session = Depends(get_db)):
    return crud.create_teacher_profile(db=db, obj_in=profile)

@app.put("/teacher-profiles/{profile_id}", response_model=schemas.TeacherProfile)
def update_teacher_profile(profile_id: UUID, profile: schemas.TeacherProfileUpdate, db: Session = Depends(get_db)):
    db_profile = crud.get_teacher_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return crud.update_teacher_profile(db=db, db_obj=db_profile, obj_in=profile)

@app.delete("/teacher-profiles/{profile_id}", response_model=schemas.TeacherProfile)
def delete_teacher_profile(profile_id: UUID, db: Session = Depends(get_db)):
    db_profile = crud.delete_teacher_profile(db, id=profile_id)
    if db_profile is None:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return db_profile

# QuestionCategory routes
@app.get("/question-categories/", response_model=List[schemas.QuestionCategory])
def read_question_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    question_categories = crud.get_question_categories(db, skip=skip, limit=limit)
    return question_categories

@app.get("/question-categories/{category_id}", response_model=schemas.QuestionCategory)
def read_question_category(category_id: UUID, db: Session = Depends(get_db)):
    db_category = crud.get_question_category(db, id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Question category not found")
    return db_category

@app.post("/question-categories/", response_model=schemas.QuestionCategory)
def create_question_category(category: schemas.QuestionCategoryCreate, db: Session = Depends(get_db)):
    return crud.create_question_category(db=db, obj_in=category)

@app.put("/question-categories/{category_id}", response_model=schemas.QuestionCategory)
def update_question_category(category_id: UUID, category: schemas.QuestionCategoryUpdate, db: Session = Depends(get_db)):
    db_category = crud.get_question_category(db, id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Question category not found")
    return crud.update_question_category(db=db, db_obj=db_category, obj_in=category)

@app.delete("/question-categories/{category_id}", response_model=schemas.QuestionCategory)
def delete_question_category(category_id: UUID, db: Session = Depends(get_db)):
    db_category = crud.delete_question_category(db, id=category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Question category not found")
    return db_category

# Question routes
@app.get("/questions/", response_model=List[schemas.Question], dependencies=[Depends(require_role(dbmodels.UserRole.ADMIN, dbmodels.UserRole.TEACHER))])
def read_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    questions = crud.get_questions(db, skip=skip, limit=limit)
    return questions

@app.get("/questions/{question_id}", response_model=schemas.Question)
def read_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.get_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

@app.post("/questions/", response_model=schemas.Question)
def create_question(question: schemas.QuestionCreate, db: Session = Depends(get_db),current_user: models.User = Depends(get_current_user),):
    return crud.create_question(db=db, obj_in=question, user_id=current_user.id)

@app.put("/questions/{question_id}", response_model=schemas.Question)
def update_question(question_id: UUID, question: schemas.QuestionUpdate, db: Session = Depends(get_db)):
    db_question = crud.get_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return crud.update_question(db=db, db_obj=db_question, obj_in=question)

@app.delete("/questions/{question_id}", response_model=schemas.Question)
def delete_question(question_id: UUID, db: Session = Depends(get_db)):
    db_question = crud.delete_question(db, id=question_id)
    if db_question is None:
        raise HTTPException(status_code=404, detail="Question not found")
    return db_question

# QuestionTestCase routes
@app.get("/question-test-cases/", response_model=List[schemas.QuestionTestCase])
def read_question_test_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    test_cases = crud.get_question_test_cases(db, skip=skip, limit=limit)
    return test_cases

@app.get("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def read_question_test_case(test_case_id: UUID, db: Session = Depends(get_db)):
    db_test_case = crud.get_question_test_case(db, id=test_case_id)
    if db_test_case is None:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return db_test_case

@app.post("/question-test-cases/", response_model=schemas.QuestionTestCase)
def create_question_test_case(test_case: schemas.QuestionTestCaseCreate, db: Session = Depends(get_db)):
    return crud.create_question_test_case(db=db, obj_in=test_case)

@app.put("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def update_question_test_case(test_case_id: UUID, test_case: schemas.QuestionTestCaseUpdate, db: Session = Depends(get_db)):
    db_test_case = crud.get_question_test_case(db, id=test_case_id)
    if db_test_case is None:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return crud.update_question_test_case(db=db, db_obj=db_test_case, obj_in=test_case)

@app.delete("/question-test-cases/{test_case_id}", response_model=schemas.QuestionTestCase)
def delete_question_test_case(test_case_id: UUID, db: Session = Depends(get_db)):
    db_test_case = crud.delete_question_test_case(db, id=test_case_id)
    if db_test_case is None:
        raise HTTPException(status_code=404, detail="Question test case not found")
    return db_test_case

# Exam routes
@app.get("/exams/", response_model=List[schemas.Exam])
def read_exams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exams = crud.get_exams(db, skip=skip, limit=limit)
    return exams

@app.get("/exams/{exam_id}", response_model=schemas.Exam)
def read_exam(exam_id: UUID, db: Session = Depends(get_db)):
    db_exam = crud.get_exam(db, id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return db_exam

@app.post("/exams/", response_model=schemas.Exam)
def create_exam(exam: schemas.ExamCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user),):
    return crud.create_exam(db=db, obj_in=exam, user_id=current_user.id)

@app.put("/exams/{exam_id}", response_model=schemas.Exam)
def update_exam(exam_id: UUID, exam: schemas.ExamUpdate, db: Session = Depends(get_db)):
    db_exam = crud.get_exam(db, id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return crud.update_exam(db=db, db_obj=db_exam, obj_in=exam)

@app.delete("/exams/{exam_id}", response_model=schemas.Exam)
def delete_exam(exam_id: UUID, db: Session = Depends(get_db)):
    db_exam = crud.delete_exam(db, id=exam_id)
    if db_exam is None:
        raise HTTPException(status_code=404, detail="Exam not found")
    return db_exam

# ExamQuestion routes
@app.get("/exam-questions/", response_model=List[schemas.ExamQuestion])
def read_exam_questions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_questions = crud.get_exam_questions(db, skip=skip, limit=limit)
    return exam_questions

@app.get("/exam-questions/{exam_question_id}", response_model=schemas.ExamQuestion)
def read_exam_question(exam_question_id: UUID, db: Session = Depends(get_db)):
    db_exam_question = crud.get_exam_question(db, id=exam_question_id)
    if db_exam_question is None:
        raise HTTPException(status_code=404, detail="Exam question not found")
    return db_exam_question

@app.post("/exam-questions/", response_model=schemas.ExamQuestion)
def create_exam_question(exam_question: schemas.ExamQuestionCreate, db: Session = Depends(get_db)):
    return crud.create_exam_question(db=db, obj_in=exam_question)

@app.put("/exam-questions/{exam_question_id}", response_model=schemas.ExamQuestion)
def update_exam_question(exam_question_id: UUID, exam_question: schemas.ExamQuestionUpdate, db: Session = Depends(get_db)):
    db_exam_question = crud.get_exam_question(db, id=exam_question_id)
    if db_exam_question is None:
        raise HTTPException(status_code=404, detail="Exam question not found")
    return crud.update_exam_question(db=db, db_obj=db_exam_question, obj_in=exam_question)

@app.delete("/exam-questions/{exam_question_id}", response_model=schemas.ExamQuestion)
def delete_exam_question(exam_question_id: UUID, db: Session = Depends(get_db)):
    db_exam_question = crud.delete_exam_question(db, id=exam_question_id)
    if db_exam_question is None:
        raise HTTPException(status_code=404, detail="Exam question not found")
    return db_exam_question

# ExamRegistration routes
@app.get("/exam-registrations/", response_model=List[schemas.ExamRegistration])
def read_exam_registrations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_registrations = crud.get_exam_registrations(db, skip=skip, limit=limit)
    return exam_registrations

@app.get("/exam-registrations/{registration_id}", response_model=schemas.ExamRegistration)
def read_exam_registration(registration_id: UUID, db: Session = Depends(get_db)):
    db_registration = crud.get_exam_registration(db, id=registration_id)
    if db_registration is None:
        raise HTTPException(status_code=404, detail="Exam registration not found")
    return db_registration

@app.post("/exam-registrations/", response_model=schemas.ExamRegistration)
def create_exam_registration(registration: schemas.ExamRegistrationCreate, db: Session = Depends(get_db)):
    return crud.create_exam_registration(db=db, obj_in=registration)

@app.put("/exam-registrations/{registration_id}", response_model=schemas.ExamRegistration)
def update_exam_registration(registration_id: UUID, registration: schemas.ExamRegistrationUpdate, db: Session = Depends(get_db)):
    db_registration = crud.get_exam_registration(db, id=registration_id)
    if db_registration is None:
        raise HTTPException(status_code=404, detail="Exam registration not found")
    return crud.update_exam_registration(db=db, db_obj=db_registration, obj_in=registration)

@app.delete("/exam-registrations/{registration_id}", response_model=schemas.ExamRegistration)
def delete_exam_registration(registration_id: UUID, db: Session = Depends(get_db)):
    db_registration = crud.delete_exam_registration(db, id=registration_id)
    if db_registration is None:
        raise HTTPException(status_code=404, detail="Exam registration not found")
    return db_registration

# ExamSession routes
@app.get("/exam-sessions/", response_model=List[schemas.ExamSession])
def read_exam_sessions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_sessions = crud.get_exam_sessions(db, skip=skip, limit=limit)
    return exam_sessions

@app.get("/exam-sessions/{session_id}", response_model=schemas.ExamSession)
def read_exam_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.get_exam_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return db_session

@app.post("/exam-sessions/", response_model=schemas.ExamSession)
def create_exam_session(session: schemas.ExamSessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user),):
    return crud.create_exam_session(db=db, obj_in=session, student_id=current_user.id)

@app.put("/exam-sessions/{session_id}", response_model=schemas.ExamSession)
def update_exam_session(session_id: UUID, session: schemas.ExamSessionUpdate, db: Session = Depends(get_db)):
    db_session = crud.get_exam_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return crud.update_exam_session(db=db, db_obj=db_session, obj_in=session)

@app.delete("/exam-sessions/{session_id}", response_model=schemas.ExamSession)
def delete_exam_session(session_id: UUID, db: Session = Depends(get_db)):
    db_session = crud.delete_exam_session(db, id=session_id)
    if db_session is None:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return db_session

# Submission routes
@app.get("/submissions/", response_model=List[schemas.Submission])
def read_submissions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submissions = crud.get_submissions(db, skip=skip, limit=limit)
    return submissions

@app.get("/submissions/{submission_id}", response_model=schemas.Submission)
def read_submission(submission_id: UUID, db: Session = Depends(get_db)):
    db_submission = crud.get_submission(db, id=submission_id)
    if db_submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission

@app.post("/submissions/", response_model=schemas.Submission)
def create_submission(submission: schemas.SubmissionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user),):
    # Find the exam session for this user & exam
    exam_session = db.query(models.ExamSession).filter_by(
        exam_id=submission.exam_id,
        student_id=current_user.id
    ).first()

    if not exam_session:
        raise HTTPException(status_code=400, detail="No active exam session found for this exam")

    
    return crud.create_submission(db=db, obj_in=submission, student_id=current_user.id, exam_session_id=exam_session.id)

@app.put("/submissions/{submission_id}", response_model=schemas.Submission)
def update_submission(submission_id: UUID, submission: schemas.SubmissionUpdate, db: Session = Depends(get_db)):
    db_submission = crud.get_submission(db, id=submission_id)
    if db_submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return crud.update_submission(db=db, db_obj=db_submission, obj_in=submission)

@app.delete("/submissions/{submission_id}", response_model=schemas.Submission)
def delete_submission(submission_id: UUID, db: Session = Depends(get_db)):
    db_submission = crud.delete_submission(db, id=submission_id)
    if db_submission is None:
        raise HTTPException(status_code=404, detail="Submission not found")
    return db_submission

# SubmissionResult routes
@app.get("/submission-results/", response_model=List[schemas.SubmissionResult])
def read_submission_results(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submission_results = crud.get_submission_results(db, skip=skip, limit=limit)
    return submission_results

@app.get("/submission-results/{result_id}", response_model=schemas.SubmissionResult)
def read_submission_result(result_id: UUID, db: Session = Depends(get_db)):
    db_result = crud.get_submission_result(db, id=result_id)
    if db_result is None:
        raise HTTPException(status_code=404, detail="Submission result not found")
    return db_result

@app.post("/submission-results/", response_model=schemas.SubmissionResult)
def create_submission_result(result: schemas.SubmissionResultCreate, db: Session = Depends(get_db)):
    return crud.create_submission_result(db=db, obj_in=result)

@app.put("/submission-results/{result_id}", response_model=schemas.SubmissionResult)
def update_submission_result(result_id: UUID, result: schemas.SubmissionResultUpdate, db: Session = Depends(get_db)):
    db_result = crud.get_submission_result(db, id=result_id)
    if db_result is None:
        raise HTTPException(status_code=404, detail="Submission result not found")
    return crud.update_submission_result(db=db, db_obj=db_result, obj_in=result)

@app.delete("/submission-results/{result_id}", response_model=schemas.SubmissionResult)
def delete_submission_result(result_id: UUID, db: Session = Depends(get_db)):
    db_result = crud.delete_submission_result(db, id=result_id)
    if db_result is None:
        raise HTTPException(status_code=404, detail="Submission result not found")
    return db_result

# SubmissionEvent routes
@app.get("/submission-events/", response_model=List[schemas.SubmissionEvent])
def read_submission_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    submission_events = crud.get_submission_events(db, skip=skip, limit=limit)
    return submission_events

@app.get("/submission-events/{event_id}", response_model=schemas.SubmissionEvent)
def read_submission_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.get_submission_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Submission event not found")
    return db_event

@app.post("/submission-events/", response_model=schemas.SubmissionEvent)
def create_submission_event(event: schemas.SubmissionEventCreate, db: Session = Depends(get_db)):
    return crud.create_submission_event(db=db, obj_in=event)

@app.put("/submission-events/{event_id}", response_model=schemas.SubmissionEvent)
def update_submission_event(event_id: UUID, event: schemas.SubmissionEventUpdate, db: Session = Depends(get_db)):
    db_event = crud.get_submission_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Submission event not found")
    return crud.update_submission_event(db=db, db_obj=db_event, obj_in=event)

@app.delete("/submission-events/{event_id}", response_model=schemas.SubmissionEvent)
def delete_submission_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.delete_submission_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Submission event not found")
    return db_event

# ExamEvent routes
@app.get("/exam-events/", response_model=List[schemas.ExamEvent])
def read_exam_events(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    exam_events = crud.get_exam_events(db, skip=skip, limit=limit)
    return exam_events

@app.get("/exam-events/{event_id}", response_model=schemas.ExamEvent)
def read_exam_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.get_exam_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Exam event not found")
    return db_event

@app.post("/exam-events/", response_model=schemas.ExamEvent)
def create_exam_event(event: schemas.ExamEventCreate, db: Session = Depends(get_db)):
    return crud.create_exam_event(db=db, obj_in=event)

@app.put("/exam-events/{event_id}", response_model=schemas.ExamEvent)
def update_exam_event(event_id: UUID, event: schemas.ExamEventUpdate, db: Session = Depends(get_db)):
    db_event = crud.get_exam_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Exam event not found")
    return crud.update_exam_event(db=db, db_obj=db_event, obj_in=event)

@app.delete("/exam-events/{event_id}", response_model=schemas.ExamEvent)
def delete_exam_event(event_id: UUID, db: Session = Depends(get_db)):
    db_event = crud.delete_exam_event(db, id=event_id)
    if db_event is None:
        raise HTTPException(status_code=404, detail="Exam event not found")
    return db_event

# AuditLog routes
@app.get("/audit-logs/", response_model=List[schemas.AuditLog], dependencies=[Depends(require_role(dbmodels.UserRole.ADMIN, dbmodels.UserRole.TEACHER))])
def read_audit_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    audit_logs = crud.get_audit_logs(db, skip=skip, limit=limit)
    return audit_logs

@app.get("/audit-logs/{log_id}", response_model=schemas.AuditLog)
def read_audit_log(log_id: UUID, db: Session = Depends(get_db)):
    db_log = crud.get_audit_log(db, id=log_id)
    if db_log is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return db_log

@app.post("/audit-logs/", response_model=schemas.AuditLog)
def create_audit_log(log: schemas.AuditLogCreate, db: Session = Depends(get_db)):
    return crud.create_audit_log(db=db, obj_in=log)

@app.put("/audit-logs/{log_id}", response_model=schemas.AuditLog)
def update_audit_log(log_id: UUID, log: schemas.AuditLogUpdate, db: Session = Depends(get_db)):
    db_log = crud.get_audit_log(db, id=log_id)
    if db_log is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return crud.update_audit_log(db=db, db_obj=db_log, obj_in=log)

@app.delete("/audit-logs/{log_id}", response_model=schemas.AuditLog)
def delete_audit_log(log_id: UUID, db: Session = Depends(get_db)):
    db_log = crud.delete_audit_log(db, id=log_id)
    if db_log is None:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return db_log

# Root endpoint
@app.get("/")
def read_root():
    return {"message": "Online Exam System API", "version": "1.0.0"}

# Get assigned questions for a specific student in a specific exam
@app.get("/exams/{exam_id}/students/{student_id}/questions/", response_model=List[schemas.StudentExamQuestion])
def get_student_questions_for_exam(exam_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    """Get all questions assigned to a specific student for a specific exam"""
    questions = crud.get_student_exam_questions_by_exam_and_student(db, exam_id=exam_id, student_id=student_id)
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this student in this exam")
    return questions

# Get all students and their assigned questions for a specific exam
@app.get("/exams/{exam_id}/student-questions/", response_model=List[schemas.StudentExamQuestion])
def get_all_student_questions_for_exam(exam_id: UUID, db: Session = Depends(get_db)):
    """Get all student question assignments for a specific exam"""
    assignments = crud.get_student_exam_questions_by_exam(db, exam_id=exam_id)
    if not assignments:
        raise HTTPException(status_code=404, detail="No question assignments found for this exam")
    return assignments

# Get questions with full question details for a student in an exam
@app.get(
    "/exams/{exam_id}/questions-with-details/",
    response_model=List[schemas.StudentExamQuestionWithQuestion]
)
def get_student_questions_with_details(
    exam_id: UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  # get logged-in student
):
    """Get questions assigned to the logged-in student for this exam"""
    student_id = current_user.id  # ✅ automatically take from logged-in user

    questions = crud.get_exam_questions_for_student(db, student_id=student_id, exam_id=exam_id)
    if not questions:
        raise HTTPException(
            status_code=404,
            detail="No questions found for this student in this exam"
        )
    return questions

# Assign a single question to a student
@app.post("/exams/{exam_id}/students/{student_id}/assign-question/", response_model=schemas.StudentExamQuestion)
def assign_question_to_student(
    exam_id: UUID, 
    student_id: UUID, 
    question_assignment: schemas.StudentExamQuestionCreate, 
    db: Session = Depends(get_db)
):
    """Assign a question to a student for an exam"""
    # Validate that the exam_id and student_id in the URL match the request body
    if question_assignment.exam_id != exam_id or question_assignment.student_id != student_id:
        raise HTTPException(status_code=400, detail="Exam ID or Student ID mismatch")
    
    return crud.create_student_exam_question(db=db, obj_in=question_assignment)

# Bulk assign questions to students
@app.post("/student-exam-questions/bulk-assign/", response_model=List[schemas.StudentExamQuestion])
def bulk_assign_questions(
    bulk_assignment: schemas.BulkStudentExamQuestionCreate, 
    db: Session = Depends(get_db)
):
    """Bulk assign questions to students"""
    try:
        assignments = [assignment.dict() for assignment in bulk_assignment.assignments]
        return crud.bulk_assign_questions_to_students(db=db, assignments=assignments)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error in bulk assignment: {str(e)}")

# Get all exams where a specific student has assigned questions
@app.get("/me/assigned-exams/", response_model=List[schemas.StudentExamQuestion])
def get_my_assigned_exams(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  # 👈 auto-inject logged-in user
):
    """Get all exams where the logged-in student has assigned questions"""
    assignments = db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.student_id == current_user.id
    ).all()

    if not assignments:
        raise HTTPException(status_code=404, detail="No exam assignments found for this student")
    
    return assignments

@app.get("/students/{student_id}/assigned-exams/", response_model=List[schemas.StudentExamQuestion])
def get_student_assigned_exams_admin(student_id: UUID, db: Session = Depends(get_db)):
    """Admin/teacher endpoint: get assigned exams for a given student_id"""
    return db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.student_id == student_id
    ).all()

# Check if a student has questions assigned for a specific exam
@app.get("/exams/{exam_id}/students/{student_id}/has-questions/")
def check_student_has_questions(exam_id: UUID, student_id: UUID, db: Session = Depends(get_db)):
    """Check if a student has questions assigned for a specific exam"""
    count = db.query(models.StudentExamQuestion).filter(
        models.StudentExamQuestion.exam_id == exam_id,
        models.StudentExamQuestion.student_id == student_id
    ).count()
    
    return {
        "has_questions": count > 0,
        "question_count": count,
        "exam_id": exam_id,
        "student_id": student_id
    }

@app.get("/exams/{exam_id}/submissions", response_model=List[schemas.Submission])
def read_submissions_by_exam(
    exam_id: UUID, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    submissions = crud.get_submissions_by_exam_id(db, exam_id=exam_id, skip=skip, limit=limit)
    return submissions


# Get question statistics for an exam
@app.get("/exams/{exam_id}/question-stats/")
def get_exam_question_stats(exam_id: UUID, db: Session = Depends(get_db)):
    """Get statistics about question assignments for an exam"""
    from sqlalchemy import func
    
    stats = db.query(
        func.count(models.StudentExamQuestion.id).label("total_assignments"),
        func.count(func.distinct(models.StudentExamQuestion.student_id)).label("students_count"),
        func.count(func.distinct(models.StudentExamQuestion.question_id)).label("unique_questions"),
        func.avg(models.StudentExamQuestion.points).label("avg_points")
    ).filter(
        models.StudentExamQuestion.exam_id == exam_id
    ).first()
    
    if not stats or stats.total_assignments == 0:
        raise HTTPException(status_code=404, detail="No question assignments found for this exam")
    
    return {
        "exam_id": exam_id,
        "total_assignments": stats.total_assignments,
        "students_with_questions": stats.students_count,
        "unique_questions_used": stats.unique_questions,
        "average_points_per_question": float(stats.avg_points) if stats.avg_points else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)