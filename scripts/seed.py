import os
import sys
from typing import List
from dotenv import load_dotenv

# Ensure backend root can be loaded
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

load_dotenv()

from agent import init_qdrant_collection, index_chunks

def chunk_text(text: str, max_chars: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    if len(text) <= max_chars:
        return [text]
        
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        
        if end < len(text):
            lookback = int(max_chars * 0.15)
            break_points = [
                text.rfind('\n', end - lookback, end),
                text.rfind('. ', end - lookback, end),
                text.rfind(' ', end - lookback, end)
            ]
            valid_breaks = [bp for bp in break_points if bp != -1]
            if valid_breaks:
                end = max(valid_breaks) + 1
                
        chunks.append(text[start:end].strip())
        start = end - overlap
        if start >= len(text) or end == len(text):
            break
    return chunks

def parse_knowledge_base(file_path: str):
    """
    Parses the markdown knowledge base file.
    Splits the file by '## ' headings, then sub-chunks to max 1000 characters.
    """
    if not os.path.exists(file_path):
        print(f"❌ Knowledge base file not found at {file_path}")
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split content by '## '
    sections = content.split("\n## ")
    chunks = []
    chunk_id = 1
    
    for section in sections[1:]:
        section = section.strip()
        if not section:
            continue
            
        # Extract title from the first line
        lines = section.split("\n")
        title = lines[0].strip()
        
        # Sub-chunk the section if it is too long
        sub_chunks = chunk_text(section, max_chars=1000, overlap=200)
        for j, sub_text in enumerate(sub_chunks):
            text = f"Tài liệu: Bệnh viện Tim Hà Nội\nPhần: {title} (Đoạn {j+1})\n\n{sub_text}"
            chunks.append({
                "id": chunk_id,
                "text": text,
                "title": f"{title} - Đoạn {j+1}" if len(sub_chunks) > 1 else title,
                "source": "data/raw/knowledge_base.md"
            })
            chunk_id += 1
        
    return chunks

def seed_databases():
    print("🌱 Initializing seeding process...")
    
    # 1. Initialize Qdrant collection first (always create/recreate it)
    print("Connecting and initializing Qdrant collection...")
    if not init_qdrant_collection():
        print("❌ Failed to initialize Qdrant collection. Check Qdrant service is running.")
        return
    print("✅ Qdrant collection ready.")
        
    # 2. Find and parse all files in data/raw
    raw_dir = os.path.join(ROOT_DIR, "data", "raw")
    if not os.path.exists(raw_dir):
        print(f"❌ Raw data directory not found at {raw_dir}")
        return

    all_chunks = []
    parsed_files = 0
    
    for filename in sorted(os.listdir(raw_dir)):
        if filename.startswith(".") or not filename.endswith((".txt", ".md")):
            continue
            
        file_path = os.path.join(raw_dir, filename)
        print(f"\nParsing: {filename}...")
        
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            print(f"  ⚠️  Could not read {filename}: {e}")
            continue
            
        if filename == "knowledge_base.md":
            chunks = parse_knowledge_base(file_path)
        else:
            # Parse text/markdown files using optimized chunking
            chunks = []
            base_id = abs(hash(filename)) % 10000000
            chunk_id = base_id
            
            if filename.endswith(".md"):
                # Split by markdown '## ' headers
                sections = content.split("\n## ")
                for section in sections:
                    section = section.strip()
                    if not section:
                        continue
                    lines = section.split("\n")
                    title = lines[0].strip().replace("## ", "").replace("# ", "")
                    sub_chunks = chunk_text(section, max_chars=1000, overlap=200)
                    for j, sub_text in enumerate(sub_chunks):
                        text = f"Tài liệu: {filename}\nPhần: {title} (Đoạn {j+1})\n\n{sub_text}"
                        chunks.append({
                            "id": chunk_id,
                            "text": text,
                            "title": f"{title} - Đoạn {j+1}" if len(sub_chunks) > 1 else title,
                            "source": filename
                        })
                        chunk_id += 1
            else:
                paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
                for i, para in enumerate(paragraphs):
                    first_line = para.split("\n")[0]
                    title = first_line[:40] + "..." if len(first_line) > 40 else first_line
                    sub_chunks = chunk_text(para, max_chars=1000, overlap=200)
                    for j, sub_text in enumerate(sub_chunks):
                        text = f"Tài liệu: {filename}\nPhần: {title} (Phân đoạn {j+1})\n\n{sub_text}"
                        chunks.append({
                            "id": chunk_id,
                            "text": text,
                            "title": f"{filename} - {title} ({j+1})" if len(sub_chunks) > 1 else f"{filename} - {title}",
                            "source": filename
                        })
                        chunk_id += 1
                    
        if chunks:
            print(f"  → Extracted {len(chunks)} chunks")
            all_chunks.extend(chunks)
            parsed_files += 1
        else:
            print(f"  ⚠️  No chunks extracted (file may be empty or have no ## headers)")
        
    if not all_chunks:
        print("\n⚠️  No chunks found in data/raw/. Qdrant collection is initialized but empty.")
        print("   Place .md or .txt files in data/raw/ then re-run this script.")
        print("   Example: docker compose exec backend python scripts/import_file.py data/raw/myfile.md")
        return
        
    print(f"\n📊 Total: {len(all_chunks)} chunks from {parsed_files} file(s).")
    print("Indexing all chunks into Qdrant (this may take a few minutes)...")
    if index_chunks(all_chunks):
        print(f"✅ Successfully indexed {len(all_chunks)} chunks into Qdrant!")
    else:
        print("❌ Failed to index chunks into Qdrant.")

    # 3. Note about Postgres (tables are auto-created by FastAPI on startup)
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        print("\n✅ PostgreSQL connection available. Tables are created automatically on FastAPI startup.")
        print("   To manually run migrations: docker compose exec backend python scripts/migrate_db.py")

    print("\n🎉 Seeding routine complete!")

if __name__ == "__main__":
    seed_databases()
