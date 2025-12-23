import { AutopilotCommand } from './autopilotService';
import { autopilotRetryManager } from './autopilotRetryManager';

/**
 * Command priority levels
 */
export enum CommandPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  EMERGENCY = 3,
}

/**
 * Command execution status
 */
export enum CommandStatus {
  QUEUED = 'queued',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Queued command interface
 */
export interface QueuedCommand {
  id: string;
  command: AutopilotCommand;
  params?: any;
  priority: CommandPriority;
  status: CommandStatus;
  createdAt: number;
  expiresAt: number;
  executedAt?: number;
  completedAt?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  maxQueueSize: number;
  defaultExpiryMs: number;
  processingIntervalMs: number;
  emergencyTimeoutMs: number;
}

/**
 * AutopilotCommandQueue - Manages command queuing during connectivity issues
 * Story 3.3 AC9: Command queue management during connectivity issues
 */
export class AutopilotCommandQueue {
  private static readonly DEFAULT_CONFIG: QueueConfig = {
    maxQueueSize: 50,
    defaultExpiryMs: 60000, // 1 minute
    processingIntervalMs: 1000, // Check every second
    emergencyTimeoutMs: 5000, // Emergency commands timeout quickly
  };

  private queue: QueuedCommand[] = [];
  private isProcessing = false;
  private processingInterval?: ReturnType<typeof setInterval>;
  private config: QueueConfig;
  private commandExecutor?: (command: AutopilotCommand, params?: any) => Promise<boolean>;

  constructor(
    config?: Partial<QueueConfig>,
    commandExecutor?: (command: AutopilotCommand, params?: any) => Promise<boolean>,
  ) {
    this.config = { ...AutopilotCommandQueue.DEFAULT_CONFIG, ...config };
    this.commandExecutor = commandExecutor;
    this.startProcessing();
  }

  /**
   * Add command to queue with priority handling
   */
  enqueueCommand(
    command: AutopilotCommand,
    params?: any,
    priority: CommandPriority = CommandPriority.NORMAL,
    expiryMs?: number,
  ): string {
    // Generate unique command ID
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate expiry time based on priority
    const expiry = expiryMs || this.getDefaultExpiryForPriority(priority);

    const queuedCommand: QueuedCommand = {
      id: commandId,
      command,
      params,
      priority,
      status: CommandStatus.QUEUED,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiry,
      retryCount: 0,
      maxRetries: this.getMaxRetriesForPriority(priority),
    };

    // Handle emergency commands - clear non-emergency queue and prioritize
    if (priority === CommandPriority.EMERGENCY) {
      this.clearNonEmergencyCommands();
      this.queue.unshift(queuedCommand);
    } else {
      // Check queue size limit
      if (this.queue.length >= this.config.maxQueueSize) {
        this.removeOldestLowPriorityCommand();
      }

      // Insert command in priority order
      this.insertCommandByPriority(queuedCommand);
    }

    console.info(`[CommandQueue] Enqueued ${command} with priority ${priority}, ID: ${commandId}`);

    return commandId;
  }

  /**
   * Cancel specific command
   */
  cancelCommand(commandId: string): boolean {
    const commandIndex = this.queue.findIndex((cmd) => cmd.id === commandId);

    if (commandIndex !== -1) {
      const command = this.queue[commandIndex];

      if (command.status === CommandStatus.QUEUED) {
        command.status = CommandStatus.CANCELLED;
        this.queue.splice(commandIndex, 1);
        console.info(`[CommandQueue] Cancelled command ${commandId}`);
        return true;
      }
    }

    return false;
  }

