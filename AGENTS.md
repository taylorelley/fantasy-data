# AGENTS.md

This AGENTS file provides contribution guidelines for fantasy-data

## Testing and Validation

- Use **test-driven development (TDD)**. Add or update tests in `tests/` for any new functionality or bug fix before or alongside the implementation.
- Before committing changes, run:
  ```bash
  npm run lint
  npm test
  ```  
Both commands must succeed. If either fails, fix the issues before committing.
- Keep the repository compatible with Node.js 22.19 (LTS).

## General Guidelines

- Follow the existing project structure and naming conventions.
- When adding dependencies, update package.json and run npm install to lock them in package-lock.json.
- Formatting with: 
  ```bash
  npx prettier --write .
  ```  
is recommended before committing.
