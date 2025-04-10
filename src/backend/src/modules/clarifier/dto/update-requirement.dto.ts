export class UpdateRequirementDto {
  title?: string;
  text?: string;
  description?: string;
  domain?: string;
  priority?: string;
  status?: 'initial' | 'clarifying' | 'expectations_generated' | 'completed';
}
