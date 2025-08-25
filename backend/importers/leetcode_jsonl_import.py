"""
Import LeetCode problems from JSONL files (HumanEval format)
"""
import json
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from backend import models


def ensure_category(db: Session, name: str) -> models.QuestionCategory:
    """Create or get category by name"""
    cat = db.query(models.QuestionCategory).filter(models.QuestionCategory.name == name).first()
    if cat:
        return cat
    cat = models.QuestionCategory(
        name=name,
        description=f"{name.title()} problems",
        is_active=True,
        extra_data={}
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


def get_or_create_system_user(db: Session) -> models.User:
    """Get or create system user for imports"""
    user = db.query(models.User).filter(models.User.email == "system@leetcode-import.com").first()
    if user:
        return user
    user = models.User(
        email="system@leetcode-import.com",
        password_hash="system_user",
        role=models.UserRole.ADMIN,
        is_active=True,
        extra_data={"is_system": True}
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def question_exists(db: Session, question_id: str) -> Optional[models.Question]:
    """Check if question exists by question_id"""
    return db.query(models.Question).filter(
        models.Question.extra_data['question_id'].astext == str(question_id)
    ).first()


def parse_test_cases_from_input_output(input_output: list) -> list:
    """Convert input_output format to test cases - ONLY FIRST 3 (SAMPLE CASES)"""
    test_cases = []
    for i, case in enumerate(input_output):
        # ONLY PROCESS FIRST 3 TEST CASES
        if i >= 3:
            break
            
        # Handle missing or None output
        output = case.get("output", "")
        if output is None:
            output = ""  # Convert None to empty string
        
        # Skip test cases with empty output if you don't want them
        if not output and output != 0:  # Allow 0 as valid output
            continue
            
        test_cases.append({
            "input": case.get("input", ""),
            "output": str(output),  # Ensure it's a string
            "is_example": True  # ALL IMPORTED CASES ARE SAMPLE/EXAMPLE CASES
        })
    return test_cases


def import_from_jsonl_files(db: Session, file_paths: list, overwrite: bool = False) -> Dict[str, Any]:
    """Import from multiple JSONL files"""
    system_user = get_or_create_system_user(db)
    created = 0
    updated = 0
    test_cases_created = 0
    errors = []
    
    # ADD THIS NEAR THE TOP - Batch processing variables
    BATCH_SIZE = 100  # Process in batches
    batch_count = 0

    # Process all files
    for file_path in file_paths:
        print(f"Processing file: {file_path}")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                for line_no, line in enumerate(f, 1):
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        obj = json.loads(line)
                        
                        # Extract fields from new format
                        task_id = obj.get("task_id", "")
                        question_id = str(obj.get("question_id", ""))
                        title = task_id.replace('-', ' ').title() if task_id else f"Problem {question_id}"
                        difficulty = obj.get("difficulty", "Medium").lower()
                        tags = [tag.lower().replace(' ', '-') for tag in obj.get("tags", [])]
                        problem_description = obj.get("problem_description", "")
                        starter_code = obj.get("starter_code", "")
                        input_output = obj.get("input_output", [])

                        # Map difficulty
                        if difficulty not in ['easy', 'medium', 'hard']:
                            difficulty = 'medium'

                        # Use first tag as primary category, fallback to 'array'
                        primary_tag = tags[0] if tags else 'array'
                        category = ensure_category(db, primary_tag)

                        # Parse test cases BEFORE creating question - ONLY SAMPLE CASES
                        test_cases = parse_test_cases_from_input_output(input_output)
                        
                        # Skip questions with no valid test cases
                        if not test_cases:
                            print(f"Skipping question {question_id} - no valid sample test cases")
                            continue

                        # Check if exists
                        existing = question_exists(db, question_id) if question_id else None

                        if existing and not overwrite:
                            continue

                        if existing and overwrite:
                            # Update existing question
                            existing.title = title
                            existing.description = f"LeetCode Problem #{question_id}"
                            existing.problem_statement = problem_description
                            existing.difficulty = models.Difficulty(difficulty)
                            existing.category_id = category.id
                            existing.extra_data = {
                                **(existing.extra_data or {}),
                                "question_id": question_id,
                                "task_id": task_id,
                                "tags": tags,
                                "starter_code": starter_code,
                                "imported_from": "jsonl_human_eval",
                                "imported_at": datetime.now().isoformat()
                            }
                            db.add(existing)
                            db.flush()

                            # DELETE ONLY EXISTING SAMPLE TEST CASES, KEEP HIDDEN ONES
                            existing_sample_cases = db.query(models.QuestionTestCase).filter(
                                models.QuestionTestCase.question_id == existing.id,
                                models.QuestionTestCase.is_sample == True
                            ).all()
                            
                            for tc in existing_sample_cases:
                                db.delete(tc)
                            db.flush()

                            # Add new sample test cases
                            for tc_data in test_cases:
                                tc = models.QuestionTestCase(
                                    question_id=existing.id,
                                    input_data=tc_data["input"],
                                    expected_output=tc_data["output"],
                                    is_sample=True,  # SAMPLE CASE
                                    is_hidden=False, # VISIBLE TO STUDENTS
                                    weight=1,
                                    extra_data={"imported_from": "jsonl_human_eval"}
                                )
                                db.add(tc)
                                test_cases_created += 1

                            updated += 1
                            batch_count += 1
                            if batch_count % BATCH_SIZE == 0:
                                db.commit()
                                print(f"Committed batch at question {batch_count}")
                        else:
                            # Create new question
                            question = models.Question(
                                title=title,
                                description=f"LeetCode Problem #{question_id}",
                                problem_statement=problem_description,
                                difficulty=models.Difficulty(difficulty),
                                max_score=100,
                                time_limit_seconds=30,
                                category_id=category.id,
                                created_by=system_user.id,
                                is_active=True,
                                extra_data={
                                    "question_id": question_id,
                                    "task_id": task_id,
                                    "tags": tags,
                                    "starter_code": starter_code,
                                    "imported_from": "jsonl_human_eval",
                                    "imported_at": datetime.now().isoformat()
                                }
                            )
                            db.add(question)
                            db.flush()  # Get the ID

                            # Add ONLY SAMPLE test cases
                            for tc_data in test_cases:
                                tc = models.QuestionTestCase(
                                    question_id=question.id,
                                    input_data=tc_data["input"],
                                    expected_output=tc_data["output"],
                                    is_sample=True,  # SAMPLE CASE
                                    is_hidden=False, # VISIBLE TO STUDENTS
                                    weight=1,
                                    extra_data={"imported_from": "jsonl_human_eval"}
                                )
                                db.add(tc)
                                test_cases_created += 1

                            created += 1
                            batch_count += 1
                            if batch_count % BATCH_SIZE == 0:
                                db.commit()
                                print(f"Committed batch at question {batch_count}")

                    except json.JSONDecodeError as e:
                        print(f"JSON error in {file_path} line {line_no}: {e}")
                        db.rollback()
                        errors.append(f"Line {line_no}: JSON decode error")
                        continue
                    except Exception as e:
                        print(f"Error processing {file_path} line {line_no}: {e}")
                        db.rollback()
                        errors.append(f"Line {line_no}: {str(e)}")
                        continue

        except FileNotFoundError:
            print(f"File not found: {file_path}")
            errors.append(f"File not found: {file_path}")
            continue
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            errors.append(f"File error: {str(e)}")
            continue

    # ADD THIS AT THE END - Final commit for remaining records
    if batch_count % BATCH_SIZE != 0:
        db.commit()
        print(f"Final commit - total questions processed: {batch_count}")

    return {
        "created": created,
        "updated": updated,
        "test_cases": test_cases_created,
        "errors": errors
    }
