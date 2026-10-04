from datetime import datetime

def compute_priority(created_at: datetime, estimated_minutes: int, item_count: int) -> str:
    """Simple deterministic score: wait minutes + 0.5*ETA + 2*item count."""
    wait = max(0, int((datetime.utcnow() - created_at).total_seconds() // 60))
    score = wait + int(0.5 * estimated_minutes) + (2 * item_count)
    if score >= 35:
        return "HIGH"
    if score >= 20:
        return "MEDIUM"
    return "NORMAL"