  /**
   * Clear all non-emergency commands
   */
  clearNonEmergencyCommands(): void {
    const emergencyCommands = this.queue.filter(
      (cmd) => cmd.priority === CommandPriority.EMERGENCY,
    );
    const cancelledCount = this.queue.length - emergencyCommands.length;

    this.queue = emergencyCommands;

    if (cancelledCount > 0) {
      console.warn(`[CommandQueue] Cleared ${cancelledCount} non-emergency commands for emergency`);
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    totalCommands: number;
    byStatus: { [key in CommandStatus]: number };
    byPriority: { [key in CommandPriority]: number };
    oldestCommand?: QueuedCommand;
    processingCommand?: QueuedCommand;
  } {
    const status = {
      totalCommands: this.queue.length,
      byStatus: {} as { [key in CommandStatus]: number },
      byPriority: {} as { [key in CommandPriority]: number },
      oldestCommand: undefined as QueuedCommand | undefined,
      processingCommand: undefined as QueuedCommand | undefined,
    };

    // Initialize counters
    Object.values(CommandStatus).forEach((s) => (status.byStatus[s] = 0));
    [
      CommandPriority.LOW,
      CommandPriority.NORMAL,
      CommandPriority.HIGH,
      CommandPriority.EMERGENCY,
    ].forEach((p) => (status.byPriority[p] = 0));

    // Count commands
    this.queue.forEach((cmd) => {
      status.byStatus[cmd.status]++;
      status.byPriority[cmd.priority]++;
    });

    // Find oldest and processing commands
    status.oldestCommand = this.queue.reduce(
      (oldest, cmd) => (!oldest || cmd.createdAt < oldest.createdAt ? cmd : oldest),
      undefined as QueuedCommand | undefined,
    );

    status.processingCommand = this.queue.find((cmd) => cmd.status === CommandStatus.EXECUTING);

    return status;
  }

  /**
   * Get command by ID
   */
  getCommand(commandId: string): QueuedCommand | undefined {
    return this.queue.find((cmd) => cmd.id === commandId);
  }

  /**
   * Set command executor function
   */
  setCommandExecutor(
    executor: (command: AutopilotCommand, params?: any) => Promise<boolean>,
  ): void {
    this.commandExecutor = executor;
  }

  /**
   * Start queue processing
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.config.processingIntervalMs);
  }

  /**
   * Process commands in queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.commandExecutor) {
      return;
    }

    // Clean up expired commands
    this.cleanupExpiredCommands();

    // Find next command to execute
    const nextCommand = this.getNextCommand();
    if (!nextCommand) {
      return;
    }

    this.isProcessing = true;
    nextCommand.status = CommandStatus.EXECUTING;
    nextCommand.executedAt = Date.now();

    try {
      console.info(`[CommandQueue] Executing ${nextCommand.command} (${nextCommand.id})`);

      // Execute command with retry logic
      const result = await autopilotRetryManager.executeWithRetry(
        () => this.commandExecutor!(nextCommand.command, nextCommand.params),
        'command',
      );

      if (result.success) {
        nextCommand.status = CommandStatus.COMPLETED;
        nextCommand.completedAt = Date.now();
        console.info(`[CommandQueue] Command ${nextCommand.id} completed successfully`);
      } else {
        this.handleCommandFailure(nextCommand, result.error || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.handleCommandFailure(nextCommand, errorMessage);
    } finally {
      this.isProcessing = false;

      // Remove completed/failed commands (check final status after processing)
      const finalCommand = this.queue.find((cmd) => cmd.id === nextCommand.id);
      if (
        finalCommand &&
        (finalCommand.status === CommandStatus.COMPLETED ||
          finalCommand.status === CommandStatus.FAILED)
      ) {
        this.removeCommand(nextCommand.id);
      }
    }
  }

  /**
   * Handle command execution failure
   */
  private handleCommandFailure(command: QueuedCommand, error: string): void {
    command.error = error;
    command.retryCount++;

    if (command.retryCount < command.maxRetries && Date.now() < command.expiresAt) {
      // Retry command
      command.status = CommandStatus.QUEUED;
      console.warn(
        `[CommandQueue] Command ${command.id} failed, retry ${command.retryCount}/${command.maxRetries}: ${error}`,
      );
    } else {
      // Max retries reached or expired
      command.status = CommandStatus.FAILED;
      command.completedAt = Date.now();
      console.error(`[CommandQueue] Command ${command.id} failed permanently: ${error}`);
    }
  }

  /**
   * Get next command to execute (highest priority, oldest first)
   */
  private getNextCommand(): QueuedCommand | undefined {
    return this.queue
      .filter((cmd) => cmd.status === CommandStatus.QUEUED)
      .sort((a, b) => {
        // Sort by priority (descending), then by creation time (ascending)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt - b.createdAt;
      })[0];
  }

  /**
   * Insert command in priority order
   */
  private insertCommandByPriority(command: QueuedCommand): void {
    let insertIndex = this.queue.length;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < command.priority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, command);
  }

  /**
   * Remove command from queue
   */
  private removeCommand(commandId: string): void {
    const index = this.queue.findIndex((cmd) => cmd.id === commandId);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Remove oldest low priority command to make space
   */
  private removeOldestLowPriorityCommand(): void {
    const lowPriorityCommands = this.queue
      .filter((cmd) => cmd.priority === CommandPriority.LOW && cmd.status === CommandStatus.QUEUED)
      .sort((a, b) => a.createdAt - b.createdAt);

    if (lowPriorityCommands.length > 0) {
      this.removeCommand(lowPriorityCommands[0].id);
    } else {
      // If no low priority commands, remove oldest normal priority
      const normalCommands = this.queue
        .filter(
          (cmd) => cmd.priority === CommandPriority.NORMAL && cmd.status === CommandStatus.QUEUED,
        )
        .sort((a, b) => a.createdAt - b.createdAt);

      if (normalCommands.length > 0) {
        this.removeCommand(normalCommands[0].id);
      }
    }
  }

  /**
   * Clean up expired commands
   */
  private cleanupExpiredCommands(): void {
    const now = Date.now();
    const expiredCommands = this.queue.filter(
      (cmd) => cmd.status === CommandStatus.QUEUED && cmd.expiresAt < now,
    );

    expiredCommands.forEach((cmd) => {
      cmd.status = CommandStatus.EXPIRED;
      console.warn(`[CommandQueue] Command ${cmd.id} expired`);
    });

    this.queue = this.queue.filter((cmd) => cmd.status !== CommandStatus.EXPIRED);
  }

  /**
   * Get default expiry time based on priority
   */
  private getDefaultExpiryForPriority(priority: CommandPriority): number {
    switch (priority) {
      case CommandPriority.EMERGENCY:
        return this.config.emergencyTimeoutMs;
      case CommandPriority.HIGH:
        return this.config.defaultExpiryMs / 2;
      case CommandPriority.NORMAL:
        return this.config.defaultExpiryMs;
      case CommandPriority.LOW:
        return this.config.defaultExpiryMs * 2;
      default:
        return this.config.defaultExpiryMs;
    }
  }

  /**
   * Get max retries based on priority
   */
  private getMaxRetriesForPriority(priority: CommandPriority): number {
    switch (priority) {
      case CommandPriority.EMERGENCY:
        return 1; // Emergency commands get one retry
      case CommandPriority.HIGH:
        return 2;
      case CommandPriority.NORMAL:
        return 3;
      case CommandPriority.LOW:
        return 1;
      default:
        return 2;
    }
  }

  /**
   * Cleanup method
   */
  destroy(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    this.queue = [];
    this.isProcessing = false;
  }
}

// Singleton instance for global use
export const autopilotCommandQueue = new AutopilotCommandQueue();
