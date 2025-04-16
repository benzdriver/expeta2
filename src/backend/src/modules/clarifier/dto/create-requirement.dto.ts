export class CreateRequirementDto {
  title: string;
  text: string;
  description?: string;
  domain?: string;
  priority?: string;
  createdBy?: string;
  metadata?: Record<string, any>;
}
