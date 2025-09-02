import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  getUser, 
  authenticateUser, 
  requireAuth, 
  requireGuest, 
  checkAuth,
  checkSessionTimeout,
  protectedRouteAuth,
  requireRole,
  requireAuthAPI,
  authenticateRoute,
  optionalAuth
} from '../auth.middleware';
import { AuthErrorCode } from '../auth.errors';

// SessionService のモック
vi.mock('../session.service', () => ({
  SessionService: {
    validateAndRefreshSession: vi.fn(),
    getAuthenticatedClient: vi.fn(),
  }
}));

// sessions.server のモック
vi.mock('../sessions.server', () => ({
  getSession: vi.fn(),
  commitSession: vi.fn(),
  destroySession: vi.fn(),
}));

// react-router のモック
vi.mock('react-router', () => ({
  redirect: vi.fn((url, options) => {
    const error = new Error(`Redirect to ${url}`);
    (error as any).url = url;
    (error as any).options = options;
    throw error;
  }),
}));

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('should return userId when authentication is successful', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        headers: undefined,
        shouldRedirect: false
      });

      const result = await getUser(mockRequest);
      expect(result).toBe('test-user-id');
    });

    it('should return null when authentication fails', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: null,
        shouldRedirect: true
      });

      const result = await getUser(mockRequest);
      expect(result).toBe(null);
    });

    it('should handle timeout errors gracefully', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      const timeoutError = new Error('Authentication timeout');
      timeoutError.name = 'AbortError';
      vi.mocked(SessionService.validateAndRefreshSession).mockRejectedValue(timeoutError);

      const result = await getUser(mockRequest);
      expect(result).toBe(null);
    });
  });

  describe('authenticateUser', () => {
    it('should return successful auth result', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        headers: new Headers(),
        shouldRedirect: false
      });

      const result = await authenticateUser(mockRequest);
      expect(result.userId).toBe('test-user-id');
      expect(result.shouldRedirect).toBe(false);
      expect(result.error).toBeUndefined();
    });

    it('should return error result when authentication fails', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: null,
        shouldRedirect: true
      });

      const result = await authenticateUser(mockRequest);
      expect(result.userId).toBe(null);
      expect(result.shouldRedirect).toBe(true);
      expect(result.isExpired).toBe(true);
    });

    it('should handle timeout errors', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      const timeoutError = new Error('Authentication timeout');
      timeoutError.name = 'AbortError';
      vi.mocked(SessionService.validateAndRefreshSession).mockRejectedValue(timeoutError);

      const result = await authenticateUser(mockRequest);
      expect(result.userId).toBe(null);
      expect(result.error?.code).toBe(AuthErrorCode.TIMEOUT_ERROR);
    });
  });

  describe('requireAuth', () => {
    it('should return userId when authenticated', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        headers: undefined,
        shouldRedirect: false
      });

      const result = await requireAuth(mockRequest);
      expect(result.userId).toBe('test-user-id');
    });

    it('should redirect to login when not authenticated', async () => {
      const mockRequest = new Request('http://localhost/protected');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: null,
        shouldRedirect: true
      });

      await expect(requireAuth(mockRequest)).rejects.toThrow('Redirect to /login?redirectTo=%2Fprotected');
    });
  });

  describe('requireGuest', () => {
    it('should allow access when not authenticated', async () => {
      const mockRequest = new Request('http://localhost/login');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: null,
        shouldRedirect: false
      });

      const result = await requireGuest(mockRequest);
      expect(result).toBeDefined();
    });

    it('should redirect to home when authenticated', async () => {
      const mockRequest = new Request('http://localhost/login');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        shouldRedirect: false
      });

      await expect(requireGuest(mockRequest)).rejects.toThrow('Redirect to /');
    });
  });

  describe('checkAuth', () => {
    it('should return auth status without redirecting', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        headers: undefined,
        shouldRedirect: false
      });

      const result = await checkAuth(mockRequest);
      expect(result.userId).toBe('test-user-id');
      expect(result.error).toBeUndefined();
    });

    it('should return null userId when not authenticated', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: null,
        shouldRedirect: true
      });

      const result = await checkAuth(mockRequest);
      expect(result.userId).toBe(null);
    });
  });

  describe('protectedRouteAuth', () => {
    it('should return authenticated client when successful', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      const mockClient = { auth: { getUser: vi.fn() } };
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        headers: undefined,
        shouldRedirect: false
      });
      
      vi.mocked(SessionService.getAuthenticatedClient).mockResolvedValue(mockClient);

      const result = await protectedRouteAuth(mockRequest);
      expect(result.userId).toBe('test-user-id');
      expect(result.authenticatedClient).toBe(mockClient);
    });

    it('should continue even if client creation fails', async () => {
      const mockRequest = new Request('http://localhost/test');
      const { SessionService } = await import('../session.service');
      
      vi.mocked(SessionService.validateAndRefreshSession).mockResolvedValue({
        userId: 'test-user-id',
        headers: undefined,
        shouldRedirect: false
      });
      
      vi.mocked(SessionService.getAuthenticatedClient).mockRejectedValue(new Error('Client error'));

      const result = await protectedRouteAuth(mockRequest);
      expect(result.userId).toBe('test-user-id');
      expect(result.authenticatedClient).toBeUndefined();
    });
  });
});