FROM maven:3.9.9-eclipse-temurin-21-alpine AS build

WORKDIR /app

COPY . .

RUN mvn clean package -DskipTests

FROM openjdk:21-slim AS run

WORKDIR /app

COPY --from=build /app/target/api-0.0.1-SNAPSHOT.jar /app/api.jar

# Expose the port the application will run on
EXPOSE 8080

# Command to run the jar file
ENTRYPOINT ["java", "-jar", "api.jar"]
