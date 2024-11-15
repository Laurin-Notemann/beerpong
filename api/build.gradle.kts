plugins {
	java
	id("org.springframework.boot") version "3.3.5"
	id("io.spring.dependency-management") version "1.1.6"
}

group = "pro.beerpong"
version = "1.0.0-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation(rootProject.libs.bundles.spring)

	compileOnly(rootProject.libs.lombok)
	annotationProcessor(rootProject.libs.lombok)

	runtimeOnly(rootProject.libs.postgres)

	testImplementation(rootProject.libs.testing)
	testRuntimeOnly(rootProject.libs.junit)
}

tasks.withType<Test> {
	useJUnitPlatform()
}
