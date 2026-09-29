import hashlib
import os
import secrets

from datetime import datetime, timedelta, timezone

import bcrypt

from bson import ObjectId

from fastapi import (
    Depends,
    HTTPException,
    Request,
)

from database.mongodb import db


# =========================================================
# COLLECTIONS
# =========================================================

admin_collection = db["admins"]

admin_session_collection = db["admin_sessions"]


# =========================================================
# CONFIGURATION
# =========================================================

SESSION_COOKIE_NAME = "qid_admin_session"

SESSION_HOURS = int(
    os.getenv(
        "ADMIN_SESSION_HOURS",
        "12"
    )
)


# =========================================================
# TIME
# =========================================================

def utc_now():

    return datetime.now(
        timezone.utc
    )


# =========================================================
# PASSWORD HASHING
# =========================================================

def hash_password(password: str):

    if not password:

        raise ValueError(
            "Password cannot be empty"
        )

    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    password: str,
    password_hash: str
):

    if not password:
        return False

    if not password_hash:
        return False

    try:

        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8")
        )

    except Exception:

        return False


# =========================================================
# SESSION TOKEN HASH
# =========================================================

def hash_session_token(
    token: str
):

    return hashlib.sha256(
        token.encode("utf-8")
    ).hexdigest()


# =========================================================
# CREATE ADMIN SESSION
# =========================================================

def create_admin_session(
    admin_id
):

    raw_token = secrets.token_urlsafe(
        48
    )

    token_hash = hash_session_token(
        raw_token
    )

    now = utc_now()

    expires_at = (
        now
        + timedelta(
            hours=SESSION_HOURS
        )
    )

    admin_session_collection.insert_one({

        "token_hash":
            token_hash,

        "admin_id":
            admin_id,

        "created_at":
            now,

        "expires_at":
            expires_at,

    })

    return raw_token


# =========================================================
# SET ADMIN COOKIE
# =========================================================

def set_admin_cookie(
    response,
    token: str
):

    response.set_cookie(

        key=SESSION_COOKIE_NAME,

        value=token,

        httponly=True,

        # Local development uses HTTP
        secure=False,

        samesite="lax",

        max_age=(
            SESSION_HOURS
            * 60
            * 60
        ),

        path="/",

    )


# =========================================================
# CLEAR ADMIN COOKIE
# =========================================================

def clear_admin_cookie(
    response
):

    response.delete_cookie(

        key=SESSION_COOKIE_NAME,

        path="/",

    )


# =========================================================
# GET CURRENT ADMIN
# =========================================================

def get_current_admin(
    request: Request
):

    # -----------------------------------------------------
    # GET COOKIE
    # -----------------------------------------------------

    token = request.cookies.get(
        SESSION_COOKIE_NAME
    )

    if not token:

        raise HTTPException(
            status_code=401,
            detail="Admin login required"
        )


    # -----------------------------------------------------
    # HASH COOKIE TOKEN
    # -----------------------------------------------------

    token_hash = hash_session_token(
        token
    )


    # -----------------------------------------------------
    # FIND SESSION
    # -----------------------------------------------------

    session = (
        admin_session_collection.find_one({
            "token_hash":
                token_hash
        })
    )


    if not session:

        raise HTTPException(
            status_code=401,
            detail="Invalid admin session"
        )


    # -----------------------------------------------------
    # CHECK EXPIRY
    # -----------------------------------------------------

    expires_at = session.get(
        "expires_at"
    )


    if not expires_at:

        raise HTTPException(
            status_code=401,
            detail="Invalid admin session"
        )


    if expires_at.tzinfo is None:

        expires_at = (
            expires_at.replace(
                tzinfo=timezone.utc
            )
        )


    if expires_at <= utc_now():

        admin_session_collection.delete_one({

            "_id":
                session["_id"]

        })

        raise HTTPException(
            status_code=401,
            detail="Admin session expired"
        )


    # -----------------------------------------------------
    # GET ADMIN ID
    # -----------------------------------------------------

    admin_id = session.get(
        "admin_id"
    )


    if not admin_id:

        raise HTTPException(
            status_code=401,
            detail="Invalid admin session"
        )


    # -----------------------------------------------------
    # HANDLE OLD STRING IDs
    # -----------------------------------------------------

    if isinstance(
        admin_id,
        str
    ):

        try:

            admin_id = ObjectId(
                admin_id
            )

        except Exception:

            raise HTTPException(
                status_code=401,
                detail="Invalid admin ID"
            )


    # -----------------------------------------------------
    # FIND ACTIVE ADMIN
    # -----------------------------------------------------

    admin = (
        admin_collection.find_one({

            "_id":
                admin_id,

            "active":
                True,

        })
    )


    if not admin:

        raise HTTPException(
            status_code=401,
            detail="Admin account inactive"
        )


    # -----------------------------------------------------
    # VERIFY ADMIN ROLE HERE
    # -----------------------------------------------------
    #
    # This replaces the old require_admin()
    # dependency.
    #
    # Any request using Depends(get_current_admin)
    # is allowed only for an actual ADMIN account.
    #

    role = str(
        admin.get(
            "role",
            ""
        )
    ).strip().upper()


    if role != "ADMIN":

        raise HTTPException(
            status_code=403,
            detail="Admin authorization required"
        )


    return admin


# =========================================================
# DELETE CURRENT ADMIN SESSION
# =========================================================

def delete_current_admin_session(
    request: Request
):

    token = request.cookies.get(
        SESSION_COOKIE_NAME
    )


    if not token:
        return


    token_hash = hash_session_token(
        token
    )


    admin_session_collection.delete_one({

        "token_hash":
            token_hash

    })