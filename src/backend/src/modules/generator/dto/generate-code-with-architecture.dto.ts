export class GenerateCodeWithArchitectureDto {
  expectationId: string;
  architectureGuide: {
    pattern: string;
    components: {
      name: string;
      responsibility: string;
      interfaces?: string[];
    }[];
    interactions: {
      source: string;
      target: string;
      type: string;
      description: string;
    }[];
    constraints?: string[];
  };
  technicalRequirements: {
    language: string;
    framework: string;
    libraries?: string[];
    patterns?: string[];
    performance?: {
      criteria: string;
      threshold: string;
    }[];
    security?: string[];
  };
}
