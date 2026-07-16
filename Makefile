.PHONY: build up down ps logs clean seed test

# Start the environment
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

# View container logs
logs:
	docker compose logs -f

# Clean up docker images, volumes, and cached files
clean:
	docker compose down -v
	find . -type d -name "__pycache__" -exec rm -r {} +
	find . -type f -name "*.pyc" -delete

# Seed database with sample data
seed:
	docker compose exec backend python scripts/seed.py

# Run backend evaluation scripts
evaluate:
	docker compose exec backend python scripts/evaluate.py
