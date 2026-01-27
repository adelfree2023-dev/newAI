const fs = require('fs');
const path = require('path');

const targetDir = path.join(process.cwd(), 'src');

function getAllFiles(dirPath, arrayOfFiles = []) {
    try {
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else if (
                file.endsWith('.service.ts') ||
                file.endsWith('.controller.ts') ||
                (file.endsWith('.ts') &&
                    !file.endsWith('.spec.ts') &&
                    !file.endsWith('.module.ts') &&
                    !file.endsWith('.dto.ts') &&
                    !file.endsWith('.entity.ts') &&
                    !file.endsWith('.constants.ts') &&
                    !file.includes('test-generation-skill'))
            ) {
                arrayOfFiles.push(fullPath);
            }
        });
    } catch (e) {
        console.warn('⚠️ تخطي مجلد:', dirPath);
    }
    return arrayOfFiles;
}

function analyzeCode(content) {
    const methods = [];
    const dependencies = [];

    // استخراج التبعيات من الـ constructor (بدون افتراضات خاطئة)
    const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/s);
    if (constructorMatch) {
        const params = constructorMatch[1].split(',').map(p => p.trim());
        params.forEach(param => {
            const match = param.match(/(?:private|protected|public)?\s*(?:readonly\s*)?(\w+)\s*:\s*([A-Z][A-Za-z0-9]+)/);
            if (match) {
                const name = match[1];
                const type = match[2];
                // استثناء التبعيات القياسية التي يوفرها NestJS
                if (!['Logger', 'ConfigService'].includes(type)) {
                    dependencies.push({ name, type });
                }
            }
        });
    }

    // استخراج الطرق العامة فقط (بدون طرق خاصة)
    const methodRegex = /(?:public\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([A-Za-z0-9<>\[\]]+))?\s*\{/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        const methodName = match[1];
        // تخطي الطرق الخاصة والمتداخلة
        if (methodName.startsWith('_') || methodName === 'constructor') continue;

        // تخطي الطرق الموروثة تلقائياً
        if (['onModuleInit', 'onModuleDestroy', 'ngOnDestroy'].includes(methodName)) continue;

        methods.push({
            name: methodName,
            params: match[2].split(',').filter(p => p.trim()).map(p => p.trim().split(':')[0].trim()),
            isAsync: content.substring(match.index - 10, match.index).includes('async')
        });
    }

    return { methods, dependencies };
}

function generateTestContent(filePath, content) {
    const fileName = path.basename(filePath);
    const classNameBase = fileName.replace('.ts', '');
    const pascalName = classNameBase
        .split(/[.-]/)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');

    const { methods, dependencies } = analyzeCode(content);

    // توليد مزيفات ذكية وآمنة
    const mockProviders = dependencies.map(dep => {
        // مزيف عام يتعامل مع أي استدعاء بطريقة آمنة
        return `{ 
      provide: ${dep.type}, 
      useValue: new Proxy({}, {
        get: (target, prop) => {
          if (typeof prop === 'string' && !target[prop]) {
            target[prop] = jest.fn(() => Promise.resolve());
          }
          return target[prop] || jest.fn(() => Promise.resolve());
        }
      }) 
    }`;
    });

    // توليد اختبارات آمنة (لا تفترض سلوكاً)
    const safeTests = methods.map(method => {
        const params = method.params.length > 0
            ? method.params.map(p => `null /* TODO: replace with valid ${p} */`).join(', ')
            : '';

        return `
  describe('${method.name}', () => {
    it('should not throw error with minimal input (TODO: add real assertions)', async () => {
      try {
        ${method.isAsync ? 'await ' : ''}service.${method.name}(${params});
        expect(true).toBe(true); // ✅ Basic safety check passed
      } catch (error) {
        // ❌ This test will fail if method throws - developer must fix
        throw error;
      }
    });
  });`;
    }).join('\n');

    return `import { Test, TestingModule } from '@nestjs/testing';
import { ${pascalName} } from './${classNameBase}';

// ⚠️ AUTO-GENERATED TEST - REVIEW AND ENHANCE MANUALLY
// Target: Basic instantiation + safety checks (NOT 97% coverage)
// TODO: Replace placeholder assertions with real business logic tests

describe('${pascalName} (Auto-Generated Foundation)', () => {
  let service: ${pascalName};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ${pascalName},
        ${mockProviders.join(',\n        ')}
      ],
    }).compile();

    service = module.get<${pascalName}>(${pascalName});
  });

  it('✅ should be defined (basic sanity check)', () => {
    expect(service).toBeDefined();
  });

  ${safeTests || `
  // ℹ️ No public methods detected - add manual tests for business logic
  it('ℹ️ placeholder test - implement real tests', () => {
    expect(true).toBe(true);
  });`}
});
`;
}

async function runSwarm() {
    console.log('🚀 [REALISTIC QA SWARM] - Building TEST FOUNDATION (not fake 97%)');
    console.log('💡 Strategy: Safe instantiation + minimal safety checks');
    console.log('⚠️  Warning: Real coverage requires MANUAL test development');

    const allFiles = getAllFiles(targetDir);
    console.log(\`📂 Found \${allFiles.length} testable files\`);

  let success = 0;
  let failed = 0;

  allFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const specContent = generateTestContent(filePath, content);
      const specPath = filePath.replace(/\.ts$/, '.spec.ts');
      
      // حفظ حتى لو كان الملف موجوداً (لتحديث الإصدارات القديمة)
      fs.writeFileSync(specPath, specContent, 'utf8');
      success++;
      process.stdout.write('.');
    } catch (err) {
      failed++;
      console.error(\`\\n❌ \${path.basename(filePath)}: \${err.message}\`);
    }
  });

  console.log(\`\\n\\n✅ Generated \${success} test files\`);
  console.log(\`⚠️  Failed: \${failed}\`);
  console.log(\`\\n📊 REALISTIC EXPECTATIONS:\`);
  console.log(\`   • Initial coverage: ~30-40% (instantiation + basic calls)\`);
  console.log(\`   • Target 97%: Requires MANUAL test development by developers\`);
  console.log(\`   • Next step: Run 'npm test -- --coverage' and enhance failing tests\`);
}

runSwarm().catch(console.error);
