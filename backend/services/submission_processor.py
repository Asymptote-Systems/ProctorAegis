import asyncio
import aiohttp
import json
from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class LeetCodeAPI:
    def __init__(self, api_url: str):
        self.api_url = api_url
        
    def normalize_output(self, output: str) -> str:
        """Normalize output by removing trailing whitespace including newlines"""
        if not output:
            return ""
        # Remove trailing whitespace (spaces, tabs, newlines, carriage returns)
        return output.rstrip()
        
    async def submit_solution(self, source_code: str, language: str, test_cases: List[Dict]) -> Dict:
        """Submit solution to Judge0 and get LeetCode-style response"""
        try:
            # Get language ID
            language_id = self.get_language_id(language)
            
            # Run tests for each test case
            results = []
            passed_tests = 0
            
            for i, test_case in enumerate(test_cases):
                try:
                    # Submit to Judge0
                    async with aiohttp.ClientSession() as session:
                        submission_payload = {
                            "source_code": source_code,
                            "language_id": language_id,
                            "stdin": test_case["input"],
                            # Don't send expected_output to Judge0
                        }
                        
                        # Submit to Judge0
                        async with session.post(
                            f"{self.api_url}submissions?wait=true",
                            json=submission_payload,
                            headers={"Content-Type": "application/json"}
                        ) as response:
                            if response.status in [200, 201]:
                                result = await response.json()
                                
                                # Normalize outputs for comparison
                                actual_output = self.normalize_output(result.get("stdout") or "")
                                expected_output = self.normalize_output(test_case["output"])
                                
                                # FIXED: Get status_id correctly from nested status object
                                status_obj = result.get("status", {})
                                status_id = status_obj.get("id") if isinstance(status_obj, dict) else result.get("status_id")
                                
                                # Check if Judge0 executed successfully AND outputs match
                                execution_success = status_id == 3  # 3 = Accepted execution
                                outputs_match = actual_output == expected_output
                                
                                test_passed = execution_success and outputs_match
                                
                                # Debug logging 
                                print(f"Test Case {i+1}:")
                                print(f"  Raw stdout: {repr(result.get('stdout'))}")
                                print(f"  Raw expected: {repr(test_case['output'])}")
                                print(f"  Normalized actual: {repr(actual_output)}")
                                print(f"  Normalized expected: {repr(expected_output)}")
                                print(f"  Status object: {result.get('status')}")
                                print(f"  Status ID: {status_id}")
                                print(f"  Execution success: {execution_success}")
                                print(f"  Outputs match: {outputs_match}")
                                print(f"  Test passed: {test_passed}")
                                print("-" * 50)
                                
                                if test_passed:
                                    passed_tests += 1
                                
                                results.append({
                                    "test_case": i + 1,
                                    "passed": test_passed,
                                    "expected": expected_output,
                                    "actual": actual_output,
                                    "status_id": status_id,
                                    "status": status_obj.get("description") if isinstance(status_obj, dict) else "Unknown",
                                    "time": result.get("time"),
                                    "memory": result.get("memory"),
                                    "stderr": result.get("stderr"),
                                    "compile_output": result.get("compile_output")
                                })
                                
                            else:
                                # Handle submission error
                                error_text = await response.text()
                                results.append({
                                    "test_case": i + 1,
                                    "passed": False,
                                    "error": f"Submission failed: {error_text}"
                                })
                                
                except Exception as e:
                    results.append({
                        "test_case": i + 1,
                        "passed": False,
                        "error": str(e)
                    })
            
            # Get first result for overall status
            first_result = results[0] if results else {}
            
            # Determine overall status code
            if passed_tests == len(test_cases):
                status_code = 10  # Accepted
            elif any(r.get("status_id") == 6 for r in results):  # Compile Error
                status_code = 20  # Compile Error
            elif passed_tests > 0:
                status_code = 11  # Wrong Answer (some passed)
            else:
                status_code = 11  # Wrong Answer (none passed)
            
            # Create LeetCode-style response
            leetcode_response = {
                "status_code": status_code,
                "status_runtime": first_result.get("time", "0"),
                "memory": first_result.get("memory", "0"),
                "total_correct": passed_tests,
                "total_testcases": len(test_cases),
                "token": first_result.get("token", ""),
                "test_results": results
            }
            
            # Add error-specific fields
            if status_code == 11:  # Wrong Answer
                failed_test = next((r for r in results if not r["passed"]), {})
                leetcode_response.update({
                    "last_testcase": failed_test.get("test_case", 1),
                    "expected_output": failed_test.get("expected", ""),
                    "code_output": [r.get("actual", "") for r in results]
                })
            elif status_code == 20:  # Compile Error
                compile_error = next((r.get("compile_output") or r.get("stderr") for r in results if r.get("compile_output") or r.get("stderr")), "Unknown compile error")
                leetcode_response["compile_error"] = compile_error
            
            return leetcode_response
            
        except Exception as e:
            logger.error(f"Judge0 API error: {e}")
            return {
                "status_code": 99,  # System Error
                "error": str(e),
                "total_correct": 0,
                "total_testcases": len(test_cases),
                "test_results": []
            }

    
    def get_language_id(self, language: str) -> int:
        """Map language string to Judge0 language ID"""
        language_map = {
            "python3": 71,
            "python": 71,
            "java": 62,
            "cpp": 54,
            "c": 50,
            "javascript": 63
        }
        return language_map.get(language.lower(), 71)


    

