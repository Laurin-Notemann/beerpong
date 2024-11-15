# OpenApi Gen

# DOCKER SETUP
.PHONY: docker-db-up
docker-db-up: 
	docker compose --env-file .env -f docker/docker-compose.yml up -d database

.PHONY: docker-db-stop
docker-db-stop: 
	docker compose --env-file .env -f docker/docker-compose.yml stop database

.PHONY: docker-db-start
docker-db-start: 
	docker compose --env-file .env -f docker/docker-compose.yml start database

.PHONY: docker-db-down
docker-db-down: 
	docker compose --env-file .env -f docker/docker-compose.yml down database
