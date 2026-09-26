from typing import Dict, Any

TRAFFIC_SIGN_METADATA: Dict[str, Dict[str, str]] = {
    "Stop Sign": {
        "meaning": "Stop completely and yield right-of-way before proceeding",
        "recommendedAction": "Bring vehicle to a complete stop at the stop line and scan for oncoming traffic"
    },
    "Speed Limit": {
        "meaning": "Maximum speed limit is 40 km/h",
        "recommendedAction": "Adjust speed to 40 km/h or below according to road conditions"
    },
    "Speed Limit 30": {
        "meaning": "Maximum speed limit is 30 km/h",
        "recommendedAction": "Slow down and maintain speed at or below 30 km/h"
    },
    "Speed Limit 40": {
        "meaning": "Maximum speed limit is 40 km/h",
        "recommendedAction": "Adjust speed to 40 km/h or below according to road conditions"
    },
    "Speed Limit 50": {
        "meaning": "Maximum speed limit is 50 km/h",
        "recommendedAction": "Maintain safe speed at or below 50 km/h"
    },
    "Speed Limit 80": {
        "meaning": "Maximum speed limit is 80 km/h",
        "recommendedAction": "Drive at or below 80 km/h on open road"
    },
    "Yield": {
        "meaning": "Yield right-of-way to oncoming traffic",
        "recommendedAction": "Slow down and prepare to stop if vehicles or pedestrians are approaching"
    },
    "No Entry": {
        "meaning": "No entry. Do not proceed further",
        "recommendedAction": "Do not enter this roadway. Turn around or select an alternative route immediately"
    },
    "No Parking": {
        "meaning": "No parking zone",
        "recommendedAction": "Do not stop or park vehicle in this designated area"
    },
    "Pedestrian Crossing": {
        "meaning": "Pedestrian crossing ahead. Drive with caution",
        "recommendedAction": "Reduce speed, watch for pedestrians near crosswalks, and prepare to yield"
    },
    "School Zone": {
        "meaning": "School zone ahead. Reduce speed and watch for children",
        "recommendedAction": "Strict speed limit 25 km/h. Watch for children crossing roadway"
    },
    "Sharp Turn": {
        "meaning": "Sharp curve ahead. Reduce speed",
        "recommendedAction": "Decelerate vehicle before entering turn to maintain stability"
    },
    "Dangerous Turn": {
        "meaning": "Dangerous curve ahead",
        "recommendedAction": "Slow down to a safe speed and maintain lane position"
    },
    "Zig-Zag Road": {
        "meaning": "Winding or zig-zag road ahead",
        "recommendedAction": "Maintain cautious speed and steering control across curves"
    },
    "Construction": {
        "meaning": "Road construction / maintenance work ahead",
        "recommendedAction": "Reduce speed, follow detour signs, and watch for construction workers"
    },
    "Slippery Road": {
        "meaning": "Slippery road surface ahead",
        "recommendedAction": "Reduce speed and avoid sudden braking or hard steering"
    },
    "Mandatory Turn Left": {
        "meaning": "Mandatory left turn ahead",
        "recommendedAction": "Signal left and prepare to complete a left turn at the intersection"
    },
    "Mandatory Turn Right": {
        "meaning": "Mandatory right turn ahead",
        "recommendedAction": "Signal right and prepare to complete a right turn at the intersection"
    },
    "Roundabout": {
        "meaning": "Roundabout ahead. Yield to traffic inside roundabout",
        "recommendedAction": "Reduce speed, yield to traffic approaching from your right/inside, and join roundabout when clear"
    },
    "Speed Bump": {
        "meaning": "Speed bump ahead. Slow down",
        "recommendedAction": "Reduce speed to prevent vehicle damage and ensure passenger comfort"
    },
    "Traffic Light Ahead": {
        "meaning": "Traffic signals ahead. Prepare to stop if necessary",
        "recommendedAction": "Scan signal lights ahead and prepare for potential signal change"
    },
    "Unknown Sign": {
        "meaning": "Traffic sign detected with low confidence. Proceed with caution",
        "recommendedAction": "Maintain heightened driver awareness and observe road surroundings carefully"
    }
}

def get_sign_details(sign_type: str) -> Dict[str, str]:
    """
    Returns dictionary with meaning and recommendedAction for sign_type.
    """
    return TRAFFIC_SIGN_METADATA.get(sign_type, TRAFFIC_SIGN_METADATA["Unknown Sign"])

def get_sign_meaning(sign_type: str) -> str:
    """
    Returns human readable meaning string for sign_type.
    """
    details = get_sign_details(sign_type)
    return details["meaning"]
