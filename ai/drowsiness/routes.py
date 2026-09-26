from fastapi import APIRouter, HTTPException, status
from drowsiness.schemas import DrowsinessRequest, DrowsinessResponse
from drowsiness.service import drowsiness_service
from common.logger import logger

router = APIRouter(prefix="/predict/drowsiness", tags=["Drowsiness Detection"])

@router.post("", response_model=DrowsinessResponse, status_code=status.HTTP_200_OK)
async def predict_drowsiness(payload: DrowsinessRequest):
    """
    POST /predict/drowsiness
    Validates input payload, decodes frameData, runs computer-vision drowsiness detection pipeline.
    """
    try:
        session_id = payload.sessionId or "default_session"
        result = drowsiness_service.analyze_frame(
            session_id=session_id,
            frame_data=payload.frameData
        )
        return DrowsinessResponse(**result)
    except ValueError as ve:
        logger.warning(f"Invalid frameData payload in drowsiness endpoint: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image payload: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in drowsiness endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during drowsiness analysis"
        )
