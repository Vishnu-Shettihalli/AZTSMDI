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

export interface DashboardStats {
  totalSessions: number;
  activeGenuine: number;
  activeDeception: number;
  avgThreatScore: number;
  mostAccessedResource: string;
  resourceAccessCounts: { name: string; count: number }[];
}
