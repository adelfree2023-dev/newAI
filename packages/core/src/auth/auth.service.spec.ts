import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { Repository } from 'typeorm';

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: jest.Mocked<Repository<User>>;
    let sessionRepository: jest.Mocked<Repository<Session>>;
    let jwtService: jest.Mocked<JwtService>;

    beforeEach(async () => {
        const mockUserRepository = {
            findOne: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
        };
        const mockSessionRepository = {
            save: jest.fn(),
            delete: jest.fn(),
            findOne: jest.fn(),
        };
        const mockJwtService = {
            sign: jest.fn(),
            verify: jest.fn(),
        };
        const mockConfigService = {
            get: jest.fn().mockReturnValue('secret'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(User), useValue: mockUserRepository },
                { provide: getRepositoryToken(Session), useValue: mockSessionRepository },
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userRepository = module.get(getRepositoryToken(User));
        sessionRepository = module.get(getRepositoryToken(Session));
        jwtService = module.get(JwtService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user if credentials match', async () => {
            const mockUser = { id: '1', email: 'test@a.c', passwordHash: 'hashed' } as any;
            userRepository.findOne.mockResolvedValue(mockUser);
            // Mocking bcrypt check (simplified)
            (service as any).comparePassword = jest.fn().mockResolvedValue(true);

            const result = await service.validateUser('test@a.c', 'pass');
            expect(result).toEqual(mockUser);
        });
    });

    describe('login', () => {
        it('should return access token and create session', async () => {
            const mockUser = { id: 'u-123', email: 'a@b.c' } as User;
            jwtService.sign.mockReturnValue('token');
            sessionRepository.save.mockResolvedValue({ id: 's-1' } as Session);

            const result = await service.login(mockUser);
            expect(result.accessToken).toBe('token');
            expect(sessionRepository.save).toHaveBeenCalled();
        });
    });
});
