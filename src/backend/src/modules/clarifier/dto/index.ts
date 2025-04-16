export * from './create-requirement.dto';
export * from './update-requirement.dto';
export * from './clarification-question.dto';

export class CreateRequirementDto {
  title: string;
  text: string;
  domain?: string;
  metadata?: Record<string, any>;
}
