export class UpdateRequirementDto {
  title?: string;
  text?: string;
  domain?: string;
  status?: 'initial' | 'clarifying' | 'expectations_generated' | 'completed';
  metadata?: Record<string, any>;
}
