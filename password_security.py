from werkzeug.security import check_password_hash, generate_password_hash


DEFAULT_MAX_AGE_SECONDS = 90 * 24 * 60 * 60
DEFAULT_HISTORY_COUNT = 5
MAX_HISTORY_COUNT = 24
MIN_ENABLED_AGE_SECONDS = 1


def normalize_password_policy(data=None):
    source = data or {}
    try:
        max_age_seconds = int(source.get("maxAgeSeconds", DEFAULT_MAX_AGE_SECONDS))
    except (TypeError, ValueError):
        max_age_seconds = DEFAULT_MAX_AGE_SECONDS
    try:
        history_count = int(source.get("historyCount", DEFAULT_HISTORY_COUNT))
    except (TypeError, ValueError):
        history_count = DEFAULT_HISTORY_COUNT
    return {
        "maxAgeSeconds": max(0, max_age_seconds),
        "historyCount": min(MAX_HISTORY_COUNT, max(0, history_count)),
    }


def hash_password(password):
    return generate_password_hash(
        str(password or ""),
        method="pbkdf2:sha256:260000",
        salt_length=16,
    )


def password_matches_history(password, password_history):
    for password_hash in list(password_history or []):
        try:
            if check_password_hash(str(password_hash), str(password or "")):
                return True
        except (TypeError, ValueError):
            continue
    return False


def build_password_history(new_password, existing_history, history_count, current_password=""):
    count = min(MAX_HISTORY_COUNT, max(0, int(history_count or 0)))
    if count == 0:
        return []
    previous = [str(item) for item in list(existing_history or []) if item]
    result = [hash_password(new_password)]
    if (
        current_password
        and current_password != new_password
        and not password_matches_history(current_password, previous)
    ):
        result.append(hash_password(current_password))
    result.extend(
        item for item in previous
        if not password_matches_history(new_password, [item])
    )
    return result[:count]
