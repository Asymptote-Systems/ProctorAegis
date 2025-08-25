from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import List, Dict, Any
import uuid
import aiohttp
from ..services.submission_processor import submission_processor

router = APIRouter()

@router.post("/exams/{exam_id}/process-submissions")
async def process_submissions(
    exam_id: str,
    background_tasks: BackgroundTasks
):
    """Start processing submissions for an exam"""
    try:
        # Fetch submissions for the exam
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"http://localhost:8000/exams/{exam_id}/submissions?skip=0&limit=1000"
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=400, 
                        detail="Failed to fetch submissions"
                    )
                submissions = await response.json()
        
        if not submissions:
            raise HTTPException(
                status_code=404, 
                detail="No submissions found for this exam"
            )
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Start background processing
        background_tasks.add_task(
            submission_processor.process_submissions_batch,
            exam_id,
            submissions,
            job_id
        )
        
        return {
            "job_id": job_id,
            "message": f"Started processing {len(submissions)} submissions",
            "total_submissions": len(submissions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/processing-jobs/{job_id}/status")
async def get_processing_status(job_id: str):
    """Get processing job status"""
    status = submission_processor.get_job_status(job_id)
    
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return status

@router.delete("/processing-jobs/{job_id}")
async def cleanup_processing_job(job_id: str):
    """Clean up completed processing job"""
    submission_processor.cleanup_job(job_id)
    return {"message": "Job cleaned up successfully"}
