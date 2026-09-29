from pymongo import MongoClient
import certifi
import ssl

print("Python:", __import__("sys").version)
print("OpenSSL:", ssl.OPENSSL_VERSION)
print("CA:", certifi.where())

uri = "mongodb+srv://kanishka0402_db_user:xlRUIZBcXhb7Ob2G@cluster0.s16teyn.mongodb.net"

client = MongoClient(
    uri,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=15000
)

print("Testing MongoDB...")
print(client.admin.command("ping"))
print("MongoDB connected!")