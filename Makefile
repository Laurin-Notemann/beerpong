# OpenApi Gen
.PHONY: gen-open-api
gen-open-api:
	./scripts/gen-api

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


# DOCKER SETUP
.PHONY: docker-backend-up
docker-backend-up: 
	docker compose --env-file .env -f docker/docker-compose-dev.yml up -d --build

.PHONY: docker-backend-stop
docker-backend-stop: 
	docker compose --env-file .env -f docker/docker-compose-dev.yml stop 

.PHONY: docker-backend-start
docker-backend-start: 
	docker compose --env-file .env -f docker/docker-compose-dev.yml start 

.PHONY: docker-backend-down
docker-backend-down: 
	docker compose --env-file .env -f docker/docker-compose-dev.yml down

.PHONY: docker-backend-rebuild
docker-backend-rebuild: 
	make docker-backend-down; make docker-backend-up

.PHONY: app-build-development
app-build-development: 
	 cd mobile-app && npx eas-cli build -p ios --profile development --local --output=../.gen-builds/build.tar.gz

.PHONY: app-build-preview
app-build-preview: 
	 cd mobile-app && npx eas-cli build -p ios --profile preview --local --output=../.gen-builds/build.tar.gz --non-interactive

.PHONY: app-build-staging
app-build-staging: 
	 cd mobile-app && npx eas-cli build -p ios --profile staging --local --output=../.gen-builds/build.ipa --non-interactive

