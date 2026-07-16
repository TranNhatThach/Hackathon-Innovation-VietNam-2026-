import os
import sys
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from dotenv import load_dotenv

# Ensure backend root can be loaded
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

load_dotenv()

def seed_databases():
    print("🌱 Initializing seeding process...")
    
    # 1. Seed Vector Database (Qdrant)
    qdrant_host = os.getenv("QDRANT_HOST", "localhost")
    qdrant_port = int(os.getenv("QDRANT_PORT", "6333"))
    
    print(f"Connecting to Qdrant at {qdrant_host}:{qdrant_port}...")
    try:
        client = QdrantClient(host=qdrant_host, port=qdrant_port)
        collection_name = "hackathon_docs"
        
        # Recreate collection
        client.recreate_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
        )
        print(f"Collection '{collection_name}' created in Qdrant successfully.")
        
        # Placeholders for document upsert
        # client.upsert(collection_name=collection_name, points=[...])
        
    except Exception as e:
         print(f"⚠️ Vector DB connection/seeding failed (ensure Qdrant container is active): {e}")

    # 2. Seed Relational Database (Postgres)
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        print("Connecting to Postgres database...")
        # SQLAlchemy tables creation and seed scripts can go here
        print("PostgreSQL seeding helper loaded.")

    print("🎉 Seeding routine complete!")

if __name__ == "__main__":
    seed_databases()
