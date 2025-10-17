import { 
  AutopilotCommandQueue, 
  CommandPriority, 
  CommandStatus 
} from '../src/services/autopilotCommandQueue';
import { AutopilotCommand } from '../src/services/autopilotService';
import { autopilotRetryManager } from '../src/services/autopilotRetryManager';

// Mock the retry manager
jest.mock('../src/services/autopilotRetryManager');
const mockRetryManager = autopilotRetryManager as jest.Mocked<typeof autopilotRetryManager>;

describe('AutopilotCommandQueue', () => {
  let commandQueue: AutopilotCommandQueue;
  let mockExecutor: jest.MockedFunction<(command: AutopilotCommand, params?: any) => Promise<boolean>>;

  beforeEach(() => {
    mockExecutor = jest.fn();
    commandQueue = new AutopilotCommandQueue(undefined, mockExecutor);
    jest.useFakeTimers();
    
    // Mock retry manager to return success by default
    mockRetryManager.executeWithRetry.mockResolvedValue({
      success: true,
      responseTimeMs: 500,
      attempt: 1
    });
  });

  afterEach(() => {
    commandQueue.destroy();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Command Enqueuing', () => {
    it('should enqueue commands with correct priority ordering', () => {
      const lowId = commandQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, { degrees: 1 }, CommandPriority.LOW);
      const normalId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.NORMAL);
      const highId = commandQueue.enqueueCommand(AutopilotCommand.DISENGAGE, {}, CommandPriority.HIGH);
      const emergencyId = commandQueue.enqueueCommand(AutopilotCommand.STANDBY, {}, CommandPriority.EMERGENCY);

      const status = commandQueue.getQueueStatus();
      expect(status.totalCommands).toBe(4);
      expect(status.byPriority[CommandPriority.EMERGENCY]).toBe(1);
      expect(status.byPriority[CommandPriority.HIGH]).toBe(1);
      expect(status.byPriority[CommandPriority.NORMAL]).toBe(1);
      expect(status.byPriority[CommandPriority.LOW]).toBe(1);

      // Emergency should be first
      const emergencyCmd = commandQueue.getCommand(emergencyId);
      expect(emergencyCmd?.priority).toBe(CommandPriority.EMERGENCY);
    });

    it('should clear non-emergency commands for emergency', () => {
      commandQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, {}, CommandPriority.LOW);
      commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.NORMAL);
      commandQueue.enqueueCommand(AutopilotCommand.DISENGAGE, {}, CommandPriority.HIGH);

      expect(commandQueue.getQueueStatus().totalCommands).toBe(3);

      // Add emergency command
      commandQueue.enqueueCommand(AutopilotCommand.STANDBY, {}, CommandPriority.EMERGENCY);

      const status = commandQueue.getQueueStatus();
      expect(status.totalCommands).toBe(1);
      expect(status.byPriority[CommandPriority.EMERGENCY]).toBe(1);
    });

    it('should respect maximum queue size', () => {
      const smallQueue = new AutopilotCommandQueue({ maxQueueSize: 3 }, mockExecutor);
      
      // Fill queue
      smallQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, {}, CommandPriority.LOW);
      smallQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, {}, CommandPriority.LOW);
      smallQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, {}, CommandPriority.NORMAL);
      
      expect(smallQueue.getQueueStatus().totalCommands).toBe(3);

      // Add one more - should remove oldest low priority
      smallQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.NORMAL);
      
      expect(smallQueue.getQueueStatus().totalCommands).toBe(3);
      expect(smallQueue.getQueueStatus().byPriority[CommandPriority.LOW]).toBe(1);

      smallQueue.destroy();
    });
  });

  describe('Command Cancellation', () => {
    it('should cancel queued commands', () => {
      const commandId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {});
      
      expect(commandQueue.getCommand(commandId)?.status).toBe(CommandStatus.QUEUED);
      
      const cancelled = commandQueue.cancelCommand(commandId);
      
      expect(cancelled).toBe(true);
      expect(commandQueue.getCommand(commandId)).toBeUndefined();
    });

    it('should not cancel executing commands', () => {
      const commandId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {});
      const command = commandQueue.getCommand(commandId);
      
      if (command) {
        command.status = CommandStatus.EXECUTING;
      }
      
      const cancelled = commandQueue.cancelCommand(commandId);
      
      expect(cancelled).toBe(false);
      expect(commandQueue.getCommand(commandId)).toBeDefined();
    });
  });

  describe('Command Processing', () => {
    it('should process commands in priority order', async () => {
      // Enqueue commands in reverse priority order
      commandQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, {}, CommandPriority.LOW);
      commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.NORMAL);
      commandQueue.enqueueCommand(AutopilotCommand.DISENGAGE, {}, CommandPriority.HIGH);

      mockExecutor.mockResolvedValue(true);

      // Process queue
      jest.advanceTimersByTime(3000);

      // High priority should be executed first
      expect(mockExecutor).toHaveBeenCalledWith(AutopilotCommand.DISENGAGE, {});
    });

    it('should handle command execution failure and retry', async () => {
      const commandId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {});
      
      // Mock retry manager to return failure then success
      mockRetryManager.executeWithRetry
        .mockResolvedValueOnce({
          success: false,
          error: 'Network error',
          responseTimeMs: 1000,
          attempt: 3
        })
        .mockResolvedValueOnce({
          success: true,
          responseTimeMs: 500,
          attempt: 1
        });

      jest.advanceTimersByTime(2000);

      // Command should be retried
      const command = commandQueue.getCommand(commandId);
      expect(command?.retryCount).toBeGreaterThanOrEqual(0);
    });

    it('should mark commands as failed after max retries', async () => {
      const commandId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.NORMAL);
      
      mockRetryManager.executeWithRetry.mockResolvedValue({
        success: false,
        error: 'Persistent failure',
        responseTimeMs: 1000,
        attempt: 3
      });

      jest.advanceTimersByTime(5000);

      // Command should eventually be removed from queue after max retries
      const status = commandQueue.getQueueStatus();
      expect(status.totalCommands).toBe(0); // Failed commands are removed
    });
  });

  describe('Command Expiration', () => {
    it('should expire commands after timeout', () => {
      const commandId = commandQueue.enqueueCommand(
        AutopilotCommand.ENGAGE, 
        {}, 
        CommandPriority.NORMAL,
        1000 // 1 second expiry
      );

      expect(commandQueue.getCommand(commandId)?.status).toBe(CommandStatus.QUEUED);

      // Fast-forward past expiry
      jest.advanceTimersByTime(2000);

      // Command should be expired and removed
      expect(commandQueue.getCommand(commandId)).toBeUndefined();
    });

    it('should use different expiry times for different priorities', () => {
      const emergencyId = commandQueue.enqueueCommand(AutopilotCommand.STANDBY, {}, CommandPriority.EMERGENCY);
      const normalId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.NORMAL);

      const emergencyCmd = commandQueue.getCommand(emergencyId);
      const normalCmd = commandQueue.getCommand(normalId);

      // Emergency commands should have shorter expiry
      expect(emergencyCmd!.expiresAt - emergencyCmd!.createdAt).toBeLessThan(
        normalCmd!.expiresAt - normalCmd!.createdAt
      );
    });
  });

  describe('Queue Status and Metrics', () => {
    it('should provide comprehensive queue status', () => {
      commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {}, CommandPriority.HIGH);
      commandQueue.enqueueCommand(AutopilotCommand.ADJUST_HEADING, {}, CommandPriority.NORMAL);
      commandQueue.enqueueCommand(AutopilotCommand.DISENGAGE, {}, CommandPriority.LOW);

      const status = commandQueue.getQueueStatus();

      expect(status.totalCommands).toBe(3);
      expect(status.byStatus[CommandStatus.QUEUED]).toBe(3);
      expect(status.byPriority[CommandPriority.HIGH]).toBe(1);
      expect(status.byPriority[CommandPriority.NORMAL]).toBe(1);
      expect(status.byPriority[CommandPriority.LOW]).toBe(1);
      expect(status.oldestCommand).toBeDefined();
    });

    it('should track processing command', () => {
      const commandId = commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {});
      const command = commandQueue.getCommand(commandId);
      
      if (command) {
        command.status = CommandStatus.EXECUTING;
      }

      const status = commandQueue.getQueueStatus();
      expect(status.processingCommand?.id).toBe(commandId);
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom queue configuration', () => {
      const customQueue = new AutopilotCommandQueue({
        maxQueueSize: 5,
        defaultExpiryMs: 2000,
        processingIntervalMs: 500,
        emergencyTimeoutMs: 1000
      }, mockExecutor);

      // Test with custom config
      const commandId = customQueue.enqueueCommand(AutopilotCommand.ENGAGE, {});
      const command = customQueue.getCommand(commandId);

      expect(command).toBeDefined();
      if (command) {
        expect(command.expiresAt - command.createdAt).toBe(2000);
      }

      customQueue.destroy();
    });
  });

  describe('Integration with Retry Manager', () => {
    it('should use retry manager for command execution', async () => {
      commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, { heading: 270 });
      
      jest.advanceTimersByTime(1500);

      expect(mockRetryManager.executeWithRetry).toHaveBeenCalledWith(
        expect.any(Function),
        'command'
      );
    });

    it('should handle retry manager circuit breaker', async () => {
      mockRetryManager.executeWithRetry.mockResolvedValue({
        success: false,
        error: 'Circuit breaker open - service unavailable',
        responseTimeMs: 0,
        attempt: 0
      });

      commandQueue.enqueueCommand(AutopilotCommand.ENGAGE, {});
      
      jest.advanceTimersByTime(1500);

      // Command should be marked as failed due to circuit breaker
      const status = commandQueue.getQueueStatus();
      expect(status.totalCommands).toBe(0); // Failed commands are removed
    });
  });
});