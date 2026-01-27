export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    tenantId?: string;
    isSuperAdmin: boolean;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: any;
    requires2FA?: boolean;
    verificationToken?: string;
}
