
from database import db
from main import app


def test_database_connection():

    with app.app_context():

        try:

            db.session.execute(
                db.text("SELECT 1")
            )

            print(
                "\nSUCCESS: MySQL database connected!"
            )

            print(
                "Database: studyai_db"
            )

        except Exception as error:

            print(
                "\nERROR: Database connection failed"
            )

            print(error)

        finally:

            db.session.remove()


if __name__ == "__main__":

    test_database_connection()
