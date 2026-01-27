import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly authService: AuthService) {
        super({ usernameField: 'email', passwordField: 'password' });
    }

    async validate(email: string, password: string): Promise<any> {
        // نستخدم JWT مباشرة في هذا المشروع، لكن نترك هذا للتوافق
        throw new UnauthorizedException('يجب استخدام المصادقة بـ JWT');
    }
}
