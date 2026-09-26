from fastapi import APIRouter, HTTPException, status
from traffic_sign.schemas import TrafficSignRequest, TrafficSignResponse
from traffic_sign.service import traffic_sign_service
from common.logger import logger

router = APIRouter(prefix="/predict/traffic-sign", tags=["Traffic Sign Recognition"])

@router.post("", response_model=TrafficSignResponse, status_code=status.HTTP_200_OK)
async def predict_traffic_sign(payload: TrafficSignRequest):
    """
    POST /predict/traffic-sign
    Validates imageData payload, decodes base64 string, runs computer-vision traffic sign classifier pipeline.
    """
    try:
        result = traffic_sign_service.process_image(image_data=payload.imageData)
        return TrafficSignResponse(**result)
    except ValueError as ve:
        logger.warning(f"Invalid imageData payload in traffic sign endpoint: {str(ve)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image payload: {str(ve)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error in traffic sign endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during traffic sign recognition"
        )
