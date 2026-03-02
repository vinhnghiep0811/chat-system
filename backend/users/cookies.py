import traceback

def set_auth_cookies(response, access: str, refresh: str, secure: bool = False):
    # dev: secure=False (http). deploy: secure=True (https)
    print("DEBUG set_auth_cookies called from:\n", "".join(traceback.format_stack(limit=8)))
    common = dict(
        httponly=True,
        secure=True,
        samesite=None,
        path="/",
    )
    response.set_cookie("access_token", access, max_age=60 * 15, **common)
    response.set_cookie("refresh_token", refresh, max_age=60 * 60 * 24 * 7, **common)

def clear_auth_cookies(response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
