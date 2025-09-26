.PHONY: build run test clean deps install

# Build the application
build:
	go build -o bin/screenrecorder .

# Run the application
run:
	go run .

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -cover ./...

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf recordings/*
	rm -rf logs/*

# Install dependencies
deps:
	go mod download
	go mod tidy

# Install the application
install: build
	sudo cp bin/screenrecorder /usr/local/bin/

# Development mode with hot reload (requires air)
dev:
	air

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	golangci-lint run

# Check for security vulnerabilities
security:
	gosec ./...

# Generate documentation
docs:
	godoc -http=:6060

# Docker build
docker-build:
	docker build -t screenrecorder .

# Docker run
docker-run:
	docker run -p 8080:8080 screenrecorder

# Check if required tools are installed
check-tools:
	@which ffmpeg > /dev/null || (echo "FFmpeg is required but not installed" && exit 1)
	@which go > /dev/null || (echo "Go is required but not installed" && exit 1)

# Setup development environment
setup: check-tools deps
	@echo "Development environment setup complete"

# Run with specific configuration
run-dev:
	LOG_LEVEL=debug go run .

# Run with production configuration
run-prod:
	LOG_LEVEL=info go run .
