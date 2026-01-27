import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(async () => {
        const mockConfigService = {
            get: jest.fn().mockReturnValue('32-character-long-secret-key-12345'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                { provide: ConfigService, useValue: mockConfigService },
            ],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
    });

    it('should encrypt and decrypt', () => {
        const text = 'secret';
        const encrypted = service.encrypt(text);
        const decrypted = service.decrypt(encrypted);
        expect(decrypted).toBe(text);
    });
});
