# CI/CD Setup for Expeta 2.0

This document describes the Continuous Integration and Continuous Deployment (CI/CD) setup for the Expeta 2.0 project.

## Overview

The CI/CD pipeline is implemented using GitHub Actions and consists of the following components:

1. **Backend Tests**: Runs linting, unit tests, and integration tests for the backend
2. **Frontend Tests**: Runs linting, unit tests, and builds the frontend
3. **UI Tests**: Runs Playwright tests with recording/replay capabilities
4. **Environment Configuration**: Sets up the necessary environment variables for testing

## GitHub Actions Workflow

The workflow is defined in `.github/workflows/ci.yml` and is triggered on:
- Push to the `main` branch
- Pull requests targeting the `main` branch

### Backend Pipeline

The backend pipeline performs the following steps:
1. Checkout code with submodules
2. Set up Node.js environment
3. Install backend dependencies
4. Run linting
5. Run tests with Jest
6. Build the backend
7. Upload test results as artifacts

### Frontend Pipeline

The frontend pipeline performs the following steps:
1. Checkout code with submodules
2. Set up Node.js environment
3. Install frontend dependencies
4. Run linting
5. Run tests
6. Build the frontend

### UI Testing Pipeline

The UI testing pipeline performs the following steps:
1. Checkout code with submodules
2. Set up Node.js environment
3. Install Playwright and dependencies
4. Run Playwright tests
5. Upload test reports and traces as artifacts for replay

## UI Test Replay Capability

The CI/CD pipeline includes UI test recording and replay capabilities using Playwright:

1. **Test Recording**: Playwright automatically records test executions, including:
   - Screenshots at key points
   - Full DOM snapshots
   - Network requests and responses
   - Console logs
   - Test traces for debugging

2. **Test Replay**: The recorded tests can be replayed using:
   - GitHub Actions artifacts (available for 30 days)
   - Playwright Trace Viewer: `npx playwright show-trace path/to/trace.zip`

3. **Visual Testing**: Compare visual snapshots between test runs to detect UI regressions

## Environment Variables

The following environment variables are required for the CI/CD pipeline:

- `OPENAI_API_KEY`: API key for OpenAI services
- `ANTHROPIC_API_KEY`: API key for Anthropic services

These should be configured as GitHub repository secrets.

## Test Coverage

The test suite includes:
- Unit tests for individual services
- Integration tests for service interactions
- Semantic mediator integration tests
- UI tests with visual verification

## Running Tests Locally

To run the tests locally:

```bash
# Backend tests
cd src/backend
npm test

# Frontend tests
cd src/frontend
npm test

# UI tests with Playwright
cd src/frontend
npx playwright test

# View Playwright test report
npx playwright show-report

# Replay a specific test trace
npx playwright show-trace test-results/trace.zip
```

## Troubleshooting

If tests are failing in the CI environment but passing locally, check:
1. Environment variables are properly set in GitHub secrets
2. Node.js version matches between local and CI environments
3. All dependencies are properly installed
4. For UI tests, check the Playwright trace for browser-specific issues

## Future Improvements

Planned improvements for the CI/CD pipeline:
1. Add code coverage reporting
2. Implement automatic deployment to staging environment
3. Expand UI test coverage
4. Implement performance testing
5. Add visual regression testing with automatic baseline updates
