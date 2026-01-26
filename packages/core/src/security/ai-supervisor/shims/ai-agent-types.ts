import { generateText, streamText } from '../shims/ai-agent-types';

export interface SkillContext {
    timestamp: string;
    [key: string]: any;
}

export abstract class Skill {
    abstract execute(input: any, context: SkillContext): Promise<any>;
}

export interface AgentRuntimeOptions {
    model: string;
    temperature?: number;
    maxTokens?: number;
    skills: any[];
    systemPrompt: string;
}

export class AgentRuntime {
    constructor(private readonly options: AgentRuntimeOptions) { }

    async executeSkill(skillName: string, input: any): Promise<any> {
        const skill = this.options.skills.find(s =>
            (s.constructor as any).name === skillName || s.name === skillName
        );

        if (!skill) {
            throw new Error(`Skill ${skillName} not found`);
        }

        const context: SkillContext = {
            timestamp: new Date().toISOString(),
            systemPrompt: this.options.systemPrompt
        };

        return skill.execute(input, context);
    }

    getOptions() {
        return this.options;
    }
}
