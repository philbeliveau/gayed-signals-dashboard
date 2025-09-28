# Git Workflow Standards

## Branch Naming Conventions

### Branch Types and Naming
```bash
# Feature branches
feature/agent-orchestration-system
feature/websocket-conversation-streaming
feature/prisma-uuid-schema

# Bug fixes
fix/uuid-conversion-authentication-bug
fix/websocket-connection-timeout

# Documentation
docs/api-specification-update
docs/deployment-guide

# Architecture/Infrastructure
arch/autogen-integration-patterns
infra/railway-deployment-config

# Hotfixes (for production issues)
hotfix/critical-auth-vulnerability
hotfix/websocket-memory-leak
```

## Commit Message Standards

### Commit Format
```bash
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore, arch

feat(agents): implement AutoGen financial analyst agent
fix(auth): prevent UUID conversion bugs in user mapping
docs(api): add WebSocket endpoint documentation
arch(backend): define FastAPI service architecture
test(agents): add conversation orchestration tests
chore(deps): update AutoGen to v0.2.36
style(frontend): format agent conversation components
refactor(database): optimize conversation query performance
```

### Commit Message Examples
```bash
# ✅ GOOD: Clear, specific, follows convention
feat(websocket): add real-time agent message streaming
fix(prisma): resolve UUID conversion error in user queries
docs(architecture): add security patterns documentation

# ❌ BAD: Vague, no scope, poor description
fix: bug
update stuff
working on agents

# ✅ GOOD: Multi-line for complex changes
feat(agents): implement financial analyst agent with signal integration

- Add AutoGen financial analyst with GPT-4 integration
- Integrate existing Gayed signal calculations
- Add confidence scoring and market context
- Include WebSocket streaming for real-time updates

Closes #123, addresses architectural requirement from docs/architecture/
```

## Pull Request Standards

### PR Template
```markdown
## Summary
Brief description of changes and why they're needed.

## Architecture Impact
- [ ] Follows established patterns from docs/architecture/
- [ ] Maintains UUID security patterns
- [ ] Preserves existing domain structure
- [ ] No breaking changes to public APIs
- [ ] Updates documentation if architectural changes made

## Implementation Details
- [ ] Code follows coding standards from docs/architecture/coding-standards.md
- [ ] File organization follows docs/architecture/source-tree.md
- [ ] Security patterns implemented per docs/architecture/security-patterns.md

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] UUID conversion patterns tested
- [ ] AutoGen agent behavior validated
- [ ] WebSocket connections tested
- [ ] Performance regression tests pass

## Security Review
- [ ] No secrets in code
- [ ] Authentication patterns followed
- [ ] UUID conversion utilities used properly
- [ ] Input validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

## Dependencies
- [ ] No new dependencies without architectural approval
- [ ] All dependencies security scanned
- [ ] Version pinning for stability

## Deployment
- [ ] Environment variables documented
- [ ] Migration scripts included (if applicable)
- [ ] Deployment tested in staging
- [ ] Rollback plan documented

## Related Issues
Closes #123
Addresses architectural requirement from docs/architecture/tech-stack.md
```

### PR Review Checklist

#### For Reviewers
```markdown
## Code Quality
- [ ] Code follows established patterns from docs/architecture/
- [ ] Naming conventions followed
- [ ] Error handling implemented
- [ ] Logging appropriately added
- [ ] Performance considerations addressed

## Security
- [ ] UUID conversion patterns used correctly
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Authentication properly implemented
- [ ] Authorization checks in place

## Architecture Compliance
- [ ] Follows domain-driven structure
- [ ] Uses established tech stack
- [ ] Integrates properly with existing systems
- [ ] Maintains separation of concerns
- [ ] Follows AutoGen integration patterns

## Testing
- [ ] Adequate test coverage
- [ ] Tests follow established patterns
- [ ] Integration points tested
- [ ] Error scenarios tested
```

## Development Workflow

### Feature Development Process
```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/agent-conversation-export

# 2. Develop following architecture patterns
# - Reference docs/architecture/ for patterns
# - Follow coding standards
# - Implement security patterns
# - Add appropriate tests

# 3. Commit with proper messages
git add .
git commit -m "feat(export): implement conversation export functionality

- Add PDF export with professional formatting
- Include signal context and agent confidence scores
- Add download link generation with expiration
- Follow security patterns for file access

Addresses requirement from docs/prd/epic-4-partnership-demo-export-features.md"

# 4. Push and create PR
git push origin feature/agent-conversation-export
# Create PR using template above

# 5. Address review feedback
# Make changes, commit, push

# 6. Merge after approval
# Use squash merge for clean history
```

### Hotfix Process
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/uuid-conversion-critical-bug

# 2. Implement minimal fix
# Focus only on the critical issue
# Follow security patterns strictly

# 3. Test thoroughly
# Verify fix works
# Ensure no regressions

# 4. Fast-track review and merge
# Get immediate review
# Deploy to production ASAP
# Create post-mortem issue

# 5. Backport to development branches if needed
```

## Branch Protection Rules

### Main Branch Protection
```yaml
# GitHub branch protection settings for main
required_status_checks:
  strict: true
  contexts:
    - "ci/tests"
    - "ci/lint"
    - "ci/security-scan"
    - "ci/architecture-compliance"

enforce_admins: true
required_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true

restrictions:
  users: []
  teams: ["architects", "senior-developers"]
```

### Development Branch Guidelines
```bash
# Feature branches
- Can be created by any developer
- Must follow naming conventions
- Must pass all CI checks
- Require 1 review minimum

# Architecture branches (arch/*)
- Require architect review
- Must update docs/architecture/ if needed
- Require 2 reviews minimum

# Infrastructure branches (infra/*)
- Require DevOps review
- Must include deployment documentation
- Require security team review
```

## Code Review Standards

### Review Priorities
1. **Security**: UUID patterns, input validation, secrets
2. **Architecture**: Follows established patterns and structure
3. **Functionality**: Code works as intended
4. **Performance**: No obvious performance regressions
5. **Maintainability**: Code is readable and well-structured

### Review Comments Format
```markdown
# ✅ GOOD: Constructive, specific, references architecture
**Architecture**: This should follow the UUID conversion pattern from docs/architecture/security-patterns.md. Use `getCurrentUserId()` instead of direct Clerk ID.

**Suggestion**: Consider extracting this logic into a shared utility following the patterns in `src/lib/auth/`.

# ❌ BAD: Vague, not helpful
This looks wrong.
Fix this.
```

## Release Management

### Release Branch Strategy
```bash
# 1. Create release branch
git checkout -b release/v1.2.0

# 2. Final testing and documentation
# Update CHANGELOG.md
# Update version numbers
# Final integration tests

# 3. Merge to main and tag
git checkout main
git merge release/v1.2.0
git tag -a v1.2.0 -m "Release v1.2.0: AutoGen Agent Integration"
git push origin main --tags

# 4. Deploy to production
# Use CI/CD pipeline
# Monitor deployment
# Create release notes
```