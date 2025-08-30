"""
Import LeetCode problems from JSONL files (HumanEval format) - HYBRID OPTIMIZED VERSION
Faster than original, no external dependencies required
"""
import json
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from concurrent.futures import ThreadPoolExecutor
import os
from backend import models


def load_leetcode_content_json(file_path: str) -> Dict[str, str]:
    """Load the leetcode content JSON file and return as dictionary"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content_data = json.load(f)
        
        content_mapping = {}
        for item in content_data:
            question_data = item.get('data', {}).get('question', {})
            frontend_id = question_data.get('questionFrontendId')
            if frontend_id:
                content_mapping[frontend_id] = question_data.get('content', '')
        
        print(f"Loaded {len(content_mapping)} questions from content file")
        return content_mapping
    except Exception as e:
        print(f"Error loading leetcode content file: {e}")
        return {}


def get_problem_description_from_content(content_mapping: Dict[str, str], question_id: str) -> str:
    """Get problem description from content mapping using question_id"""
    return content_mapping.get(str(question_id), "")


def ensure_category_fast(db: Session, name: str, existing_categories: dict) -> models.QuestionCategory:
    """Create or get category by name using pre-loaded cache"""
    if name in existing_categories:
        return existing_categories[name]
    
    cat = models.QuestionCategory(
        name=name,
        description=f"{name.title()} problems",
        is_active=True,
        extra_data={}
    )
    db.add(cat)
    db.flush()
    existing_categories[name] = cat
    return cat


def get_or_create_system_user(db: Session) -> models.User:
    """Get or create system user for imports"""
    user = db.query(models.User).filter(models.User.email == "system@leetcode-import.com").first()
    if not user:
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


def parse_test_cases_from_input_output(input_output: list) -> list:
    """Convert input_output format to test cases - ONLY FIRST 3 (SAMPLE CASES)"""
    test_cases = []
    for i, case in enumerate(input_output):
        if i >= 3:  # Only first 3
            break
            
        output = case.get("output", "")
        if output is None:
            output = ""
        
        if not output and output != 0:
            continue
            
        test_cases.append({
            "input": case.get("input", ""),
            "output": str(output),
            "is_example": True
        })
    return test_cases


def process_single_file(file_path: str, content_mapping: dict, existing_questions: dict, existing_categories: dict, system_user) -> List[Tuple[Dict, List]]:
    """Process a single file and return question data"""
    print(f"Processing file: {file_path}")
    results = []
    line_count = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                line_count += 1
                if line_count % 1000 == 0:
                    print(f"  Processed {line_count} lines...")
                
                try:
                    obj = json.loads(line)
                    
                    # Extract data
                    task_id = obj.get("task_id", "")
                    question_id = str(obj.get("question_id", ""))
                    if not question_id:
                        continue
                        
                    title = task_id.replace('-', ' ').title() if task_id else f"Problem {question_id}"
                    difficulty = obj.get("difficulty", "Medium").lower()
                    if difficulty not in ['easy', 'medium', 'hard']:
                        difficulty = 'medium'
                        
                    tags = [tag.lower().replace(' ', '-') for tag in obj.get("tags", [])]
                    
                    # Get problem description
                    problem_description = (
                        content_mapping.get(question_id) or 
                        obj.get("problem_description", "")
                    )
                    
                    starter_code = obj.get("starter_code", "")
                    input_output = obj.get("input_output", [])
                    
                    # Parse test cases
                    test_cases = parse_test_cases_from_input_output(input_output)
                    if not test_cases:
                        continue
                    
                    # Create temporary category entry (we'll handle this in bulk later)
                    primary_tag = tags[0] if tags else 'array'
                    
                    question_data = {
                        'question_id': question_id,
                        'title': title,
                        'description': f"LeetCode Problem #{question_id}",
                        'problem_statement': problem_description,
                        'difficulty': difficulty,
                        'max_score': 100,
                        'time_limit_seconds': 30,
                        'category_name': primary_tag,  # We'll resolve this later
                        'created_by': system_user.id,
                        'is_active': True,
                        'extra_data': {
                            "question_id": question_id,
                            "task_id": task_id,
                            "tags": tags,
                            "starter_code": starter_code,
                            "imported_from": "jsonl_human_eval_with_content",
                            "imported_at": datetime.now().isoformat()
                        }
                    }
                    
                    results.append((question_data, test_cases))
                    
                except Exception as e:
                    print(f"Error processing line {line_count}: {e}")
                    continue
                    
    except Exception as e:
        print(f"Error processing file {file_path}: {e}")
    
    print(f"  Completed {file_path}: {len(results)} valid questions from {line_count} lines")
    return results


def import_from_jsonl_files(db: Session, file_paths: list, overwrite: bool = False) -> Dict[str, Any]:
    """
    Import from multiple JSONL files - HYBRID OPTIMIZED VERSION
    Fast but compatible with all systems
    """
    print("🚀 Starting hybrid-optimized import...")
    
    # Get system user
    system_user = get_or_create_system_user(db)
    
    # Load content mapping
    content_file_path = "backend/leetcode_questions_content.json"
    content_mapping = load_leetcode_content_json(content_file_path)
    
    # Pre-load existing data
    print("Pre-loading existing data...")
    existing_questions = {}
    questions = db.query(models.Question).filter(
        models.Question.extra_data['question_id'].astext.isnot(None)
    ).all()
    for q in questions:
        question_id = q.extra_data.get('question_id')
        if question_id:
            existing_questions[str(question_id)] = q
    
    existing_categories = {}
    categories = db.query(models.QuestionCategory).all()
    for cat in categories:
        existing_categories[cat.name] = cat
    
    print(f"Pre-loaded {len(existing_questions)} questions, {len(existing_categories)} categories")
    
    # Process files (use threading for multiple files if beneficial)
    all_questions = []
    if len(file_paths) > 1 and len(file_paths) <= 4:
        print(f"Processing {len(file_paths)} files in parallel...")
        with ThreadPoolExecutor(max_workers=min(len(file_paths), 4)) as executor:
            futures = []
            for file_path in file_paths:
                future = executor.submit(
                    process_single_file, 
                    file_path, content_mapping, existing_questions, existing_categories, system_user
                )
                futures.append(future)
            
            for future in futures:
                file_results = future.result()
                all_questions.extend(file_results)
    else:
        # Sequential processing
        for file_path in file_paths:
            questions = process_single_file(
                file_path, content_mapping, existing_questions, existing_categories, system_user
            )
            all_questions.extend(questions)
    
    print(f"📊 Processed {len(all_questions)} total valid questions")
    
    if not all_questions:
        return {"created": 0, "updated": 0, "test_cases": 0, "errors": ["No valid questions found"]}
    
    # Bulk database operations
    created = updated = test_cases_created = 0
    
    # Disable autoflush for performance
    original_autoflush = db.autoflush
    db.autoflush = False
    
    try:
        questions_to_create = []
        questions_to_update = []
        all_test_cases = []
        
        # Separate create vs update and resolve categories
        for question_data, test_cases in all_questions:
            question_id = question_data['question_id']
            existing = existing_questions.get(question_id)
            
            # Resolve category
            category = ensure_category_fast(db, question_data['category_name'], existing_categories)
            question_data['category_id'] = category.id
            del question_data['category_name']  # Remove temporary field
            
            if existing and not overwrite:
                continue
            elif existing and overwrite:
                # Update existing
                existing.title = question_data['title']
                existing.description = question_data['description']
                existing.problem_statement = question_data['problem_statement']
                existing.difficulty = models.Difficulty(question_data['difficulty'])
                existing.category_id = question_data['category_id']
                existing.extra_data = question_data['extra_data']
                
                questions_to_update.append(existing)
                
                # Add test cases
                for tc in test_cases:
                    all_test_cases.append({
                        'question_id': existing.id,
                        'input_data': tc['input'],
                        'expected_output': tc['output'],
                        'is_sample': True,
                        'is_hidden': False,
                        'weight': 1,
                        'extra_data': {"imported_from": "jsonl_human_eval_with_content"}
                    })
                updated += 1
            else:
                # Create new
                questions_to_create.append((question_data, test_cases))
                created += 1
        
        print(f"🔥 Bulk operations: {created} creates, {updated} updates")
        
        # Create new questions
        for question_data, test_cases in questions_to_create:
            question = models.Question(
                title=question_data['title'],
                description=question_data['description'],
                problem_statement=question_data['problem_statement'],
                difficulty=models.Difficulty(question_data['difficulty']),
                max_score=question_data['max_score'],
                time_limit_seconds=question_data['time_limit_seconds'],
                category_id=question_data['category_id'],
                created_by=question_data['created_by'],
                is_active=question_data['is_active'],
                extra_data=question_data['extra_data']
            )
            db.add(question)
            db.flush()
            
            # Add test cases
            for tc in test_cases:
                all_test_cases.append({
                    'question_id': question.id,
                    'input_data': tc['input'],
                    'expected_output': tc['output'],
                    'is_sample': True,
                    'is_hidden': False,
                    'weight': 1,
                    'extra_data': {"imported_from": "jsonl_human_eval_with_content"}
                })
        
        # Delete existing sample test cases for updated questions
        if questions_to_update:
            updated_question_ids = [q.id for q in questions_to_update]
            db.query(models.QuestionTestCase).filter(
                models.QuestionTestCase.question_id.in_(updated_question_ids),
                models.QuestionTestCase.is_sample == True
            ).delete(synchronize_session=False)
        
        # Bulk insert test cases
        if all_test_cases:
            print(f"Bulk inserting {len(all_test_cases)} test cases...")
            db.bulk_insert_mappings(models.QuestionTestCase, all_test_cases)
            test_cases_created = len(all_test_cases)
        
        # Commit all changes
        db.commit()
        print(f"✅ Successfully committed {created + updated} questions and {test_cases_created} test cases")
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        db.rollback()
        return {"created": 0, "updated": 0, "test_cases": 0, "errors": [str(e)]}
    finally:
        db.autoflush = original_autoflush
    
    return {
        "created": created,
        "updated": updated,
        "test_cases": test_cases_created,
        "errors": []
    }


# Legacy functions for compatibility
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


def question_exists(db: Session, question_id: str) -> Optional[models.Question]:
    """Check if question exists by question_id"""
    return db.query(models.Question).filter(
        models.Question.extra_data['question_id'].astext == str(question_id)
    ).first()
