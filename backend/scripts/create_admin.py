import getpass

from datetime import (
    datetime,
    timezone,
)

from database.mongodb import db

from auth.security import hash_password


admin_collection = db["admins"]


def main():

    print()
    print("==============================")
    print(" QID ADMIN CREATION")
    print("==============================")
    print()

    username = input(
        "Username: "
    ).strip().lower()

    email = input(
        "Email: "
    ).strip().lower()

    password = getpass.getpass(
        "Password: "
    )

    confirm = getpass.getpass(
        "Confirm password: "
    )

    if password != confirm:

        print(
            "Passwords do not match."
        )

        return

    if len(password) < 8:

        print(
            "Password must be at least "
            "8 characters."
        )

        return

    existing = admin_collection.find_one({

        "$or": [

            {
                "username":
                    username
            },

            {
                "email":
                    email
            },

        ]
    })

    if existing:

        print(
            "Admin already exists."
        )

        return


    admin_collection.insert_one({

        "username":
            username,

        "email":
            email,

        "password_hash":
            hash_password(
                password
            ),

        "role":
            "ADMIN",

        "active":
            True,

        "created_at":
            datetime.now(
                timezone.utc
            ),
    })


    print()
    print(
        "Admin created successfully."
    )


if __name__ == "__main__":
    main()