class SubmissionProcessor:
    def __init__(self):
        self.judge0_api_url = "http://server:2358/"
        self.processing_jobs = {}
        self.leetcode_api = LeetCodeAPI(self.judge0_api_url)
        
    async def process_submissions_batch(
        self, 
        exam_id: str, 
        submissions: List[Dict], 
        job_id: str
    ):
        """Process submissions asynchronously with progress tracking"""
        total_submissions = len(submissions)
        completed = 0
        failed = 0
        
        # Initialize job status
        self.processing_jobs[job_id] = {
            "status": "processing",
            "total": total_submissions,
            "completed": 0,
            "failed": 0,
            "start_time": datetime.utcnow().isoformat(),
            "errors": []
        }
        
        try:
            # Process submissions in batches of 3 to avoid overwhelming Judge0
            batch_size = 3
            for i in range(0, total_submissions, batch_size):
                batch = submissions[i:i + batch_size]
                
                # Process batch concurrently
                tasks = [
                    self.process_single_submission(submission) 
                    for submission in batch
                ]
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Update progress
                for result in results:
                    if isinstance(result, Exception):
                        failed += 1
                        self.processing_jobs[job_id]["errors"].append(str(result))
                        logger.error(f"Submission processing failed: {result}")
                    else:
                        completed += 1
                
                # Update job status
                self.processing_jobs[job_id].update({
                    "completed": completed,
                    "failed": failed
                })
                
                # Longer delay between batches to avoid rate limiting
                await asyncio.sleep(2)
                
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            self.processing_jobs[job_id]["status"] = "failed"
            self.processing_jobs[job_id]["error"] = str(e)
            return
            
        # Mark job as completed
        self.processing_jobs[job_id]["status"] = "completed"
        self.processing_jobs[job_id]["end_time"] = datetime.utcnow().isoformat()
        
    async def process_single_submission(self, submission: Dict) -> Dict[str, Any]:
        """Process a single submission"""
        try:
            print(f"Processing submission {submission['id']}")
            
            # Get test cases for the question
            test_cases = await self.get_test_cases(submission["question_id"])
            
            if not test_cases:
                raise Exception(f"No test cases found for question {submission['question_id']}")
            
            # Format test cases for Judge0
            formatted_test_cases = []
            for tc in test_cases:
                formatted_test_cases.append({
                    "input": tc["input_data"],
                    "output": tc["expected_output"]
                })
            
            print(f"Running {len(formatted_test_cases)} test cases for submission {submission['id']}")
            
            # Run the submission against test cases using Judge0
            result = await self.leetcode_api.submit_solution(
                submission["source_code"],
                submission["language"],
                formatted_test_cases
            )
            
            print(f"Judge0 result for submission {submission['id']}: {result}")
            
            # Calculate score
            score_data = self.calculate_score(result, test_cases)

            # Map status code to enum values
            status_mapping = {
                10: "accepted",           # All tests passed
                11: "wrong_answer",       # Some/no tests passed
                20: "compilation_error",  # Compile error
                99: "internal_error"      # System error
            }

            judge0_status = result.get("status_code", 99)
            api_status = status_mapping.get(judge0_status, "internal_error")
            
            # Create submission result matching the exact CURL schema
            submission_result = {
                "judge0_token": str(result.get("token", "")),
                "status": api_status,
                "stdout": str(result.get("code_output", [""])[-1] if result.get("code_output") else ""),
                "stderr": str(result.get("compile_error", "")),
                "compile_output": str(result.get("compile_error", "")),
                "exit_code": 0 if result.get("status_code") == 10 else 1,
                "execution_time": int(float(result.get("status_runtime", "0")) * 1000),  # Convert to milliseconds
                "memory_used": int(result.get("memory", 0)),
                "score": int(score_data["score"]),
                "max_score": int(score_data["max_score"]),
                "test_results": score_data["test_results"],
                "extra_data": {"judge0_response": result},
                "submission_id": str(submission["id"])
            }
            
            print(f"Saving submission result for {submission['id']}")
            
            # Save submission result
            await self.save_submission_result(submission_result)
            
            return submission_result
            
        except Exception as e:
            logger.error(f"Failed to process submission {submission['id']}: {e}")
            print(f"Error processing submission {submission['id']}: {e}")
            
            # Create failed submission result matching schema
            failed_result = {
                "judge0_token": "",
                "status": "failed",
                "stdout": "",
                "stderr": str(e),
                "compile_output": "",
                "exit_code": 1,
                "execution_time": 0,
                "memory_used": 0,
                "score": 0,
                "max_score": 0,
                "test_results": {"error": str(e)},
                "extra_data": {"error": str(e)},
                "submission_id": str(submission["id"])
            }
            
            try:
                await self.save_submission_result(failed_result)
            except Exception as save_error:
                print(f"Failed to save error result: {save_error}")
            
            raise e
    
    async def get_test_cases(self, question_id: str) -> List[Dict]:
        """Fetch test cases for a question"""
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"http://localhost:8000/questions/{question_id}/test-cases/"
            ) as response:
                if response.status == 200:
                    test_cases = await response.json()
                    print(f"Fetched {len(test_cases)} test cases for question {question_id}")
                    return test_cases
                else:
                    error_text = await response.text()
                    raise Exception(f"Failed to fetch test cases: {response.status} - {error_text}")
    
    def calculate_score(self, result: Dict, test_cases: List[Dict]) -> Dict:
        """Calculate score based on test results"""
        total_weight = sum(tc.get("weight", 1) for tc in test_cases)
        earned_score = 0
        
        total_correct = result.get("total_correct", 0)
        total_testcases = result.get("total_testcases", len(test_cases))
        
        # Calculate proportional score
        if total_testcases > 0:
            earned_score = (total_correct / total_testcases) * total_weight
        
        test_results = result.get("test_results", [])
        detailed_results = []
        
        for i, tc in enumerate(test_cases):
            test_result = test_results[i] if i < len(test_results) else {}
            weight = tc.get("weight", 1)
            passed = test_result.get("passed", False)
            
            detailed_results.append({
                "test_case_id": tc["id"],
                "passed": passed,
                "weight": weight,
                "input": tc["input_data"],
                "expected": tc["expected_output"],
                "actual": test_result.get("actual", ""),
                "status": test_result.get("status", "Unknown"),
                "time": test_result.get("time", "0"),
                "memory": test_result.get("memory", "0")
            })
        
        return {
            "score": earned_score,
            "max_score": total_weight,
            "test_results": {
                "total_tests": len(test_cases),
                "passed_tests": total_correct,
                "status_code": result.get("status_code", 99),
                "details": detailed_results
            }
        }
    
    async def save_submission_result(self, result: Dict):
        """Save submission result to database"""
        
        # Ensure all fields match the exact schema from your CURL command
        submission_result_data = {
            "judge0_token": str(result.get("judge0_token", "")),
            "status": str(result.get("status", "pending")),
            "stdout": str(result.get("stdout", "")),
            "stderr": str(result.get("stderr", "")),
            "compile_output": str(result.get("compile_output", "")),
            "exit_code": int(result.get("exit_code", 0)),
            "execution_time": int(result.get("execution_time", 0)),
            "memory_used": int(result.get("memory_used", 0)),
            "score": int(result.get("score", 0)),
            "max_score": int(result.get("max_score", 0)),
            "test_results": result.get("test_results", {}),
            "extra_data": result.get("extra_data", {}),
            "submission_id": str(result.get("submission_id"))
        }
        
        # Debug logging to see what we're sending
        print(f"Saving submission result for {submission_result_data['submission_id']}")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                "http://localhost:8000/submission-results/",
                json=submission_result_data,
                headers={
                    "accept": "application/json",
                    "Content-Type": "application/json"
                }
            ) as response:
                if response.status not in [200, 201]:
                    # Get detailed error information
                    error_text = await response.text()
                    print(f"Failed to save submission result. Status: {response.status}")
                    print(f"Error response: {error_text}")
                    print(f"Sent data: {submission_result_data}")
                    raise Exception(f"Failed to save submission result: {response.status} - {error_text}")
                else:
                    print(f"Successfully saved submission result with status: {response.status}")
    
    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get processing job status"""
        return self.processing_jobs.get(job_id)
    
    def cleanup_job(self, job_id: str):
        """Clean up completed job from memory"""
        if job_id in self.processing_jobs:
            del self.processing_jobs[job_id]

# Global processor instance
submission_processor = SubmissionProcessor()
