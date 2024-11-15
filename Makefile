# OpenApi Gen
.PHONY: gen-open-api
gen-open-api:
	export $(grep -v '^#' .env | xargs)
	cd api && mvn verify && cd ..
	sed -i '' "s/'\*\/\*'/application\/json/g" openapi/openapi.yaml
	cd mobile-app && npm run gen-types

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
