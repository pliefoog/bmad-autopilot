// Connection Health Monitor
// Advanced connection monitoring and diagnostics

import { useConnectionStore, ConnectionMetrics } from '../../store/connectionStore';

export interface ConnectionHealth {
  status: 'excellent' | 'good' | 'poor' | 'critical' | 'disconnected';
  score: number; // 0-100
  metrics: {
    packetLoss: number;
    latency: number;
    throughput: number;
    stability: number;
    uptime: number;
  };
  issues: string[];
  recommendations: string[];
  lastCheck: number;
}

export interface ConnectionDiagnostics {
  networkReachable: boolean;
  dnsResolution: boolean;
  portAccessible: boolean;
  protocolHandshake: boolean;
  dataFlow: boolean;
  errorRate: number;
  reconnectAttempts: number;
}

export class ConnectionHealthMonitor {
  private static instance: ConnectionHealthMonitor;
  private checkInterval: NodeJS.Timeout | null = null;
  private metrics: Map<string, number[]> = new Map();
  private readonly HISTORY_SIZE = 100;

  static getInstance(): ConnectionHealthMonitor {
    if (!ConnectionHealthMonitor.instance) {
      ConnectionHealthMonitor.instance = new ConnectionHealthMonitor();
    }
    return ConnectionHealthMonitor.instance;
  }

