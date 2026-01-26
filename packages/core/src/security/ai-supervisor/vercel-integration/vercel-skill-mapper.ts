import { Injectable } from '@nestjs/common';

@Injectable()
export class VercelSkillMapper {
  mapSkill(skillName: string): any {
    return {
      name: skillName,
      mapped: true
    };
  }
}
