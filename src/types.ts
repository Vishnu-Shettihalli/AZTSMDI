export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  threatPoints: number;
}

export interface Session {
  id: string;
  username: string;
  role?: string;
  ip: string;
  userAgent: string;
  loginTime: string;
  status: 'Genuine' | 'Deception';
  threatScore: number;
  failedAttempts: number;
  logs: LogEntry[];
  aiSummary?: string;
  generatingSummary?: boolean;
}

export interface Alert {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical';
  message: string;
  sessionId: string;
}

export interface SecurityPolicy {
  id: string;
  policyId: string;
  title: string;
  trigger: string;
  condition: string;
  action: 'DECEPTION' | 'QUARANTINE' | 'BLOCK' | 'INCREASE_MONITORING';
  threshold: number;
  scope: string;
  priority: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_APPROVAL';
  version: number;
  deployedAt?: string;
  createdAt: string;
  sourceEvent?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  sessionId: string;
  username: string;
  role: string;
  action: string;
  endpoint: string;
  method: string;
  status: number;
  threatScore: number;
  decision: 'ALLOW' | 'DECEPTION' | 'DENY';
  details?: string;
}

export interface DashboardStats {
  totalSessions: number;
  activeGenuine: number;
  activeDeception: number;
  avgThreatScore: number;
  mostAccessedResource: string;
  resourceAccessCounts: { name: string; count: number }[];
  activePoliciesCount?: number;
}
