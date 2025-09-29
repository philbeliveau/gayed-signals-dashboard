# Database Schema Documentation

## AutoGen Financial Intelligence Demo - Database Schema

### Overview

This document describes the PostgreSQL database schema for the AutoGen Financial Intelligence Demo, designed to support AI agent conversations for financial analysis. The schema is implemented using Prisma ORM and maps directly to the Pydantic models defined in `apps/backend/models/conversation_models.py`.

### Schema Architecture

The database follows a hierarchical structure:
- **Users** → **Conversations** → **Agent Messages**
- Each conversation belongs to one user
- Each conversation can have multiple agent messages
- All relationships use cascade deletes for data integrity

---

## Table Definitions

### Users Table (`users`)

**Purpose**: Manages user authentication and profile data with Clerk integration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY, CUID | Internal user identifier |
| `clerkId` | TEXT | UNIQUE, NOT NULL | Clerk authentication ID |
| `email` | TEXT | NULLABLE | User email address |
| `firstName` | TEXT | NULLABLE | User first name |
| `lastName` | TEXT | NULLABLE | User last name |
| `createdAt` | TIMESTAMP(3) | NOT NULL, DEFAULT now() | Account creation timestamp |
| `updatedAt` | TIMESTAMP(3) | NOT NULL, AUTO UPDATE | Last update timestamp |

**Indexes**:
- `users_clerkId_key` (UNIQUE) - Fast Clerk ID lookups

**Relationships**:
- `conversations` → One-to-many with Conversations table

---

### Conversations Table (`conversations`)

**Purpose**: Stores AutoGen agent conversation sessions with content source information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY, CUID | Conversation identifier |
| `userId` | TEXT | NOT NULL, FK → users.id | Owner user ID |
| `contentType` | TEXT | NOT NULL | Content source type (enum) |
| `contentTitle` | VARCHAR(500) | NOT NULL | Content title/headline |
| `contentContent` | TEXT | NOT NULL | Main content text |
| `contentUrl` | TEXT | NULLABLE | Source URL if applicable |
| `contentAuthor` | VARCHAR(200) | NULLABLE | Content author name |
| `contentPublishedAt` | TIMESTAMP(3) | NULLABLE | Original publication date |
| `contentMetadata` | JSONB | NOT NULL, DEFAULT '{}' | Additional content metadata |
| `status` | TEXT | NOT NULL, DEFAULT 'initialized' | Conversation status (enum) |
| `consensusReached` | BOOLEAN | NOT NULL, DEFAULT false | Agent consensus indicator |
| `finalRecommendation` | TEXT | NULLABLE | Final analysis recommendation |
| `confidenceScore` | REAL | NULLABLE | Overall confidence (0-1) |
| `createdAt` | TIMESTAMP(3) | NOT NULL, DEFAULT now() | Creation timestamp |
| `updatedAt` | TIMESTAMP(3) | NOT NULL, AUTO UPDATE | Last update timestamp |
| `completedAt` | TIMESTAMP(3) | NULLABLE | Completion timestamp |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Additional conversation data |

**Indexes**:
- `conversations_userId_createdAt_idx` - User conversation history queries
- `conversations_status_createdAt_idx` - Status-based filtering
- `conversations_contentType_createdAt_idx` - Content type analysis

**Relationships**:
- `user` → Many-to-one with Users table (CASCADE DELETE)
- `messages` → One-to-many with AgentMessage table

**Content Type Enum Values**:
- `text` - Direct text input
- `substack_article` - Substack article
- `youtube_video` - YouTube video transcript
- `market_report` - Market research report
- `news_article` - News article

**Status Enum Values**:
- `initialized` - Conversation created
- `running` - Agent debate in progress
- `paused` - Temporarily paused
- `completed` - Analysis finished
- `error` - Error occurred
- `cancelled` - User cancelled

---

### Agent Messages Table (`agent_messages`)

**Purpose**: Individual messages from AutoGen agents within conversations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY, CUID | Message identifier |
| `conversationId` | TEXT | NOT NULL, FK → conversations.id | Parent conversation |
| `agentType` | TEXT | NOT NULL | Agent type identifier (enum) |
| `agentName` | VARCHAR(100) | NOT NULL | Display name for agent |
| `content` | TEXT | NOT NULL | Message content |
| `confidenceLevel` | REAL | NULLABLE | Message confidence (0-1) |
| `messageOrder` | INTEGER | NOT NULL | Message sequence number |
| `citedSources` | TEXT[] | DEFAULT [] | Referenced data sources |
| `signalReferences` | TEXT[] | DEFAULT [] | Gayed signal references |
| `timestamp` | TIMESTAMP(3) | NOT NULL, DEFAULT now() | Message timestamp |
| `metadata` | JSONB | NOT NULL, DEFAULT '{}' | Additional message data |

