import os
import sys
import uuid
from dotenv import load_dotenv

# Ensure backend root can be loaded
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(ROOT_DIR)

load_dotenv()

from agent import index_chunks, init_qdrant_collection

def parse_file(file_path: str):
    """
    Parses a text (.txt) or markdown (.md) file and splits it into chunks.
    For .md, splits by '## ' headings.
    For .txt, splits by double newlines (paragraphs) or fixed size.
    """
    if not os.path.exists(file_path):
        print(f"❌ File not found at {file_path}")
        return []

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read().strip()

    file_name = os.path.basename(file_path)
    chunks = []
    
    # Generate unique integer hash range for IDs
    base_id = hash(file_name) % 10000000
    
    if file_path.endswith(".md"):
        # Split by markdown headers
        sections = content.split("\n## ")
        chunk_id = base_id
        
        for section in sections:
            section = section.strip()
            if not section:
                continue
            
            lines = section.split("\n")
            title = lines[0].strip().replace("## ", "")
            text = f"Tài liệu: {file_name}\nPhần: {title}\n\n{section}"
            
            chunks.append({
                "id": chunk_id,
                "text": text,
                "title": title,
                "source": file_name
            })
            chunk_id += 1
    else:
        # Split .txt by paragraphs (double newlines)
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        chunk_id = base_id
        
        for i, para in enumerate(paragraphs):
            # Extract first 40 chars as title
            title = para.split("\n")[0][:40] + "..." if len(para.split("\n")[0]) > 40 else para.split("\n")[0]
            text = f"Tài liệu: {file_name}\nĐoạn {i+1}: {title}\n\n{para}"
            
            chunks.append({
                "id": chunk_id,
                "text": text,
                "title": f"{file_name} - Đoạn {i+1}",
                "source": file_name
            })
            chunk_id += 1

    return chunks

def main():
    if len(sys.argv) < 2:
        print("❌ Vui lòng truyền đường dẫn file cần import. Ví dụ:")
        print("python scripts/import_file.py data/raw/quy_trinh_tiep_don.txt")
        return

    relative_path = sys.argv[1]
    file_path = os.path.join(ROOT_DIR, relative_path) if not os.path.isabs(relative_path) else relative_path
    
    print(f"📖 Đang đọc file: {file_path}...")
    chunks = parse_file(file_path)
    
    if not chunks:
        print("⚠️ Không có nội dung nào được trích xuất để nạp.")
        return

    print(f"✅ Trích xuất thành công {len(chunks)} đoạn văn bản.")
    print("🔧 Đang kiểm tra và khởi tạo Qdrant collection (nếu chưa có)...")
    init_qdrant_collection()
    print("🚀 Đang tiến hành tạo Vector Embedding qua FPT và nạp vào Qdrant...")
    
    if index_chunks(chunks):
        print(f"🎉 Đã nạp thành công tài liệu '{os.path.basename(file_path)}' vào Vector Database!")
    else:
        print("❌ Nạp tài liệu thất bại.")

if __name__ == "__main__":
    main()
