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

    const constructorMatch = content.match(/constructor\s*\(([^)]*)\)/s);
    if (constructorMatch) {
        const params = constructorMatch[1].split(',').map(p => p.trim());
        params.forEach(param => {
            const match = param.match(/(?:private|protected|public)?\s*(?:readonly\s*)?(\w+)\s*:\s*([A-Z][A-Za-z0-9]+)/);
            if (match) {
                const name = match[1];
                const type = match[2];
                if (!['Logger', 'ConfigService'].includes(type)) {
                    dependencies.push({ name, type });
                }
            }
        });
    }

    const methodRegex = /(?:public\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([A-Za-z0-9<>\[\]]+))?\s*\{/g;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        const methodName = match[1];
        if (methodName.startsWith('_') || methodName === 'constructor') continue;
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

    const mockProviders = dependencies.map(dep => {
        return '{ \n      provide: ' + dep.type + ', \n      useValue: new Proxy({}, {\n        get: (target, prop) => {\n          if (typeof prop === "string" && !target[prop]) {\n            target[prop] = jest.fn(() => Promise.resolve());\n          }\n          return target[prop] || jest.fn(() => Promise.resolve());\n        }\n      }) \n    }';
    });

    const safeTests = methods.map(method => {
        const params = method.params.length > 0
            ? method.params.map(p => "null /* TODO: replace with valid " + p + " */").join(', ')
            : '';

        return '\n  describe("' + method.name + '", () => {\n' +
            '    it("should not throw error with minimal input (TODO: add real assertions)", async () => {\n' +
            '      try {\n' +
            '        ' + (method.isAsync ? 'await ' : '') + 'service.' + method.name + '(' + params + ');\n' +
            '        expect(true).toBe(true); // ✅ Basic safety check passed\n' +
            '      } catch (error) {\n' +
            '        throw error;\n' +
            '      }\n' +
            '    });\n' +
            '  });';
    }).join('\n');

    return "import { Test, TestingModule } from '@nestjs/testing';\n" +
        "import { " + pascalName + " } from './" + classNameBase + "';\n\n" +
        "describe('" + pascalName + " (Auto-Generated Foundation)', () => {\n" +
        "  let service: " + pascalName + ";\n\n" +
        "  beforeEach(async () => {\n" +
        "    const module: TestingModule = await Test.createTestingModule({\n" +
        "      providers: [\n" +
        "        " + pascalName + ",\n" +
        "        " + mockProviders.join(',\n        ') + "\n" +
        "      ],\n" +
        "    }).compile();\n\n" +
        "    service = module.get<" + pascalName + ">(" + pascalName + ");\n" +
        "  });\n\n" +
        "  it('✅ should be defined (basic sanity check)', () => {\n" +
        "    expect(service).toBeDefined();\n" +
        "  });\n" +
        (safeTests || "\n  it('ℹ️ placeholder test', () => { expect(true).toBe(true); });") + "\n" +
        "});\n";
}

async function runSwarm() {
    console.log('🚀 [REALISTIC QA SWARM] - Building TEST FOUNDATION');

    const allFiles = getAllFiles(targetDir);
    console.log('📂 Found ' + allFiles.length + ' testable files');

    let success = 0;
    let failed = 0;

    allFiles.forEach(filePath => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const specContent = generateTestContent(filePath, content);
            const specPath = filePath.replace(/\.ts$/, '.spec.ts');

            fs.writeFileSync(specPath, specContent, 'utf8');
            success++;
            process.stdout.write('.');
        } catch (err) {
            failed++;
            console.error('\n❌ ' + path.basename(filePath) + ': ' + err.message);
        }
    });

    console.log('\n\n✅ Generated ' + success + ' test files');
    console.log('⚠️  Failed: ' + failed);
}

runSwarm().catch(console.error);
