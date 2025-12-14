# Sync Module Documentation

## Overview

The Sync module provides offline synchronization functionality for the personal finance app. It allows clients to queue operations when offline and sync them when connectivity is restored.

## Features

- **Queue Management**: Add individual or batch operations to sync queue
- **Automatic Processing**: Process pending sync operations
- **Conflict Resolution**: Handle data conflicts between local and remote data
- **Status Monitoring**: Track sync status and progress
- **Cleanup**: Remove old completed sync items

## API Endpoints

### Add to Sync Queue
```
POST /sync/queue
```
Add a single operation to the sync queue.

**Request Body:**
```json
{
  "operation": "CREATE|UPDATE|DELETE",
  "entityType": "BUDGET|EXPENSE|CREDIT_CARD|CATEGORY|BUDGET_PERIOD",
  "entityId": "uuid",
  "data": { /* entity data */ }
}
```

### Batch Sync
```
POST /sync/batch
```
Add multiple operations to the sync queue.

**Request Body:**
```json
{
  "items": [
    {
      "operation": "CREATE",
      "entityType": "EXPENSE",
      "entityId": "expense-1",
      "data": { "amount": 100, "description": "Coffee" }
    },
    {
      "operation": "UPDATE",
      "entityType": "BUDGET",
      "entityId": "budget-1",
      "data": { "totalIncome": 5000 }
    }
  ]
}
```

### Process Sync Queue
```
POST /sync/process
```
Process all pending sync operations for the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 10,
    "successful": 8,
    "failed": 1,
    "conflicts": 1,
    "errors": ["Error message"]
  }
}
```

### Get Sync Status
```
GET /sync/status
```
Get current sync status for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user-id",
    "pendingItems": 5,
    "processingItems": 2,
    "failedItems": 1,
    "lastSyncAt": "2024-12-14T10:30:00Z"
  }
}
```

### Get Conflicts
```
GET /sync/conflicts
```
Get all unresolved conflicts for the user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "conflict-id",
      "entityType": "EXPENSE",
      "entityId": "expense-1",
      "localData": { /* local version */ },
      "remoteData": { /* server version */ },
      "conflictReason": "Expense was modified more recently on server"
    }
  ]
}
```

### Resolve Conflict
```
POST /sync/conflicts/:conflictId/resolve
```
Resolve a specific conflict.

**Request Body:**
```json
{
  "resolution": "LOCAL|REMOTE|MERGE",
  "mergedData": { /* required for MERGE resolution */ }
}
```

### Batch Resolve Conflicts
```
POST /sync/conflicts/resolve-batch
```
Resolve multiple conflicts at once.

**Request Body:**
```json
{
  "resolutions": [
    {
      "conflictId": "conflict-1",
      "resolution": "LOCAL"
    },
    {
      "conflictId": "conflict-2",
      "resolution": "MERGE",
      "mergedData": { /* merged data */ }
    }
  ]
}
```

### Cleanup Sync Queue
```
DELETE /sync/cleanup?days=7
```
Remove completed sync items older than specified days (default: 7).

## Conflict Resolution Strategies

1. **LOCAL**: Use the local (client) version of the data
2. **REMOTE**: Keep the remote (server) version of the data
3. **MERGE**: Use custom merged data provided by the client

## Usage Flow

1. **Offline Operations**: When offline, add operations to sync queue using `/sync/queue` or `/sync/batch`
2. **Connectivity Check**: When connectivity is restored, check sync status with `/sync/status`
3. **Process Queue**: Process pending operations with `/sync/process`
4. **Handle Conflicts**: If conflicts arise, get them with `/sync/conflicts` and resolve with `/sync/conflicts/:id/resolve`
5. **Cleanup**: Periodically cleanup old items with `/sync/cleanup`

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

Common error codes:
- `UNAUTHORIZED`: User not authenticated
- `INVALID_INPUT`: Invalid request data
- `CONFLICT_NOT_FOUND`: Conflict ID not found
- `SYNC_ERROR`: General synchronization error
- `DATABASE_ERROR`: Database operation failed

## Implementation Notes

- All operations are user-scoped (authenticated user only)
- Sync items have automatic retry logic (max 3 retries)
- Conflicts are detected by comparing `updatedAt` timestamps
- Completed sync items are automatically cleaned up after 7 days
- All endpoints require authentication via Bearer token