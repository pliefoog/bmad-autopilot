#!/usr/bin/env node

/**
 * Story 11.8: CI/CD Pipeline Integration - Simulator Lifecycle Management
 * PURPOSE: Automated NMEA Bridge Simulator startup/shutdown management for CI/CD environments
 * REQUIREMENT: AC#1 - CI/CD Pipeline Configuration - Automated simulator lifecycle
 * METHOD: Reliable simulator process management with port conflict resolution and health checks
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const net = require('net');

class SimulatorLifecycleManager {
  constructor() {
    this.simulatorProcess = null;
    this.healthCheckInterval = null;
    this.config = {
      ports: {
        websocket: 8080,
        api: 9090,
        tcp: 2000
      },
      timeouts: {
        startup: 30000,
        healthCheck: 5000,
        shutdown: 10000
      },
      retries: {
        startup: 3,
        portCheck: 5
      }
    };
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      
      server.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Find available ports for the simulator
   */
  async findAvailablePorts() {
    const ports = { ...this.config.ports };
    
    for (const [service, port] of Object.entries(ports)) {
      let currentPort = port;
      let attempts = 0;
      
      while (attempts < this.config.retries.portCheck) {
        if (await this.isPortAvailable(currentPort)) {
          ports[service] = currentPort;
          break;
        }
        
        currentPort += 1;
        attempts += 1;
        
        if (attempts === this.config.retries.portCheck) {
          throw new Error(`Cannot find available port for ${service} service (tried ${port}-${currentPort})`);
        }
      }
    }
    
    return ports;
  }

  /**
   * Clean up any existing simulator processes
   */
  async cleanupExistingProcesses() {
    return new Promise((resolve) => {
      exec('pkill -f nmea-bridge-simulator', (error) => {
        // Ignore errors - process might not exist
        setTimeout(resolve, 1000); // Give processes time to terminate
      });
    });
  }

  /**
   * Health check for simulator
   */
  async performHealthCheck(ports) {
    try {
      const response = await fetch(`http://localhost:${ports.api}/api/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Start the NMEA Bridge Simulator with configuration
   */
  async startSimulator(scenario = 'basic-navigation', options = {}) {
    console.log(`🚀 Starting NMEA Bridge Simulator - Scenario: ${scenario}`);
    
    try {
      // Step 1: Cleanup existing processes
      await this.cleanupExistingProcesses();
      
      // Step 2: Find available ports
      const ports = await this.findAvailablePorts();
      console.log(`📡 Allocated ports: WebSocket=${ports.websocket}, API=${ports.api}, TCP=${ports.tcp}`);
      
      // Step 3: Start simulator process
      const simulatorPath = path.join(__dirname, '../../server/nmea-bridge-simulator.js');
      const args = [
        simulatorPath,
        '--scenario', scenario,
        '--api-port', ports.api.toString(),
        '--websocket-port', ports.websocket.toString(),
        '--tcp-port', ports.tcp.toString(),
        '--ci-mode'
      ];
      
      if (options.duration) {
        args.push('--duration', options.duration.toString());
      }
      
      if (options.loop) {
        args.push('--loop');
      }
      
      this.simulatorProcess = spawn('node', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      // Step 4: Wait for startup with health checks
      let healthCheckAttempts = 0;
      const maxHealthChecks = this.config.timeouts.startup / 2000;
      
      while (healthCheckAttempts < maxHealthChecks) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (await this.performHealthCheck(ports)) {
          console.log(`✅ Simulator started successfully on ports ${JSON.stringify(ports)}`);
          
          // Save port configuration for other processes
          const configPath = path.join(__dirname, 'simulator-ports.json');
          fs.writeFileSync(configPath, JSON.stringify(ports, null, 2));
          
          // Start continuous health monitoring
          this.startHealthMonitoring(ports);
          
          return {
            success: true,
            ports,
            pid: this.simulatorProcess.pid
          };
        }
        
        healthCheckAttempts++;
      }
      
      throw new Error('Simulator failed to start within timeout period');
      
    } catch (error) {
      console.error(`❌ Failed to start simulator: ${error.message}`);
      await this.stopSimulator();
      throw error;
    }
  }

  /**
   * Start continuous health monitoring
   */
  startHealthMonitoring(ports) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      if (!(await this.performHealthCheck(ports))) {
        console.error('🔥 Simulator health check failed');
        await this.stopSimulator();
        process.exit(1);
      }
    }, this.config.timeouts.healthCheck);
  }

  /**
   * Stop the simulator gracefully
   */
  async stopSimulator() {
    console.log('🛑 Stopping NMEA Bridge Simulator...');
    
    try {
      // Clear health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Graceful shutdown
      if (this.simulatorProcess && !this.simulatorProcess.killed) {
        this.simulatorProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (!this.simulatorProcess.killed) {
              this.simulatorProcess.kill('SIGKILL');
            }
            resolve();
          }, this.config.timeouts.shutdown);
          
          this.simulatorProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      // Cleanup any remaining processes
      await this.cleanupExistingProcesses();
      
      // Remove port configuration file
      const configPath = path.join(__dirname, 'simulator-ports.json');
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }
      
      console.log('✅ Simulator stopped successfully');
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Error stopping simulator: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current simulator status
   */
  async getStatus() {
    const configPath = path.join(__dirname, 'simulator-ports.json');
    
    if (!fs.existsSync(configPath)) {
      return { running: false };
    }
    
    try {
      const ports = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const healthy = await this.performHealthCheck(ports);
      
      return {
        running: true,
        healthy,
        ports,
        pid: this.simulatorProcess?.pid || null
      };
    } catch (error) {
      return { running: false, error: error.message };
    }
  }
}

// CLI Interface
if (require.main === module) {
  const manager = new SimulatorLifecycleManager();
  const command = process.argv[2];
  const scenario = process.argv[3] || 'basic-navigation';
  
  async function handleCommand() {
    try {
      switch (command) {
        case 'start':
          const options = {
            duration: process.argv.includes('--duration') ? parseInt(process.argv[process.argv.indexOf('--duration') + 1]) : null,
            loop: process.argv.includes('--loop')
          };
          const result = await manager.startSimulator(scenario, options);
          console.log(JSON.stringify(result, null, 2));
          break;
          
        case 'stop':
          await manager.stopSimulator();
          break;
          
        case 'status':
          const status = await manager.getStatus();
          console.log(JSON.stringify(status, null, 2));
          break;
          
        case 'restart':
          await manager.stopSimulator();
          await new Promise(resolve => setTimeout(resolve, 2000));
          await manager.startSimulator(scenario);
          break;
          
        default:
          console.log(`Usage: ${process.argv[1]} <start|stop|status|restart> [scenario] [options]`);
          console.log('  start <scenario>  - Start simulator with scenario');
          console.log('  stop              - Stop simulator gracefully');
          console.log('  status            - Get current simulator status');
          console.log('  restart <scenario>- Restart simulator with scenario');
          console.log('');
          console.log('Options:');
          console.log('  --duration <ms>   - Run for specified duration');
          console.log('  --loop            - Loop scenario continuously');
          process.exit(1);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  }
  
  handleCommand();
}

module.exports = { SimulatorLifecycleManager };