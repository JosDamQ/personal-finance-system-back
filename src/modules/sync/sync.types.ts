import { SyncOperation, EntityType, SyncQueueStatus } from "@prisma/client";

export interface SyncQueueItemDto {
  operation: SyncOperation;
  entityType: EntityType;
  entityId: string;
  data: any;
}

export interface BatchSyncDto {
  items: SyncQueueItemDto[];
}

export interface SyncQueueResponse {
  id: string;
  operation: SyncOperation;
  entityType: EntityType;
  entityId: string;
  data: any;
  retryCount: number;
  maxRetries: number;
  status: SyncQueueStatus;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncStatusResponse {
  userId: string;
  pendingItems: number;
  processingItems: number;
  failedItems: number;
  lastSyncAt?: Date;
}

export interface ConflictResolutionDto {
  conflictId: string;
  resolution: 'LOCAL' | 'REMOTE' | 'MERGE';
  mergedData?: any;
}

export interface BatchConflictResolutionDto {
  resolutions: ConflictResolutionDto[];
}

export interface SyncResult {
  processed: number;
  successful: number;
  failed: number;
  conflicts: number;
  errors: string[];
}

export interface ConflictItem {
  id: string;
  entityType: EntityType;
  entityId: string;
  localData: any;
  remoteData: any;
  conflictReason: string;
}