**Indexes**:
- `agent_messages_conversationId_messageOrder_idx` - Conversation message ordering
- `agent_messages_agentType_timestamp_idx` - Agent-specific analysis
- `agent_messages_timestamp_idx` - Time-based queries

**Relationships**:
- `conversation` → Many-to-one with Conversations table (CASCADE DELETE)

**Agent Type Enum Values**:
- `financial_analyst` - Quantitative financial analysis
- `market_context` - Market intelligence and context
- `risk_challenger` - Risk assessment and contrarian views

---

## Relationship Constraints

### Foreign Key Relationships

1. **Conversations → Users**
   ```sql
   ALTER TABLE conversations ADD CONSTRAINT conversations_userId_fkey
   FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
   ```

2. **Agent Messages → Conversations**
   ```sql
   ALTER TABLE agent_messages ADD CONSTRAINT agent_messages_conversationId_fkey
   FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;
   ```

### Cascade Behavior

- **User Deletion**: Deletes all user conversations and their messages
- **Conversation Deletion**: Deletes all associated agent messages
- **Message Deletion**: Independent, no cascade effects

---

## Performance Optimization

### Index Strategy

**User Queries**:
- `clerkId` unique index for authentication
- Conversations ordered by creation date

**Conversation Queries**:
- User-specific conversation lists with pagination
- Status-based filtering (active, completed, error)
- Content type analysis and categorization

**Message Queries**:
- Conversation message ordering for display
- Agent-specific performance analysis
- Time-based conversation reconstruction

### Query Patterns

**Common Query Examples**:

```sql
-- User's recent conversations
SELECT * FROM conversations
WHERE userId = ?
ORDER BY createdAt DESC
LIMIT 20;

-- Conversation with messages
SELECT c.*, array_agg(am.* ORDER BY am.messageOrder) as messages
FROM conversations c
LEFT JOIN agent_messages am ON c.id = am.conversationId
WHERE c.id = ?
GROUP BY c.id;

-- Agent performance metrics
SELECT agentType,
       COUNT(*) as message_count,
       AVG(confidenceLevel) as avg_confidence
FROM agent_messages
WHERE timestamp > ?
GROUP BY agentType;
```

---

## Data Validation

### Pydantic Model Mapping

The schema enforces validation rules that match the Pydantic models:

**Field Length Limits**:
- `contentTitle`: 500 characters (business requirement)
- `contentAuthor`: 200 characters (reasonable name length)
- `agentName`: 100 characters (display name limit)

**Data Type Enforcement**:
- `confidenceScore`: REAL (0-1) enforced at application level
- `citedSources`: Array of strings for financial data references
- `signalReferences`: Array of strings for Gayed signal integration
- `metadata`: JSONB for flexible additional data

**Enum Value Validation**:
- Enforced at application level through Pydantic models
- Database stores as TEXT for flexibility
- Application validates against enum definitions

---

## Migration Management

### Production Deployment

Use the provided migration scripts for safe production deployment:

```bash
# Apply migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Generate Prisma client
npx prisma generate
```

### Development Workflow

```bash
# Create new migration
npx prisma migrate dev --name descriptive_name

# Reset database (development only)
npx prisma migrate reset

# Seed test data
npm run db:seed
```

---

## Security Considerations

### Data Protection

1. **User Privacy**:
   - User data linked through Clerk IDs
   - No sensitive personal data stored directly
   - Cascade deletes ensure complete data removal

2. **Financial Data**:
   - Conversation content may contain sensitive financial analysis
   - Proper access controls through user ID validation
   - Audit trail through timestamp fields

3. **Database Access**:
   - Connection strings secured through environment variables
   - Production uses SSL/TLS encryption
   - Application-level authorization controls

### Compliance

- **Data Retention**: Configurable through application logic
- **Audit Logging**: Timestamp fields track all data changes
- **User Rights**: Full data deletion through cascade relationships

---

## Monitoring and Maintenance

### Health Checks

Monitor key metrics:
- Connection pool usage
- Query performance on indexed fields
- Table growth rates
- Migration status

### Backup Strategy

- Automated Railway PostgreSQL backups
- Schema versioning through Prisma migrations
- Test data recreation through seed scripts

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-09-28 | Initial schema implementation |
| | | - Core conversation tables |
| | | - Clerk authentication integration |
| | | - Performance indexes |
| | | - Seed data framework |