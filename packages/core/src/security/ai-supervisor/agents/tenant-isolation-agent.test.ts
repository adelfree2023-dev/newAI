import { TenantIsolationAgent } from './tenant-isolation-agent';
import { AgentRuntime } from '../shims/ai-agent-types';
import { AuditService } from '../../layers/s4-audit-logging/audit.service';

describe('TenantIsolationAgent', () => {
    let agent: TenantIsolationAgent;
    let mockRuntime: jest.Mocked<AgentRuntime>;
    let mockAudit: jest.Mocked<AuditService>;

    beforeEach(() => {
        mockRuntime = {
            executeSkill: jest.fn(),
        } as any;

        mockAudit = {
            logSecurityEvent: jest.fn(),
            logSystemEvent: jest.fn(),
            logBusinessEvent: jest.fn(),
        } as any;

        agent = new TenantIsolationAgent(mockRuntime, mockAudit);
    });

    it('should validate tenant isolation successfully', async () => {
        const mockResult = {
            isolationStatus: 'SECURE',
            threatLevel: 'NONE',
        };

        mockRuntime.executeSkill.mockResolvedValue(mockResult);

        const data = { tenantId: 'test-tenant' };
        const result = await agent.validateTenantIsolation(data);

        expect(result.isolationStatus).toBe('SECURE');
        expect(mockRuntime.executeSkill).toHaveBeenCalledWith('database-isolation', expect.any(Object));
        expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('TENANT_ISOLATION_VALIDATION', expect.any(Object));
    });

    it('should handle isolation breach', async () => {
        const mockResult = {
            isolationStatus: 'INSECURE',
            threatLevel: 'HIGH',
            detectedIssues: ['Cross-tenant access detected'],
            recommendedActions: ['ALERT_ADMIN'],
        };

        mockRuntime.executeSkill.mockResolvedValue(mockResult);

        const data = { tenantId: 'attacker' };
        await agent.validateTenantIsolation(data);

        expect(mockAudit.logSecurityEvent).toHaveBeenCalledWith('ISOLATION_BREACH_DETECTED', expect.any(Object));
    });
});