  startMonitoring(intervalMs: number = 5000): void {
    this.stopMonitoring();
    
    this.checkInterval = setInterval(() => {
      this.performHealthCheck();
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async performHealthCheck(): Promise<ConnectionHealth> {
    const connectionStore = useConnectionStore.getState();
    const metrics = connectionStore.metrics;

    // Calculate metrics
    const packetLoss = this.calculatePacketLoss(metrics);
    const latency = this.calculateAverageLatency();
    const throughput = this.calculateThroughput(metrics);
    const stability = this.calculateStability(metrics);
    const uptime = this.calculateUptime(metrics);

    // Store metrics for trend analysis
    this.recordMetric('packetLoss', packetLoss);
    this.recordMetric('latency', latency);
    this.recordMetric('throughput', throughput);

    const healthMetrics = {
      packetLoss,
      latency,
      throughput,
      stability,
      uptime,
    };

    const { status, score } = this.calculateHealthScore(healthMetrics);
    const issues = this.identifyIssues(healthMetrics, connectionStore);
    const recommendations = this.generateRecommendations(issues, healthMetrics);

    const health: ConnectionHealth = {
      status,
      score,
      metrics: healthMetrics,
      issues,
      recommendations,
      lastCheck: Date.now(),
    };

    // Store health data in connection store if we add that capability later
    // connectionStore.updateConnectionHealth(health);

    return health;
  }

  async runDiagnostics(host: string, port: number): Promise<ConnectionDiagnostics> {
    const results: ConnectionDiagnostics = {
      networkReachable: false,
      dnsResolution: false,
      portAccessible: false,
      protocolHandshake: false,
      dataFlow: false,
      errorRate: 0,
      reconnectAttempts: 0,
    };

    try {
      // Network reachability test
      results.networkReachable = await this.testNetworkReachability();
      
      // DNS resolution test
      results.dnsResolution = await this.testDnsResolution(host);
      
      // Port accessibility test
      results.portAccessible = await this.testPortAccessibility(host, port);
      
      // Protocol handshake test
      results.protocolHandshake = await this.testProtocolHandshake(host, port);
      
      // Data flow test
      results.dataFlow = await this.testDataFlow(host, port);

      // Get error metrics from connection store
      const connectionStore = useConnectionStore.getState();
      results.errorRate = this.calculateErrorRate();
      results.reconnectAttempts = connectionStore.metrics.reconnectAttempts || 0;

    } catch (error) {
      console.error('Diagnostics failed:', error);
    }

    return results;
  }

  private calculatePacketLoss(metrics: ConnectionMetrics): number {
    const received = metrics.packetsReceived || 0;
    const dropped = metrics.packetsDropped || 0;
    const total = received + dropped;
    
    if (total === 0) return 0;
    return (dropped / total) * 100;
  }

  private calculateAverageLatency(): number {
    const latencyHistory = this.metrics.get('latency') || [];
    if (latencyHistory.length === 0) return 0;
    
    const sum = latencyHistory.reduce((a, b) => a + b, 0);
    return sum / latencyHistory.length;
  }

  private calculateThroughput(metrics: ConnectionMetrics): number {
    const received = metrics.packetsReceived || 0;
    const timeConnected = metrics.connectedAt ? 
      Date.now() - metrics.connectedAt : 0;
    
    if (timeConnected === 0) return 0;
    return (received / (timeConnected / 1000)); // packets per second
  }

  private calculateStability(metrics: ConnectionMetrics): number {
    const reconnects = metrics.reconnectAttempts || 0;
    const uptime = this.calculateUptime(metrics);
    
    if (uptime === 0) return 0;
    const reconnectRate = reconnects / (uptime / 3600000); // per hour
    return Math.max(0, 100 - (reconnectRate * 10));
  }

  private calculateUptime(metrics: ConnectionMetrics): number {
    if (!metrics.connectedAt) return 0;
    return Date.now() - metrics.connectedAt;
  }

  private calculateHealthScore(metrics: ConnectionHealth['metrics']): { status: ConnectionHealth['status'], score: number } {
    const weights = {
      packetLoss: 0.3,
      latency: 0.2,
      throughput: 0.2,
      stability: 0.2,
      uptime: 0.1,
    };

    // Convert metrics to 0-100 scores
    const packetLossScore = Math.max(0, 100 - metrics.packetLoss);
    const latencyScore = Math.max(0, 100 - Math.min(100, metrics.latency / 10));
    const throughputScore = Math.min(100, metrics.throughput * 2);
    const stabilityScore = metrics.stability;
    const uptimeScore = Math.min(100, metrics.uptime / 36000); // 10 minutes = 100%

    const score = Math.round(
      (packetLossScore * weights.packetLoss) +
      (latencyScore * weights.latency) +
      (throughputScore * weights.throughput) +
      (stabilityScore * weights.stability) +
      (uptimeScore * weights.uptime)
    );

    let status: ConnectionHealth['status'];
    if (score >= 90) status = 'excellent';
    else if (score >= 75) status = 'good';
    else if (score >= 50) status = 'poor';
    else if (score >= 25) status = 'critical';
    else status = 'disconnected';

    return { status, score };
  }

  private identifyIssues(metrics: ConnectionHealth['metrics'], state: any): string[] {
    const issues: string[] = [];

    if (metrics.packetLoss > 5) {
      issues.push(`High packet loss: ${metrics.packetLoss.toFixed(1)}%`);
    }

    if (metrics.latency > 100) {
      issues.push(`High latency: ${metrics.latency.toFixed(0)}ms`);
    }

    if (metrics.throughput < 1) {
      issues.push(`Low throughput: ${metrics.throughput.toFixed(1)} packets/sec`);
    }

    if (metrics.stability < 80) {
      issues.push(`Connection instability detected`);
    }

    if (!state.isConnected) {
      issues.push('Not connected to NMEA source');
    }

    return issues;
  }

  private generateRecommendations(issues: string[], metrics: ConnectionHealth['metrics']): string[] {
    const recommendations: string[] = [];

    if (metrics.packetLoss > 5) {
      recommendations.push('Check network stability and WiFi signal strength');
      recommendations.push('Consider using wired connection if possible');
    }

    if (metrics.latency > 100) {
      recommendations.push('Verify network path to NMEA bridge');
      recommendations.push('Check for network congestion');
    }

    if (metrics.throughput < 1) {
      recommendations.push('Verify NMEA bridge is transmitting data');
      recommendations.push('Check bridge configuration and output rate');
    }

    if (metrics.stability < 80) {
      recommendations.push('Enable auto-reconnect if not already active');
      recommendations.push('Check power stability of NMEA bridge');
    }

    if (issues.length === 0) {
      recommendations.push('Connection health is optimal');
    }

    return recommendations;
  }

  private recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const history = this.metrics.get(name)!;
    history.push(value);

    if (history.length > this.HISTORY_SIZE) {
      history.shift();
    }
  }

  private calculateErrorRate(): number {
    const connectionStore = useConnectionStore.getState();
    const metrics = connectionStore.metrics;
    const total = (metrics.packetsReceived || 0) + (metrics.packetsDropped || 0);
    const errors = metrics.packetsDropped || 0;
    
    if (total === 0) return 0;
    return (errors / total) * 100;
  }

  // Network test methods (simplified implementations)
  private async testNetworkReachability(): Promise<boolean> {
    // In a real implementation, this would test basic network connectivity
    return navigator.onLine;
  }

  private async testDnsResolution(host: string): Promise<boolean> {
    // Simplified DNS test - in practice would use more sophisticated methods
    try {
      const response = await fetch(`http://${host}:1/`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        signal: AbortSignal.timeout(2000)
      });
      return true;
    } catch {
      return false;
    }
  }

  private async testPortAccessibility(host: string, port: number): Promise<boolean> {
    // Simplified port test
    try {
      const socket = new WebSocket(`ws://${host}:${port}`);
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          socket.close();
          resolve(false);
        }, 2000);

        socket.onopen = () => {
          clearTimeout(timeout);
          socket.close();
          resolve(true);
        };

        socket.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }

  private async testProtocolHandshake(host: string, port: number): Promise<boolean> {
    // Test NMEA protocol handshake
    return true; // Simplified for this example
  }

  private async testDataFlow(host: string, port: number): Promise<boolean> {
    // Test actual NMEA data reception
    return true; // Simplified for this example
  }

  getMetricHistory(metricName: string): number[] {
    return this.metrics.get(metricName) || [];
  }

  clearHistory(): void {
    this.metrics.clear();
  }
}

// Export singleton instance
export const connectionHealthMonitor = ConnectionHealthMonitor.getInstance();