.PHONY: build up down ps logs clean seed migrate evaluate test

# Start the environment (detached)
up:
	docker compose up -d

# Build all containers
build:
	docker compose build

# Stop the environment
down:
	docker compose down

# Check containers status
ps:
	docker compose ps

# View container logs (stream)
logs:
	docker compose logs -f

# Clean up docker images, volumes, and cached files
clean:
	docker compose down -v
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete

# Run database migrations
migrate:
	docker compose exec backend python scripts/migrate_db.py

# Seed vector database with hospital knowledge documents from data/raw/
seed:
	docker compose exec backend python scripts/seed.py

# Import a single file into vector database
# Usage: make import FILE=data/raw/myfile.md
import:
	docker compose exec backend python scripts/import_file.py $(FILE)

# Run agent quality evaluation tests
evaluate:
	docker compose exec backend python scripts/evaluate.py

# Run hybrid RAG retrieval tests
test-rag:
	docker compose exec backend python scripts/test_hybrid_rag.py

# Run conversation history persistence tests
test-history:
	docker compose exec backend python scripts/test_conversation_history.py

# Run all test suites
test: test-rag test-history
